import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { MockBeeServer } from '../../src/dev-mock/mock-bee.js';
import { SwarmDeadDropClient } from '../../src/swarm/client.js';

test('local mock rejects malicious writes and bounds resource use', async (t) => {
  const server = new MockBeeServer(1638);
  await server.start();
  const base = 'http://127.0.0.1:1638';
  try {
    await t.test('browser-origin writes are forbidden', async () => {
      assert.equal(
        (
          await fetch(base + '/stamps/60/17', {
            method: 'POST',
            headers: { Origin: 'https://attacker.invalid' },
          })
        ).status,
        403,
      );
    });
    await t.test('invalid numeric and depth inputs are rejected', async () => {
      for (const path of [
        '/stamps/NaN/17',
        '/stamps/999999/17',
        '/stamps/60/17x',
        '/stamps/60/100',
      ])
        assert.equal((await fetch(base + path, { method: 'POST' })).status, 400);
    });
    const response = await fetch(base + '/stamps/60/17', { method: 'POST' });
    const { batchID } = (await response.json()) as { batchID: string };
    await t.test(
      'wrong body types fail without crashing and large bodies are limited',
      async () => {
        const empty = await fetch(base + '/bytes', {
          method: 'POST',
          headers: { 'swarm-postage-batch-id': batchID },
        });
        assert.equal(empty.status, 400);
        const large = await fetch(base + '/bytes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'swarm-postage-batch-id': batchID,
          },
          body: Buffer.alloc(5 * 1024 * 1024 + 1),
        });
        assert.equal(large.status, 413);
        assert.equal((await fetch(base + '/health')).status, 200);
      },
    );
    await t.test('download invalid references are rejected before requests', async () => {
      const client = new SwarmDeadDropClient(base);
      await assert.rejects(client.downloadDeadDrop('../health'), /Invalid reference/);
    });
    await t.test('a second batch cannot replace a document expiry boundary', async () => {
      const client = new SwarmDeadDropClient(base);
      const second = await client.createMockBatch(60, 17);
      const ciphertext = Buffer.from('unique boundary collision fixture');
      const first = await client.uploadEncryptedDeadDrop(batchID, ciphertext);
      const retry = await client.uploadEncryptedDeadDrop(batchID, ciphertext);
      assert.equal(retry.reference, first.reference);
      const conflict = await fetch(base + '/bytes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'swarm-postage-batch-id': second },
        body: ciphertext,
      });
      assert.equal(conflict.status, 409);
      server.expireBatchImmediately(second);
      assert.deepEqual(await client.downloadDeadDrop(first.reference), ciphertext);
    });
    await t.test('DNS-rebinding hosts and malformed labels are rejected', async () => {
      const status = await new Promise<number | undefined>((resolve, reject) => {
        const req = request(
          base + '/health',
          { headers: { Host: 'attacker.invalid' } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        );
        req.on('error', reject);
        req.end();
      });
      assert.equal(status, 403);
      for (const query of ['label=a&label=b', `label=${'x'.repeat(81)}`]) {
        assert.equal(
          (await fetch(base + '/stamps/60/17?' + query, { method: 'POST' })).status,
          400,
        );
      }
    });
    await t.test('compressed uploads are refused before inflation', async () => {
      const response = await fetch(base + '/bytes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'gzip',
          'swarm-postage-batch-id': batchID,
        },
        body: new Uint8Array([31, 139]),
      });
      assert.equal(response.status, 415);
      assert.equal((await fetch(base + '/health')).status, 200);
    });
    await t.test('expired data fails closed', async () => {
      const client = new SwarmDeadDropClient(base);
      const receipt = await client.uploadEncryptedDeadDrop(
        batchID,
        Buffer.from('synthetic ciphertext'),
      );
      assert.equal(
        (await client.downloadDeadDrop(receipt.reference)).toString(),
        'synthetic ciphertext',
      );
      server.expireBatchImmediately(batchID);
      await assert.rejects(client.downloadDeadDrop(receipt.reference), /404/);
    });
    await t.test(
      'batch allocation is bounded and health stays responsive at capacity',
      async () => {
        let exhausted = false;
        for (let n = 0; n < 65; n++)
          if ((await fetch(base + '/stamps/60/17', { method: 'POST' })).status === 503) {
            exhausted = true;
            break;
          }
        assert.equal(exhausted, true);
        assert.equal((await fetch(base + '/health')).status, 200);
      },
    );
  } finally {
    await server.stop();
  }
});
