import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  encryptAES256GCM,
  decryptAES256GCM,
  packEncryptedData,
  unpackEncryptedData,
} from '../../src/crypto/aes.js';
import { ChainlinkSecretsManager } from '../../src/chainlink/secrets.js';
import { MemoryScrubber } from '../../src/ai/memory-scrubber.js';
import { calculateBatchCapacity, getRecommendedDepthForSize } from '../../src/swarm/postage.js';
import { deriveKeyFromSignature } from '../../src/crypto/keygen.js';
const key = 'ab'.repeat(32);

test('rejects malformed/truncated keys that Buffer.from silently accepts', () => {
  for (const value of [key + 'zz', key + 'a', 'ab'.repeat(31), 'xx'.repeat(32), ''])
    assert.throws(() => encryptAES256GCM('secret', value));
  assert.throws(() => deriveKeyFromSignature('0xzz'));
});
test('accepts empty authenticated payloads and uses fresh nonces', () => {
  const a = encryptAES256GCM('', key);
  const b = encryptAES256GCM('', key);
  assert.notEqual(a.iv, b.iv);
  assert.equal(decryptAES256GCM(unpackEncryptedData(packEncryptedData(a)), key).length, 0);
});
test('rejects short GCM tags, malformed IV, wrong algorithms, extra hex and large envelopes', () => {
  const payload = encryptAES256GCM('secret', key);
  for (const patch of [
    { authTag: payload.authTag.slice(0, 8) },
    { iv: '00' },
    { algorithm: 'aes-256-cbc' },
    { ciphertext: payload.ciphertext + 'zz' },
    { timestamp: null },
  ]) {
    assert.throws(() => decryptAES256GCM({ ...payload, ...patch } as typeof payload, key));
    assert.throws(() => unpackEncryptedData(Buffer.from(JSON.stringify({ ...payload, ...patch }))));
  }
  assert.throws(() => unpackEncryptedData(Buffer.alloc(5 * 1024 * 1024)));
});
test('all authenticated components reject modifications and wrong keys', () => {
  const payload = encryptAES256GCM('private data', key);
  for (const field of ['iv', 'authTag', 'ciphertext'] as const) {
    const tampered = Buffer.from(payload[field], 'hex');
    tampered[0] ^= 1;
    assert.throws(
      () => decryptAES256GCM({ ...payload, [field]: tampered.toString('hex') }, key),
      /Decryption failed/,
    );
  }
  assert.throws(() => decryptAES256GCM(payload, 'cd'.repeat(32)));
});
test('simulator wrapping is randomized, authenticated and labeled as local', () => {
  const a = ChainlinkSecretsManager.encryptSecretForDON(key);
  const b = ChainlinkSecretsManager.encryptSecretForDON(key);
  assert.equal(a.algorithm, 'local-simulation-aes-gcm');
  assert.notEqual(a.encryptedKeyHex, b.encryptedKeyHex);
  assert.equal(ChainlinkSecretsManager.decryptSecretInsideTEE(a), key);
  a.payload.authTag = '00'.repeat(16);
  assert.throws(() => ChainlinkSecretsManager.decryptSecretInsideTEE(a));
});
test('buffer wiping still zeroes Uint8Array when random source fails', (t) => {
  t.mock.method(crypto, 'randomFillSync', () => {
    throw new Error('unavailable');
  });
  const bytes = new Uint8Array([1, 2, 3]);
  MemoryScrubber.scrubBuffer(bytes);
  assert.deepEqual([...bytes], [0, 0, 0]);
});
test('scrubbing a cyclic object terminates and wipes nested buffers', () => {
  const bytes = Buffer.from('secret');
  const object: Record<string, unknown> = { bytes };
  object.self = object;
  MemoryScrubber.scrubObject(object);
  assert.equal(
    bytes.every((n) => n === 0),
    true,
  );
  assert.equal(object.self, null);
});
test('invalid batch arithmetic cannot become unbounded or silently produce NaN', () => {
  for (const n of [NaN, Infinity, 16.5, -1, 33]) assert.throws(() => calculateBatchCapacity(n));
  for (const n of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER])
    assert.throws(() => getRecommendedDepthForSize(n));
});
