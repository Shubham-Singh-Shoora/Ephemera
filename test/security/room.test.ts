import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RoomSession,
  MAX_DOCUMENT_BYTES,
  type RoomDuration,
} from '../../frontend/src/features/room/room-session.js';
import { POST as upload } from '../../frontend/src/app/api/upload/route.js';
import { POST as analyze } from '../../frontend/src/app/api/analyze/route.js';
import { POST as expire } from '../../frontend/src/app/api/expire/route.js';

const encode = (text: string) => new TextEncoder().encode(text);
const sample = () => encode('Launch is planned for December.\n\nMaya owns the project.');

test('real encryption round-trip retrieves evidence and does not expose key or plaintext', async () => {
  const room = new RoomSession();
  try {
    const input = sample();
    const info = await room.open(input, 'test.txt', 5);
    assert.equal(info.bytes, input.byteLength);
    assert.equal(JSON.stringify(room), '{}');
    assert.equal('key' in info, false);
    input.fill(0);
    assert.equal((await room.search('December'))[0].passage, 'Launch is planned for December.');
    assert.deepEqual(await room.search('unicorn'), []);
    assert.deepEqual(await room.search('plan'), []); // no substring matches
  } finally {
    room.close();
  }
});

test('room metadata is a copy, so caller cannot extend expiry', async () => {
  const room = new RoomSession();
  try {
    const info = await room.open(sample(), 'a.txt', 5);
    const deadline = info.expiresAt;
    info.expiresAt = Infinity;
    assert.equal(room.info?.expiresAt, deadline);
  } finally {
    room.close();
  }
});

for (const ttl of [NaN, Infinity, -1, 0, 1, 5.1, 10000, '15'])
  test(`rejects invalid duration ${String(ttl)} without creating a room`, async () => {
    const room = new RoomSession();
    await assert.rejects(room.open(sample(), 'a.txt', ttl as RoomDuration), /valid room duration/);
    assert.equal(room.info, null);
  });

test('rejects empty, oversized, binary, malformed UTF-8 and whitespace-only documents', async () => {
  const room = new RoomSession();
  for (const input of [
    new Uint8Array(),
    new Uint8Array(MAX_DOCUMENT_BYTES + 1),
    new Uint8Array([0]),
    new Uint8Array([255]),
    encode('   \n'),
  ])
    await assert.rejects(room.open(input, 'a.txt', 5));
  assert.equal(room.info, null);
});

test('Unicode works and script-like text is returned only as data', async () => {
  const room = new RoomSession();
  try {
    await room.open(encode('माया café launch <script>alert(1)</script>'), 'test.txt', 5);
    assert.equal((await room.search('café'))[0].matchedWords, 1);
    assert.match((await room.search('script'))[0].passage, /<script>/);
    await assert.rejects(room.search('a'.repeat(201)), /200/);
    await assert.rejects(room.search(' '));
    await assert.rejects(room.search('!!!'));
  } finally {
    room.close();
  }
});

test('close is idempotent and refuses all later reads', async () => {
  let calls = 0;
  const room = new RoomSession(() => calls++);
  await room.open(sample(), 'a.txt', 5);
  room.close();
  room.close();
  assert.equal(calls, 1);
  assert.equal(room.info, null);
  await assert.rejects(room.search('launch'), /closed/);
});

test('close during encryption cannot resurrect a room', async () => {
  const room = new RoomSession();
  const pending = room.open(sample(), 'a.txt', 5);
  room.close();
  await assert.rejects(pending, /cancelled/);
  assert.equal(room.status, 'closed');
  assert.equal(room.info, null);
});

test('close during decryption cannot return an answer', async () => {
  const room = new RoomSession();
  await room.open(sample(), 'a.txt', 5);
  const pending = room.search('launch');
  room.close();
  await assert.rejects(pending, /closed/);
});

test('concurrent opens and silent replacement are rejected', async () => {
  const room = new RoomSession();
  const opening = room.open(sample(), 'a.txt', 5);
  await assert.rejects(room.open(sample(), 'b.txt', 5), /Close/);
  await opening;
  try {
    await assert.rejects(room.open(sample(), 'b.txt', 5), /Close/);
  } finally {
    room.close();
  }
});

test('expiry at the exact deadline denies reads even if timers were suspended', async (t) => {
  const room = new RoomSession();
  const info = await room.open(sample(), 'a.txt', 5);
  t.mock.method(Date, 'now', () => info.expiresAt);
  await assert.rejects(room.search('launch'), /closed/);
  assert.equal(room.info, null);
  assert.equal(room.status, 'closed');
});

test('rolling wall clock backwards cannot extend monotonic expiry', async (t) => {
  const room = new RoomSession();
  await room.open(sample(), 'a.txt', 5);
  const monotonic = performance.now();
  t.mock.method(Date, 'now', () => 0);
  t.mock.method(performance, 'now', () => monotonic + 300_001);
  await assert.rejects(room.search('launch'), /closed/);
});

test('one room cannot see another room and reopening does not retain results', async () => {
  const a = new RoomSession();
  const b = new RoomSession();
  try {
    await a.open(encode('alpha document'), 'a.txt', 5);
    await b.open(encode('bravo document'), 'b.txt', 5);
    assert.deepEqual(await a.search('bravo'), []);
    a.close();
    assert.equal((await b.search('bravo')).length, 1);
    await a.open(encode('charlie document'), 'c.txt', 5);
    assert.deepEqual(await a.search('alpha'), []);
  } finally {
    a.close();
    b.close();
  }
});

for (const [name, handler] of Object.entries({ upload, analyze, expire }))
  test(`retired ${name} endpoint refuses work without reading attacker body`, async () => {
    let read = false;
    const request = {
      json() {
        read = true;
        throw new Error('must never read');
      },
    };
    const response = await (handler as (...args: unknown[]) => Response)(request);
    assert.equal(response.status, 410);
    assert.equal(read, false);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal((await response.json()).code, 'BROWSER_ONLY');
  });
