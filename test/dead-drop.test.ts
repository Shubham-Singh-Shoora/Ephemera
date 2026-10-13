import { MockBeeServer } from '../src/dev-mock/mock-bee.js';
import { ingestDeadDrop } from '../src/ingestion.js';
import { SwarmDeadDropClient } from '../src/swarm/client.js';
import { unpackEncryptedData, decryptAES256GCM } from '../src/crypto/aes.js';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function runDeadDropEndToEndTest() {
  console.log('===========================================================');
  console.log('🧪 RUNNING LOCAL ENCRYPTION AND MOCK EXPIRY TEST');
  console.log('===========================================================\n');

  const TEST_PORT = 1635;
  const mockBee = new MockBeeServer(TEST_PORT);
  await mockBee.start();

  try {
    const client = new SwarmDeadDropClient(`http://localhost:${TEST_PORT}`);

    // Step 1: Ingest sample confidential patient dataset
    console.log('\n--- PHASE 1.1: INGESTION & ENCRYPTED UPLOAD ---');
    const result = await ingestDeadDrop({
      filePath: './test-data/confidential_patient_record.json',
      ttlSeconds: 60, // 60 seconds TTL
      batchDepth: 17,
      beeUrl: `http://localhost:${TEST_PORT}`,
    });

    const { swarmReference, ephemeralKey, batchId } = result;

    // Step 2: Verify encrypted state on Swarm (Confidentiality check)
    console.log('\n--- PHASE 1.2: CONFIDENTIALITY VERIFICATION ---');
    console.log(`Downloading raw chunks from Swarm Reference: ${swarmReference}`);
    const rawDownloadedBytes = await client.downloadDeadDrop(swarmReference);
    const rawText = rawDownloadedBytes.toString('utf-8');

    // Ensure the raw downloaded bytes contain NO patient keywords
    const containsLeakedKeywords =
      rawText.includes('AIIMS') || rawText.includes('Carcinoma') || rawText.includes('TX-409');

    if (containsLeakedKeywords) {
      throw new Error(
        'SECURITY VIOLATION: Confidential patient data leaked in plaintext on Swarm!',
      );
    }
    console.log('✅ PASS: Local mock ciphertext excludes the fixture keywords.');

    // Step 3: Decrypt in-memory using the ephemeral key
    console.log('\n--- PHASE 1.3: IN-MEMORY DECRYPTION (TEE SIMULATION) ---');
    const unpacked = unpackEncryptedData(rawDownloadedBytes);
    const decryptedBuffer = decryptAES256GCM(unpacked, ephemeralKey);
    const fixture = await readFile('./test-data/confidential_patient_record.json');
    try {
      assert.deepEqual(decryptedBuffer, fixture);
    } finally {
      fixture.fill(0);
      decryptedBuffer.fill(0);
    }
    console.log('✅ PASS: Decrypted bytes exactly match the fictional fixture.');

    // Step 4: Simulate Swarm TTL Expiration (Self-Destruct)
    console.log('\n--- PHASE 1.4: SIMULATING BATCH TTL EXPIRATION (SELF-DESTRUCT) ---');
    console.log(`Expiring Postage Batch ${batchId.slice(0, 16)}...`);
    mockBee.expireBatchImmediately(batchId);

    console.log('Attempting to download chunks from Swarm after batch expiration...');
    let downloadFailedAsExpected = false;
    try {
      await client.downloadDeadDrop(swarmReference);
    } catch (err: any) {
      downloadFailedAsExpected = true;
      console.log(`✅ PASS: Download failed as expected with message: "${err.message}"`);
    }

    if (!downloadFailedAsExpected) {
      throw new Error('FAILURE: Data was still retrievable after batch TTL expired!');
    }

    console.log('\n===========================================================');
    console.log('🎉 LOCAL MOCK LIFECYCLE PASSED. No distributed deletion claim. ✅');
    console.log('===========================================================');
  } finally {
    await mockBee.stop();
  }
}

runDeadDropEndToEndTest().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
