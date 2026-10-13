import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeConfidentialAISession } from '../../src/ai/runner.js';
import { DirectRAMStreamReader } from '../../src/ai/stream-reader.js';
import { InMemoryKnowledgeBase } from '../../src/ai/knowledge-base.js';
import { SwarmDeadDropClient } from '../../src/swarm/client.js';
import { MemoryScrubber } from '../../src/ai/memory-scrubber.js';
import { encryptAES256GCM, packEncryptedData } from '../../src/crypto/aes.js';

test('session and index are disposed when ingestion fails', async (t) => {
  let sessionDisposed = false,
    indexDisposed = false;
  t.mock.method(DirectRAMStreamReader.prototype, 'readAndDecrypt', async () => ({
    contentType: 'plaintext',
    rawText: 'synthetic secret',
    byteSize: 16,
    dispose: () => {
      sessionDisposed = true;
    },
  }));
  t.mock.method(InMemoryKnowledgeBase.prototype, 'ingest', () => {
    throw new Error('index failure');
  });
  t.mock.method(InMemoryKnowledgeBase.prototype, 'dispose', () => {
    indexDisposed = true;
  });
  await assert.rejects(
    executeConfidentialAISession({
      swarmReference: 'ab'.repeat(32),
      ephemeralKey: 'cd'.repeat(32),
    }),
    /index failure/,
  );
  assert.equal(sessionDisposed, true);
  assert.equal(indexDisposed, true);
});

test('invalid UTF-8 still wipes decrypted bytes and downloaded envelope', async (t) => {
  const key = 'ab'.repeat(32);
  const encrypted = packEncryptedData(encryptAES256GCM(Buffer.from([0xc3, 0x28]), key));
  const scrubbed: Uint8Array[] = [];
  const original = MemoryScrubber.scrubBuffer;
  t.mock.method(SwarmDeadDropClient.prototype, 'downloadDeadDrop', async () => encrypted);
  t.mock.method(MemoryScrubber, 'scrubBuffer', (buffer: Uint8Array | null) => {
    if (buffer) scrubbed.push(buffer);
    original(buffer);
  });
  await assert.rejects(
    new DirectRAMStreamReader().readAndDecrypt('ab'.repeat(32), key),
    /encoded data|UTF-8/i,
  );
  assert.ok(scrubbed.some((buffer) => buffer.length === 2));
  assert.ok(scrubbed.every((buffer) => buffer.every((byte) => byte === 0)));
  assert.ok(encrypted.every((byte) => byte === 0));
});

test('session references are cleared even if object cleanup fails', async (t) => {
  const key = 'ab'.repeat(32);
  t.mock.method(SwarmDeadDropClient.prototype, 'downloadDeadDrop', async () =>
    packEncryptedData(encryptAES256GCM('{"example":"synthetic"}', key)),
  );
  const session = await new DirectRAMStreamReader().readAndDecrypt('ab'.repeat(32), key);
  t.mock.method(MemoryScrubber, 'scrubObject', () => {
    throw new Error('injected cleanup failure');
  });
  assert.throws(() => session.dispose(), /injected cleanup failure/);
  assert.equal(session.rawText, '');
  assert.equal(session.parsedData, null);
  assert.equal(session.byteSize, 0);
  assert.equal(session.swarmReference, '');
});
