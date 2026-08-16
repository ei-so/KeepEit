import {
  VaultData,
  VaultEnvelope,
  VaultEnvelopeV3,
  VaultEnvelopeLegacy,
  VaultWrapperPasskey,
} from '../types/vault';
import {
  deriveKey,
  encrypt,
  decrypt,
  deriveKek,
  deriveKekFromPrf,
  importDek,
  wrapDek,
  unwrapDek,
  encryptWithDek,
  decryptWithDek,
  generateRecoveryCode,
  normalizeRecoveryCode,
  uint8ArrayToBase64,
  base64ToUint8Array,
  WrongPasswordError,
} from './crypto';

const DB_NAME = 'KeepEitDB';
const DB_VERSION = 2;
const STORE_NAME = 'envelope_store';
const SINGLETON_KEY = 'vault_envelope_singleton';

// Module-scoped non-extractable key and memory state
let activeKey: CryptoKey | null = null;
let activeRawDek: Uint8Array | null = null;
let activeVaultData: VaultData | null = null;
let currentEnvelope: VaultEnvelope | null = null;

/**
 * Open IndexedDB connection with self-healing store creation
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('envelope_store')) {
        db.createObjectStore('envelope_store');
      }
      if (!db.objectStoreNames.contains('vaultStore')) {
        db.createObjectStore('vaultStore');
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const currentVersion = db.version;
        db.close();
        const upgradeReq = indexedDB.open(DB_NAME, currentVersion + 1);
        upgradeReq.onupgradeneeded = (e) => {
          const upgradedDb = (e.target as IDBOpenDBRequest).result;
          if (!upgradedDb.objectStoreNames.contains('envelope_store')) {
            upgradedDb.createObjectStore('envelope_store');
          }
          if (!upgradedDb.objectStoreNames.contains('vaultStore')) {
            upgradedDb.createObjectStore('vaultStore');
          }
        };
        upgradeReq.onsuccess = () => resolve(upgradeReq.result);
        upgradeReq.onerror = () => reject(upgradeReq.error);
      } else {
        resolve(db);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Read the single VaultEnvelope from IndexedDB
 */
async function getStoredEnvelope(): Promise<VaultEnvelope | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(SINGLETON_KEY);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to read stored envelope from IndexedDB:', err);
    return null;
  }
}

/**
 * Write the single VaultEnvelope to IndexedDB
 */
async function setStoredEnvelope(envelope: VaultEnvelope): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(envelope, SINGLETON_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if an encrypted vault envelope exists in IndexedDB
 */
export async function exists(): Promise<boolean> {
  const envelope = await getStoredEnvelope();
  return envelope !== null;
}

/**
 * Create a new vault with master password using Version 3 Key Indirection.
 */
export async function create(
  password: string,
  hint?: string,
  displayName?: string
): Promise<{ recoveryCode: string; vault: VaultData }> {
  // 1. Generate random 256-bit DEK
  const rawDek = crypto.getRandomValues(new Uint8Array(32));
  const dekKey = await importDek(rawDek);

  // 2. Master KEK_pw
  const masterSalt = crypto.getRandomValues(new Uint8Array(16));
  const kekPw = await deriveKek(password, masterSalt, 600000);
  const wrappedPass = await wrapDek(rawDek, kekPw);

  // 3. Initial Vault Data
  const initialVaultData: VaultData = {
    version: '1.0.0',
    developer: 'Kurt Ross Gonzaga',
    accountProfile: {
      displayName: displayName?.trim() || 'Vault User',
      avatarColor: '#27272A',
    },
    items: [],
    folders: [],
    tags: [],
    activityLogs: [
      {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        action: 'create',
        details: 'Vault initialized with key indirection envelope (v3).',
      },
    ],
    settings: {
      autoLockMinutes: 5,
      theme: 'light',
      showPasswordHint: false,
      clearClipboardSeconds: 30,
      panicShakeEnabled: false,
    },
  };

  // 4. Encrypt VaultData using non-extractable DEK
  const encryptedPayload = await encryptWithDek(initialVaultData, dekKey);

  // 5. Recovery Code & KEK_rec
  const recoveryCode = generateRecoveryCode();
  const normalizedCode = normalizeRecoveryCode(recoveryCode);
  const recoverySalt = crypto.getRandomValues(new Uint8Array(16));
  const kekRec = await deriveKek(normalizedCode, recoverySalt, 600000);
  const wrappedRec = await wrapDek(rawDek, kekRec);

  const now = new Date().toISOString();
  const envelope: VaultEnvelopeV3 = {
    version: 3,
    kdf: 'PBKDF2-SHA256',
    iterations: 600000,
    salt: uint8ArrayToBase64(masterSalt),
    wrappers: {
      password: {
        iv: wrappedPass.iv,
        wrappedDek: wrappedPass.wrappedDek,
      },
      recovery: {
        iv: wrappedRec.iv,
        wrappedDek: wrappedRec.wrappedDek,
        salt: uint8ArrayToBase64(recoverySalt),
      },
    },
    iv: encryptedPayload.iv,
    ciphertext: encryptedPayload.ciphertext,
    createdAt: now,
    updatedAt: now,
    hint: hint?.trim() || undefined,
  };

  await setStoredEnvelope(envelope);

  // Memory state
  activeKey = dekKey;
  activeRawDek = new Uint8Array(rawDek);
  activeVaultData = initialVaultData;
  currentEnvelope = envelope;

  // Zero buffer
  rawDek.fill(0);

  return { recoveryCode, vault: initialVaultData };
}

/**
 * Migration helper: unlock legacy (v1/v2) envelope, generate DEK, re-encrypt under v3 structure.
 */
async function unlockAndMigrateLegacy(
  legacyEnvelope: VaultEnvelopeLegacy,
  password: string
): Promise<VaultData> {
  const saltBytes = base64ToUint8Array(legacyEnvelope.salt);
  const oldKey = await deriveKey(password, saltBytes);

  let vaultData: VaultData;
  try {
    vaultData = await decrypt(
      { iv: legacyEnvelope.iv, ciphertext: legacyEnvelope.ciphertext },
      oldKey
    );
  } catch {
    throw new WrongPasswordError('Invalid master password. Decryption failed.');
  }

  if (!vaultData || typeof vaultData !== 'object' || !Array.isArray(vaultData.items)) {
    throw new WrongPasswordError('Corrupted vault structure.');
  }

  // 1. Generate new 256-bit DEK
  const rawDek = crypto.getRandomValues(new Uint8Array(32));
  const dekKey = await importDek(rawDek);

  // 2. Derive master KEK_pw
  const masterSalt = crypto.getRandomValues(new Uint8Array(16));
  const kekPw = await deriveKek(password, masterSalt, 600000);
  const wrappedPass = await wrapDek(rawDek, kekPw);

  // 3. Append security activity log entry
  const updatedVault: VaultData = {
    ...vaultData,
    activityLogs: [
      {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        action: 'security',
        details: 'Upgraded vault encryption envelope to Version 3 (Key Indirection).',
      },
      ...(vaultData.activityLogs || []),
    ],
  };

  // 4. Encrypt with DEK
  const encryptedPayload = await encryptWithDek(updatedVault, dekKey);

  // 5. Construct Version 3 Envelope
  const now = new Date().toISOString();
  const v3Envelope: VaultEnvelopeV3 = {
    version: 3,
    kdf: 'PBKDF2-SHA256',
    iterations: 600000,
    salt: uint8ArrayToBase64(masterSalt),
    wrappers: {
      password: {
        iv: wrappedPass.iv,
        wrappedDek: wrappedPass.wrappedDek,
      },
    },
    iv: encryptedPayload.iv,
    ciphertext: encryptedPayload.ciphertext,
    createdAt: legacyEnvelope.createdAt || now,
    updatedAt: now,
    hint: legacyEnvelope.hint,
  };

  await setStoredEnvelope(v3Envelope);

  activeKey = dekKey;
  activeRawDek = rawDek;
  activeVaultData = updatedVault;
  currentEnvelope = v3Envelope;

  return updatedVault;
}

/**
 * Unlock vault with master password
 */
export async function unlock(password: string): Promise<VaultData> {
  const envelope = await getStoredEnvelope();
  if (!envelope) {
    throw new Error('No vault found in local storage.');
  }

  // Handle Legacy Envelope (Migration path for v1 / v2)
  if (!('version' in envelope) || envelope.version !== 3) {
    return await unlockAndMigrateLegacy(envelope as VaultEnvelopeLegacy, password);
  }

  const v3Envelope = envelope as VaultEnvelopeV3;
  const masterSalt = base64ToUint8Array(v3Envelope.salt);
  const kekPw = await deriveKek(password, masterSalt, v3Envelope.iterations || 600000);

  let rawDek: Uint8Array;
  try {
    rawDek = await unwrapDek(v3Envelope.wrappers.password, kekPw);
  } catch {
    // A failed unwrap is WrongPasswordError — do not attempt to decrypt the ciphertext to find out.
    throw new WrongPasswordError('Invalid master password. Decryption failed.');
  }

  const dekKey = await importDek(rawDek);

  // Decrypt main payload
  const vaultData = await decryptWithDek(
    { iv: v3Envelope.iv, ciphertext: v3Envelope.ciphertext },
    dekKey
  );

  if (!vaultData || typeof vaultData !== 'object' || !Array.isArray(vaultData.items)) {
    rawDek.fill(0);
    throw new WrongPasswordError('Corrupted vault structure or invalid authentication tag.');
  }

  // Record unlock log
  const updatedVault: VaultData = {
    ...vaultData,
    activityLogs: [
      {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        action: 'unlock',
        details: 'Vault unlocked successfully via master password (v3 key indirection).',
      },
      ...(vaultData.activityLogs || []),
    ],
  };

  // Re-encrypt payload with updated log
  const newEncrypted = await encryptWithDek(updatedVault, dekKey);
  v3Envelope.iv = newEncrypted.iv;
  v3Envelope.ciphertext = newEncrypted.ciphertext;
  v3Envelope.updatedAt = new Date().toISOString();
  await setStoredEnvelope(v3Envelope);

  // Memory references
  activeKey = dekKey;
  activeRawDek = rawDek;
  activeVaultData = updatedVault;
  currentEnvelope = v3Envelope;

  return updatedVault;
}

/**
 * Unlock vault using recovery code
 */
export async function unlockWithRecovery(code: string): Promise<VaultData> {
  const envelope = await getStoredEnvelope();
  if (!envelope) {
    throw new Error('No vault found in local storage.');
  }

  if (envelope.version === 3) {
    const v3 = envelope as VaultEnvelopeV3;
    if (!v3.wrappers.recovery) {
      throw new Error('No recovery code wrapper available for this vault.');
    }

    const normalized = normalizeRecoveryCode(code);
    const recoverySalt = base64ToUint8Array(v3.wrappers.recovery.salt);
    const kekRec = await deriveKek(normalized, recoverySalt, v3.iterations || 600000);

    let rawDek: Uint8Array;
    try {
      rawDek = await unwrapDek(v3.wrappers.recovery, kekRec);
    } catch {
      throw new WrongPasswordError('Invalid emergency recovery code.');
    }

    const dekKey = await importDek(rawDek);
    const vaultData = await decryptWithDek(
      { iv: v3.iv, ciphertext: v3.ciphertext },
      dekKey
    );

    activeKey = dekKey;
    activeRawDek = rawDek;
    activeVaultData = vaultData;
    currentEnvelope = v3;

    return vaultData;
  } else {
    // Legacy recovery path
    const legacy = envelope as VaultEnvelopeLegacy;
    if (!legacy.recoverySalt || !legacy.recoveryIv || !legacy.recoveryCiphertext) {
      throw new Error('No recovery data available for this vault.');
    }

    const normalized = normalizeRecoveryCode(code);
    const recoverySaltBytes = base64ToUint8Array(legacy.recoverySalt);
    const key = await deriveKey(normalized, recoverySaltBytes);

    const vaultData = await decrypt(
      { iv: legacy.recoveryIv, ciphertext: legacy.recoveryCiphertext },
      key
    );

    if (!vaultData || typeof vaultData !== 'object') {
      throw new WrongPasswordError('Invalid recovery code.');
    }

    // Convert to v3
    const rawDek = crypto.getRandomValues(new Uint8Array(32));
    const dekKey = await importDek(rawDek);
    const encryptedPayload = await encryptWithDek(vaultData, dekKey);

    const now = new Date().toISOString();
    const v3Envelope: VaultEnvelopeV3 = {
      version: 3,
      kdf: 'PBKDF2-SHA256',
      iterations: 600000,
      salt: legacy.salt || uint8ArrayToBase64(crypto.getRandomValues(new Uint8Array(16))),
      wrappers: {
        password: {
          iv: '',
          wrappedDek: '',
        },
        recovery: {
          iv: legacy.recoveryIv,
          wrappedDek: legacy.recoveryCiphertext,
          salt: legacy.recoverySalt,
        },
      },
      iv: encryptedPayload.iv,
      ciphertext: encryptedPayload.ciphertext,
      createdAt: legacy.createdAt || now,
      updatedAt: now,
      hint: legacy.hint,
    };

    await setStoredEnvelope(v3Envelope);

    activeKey = dekKey;
    activeRawDek = rawDek;
    activeVaultData = vaultData;
    currentEnvelope = v3Envelope;

    return vaultData;
  }
}

/**
 * Lock vault: zero memory buffers, null derived keys, clear decrypted state
 */
export function lock(): void {
  if (activeRawDek) {
    activeRawDek.fill(0);
    activeRawDek = null;
  }
  activeKey = null;
  activeVaultData = null;
  currentEnvelope = null;
}

/**
 * Read current decrypted vault data in memory (returns null if locked)
 */
export function read(): VaultData | null {
  return activeVaultData;
}

/**
 * Single store mutation runner: accepts function, mutates draft, re-encrypts, and writes to IndexedDB
 */
export async function mutate(
  mutator: (draft: VaultData) => void | VaultData
): Promise<VaultData> {
  if (!activeKey || !activeVaultData || !currentEnvelope) {
    throw new Error('Vault is locked. Cannot perform mutation.');
  }

  // Deep clone draft
  const draft: VaultData = JSON.parse(JSON.stringify(activeVaultData));
  const result = mutator(draft);
  const finalData = result || draft;

  // Enforce activity logs cap of 200 entries (ring buffer)
  if (Array.isArray(finalData.activityLogs) && finalData.activityLogs.length > 200) {
    finalData.activityLogs = finalData.activityLogs.slice(0, 200);
  }

  // Re-encrypt payload with non-extractable DEK
  const encrypted = await encryptWithDek(finalData, activeKey);

  // Update envelope
  currentEnvelope.iv = encrypted.iv;
  currentEnvelope.ciphertext = encrypted.ciphertext;
  currentEnvelope.updatedAt = new Date().toISOString();

  // Write to IndexedDB
  await setStoredEnvelope(currentEnvelope);

  // Update memory state
  activeVaultData = finalData;

  return finalData;
}

/**
 * Get the raw stored VaultEnvelope for backup exports
 */
export async function getRawEnvelope(): Promise<VaultEnvelope | null> {
  return await getStoredEnvelope();
}

/**
 * Re-encrypt vault with a new master password atomically.
 * Unwraps DEK with old KEK, rewraps under new KEK, writes, verifies new envelope unwraps, then commits.
 */
export async function reEncryptWithNewPassword(
  newPassword: string,
  hint?: string,
  oldPassword?: string
): Promise<VaultData> {
  if (!activeVaultData || !currentEnvelope) {
    throw new Error('Vault is locked. Cannot change master password.');
  }

  let rawDek: Uint8Array;
  if (oldPassword && currentEnvelope.version === 3) {
    const v3 = currentEnvelope as VaultEnvelopeV3;
    const oldSalt = base64ToUint8Array(v3.salt);
    const kekOld = await deriveKek(oldPassword, oldSalt, v3.iterations || 600000);
    rawDek = await unwrapDek(v3.wrappers.password, kekOld);
  } else if (activeRawDek) {
    rawDek = new Uint8Array(activeRawDek);
  } else {
    throw new Error('Unable to retrieve vault decryption key for password change.');
  }

  // Generate new master salt and KEK_pw
  const newMasterSalt = crypto.getRandomValues(new Uint8Array(16));
  const kekNew = await deriveKek(newPassword, newMasterSalt, 600000);
  const newWrappedPass = await wrapDek(rawDek, kekNew);

  const now = new Date().toISOString();
  const existingWrappers = currentEnvelope.version === 3 ? (currentEnvelope as VaultEnvelopeV3).wrappers : { password: { iv: '', wrappedDek: '' } };

  const newEnvelope: VaultEnvelopeV3 = {
    version: 3,
    kdf: 'PBKDF2-SHA256',
    iterations: 600000,
    salt: uint8ArrayToBase64(newMasterSalt),
    wrappers: {
      ...existingWrappers,
      password: {
        iv: newWrappedPass.iv,
        wrappedDek: newWrappedPass.wrappedDek,
      },
    },
    iv: currentEnvelope.iv,
    ciphertext: currentEnvelope.ciphertext,
    createdAt: currentEnvelope.createdAt || now,
    updatedAt: now,
    hint: hint !== undefined ? (hint.trim() || undefined) : currentEnvelope.hint,
  };

  // Write new envelope to IndexedDB
  await setStoredEnvelope(newEnvelope);

  // Verify the new envelope unwraps before committing
  let testDek: Uint8Array;
  try {
    testDek = await unwrapDek(newEnvelope.wrappers.password, kekNew);
  } catch (err) {
    throw new Error('Decryption verification failed after re-wrapping. Rolling back.');
  }
  testDek.fill(0);

  // Commit memory references (Never leave file with zero valid wrappers)
  currentEnvelope = newEnvelope;
  activeRawDek = rawDek;

  return activeVaultData;
}

/**
 * Regenerate recovery code with master password verification
 */
export async function regenerateRecoveryCode(masterPassword: string): Promise<string> {
  if (!activeVaultData || !currentEnvelope) {
    throw new Error('Vault is locked.');
  }

  let rawDek: Uint8Array;
  if (currentEnvelope.version === 3) {
    const v3 = currentEnvelope as VaultEnvelopeV3;
    const masterSalt = base64ToUint8Array(v3.salt);
    const kekPw = await deriveKek(masterPassword, masterSalt, v3.iterations || 600000);
    try {
      rawDek = await unwrapDek(v3.wrappers.password, kekPw);
    } catch {
      throw new WrongPasswordError('Incorrect current master password.');
    }
  } else if (activeRawDek) {
    rawDek = new Uint8Array(activeRawDek);
  } else {
    throw new WrongPasswordError('Incorrect current master password.');
  }

  // Generate new recovery code
  const recoveryCode = generateRecoveryCode();
  const normalizedCode = normalizeRecoveryCode(recoveryCode);
  const recoverySalt = crypto.getRandomValues(new Uint8Array(16));
  const kekRec = await deriveKek(normalizedCode, recoverySalt, 600000);
  const wrappedRec = await wrapDek(rawDek, kekRec);

  if (currentEnvelope.version === 3) {
    const v3 = currentEnvelope as VaultEnvelopeV3;
    v3.wrappers.recovery = {
      iv: wrappedRec.iv,
      wrappedDek: wrappedRec.wrappedDek,
      salt: uint8ArrayToBase64(recoverySalt),
    };
    v3.updatedAt = new Date().toISOString();
    await setStoredEnvelope(v3);
  }

  rawDek.fill(0);
  return recoveryCode;
}

/**
 * Replace entire vault envelope from an imported backup file
 */
export async function replaceEnvelopeWithBackup(
  backupEnvelope: VaultEnvelope,
  password: string
): Promise<VaultData> {
  if (!backupEnvelope || typeof backupEnvelope !== 'object') {
    throw new Error('Invalid backup file structure.');
  }

  if (backupEnvelope.version === 3) {
    const v3 = backupEnvelope as VaultEnvelopeV3;
    if (!v3.salt || !v3.wrappers?.password) {
      throw new Error('Invalid Version 3 backup envelope structure.');
    }

    const saltBytes = base64ToUint8Array(v3.salt);
    const kekPw = await deriveKek(password, saltBytes, v3.iterations || 600000);

    let rawDek: Uint8Array;
    try {
      rawDek = await unwrapDek(v3.wrappers.password, kekPw);
    } catch {
      throw new WrongPasswordError('Incorrect password or corrupted backup file.');
    }

    const dekKey = await importDek(rawDek);
    const decryptedVault = await decryptWithDek(
      { iv: v3.iv, ciphertext: v3.ciphertext },
      dekKey
    );

    if (!decryptedVault || typeof decryptedVault !== 'object' || !Array.isArray(decryptedVault.items)) {
      rawDek.fill(0);
      throw new WrongPasswordError('Incorrect password or corrupted backup file.');
    }

    await setStoredEnvelope(v3);

    activeKey = dekKey;
    activeRawDek = rawDek;
    activeVaultData = decryptedVault;
    currentEnvelope = v3;

    return decryptedVault;
  } else {
    // Legacy backup
    const legacy = backupEnvelope as VaultEnvelopeLegacy;
    if (!legacy.salt || !legacy.ciphertext) {
      throw new Error('Invalid backup file structure.');
    }

    const saltBytes = base64ToUint8Array(legacy.salt);
    const key = await deriveKey(password, saltBytes);

    const decryptedVault = await decrypt(
      { iv: legacy.iv, ciphertext: legacy.ciphertext },
      key
    );

    if (!decryptedVault || typeof decryptedVault !== 'object' || !Array.isArray(decryptedVault.items)) {
      throw new WrongPasswordError('Incorrect password or corrupted backup file.');
    }

    // Convert to v3
    const rawDek = crypto.getRandomValues(new Uint8Array(32));
    const dekKey = await importDek(rawDek);
    const masterSalt = crypto.getRandomValues(new Uint8Array(16));
    const kekPw = await deriveKek(password, masterSalt, 600000);
    const wrappedPass = await wrapDek(rawDek, kekPw);
    const encryptedPayload = await encryptWithDek(decryptedVault, dekKey);

    const now = new Date().toISOString();
    const v3Envelope: VaultEnvelopeV3 = {
      version: 3,
      kdf: 'PBKDF2-SHA256',
      iterations: 600000,
      salt: uint8ArrayToBase64(masterSalt),
      wrappers: {
        password: {
          iv: wrappedPass.iv,
          wrappedDek: wrappedPass.wrappedDek,
        },
      },
      iv: encryptedPayload.iv,
      ciphertext: encryptedPayload.ciphertext,
      createdAt: legacy.createdAt || now,
      updatedAt: now,
      hint: legacy.hint,
    };

    await setStoredEnvelope(v3Envelope);

    activeKey = dekKey;
    activeRawDek = rawDek;
    activeVaultData = decryptedVault;
    currentEnvelope = v3Envelope;

    return decryptedVault;
  }
}

/**
 * Destroy vault from IndexedDB and lock
 */
export async function destroy(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(SINGLETON_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  lock();
}

/**
 * Get envelope hint if present
 */
export async function getHint(): Promise<string | undefined> {
  const envelope = await getStoredEnvelope();
  return envelope?.hint;
}

/**
 * Get active non-extractable raw DEK from memory (returns null if locked)
 */
export function getActiveRawDek(): Uint8Array | null {
  return activeRawDek;
}

/**
 * Check if the stored envelope has a passkey wrapper
 */
export async function hasPasskeyWrapper(): Promise<boolean> {
  const envelope = await getStoredEnvelope();
  return Boolean(
    envelope &&
      'version' in envelope &&
      envelope.version === 3 &&
      envelope.wrappers?.passkey?.credentialId
  );
}

/**
 * Store a new passkey wrapper in the current envelope
 */
export async function enrollPasskeyWrapper(passkeyWrapper: VaultWrapperPasskey): Promise<void> {
  const envelope = currentEnvelope || (await getStoredEnvelope());
  if (!envelope || envelope.version !== 3) {
    throw new Error('Vault envelope must be Version 3 to enable passkey.');
  }

  const v3 = envelope as VaultEnvelopeV3;
  v3.wrappers.passkey = passkeyWrapper;
  v3.updatedAt = new Date().toISOString();

  await setStoredEnvelope(v3);
  currentEnvelope = v3;

  if (activeVaultData && activeKey) {
    await mutate((data) => {
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'security',
          details: 'Passkey unlock enabled.',
        },
        ...(data.activityLogs || []),
      ];
    });
  }
}

/**
 * Remove passkey wrapper from the current envelope
 */
export async function removePasskeyWrapper(): Promise<void> {
  const envelope = currentEnvelope || (await getStoredEnvelope());
  if (!envelope || envelope.version !== 3) {
    throw new Error('No Version 3 vault envelope found.');
  }

  const v3 = envelope as VaultEnvelopeV3;
  delete v3.wrappers.passkey;
  v3.updatedAt = new Date().toISOString();

  await setStoredEnvelope(v3);
  currentEnvelope = v3;

  if (activeVaultData && activeKey) {
    await mutate((data) => {
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'security',
          details: 'Passkey unlock disabled.',
        },
        ...(data.activityLogs || []),
      ];
    });
  }
}

/**
 * Unlock vault using passkey PRF output
 */
export async function unlockWithPasskeyPrf(prfOutput: Uint8Array): Promise<VaultData> {
  const envelope = await getStoredEnvelope();
  if (!envelope || !('version' in envelope) || envelope.version !== 3) {
    throw new Error('No Version 3 vault found in local storage.');
  }

  const v3 = envelope as VaultEnvelopeV3;
  if (!v3.wrappers.passkey) {
    throw new Error('Passkey unlock is not configured for this vault.');
  }

  const masterSalt = base64ToUint8Array(v3.salt);
  const kekPk = await deriveKekFromPrf(prfOutput, masterSalt);

  let rawDek: Uint8Array;
  try {
    rawDek = await unwrapDek(v3.wrappers.passkey, kekPk);
  } catch {
    throw new WrongPasswordError("That passkey doesn't match this vault.");
  }

  const dekKey = await importDek(rawDek);

  const vaultData = await decryptWithDek(
    { iv: v3.iv, ciphertext: v3.ciphertext },
    dekKey
  );

  if (!vaultData || typeof vaultData !== 'object' || !Array.isArray(vaultData.items)) {
    rawDek.fill(0);
    throw new WrongPasswordError('Corrupted vault structure or invalid authentication tag.');
  }

  const updatedVault: VaultData = {
    ...vaultData,
    activityLogs: [
      {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        action: 'unlock',
        details: 'Unlocked via Passkey',
      },
      ...(vaultData.activityLogs || []),
    ],
  };

  const newEncrypted = await encryptWithDek(updatedVault, dekKey);
  v3.iv = newEncrypted.iv;
  v3.ciphertext = newEncrypted.ciphertext;
  v3.updatedAt = new Date().toISOString();
  await setStoredEnvelope(v3);

  activeKey = dekKey;
  activeRawDek = rawDek;
  activeVaultData = updatedVault;
  currentEnvelope = v3;

  return updatedVault;
}

