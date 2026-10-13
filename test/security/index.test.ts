import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryKnowledgeBase } from '../../src/ai/knowledge-base.js';
import { MemoryScrubber } from '../../src/ai/memory-scrubber.js';

test('deep input fails predictably and leaves an existing index usable', () => {
  const index = new InMemoryKnowledgeBase();
  index.ingest('An ordinary synthetic document with a launch timeline.');
  const before = index.getChunkCount();
  let nested: unknown = 'synthetic';
  for (let i = 0; i < 10000; i++) nested = { child: nested };
  assert.throws(() => index.ingest(nested), /structure exceeds/);
  assert.equal(index.getChunkCount(), before);
  assert.match(index.search('launch')[0].chunk.content, /launch/);
  index.dispose();
});

test('cyclic objects and getters are rejected without executing user code', () => {
  const index = new InMemoryKnowledgeBase();
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(() => index.ingest(cyclic), /Cyclic/);
  let read = false;
  const accessor = Object.defineProperty({}, 'secret', {
    enumerable: true,
    get() {
      read = true;
      return 'hidden';
    },
  });
  assert.throws(() => index.ingest(accessor), /accessors/);
  assert.equal(read, false);
  assert.equal(index.getChunkCount(), 0);
});

test('chunk exhaustion rolls back partial ingestion and long passages stay bounded', () => {
  const index = new InMemoryKnowledgeBase();
  assert.throws(
    () => index.ingest(Array.from({ length: 2050 }, (_, i) => `Synthetic entry ${i}`)),
    /index.*limit/i,
  );
  assert.equal(index.getChunkCount(), 0);
  index.ingest('launch '.repeat(10000));
  const results = index.search('launch', 3);
  assert.equal(results.length, 3);
  assert.ok(results.every((result) => result.chunk.content.length <= 4096));
  for (const topK of [-1, 0, 11, Infinity])
    assert.throws(() => index.search('launch', topK), /search/);
  index.dispose();
});

test('deep cleanup reaches owned buffers without overflowing the call stack', () => {
  const secret = Buffer.from('synthetic secret');
  let nested: unknown = { secret };
  for (let i = 0; i < 20000; i++) nested = { child: nested };
  assert.doesNotThrow(() => MemoryScrubber.scrubObject(nested));
  assert.ok(secret.every((byte) => byte === 0));
  assert.deepEqual(nested, { child: null });
});
