import fs from 'node:fs';
import path from 'node:path';
import { encryptAES256GCM, packEncryptedData } from './crypto/aes.js';
import { generateEphemeralKey } from './crypto/keygen.js';
import { SwarmDeadDropClient } from './swarm/client.js';
import { calculateBatchCapacity } from './swarm/postage.js';
interface IngestionOptions {
  filePath: string;
  ttlSeconds?: number;
  batchDepth?: number;
  beeUrl?: string;
}
/** Local mock lifecycle. Live postage economics are not a deterministic deletion timer. */
export async function ingestDeadDrop({
  filePath,
  ttlSeconds = 7200,
  batchDepth = 17,
  beeUrl = process.env.BEE_URL || 'http://localhost:1633',
}: IngestionOptions) {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 86400)
    throw new Error('TTL must be 1 to 86400 seconds.');
  calculateBatchCapacity(batchDepth);
  const absolutePath = path.resolve(filePath);
  if (fs.statSync(absolutePath).size > 2 * 1024 * 1024)
    throw new Error('File exceeds the 2 MB research limit.');
  const rawData = fs.readFileSync(absolutePath);
  const ephemeralKey = generateEphemeralKey();
  let packed: Buffer | undefined;
  try {
    packed = packEncryptedData(encryptAES256GCM(rawData, ephemeralKey));
    rawData.fill(0);
    const client = new SwarmDeadDropClient(beeUrl);
    const health = await client.checkHealth();
    if (!health.isConnected) throw new Error('Bee node unavailable.');
    if (!health.version?.endsWith('-mock'))
      throw new Error(
        'Automatic TTL batch creation is supported only by the local mock. Live Swarm needs explicit postage funding and retention policy.',
      );
    // A fresh batch avoids extending another room or silently changing the requested duration.
    const batchId = await client.createMockBatch(ttlSeconds, batchDepth);
    const result = await client.uploadEncryptedDeadDrop(batchId, packed);
    return {
      swarmReference: result.reference,
      ephemeralKey,
      batchId,
      ttlSeconds,
      chunkCount: result.chunkCount,
    };
  } finally {
    rawData.fill(0);
    packed?.fill(0);
  }
}
if (process.argv[1]?.endsWith('ingestion.ts')) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run ingest -- <synthetic-file>');
    process.exitCode = 1;
  } else
    ingestDeadDrop({ filePath })
      .then(() => console.log('Local ingestion complete. Keys are never logged.'))
      .catch(() => {
        console.error('Local ingestion failed. Check your file and mock Bee server.');
        process.exitCode = 1;
      });
}
