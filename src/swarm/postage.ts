/**
 * Swarm Postage Batch & Capacity Calculations
 * 
 * Swarm stores all data in 4 KiB (4096 bytes) Binary Merkle Tree (BMT) chunks.
 * A postage stamp batch allocates 2^depth chunks on the network.
 */

export const SWARM_CHUNK_SIZE_BYTES = 4096; // 4 KiB

export interface BatchCapacityInfo {
  depth: number;
  totalChunks: number;
  nominalBytes: number;
  nominalMegabytes: number;
  nominalGigabytes: number;
  recommendedMaxBytes: number; // ~75% utilization to avoid bucket collisions
}

/**
 * Calculates storage capacity for a given Swarm postage batch depth.
 * 
 * @param depth Batch depth (typically 17 to 30)
 */
export function calculateBatchCapacity(depth: number): BatchCapacityInfo {
  if (depth < 16 || depth > 32) {
    throw new Error(`Batch depth must be between 16 and 32, got ${depth}`);
  }

  const totalChunks = Math.pow(2, depth);
  const nominalBytes = totalChunks * SWARM_CHUNK_SIZE_BYTES;
  const nominalMegabytes = nominalBytes / (1024 * 1024);
  const nominalGigabytes = nominalBytes / (1024 * 1024 * 1024);
  const recommendedMaxBytes = Math.floor(nominalBytes * 0.75);

  return {
    depth,
    totalChunks,
    nominalBytes,
    nominalMegabytes,
    nominalGigabytes,
    recommendedMaxBytes
  };
}

/**
 * Calculates the recommended minimum batch depth needed to store a dataset of given byte size.
 * 
 * @param dataSizeBytes Size of data in bytes
 * @returns Minimum depth (at least 17 as per Swarm protocol specifications)
 */
export function getRecommendedDepthForSize(dataSizeBytes: number): number {
  // Swarm minimum depth on network is 17 (approx 512MB)
  let depth = 17;
  while (calculateBatchCapacity(depth).recommendedMaxBytes < dataSizeBytes && depth < 32) {
    depth++;
  }
  return depth;
}

/**
 * Formats a TTL (Time-To-Live in seconds) into human-readable string.
 */
export function formatTTL(ttlSeconds: number): string {
  if (ttlSeconds <= 0) return 'EXPIRED (0s)';
  const hours = Math.floor(ttlSeconds / 3600);
  const minutes = Math.floor((ttlSeconds % 3600) / 60);
  const seconds = ttlSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}
