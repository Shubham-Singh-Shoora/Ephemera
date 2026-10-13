import crypto from 'node:crypto';

export interface EncryptedPayload {
  algorithm: 'aes-256-gcm';
  iv: string;
  authTag: string;
  ciphertext: string;
  timestamp: number;
}
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
function hex(value: unknown, bytes?: number): value is string {
  return (
    typeof value === 'string' &&
    /^(?:[0-9a-fA-F]{2})*$/.test(value) &&
    (bytes === undefined || value.length === bytes * 2)
  );
}
function keyBytes(key: string): Buffer {
  if (!hex(key, 32)) throw new Error('Invalid key: expected exactly 32 bytes of hexadecimal.');
  return Buffer.from(key, 'hex');
}
function validate(payload: unknown): asserts payload is EncryptedPayload {
  if (!payload || typeof payload !== 'object') throw new Error('Malformed encrypted payload.');
  const p = payload as EncryptedPayload;
  if (
    p.algorithm !== 'aes-256-gcm' ||
    !hex(p.iv, 12) ||
    !hex(p.authTag, 16) ||
    !hex(p.ciphertext) ||
    p.ciphertext.length > MAX_PAYLOAD_BYTES * 2 ||
    !Number.isSafeInteger(p.timestamp) ||
    p.timestamp < 0
  )
    throw new Error('Malformed encrypted payload.');
}
export function encryptAES256GCM(plaintext: Buffer | string, keyHex: string): EncryptedPayload {
  const key = keyBytes(keyHex);
  const input = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  try {
    if (input.length > MAX_PAYLOAD_BYTES) throw new Error('Payload exceeds 2 MB limit.');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    return {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      ciphertext: encrypted.toString('hex'),
      timestamp: Date.now(),
    };
  } finally {
    key.fill(0);
    if (typeof plaintext === 'string') input.fill(0);
  }
}
export function decryptAES256GCM(payload: EncryptedPayload, keyHex: string): Buffer {
  validate(payload);
  const key = keyBytes(keyHex);
  let partial: Buffer | undefined;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'hex'), {
      authTagLength: 16,
    });
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
    partial = decipher.update(Buffer.from(payload.ciphertext, 'hex'));
    const final = decipher.final();
    try {
      return Buffer.concat([partial, final]);
    } finally {
      final.fill(0);
    }
  } catch {
    throw new Error('Decryption failed: invalid key or tampered data.');
  } finally {
    key.fill(0);
    partial?.fill(0);
  }
}
export function packEncryptedData(payload: EncryptedPayload): Buffer {
  validate(payload);
  return Buffer.from(JSON.stringify(payload), 'utf8');
}
export function unpackEncryptedData(buffer: Buffer): EncryptedPayload {
  if (buffer.length > MAX_PAYLOAD_BYTES * 2 + 1024)
    throw new Error('Encrypted envelope is too large.');
  const parsed: unknown = JSON.parse(buffer.toString('utf8'));
  validate(parsed);
  return parsed;
}
