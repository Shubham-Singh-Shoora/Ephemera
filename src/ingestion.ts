import fs from 'fs';
import path from 'path';
import { encryptAES256GCM, packEncryptedData } from './crypto/aes.js';
import { generateEphemeralKey } from './crypto/keygen.js';
import { SwarmDeadDropClient } from './swarm/client.js';
import { calculateBatchCapacity, formatTTL } from './swarm/postage.js';

interface IngestionOptions {
  filePath: string;
  ttlSeconds?: number;
  batchDepth?: number;
  beeUrl?: string;
}

/**
 * Executes a Dead-Drop Ingestion into Ethereum Swarm:
 * 1. Reads local confidential dataset
 * 2. Encrypts locally via AES-256-GCM
 * 3. Uploads to Swarm under a short-lived postage batch
 * 4. Returns the Dead-Drop Receipt
 */
export async function ingestDeadDrop(options: IngestionOptions) {
  const {
    filePath,
    ttlSeconds = 7200, // Default 2 hours
    batchDepth = 17,   // Default depth 17 (~512MB)
    beeUrl = process.env.BEE_URL || 'http://localhost:1633'
  } = options;

  console.log('\n======================================================');
  console.log('🔒 EPHEMERAL DEAD-DROP DATA INGESTION ENGINE');
  console.log('======================================================');

  // Step 1: Read confidential data
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const rawData = fs.readFileSync(absolutePath);
  console.log(`\n[Step 1] Loaded Confidential File: ${path.basename(absolutePath)}`);
  console.log(`         File Size: ${rawData.length} bytes`);

  // Step 2: Client-side Authenticated Encryption
  console.log('\n[Step 2] Generating Ephemeral Cryptographic Key...');
  const ephemeralKey = generateEphemeralKey();
  console.log(`         Generated Key (256-bit): ${ephemeralKey}`);

  console.log('         Encrypting dataset with AES-256-GCM...');
  const encryptedPayload = encryptAES256GCM(rawData, ephemeralKey);
  const packedUploadBuffer = packEncryptedData(encryptedPayload);
  console.log(`         Encrypted Ciphertext Size: ${packedUploadBuffer.length} bytes`);
  console.log(`         IV: ${encryptedPayload.iv}`);
  console.log(`         AuthTag: ${encryptedPayload.authTag}`);

  // Step 3: Swarm Postage Batch Selection
  console.log('\n[Step 3] Connecting to Ethereum Swarm Bee Node...');
  const client = new SwarmDeadDropClient(beeUrl);
  const health = await client.checkHealth();

  if (!health.isConnected) {
    console.error(`\n❌ Error: Cannot connect to Bee node at ${beeUrl}`);
    console.error(`   To run the local mock Bee node for development:`);
    console.error(`   Run in a separate terminal: npm run mock-bee\n`);
    throw new Error(`Bee node connection failed at ${beeUrl}`);
  }
  console.log(`         Connected to Bee Node! (Version: ${health.version})`);

  // Query batches or create an ephemeral batch
  console.log('         Checking available postage batches...');
  const existingBatches = await client.getPostageBatches();
  let selectedBatchId: string;
  let batchTtl: number = ttlSeconds;

  const validBatch = existingBatches.find(b => b.usable && b.ttl > 60);
  if (validBatch) {
    selectedBatchId = validBatch.batchId;
    batchTtl = validBatch.ttl;
    console.log(`         Found active batch: ${selectedBatchId.slice(0, 16)}...`);
    console.log(`         Batch TTL Remaining: ${formatTTL(batchTtl)}`);
  } else {
    console.log(`         Creating new short-duration postage batch (TTL: ${formatTTL(ttlSeconds)})...`);
    selectedBatchId = await client.createPostageBatch(ttlSeconds.toString(), batchDepth, 'Ephemeral Dead-Drop');
    console.log(`         Created Batch ID: ${selectedBatchId}`);
  }

  // Step 4: Upload Encrypted Chunks to Swarm
  console.log('\n[Step 4] Shredding and Uploading 4KB Chunks to Swarm...');
  const uploadResult = await client.uploadEncryptedDeadDrop(selectedBatchId, packedUploadBuffer);
  console.log(`         Chunks Uploaded: ${uploadResult.chunkCount} chunk(s) (4096 bytes/chunk)`);
  console.log(`         Swarm Reference Hash: ${uploadResult.reference}`);

  const capacity = calculateBatchCapacity(batchDepth);

  // Summary Receipt
  console.log('\n======================================================');
  console.log('📜 DEAD-DROP RECEIPT (HANDOFF TO TEE)');
  console.log('======================================================');
  console.log(`Swarm Reference (Hash):  ${uploadResult.reference}`);
  console.log(`Decryption Key (Hex):     ${ephemeralKey}`);
  console.log(`Postage Batch ID:         ${selectedBatchId}`);
  console.log(`Time-To-Live (TTL):       ${formatTTL(batchTtl)}`);
  console.log(`Total Merkle Chunks:      ${uploadResult.chunkCount}`);
  console.log(`Batch Capacity:           ${capacity.nominalMegabytes.toFixed(2)} MB (Depth ${batchDepth})`);
  console.log('======================================================');
  console.log('⚡ The source data is now stored ONLY as encrypted 4KB chunks on Swarm.');
  console.log('⚡ When the TTL expires, Swarm nodes will permanently drop all chunks.');
  console.log('======================================================\n');

  return {
    swarmReference: uploadResult.reference,
    ephemeralKey,
    batchId: selectedBatchId,
    ttlSeconds: batchTtl,
    chunkCount: uploadResult.chunkCount
  };
}

// Standalone runner for testing
if (process.argv[1] && process.argv[1].endsWith('ingestion.ts')) {
  const samplePath = './test-data/confidential_patient_record.json';
  ingestDeadDrop({ filePath: samplePath }).catch(err => {
    console.error('Ingestion aborted:', err.message);
  });
}
