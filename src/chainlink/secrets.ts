import crypto from 'node:crypto';
import { encryptAES256GCM, decryptAES256GCM, type EncryptedPayload } from '../crypto/aes.js';

/** Local simulator only. Not Chainlink threshold encryption or enclave attestation. */
export interface EncryptedSecretPayload {
  encryptedKeyHex: string;
  algorithm: 'local-simulation-aes-gcm';
  payload: EncryptedPayload;
  timestamp: number;
}
export class ChainlinkSecretsManager {
  // Random per process. The old public, hardcoded wrapping secret was recoverable by anyone.
  private static readonly wrappingKey = crypto.randomBytes(32).toString('hex');
  public static encryptSecretForDON(key: string): EncryptedSecretPayload {
    if (!/^[a-fA-F0-9]{64}$/.test(key)) throw new Error('Invalid ephemeral key.');
    const payload = encryptAES256GCM(key, this.wrappingKey);
    return {
      encryptedKeyHex: payload.ciphertext,
      algorithm: 'local-simulation-aes-gcm',
      payload,
      timestamp: Date.now(),
    };
  }
  public static decryptSecretInsideTEE(secret: EncryptedSecretPayload): string {
    if (
      secret.algorithm !== 'local-simulation-aes-gcm' ||
      secret.encryptedKeyHex !== secret.payload.ciphertext
    )
      throw new Error('Invalid simulator envelope.');
    const plaintext = decryptAES256GCM(secret.payload, this.wrappingKey);
    try {
      return plaintext.toString('utf8');
    } finally {
      plaintext.fill(0);
    }
  }
}
