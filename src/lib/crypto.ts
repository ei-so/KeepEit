export class WrongPasswordError extends Error {
  constructor(message = 'Invalid password or recovery code') {
    super(message);
    this.name = 'WrongPasswordError';
  }
}

// Utility for Uint8Array <-> Base64
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from password and salt using PBKDF2-SHA-256 with 600,000 iterations.
 * The derived key is non-extractable (extractable: false).
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // extractable = false
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt VaultData using AES-GCM with a fresh random 12-byte IV.
 */
export async function encrypt(
  data: any,
  key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);
  const dataBytes = encoder.encode(jsonString);

  // Fresh 12-byte IV
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    dataBytes
  );

  return {
    iv: uint8ArrayToBase64(ivBytes),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
  };
}

/**
  * Decrypt envelope ciphertext using AES-GCM and the derived key.
  * Throws WrongPasswordError on authentication tag mismatch or invalid payload.
  */
 export async function decrypt(
   payload: { iv: string; ciphertext: string },
   key: CryptoKey
 ): Promise<any> {
   try {
     const ivBytes = base64ToUint8Array(payload.iv);
     const ciphertextBytes = base64ToUint8Array(payload.ciphertext);

     const decryptedBuffer = await crypto.subtle.decrypt(
       {
         name: 'AES-GCM',
         iv: ivBytes,
       },
       key,
       ciphertextBytes
     );

     const decoder = new TextDecoder();
     const jsonString = decoder.decode(decryptedBuffer);
     return JSON.parse(jsonString);
   } catch (err) {
     throw new WrongPasswordError('Authentication tag check failed. Incorrect password or corrupted envelope.');
   }
 }

/**
 * Derive a 256-bit Key Encryption Key (KEK_pk) from passkey PRF output using HKDF-SHA256.
 * Salt = envelope.salt
 * Info = 'keepeit-dek-wrap-v1'
 */
export async function deriveKekFromPrf(
  prfOutput: Uint8Array,
  saltBytes: Uint8Array
): Promise<CryptoKey> {
  const hkdfBaseKey = await crypto.subtle.importKey(
    'raw',
    prfOutput,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  const encoder = new TextEncoder();
  const info = encoder.encode('keepeit-dek-wrap-v1');

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBytes,
      info,
    },
    hkdfBaseKey,
    { name: 'AES-GCM', length: 256 },
    false, // extractable = false
    ['encrypt', 'decrypt']
  );
}


/**
 * Derive a 256-bit Key Encryption Key (KEK) using PBKDF2-SHA256 from password/code and salt.
 */
export async function deriveKek(
  password: string,
  saltBytes: Uint8Array,
  iterations = 600000
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // extractable = false
    ['encrypt', 'decrypt']
  );
}

/**
 * Import raw 256-bit DEK bytes into a non-extractable AES-GCM CryptoKey.
 */
export async function importDek(rawDek: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    rawDek,
    { name: 'AES-GCM' },
    false, // extractable = false
    ['encrypt', 'decrypt']
  );
}

/**
 * Wrap raw DEK under KEK using AES-GCM and fresh 12-byte IV.
 */
export async function wrapDek(
  rawDek: Uint8Array,
  kek: CryptoKey
): Promise<{ iv: string; wrappedDek: string }> {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    kek,
    rawDek
  );

  return {
    iv: uint8ArrayToBase64(ivBytes),
    wrappedDek: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
  };
}

/**
 * Unwrap wrapped DEK using KEK.
 * Throws WrongPasswordError if unwrapping fails.
 */
export async function unwrapDek(
  wrapped: { iv: string; wrappedDek: string },
  kek: CryptoKey
): Promise<Uint8Array> {
  try {
    const ivBytes = base64ToUint8Array(wrapped.iv);
    const wrappedBytes = base64ToUint8Array(wrapped.wrappedDek);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      kek,
      wrappedBytes
    );

    return new Uint8Array(decryptedBuffer);
  } catch (err) {
    throw new WrongPasswordError('Invalid master password. Decryption failed.');
  }
}

/**
 * Encrypt VaultData using non-extractable DEK.
 */
export async function encryptWithDek(
  data: any,
  dekKey: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);
  const dataBytes = encoder.encode(jsonString);

  const ivBytes = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    dekKey,
    dataBytes
  );

  return {
    iv: uint8ArrayToBase64(ivBytes),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
  };
}

/**
 * Decrypt VaultData payload using non-extractable DEK.
 */
export async function decryptWithDek(
  payload: { iv: string; ciphertext: string },
  dekKey: CryptoKey
): Promise<any> {
  try {
    const ivBytes = base64ToUint8Array(payload.iv);
    const ciphertextBytes = base64ToUint8Array(payload.ciphertext);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      dekKey,
      ciphertextBytes
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  } catch (err) {
    throw new WrongPasswordError('Corrupted vault structure or invalid authentication tag.');
  }
}

/**
 * Generate a 24-character Crockford base32 recovery code formatted in 6 groups of 4.
 * Crockford base32 alphabet: 0123456789ABCDEFGHJKMNPQRSTVWXYZ (excludes I, L, O, U).
 */
export function generateRecoveryCode(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const randomBytes = new Uint8Array(24);
  crypto.getRandomValues(randomBytes);

  let result = '';
  for (let i = 0; i < 24; i++) {
    const index = randomBytes[i] % alphabet.length;
    result += alphabet[index];
  }

  // Format as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  return (
    result.slice(0, 4) +
    '-' +
    result.slice(4, 8) +
    '-' +
    result.slice(8, 12) +
    '-' +
    result.slice(12, 16) +
    '-' +
    result.slice(16, 20) +
    '-' +
    result.slice(20, 24)
  );
}

/**
 * Clean recovery code string for matching (strip hyphens and whitespace, uppercase).
 */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/**
 * Password strength heuristic (0 to 4 score)
 */
export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Unbreakable';
  feedback: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  if (!password) {
    return { score: 0, label: 'Weak', feedback: ['Password is empty'] };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  if (password.length < 8) {
    feedback.push('Use at least 8 characters (12+ recommended)');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters');
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Add numbers');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('Add special symbols (!@#$)');
  }

  const labels: PasswordStrengthResult['label'][] = ['Weak', 'Fair', 'Good', 'Strong', 'Unbreakable'];
  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    feedback,
  };
}

export interface PasswordGeneratorOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

export function generateSecurePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 20,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  let chars = '';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }

  return password;
}

