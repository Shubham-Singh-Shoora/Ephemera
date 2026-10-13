import crypto from 'crypto';

/**
 * Encrypted payload structure for AES-256-GCM authenticated encryption.
 * - iv: 12 bytes (96 bits) initialization vector / nonce
 * - authTag: 16 bytes (128 bits) authentication tag for integrity verification
 * - ciphertext: The encrypted raw data
 */
export interface EncryptedPayload {
  algorithm: 'aes-256-gcm';
  iv: string;         // Hex encoded
  authTag: string;    // Hex encoded
  ciphertext: string; // Hex encoded
  timestamp: number;
}

/**
 * Encrypts an arbitrary Buffer or string using AES-256-GCM.
 * AES-256-GCM is an Authenticated Encryption with Associated Data (AEAD) cipher.
 * It guarantees both CONFIDENTIALITY (cannot be read without key) and INTEGRITY (cannot be tampered with).
 *
 * @param plaintext Data to encrypt (Buffer or UTF-8 string)
 * @param keyHex 32-byte (64 hex characters) encryption key
 * @returns Serialized EncryptedPayload
 */
export function encryptAES256GCM(plaintext: Buffer | string, keyHex: string): EncryptedPayload {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(`Invalid key length: expected 32 bytes (256 bits), got ${key.length} bytes`);
  }

  // 12-byte (96-bit) IV is the NIST-recommended size for GCM mode
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const inputBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf-8') : plaintext;

  const encryptedBuffer = Buffer.concat([
    cipher.update(inputBuffer),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encryptedBuffer.toString('hex'),
    timestamp: Date.now()
  };
}

/**
 * Decrypts an EncryptedPayload using AES-256-GCM.
 * Throws an error if the key is incorrect or if the ciphertext was tampered with.
 *
 * @param payload EncryptedPayload with iv, authTag, and ciphertext
 * @param keyHex 32-byte (64 hex characters) encryption key
 * @returns Decrypted Buffer
 */
export function decryptAES256GCM(payload: EncryptedPayload, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(`Invalid key length: expected 32 bytes (256 bits), got ${key.length} bytes`);
  }

  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const ciphertext = Buffer.from(payload.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    return decrypted;
  } catch (err: any) {
    throw new Error(`Decryption failed! Invalid key or corrupted/tampered data: ${err.message}`);
  }
}

/**
 * Serializes the encrypted payload into a compact JSON Buffer ready for Swarm upload.
 */
export function packEncryptedData(payload: EncryptedPayload): Buffer {
  return Buffer.from(JSON.stringify(payload), 'utf-8');
}

/**
 * Parses a Buffer downloaded from Swarm back into an EncryptedPayload.
 */
export function unpackEncryptedData(buffer: Buffer): EncryptedPayload {
  const str = buffer.toString('utf-8');
  const parsed = JSON.parse(str);
  if (!parsed.iv || !parsed.authTag || !parsed.ciphertext) {
    throw new Error('Malformed encrypted payload format: missing iv, authTag, or ciphertext');
  }
  return parsed as EncryptedPayload;
}
