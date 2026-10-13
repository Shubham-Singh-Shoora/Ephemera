export interface DeadDropUploadResult {
  swarmReference: string; // 64-char hex Swarm reference hash
  batchId: string;        // 64-char hex postage batch ID
  ephemeralKey: string;   // 64-char hex AES-256 key
  chunkCount: number;     // Number of 4KB chunks generated
  payloadSize: number;    // Raw payload byte size
  ttlSeconds: number;     // Remaining time-to-live
  createdAt: number;      // Unix timestamp (ms)
}

export interface DeadDropMetadata {
  swarmReference: string;
  batchId: string;
  ttlRemainingSeconds: number;
  isExpired: boolean;
}
