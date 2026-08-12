import { VaultData, VaultWrapperPasskey } from '../types/vault';
import {
  base64ToUint8Array,
  uint8ArrayToBase64,
  deriveKekFromPrf,
  wrapDek,
  WrongPasswordError,
} from './crypto';
import * as store from './store';

/**
 * SECURITY NOTES FOR PASSKEY UNLOCK:
 * - Passkey unlock is exactly as strong as the device's biometric gate plus the fact
 *   that the wrapped DEK sits next to the ciphertext. Someone with the unlocked device
 *   can open the vault. This is the same model as native vaults; it is a convenience path,
 *   not an increase in security.
 * - userVerification is 'required' so a passkey alone, without biometrics or a device PIN,
 *   cannot unwrap anything.
 */

export const PASSKEY_SECURITY_NOTE =
  "Passkey unlock is exactly as strong as the device's biometric gate plus the fact that the wrapped DEK sits next to the ciphertext. Someone with the unlocked device can open the vault. This is the same model as native vaults; it is a convenience path, not an increase in security. userVerification is 'required' so a passkey alone, without biometrics or a device PIN, cannot unwrap anything.";

/**
 * Check if WebAuthn platform authenticator is supported by the browser.
 */
export async function isSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }

  try {
    const isUvpaa = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!isUvpaa) return false;

    if (
      'getClientCapabilities' in PublicKeyCredential &&
      typeof (PublicKeyCredential as any).getClientCapabilities === 'function'
    ) {
      const caps = await (PublicKeyCredential as any).getClientCapabilities();
      if (caps && caps.prf === false) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Perform assertion with WebAuthn PRF extension to get 32-byte PRF key evaluation.
 */
export async function getPasskeyPrfOutput(
  credentialIdBase64: string,
  prfSaltBytes: Uint8Array
): Promise<Uint8Array> {
  const hostname = window.location.hostname || 'localhost';
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credentialIdBytes = base64ToUint8Array(credentialIdBase64);

  let assertion: PublicKeyCredential | null = null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        rpId: hostname,
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: credentialIdBytes,
          },
        ],
        userVerification: 'required',
        timeout: 60000,
        extensions: {
          prf: {
            eval: {
              first: prfSaltBytes,
            },
          },
        } as any,
      },
    })) as PublicKeyCredential | null;
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Cancelled or timed out.');
    }
    throw err;
  }

  if (!assertion) {
    throw new Error('Passkey assertion returned null.');
  }

  const clientExtResults = assertion.getClientExtensionResults() as any;
  const prfResultFirst = clientExtResults?.prf?.results?.first;

  if (!prfResultFirst) {
    throw new Error("This browser didn't return a passkey key. Use your master password.");
  }

  return new Uint8Array(prfResultFirst);
}

/**
 * Enroll a new passkey with PRF extension for the currently unlocked vault.
 */
export async function enrollPasskey(displayName?: string): Promise<void> {
  const rawDek = store.getActiveRawDek();
  const envelope = await store.getRawEnvelope();

  if (!rawDek || !envelope) {
    throw new Error('Vault must be unlocked to enable passkey.');
  }

  if (envelope.version !== 3) {
    throw new Error('Vault envelope must be upgraded to Version 3 to enable passkey.');
  }

  // 1. Generate 32-byte prfSalt
  const prfSaltBytes = crypto.getRandomValues(new Uint8Array(32));
  const prfSaltBase64 = uint8ArrayToBase64(prfSaltBytes);

  // 2. Prepare credential creation parameters
  const hostname = window.location.hostname || 'localhost';
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  let credential: PublicKeyCredential | null = null;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        rp: { id: hostname, name: 'KeepEit' },
        user: {
          id: userId,
          name: displayName || 'KeepEit vault',
          displayName: displayName || 'KeepEit vault',
        },
        challenge,
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        extensions: { prf: {} } as any,
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Cancelled or timed out.');
    }
    throw new Error(err.message || 'Passkey creation failed on this device.');
  }

  if (!credential) {
    throw new Error('Passkey creation returned no credential.');
  }

  // 3. Check PRF capability enabled in extension result
  const clientExtResults = credential.getClientExtensionResults() as any;
  if (!clientExtResults?.prf?.enabled) {
    throw new Error("This device can't derive a key from a passkey");
  }

  const rawCredId = new Uint8Array(credential.rawId);
  const credentialIdBase64 = uint8ArrayToBase64(rawCredId);

  // 4. Run immediate assertion to get PRF output
  let prfOutput: Uint8Array;
  try {
    prfOutput = await getPasskeyPrfOutput(credentialIdBase64, prfSaltBytes);
  } catch (err: any) {
    throw new Error("This browser didn't return a passkey key. Use your master password.");
  }

  // 5. Derive KEK_pk and wrap in-memory DEK under KEK_pk
  const masterSaltBytes = base64ToUint8Array(envelope.salt);
  const kekPk = await deriveKekFromPrf(prfOutput, masterSaltBytes);
  const wrapped = await wrapDek(rawDek, kekPk);

  // Clean memory PRF output immediately
  prfOutput.fill(0);

  const wrapper: VaultWrapperPasskey = {
    iv: wrapped.iv,
    wrappedDek: wrapped.wrappedDek,
    credentialId: credentialIdBase64,
    prfSalt: prfSaltBase64,
  };

  await store.enrollPasskeyWrapper(wrapper);
}

/**
 * Unlock vault using passkey WebAuthn assertion
 */
export async function unlockPasskey(): Promise<VaultData> {
  const envelope = await store.getRawEnvelope();
  if (!envelope || !('version' in envelope) || envelope.version !== 3) {
    throw new Error('Passkey unlock is not configured for this vault.');
  }

  const passkeyWrapper = envelope.wrappers?.passkey;
  if (!passkeyWrapper) {
    throw new Error('Passkey unlock is not configured for this vault.');
  }

  const prfSaltBytes = base64ToUint8Array(passkeyWrapper.prfSalt);
  let prfOutput: Uint8Array;

  try {
    prfOutput = await getPasskeyPrfOutput(passkeyWrapper.credentialId, prfSaltBytes);
  } catch (err: any) {
    if (err.message === 'Cancelled or timed out.') {
      throw err;
    }
    if (err.message?.includes("didn't return a passkey key")) {
      throw err;
    }
    throw new Error(err.message || 'Passkey authentication failed.');
  }

  try {
    const vaultData = await store.unlockWithPasskeyPrf(prfOutput);
    prfOutput.fill(0);
    return vaultData;
  } catch (err: any) {
    prfOutput.fill(0);
    if (err instanceof WrongPasswordError || err.message?.includes("doesn't match")) {
      throw new Error("That passkey doesn't match this vault.");
    }
    throw err;
  }
}

/**
 * Check if the current envelope has a registered passkey wrapper
 */
export async function hasPasskey(): Promise<boolean> {
  return await store.hasPasskeyWrapper();
}

/**
 * Remove passkey wrapper from stored envelope
 */
export async function removePasskey(): Promise<void> {
  await store.removePasskeyWrapper();
}
