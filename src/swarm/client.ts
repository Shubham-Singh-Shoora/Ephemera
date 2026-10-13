import { Bee } from '@ethersphere/bee-js';
import { SWARM_CHUNK_SIZE_BYTES, formatTTL } from './postage.js';
const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024 + 1024;
export class SwarmDeadDropClient {
  private bee: Bee;
  public nodeUrl: string;
  constructor(nodeUrl: string = process.env.BEE_URL || 'http://localhost:1633') {
    const url = new URL(nodeUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error('Invalid Bee URL.');
    this.nodeUrl = nodeUrl.replace(/\/$/, '');
    this.bee = new Bee(this.nodeUrl, { timeout: 10_000 });
  }
  async checkHealth(): Promise<{ isConnected: boolean; version?: string }> {
    try {
      const health = await this.bee.status.getHealth();
      return { isConnected: health.status === 'ok', version: health.version };
    } catch {
      return { isConnected: false };
    }
  }
  async getPostageBatches() {
    return (await this.bee.stamp.getAll()).map((b) => ({
      batchId: b.batchID.toHex(),
      depth: b.depth,
      bucketDepth: b.bucketDepth,
      utilization: b.utilization,
      usable: b.usable,
      ttl: b.duration.toSeconds(),
      ttlFormatted: formatTTL(b.duration.toSeconds()),
      label: b.label,
    }));
  }
  async createPostageBatch(amount = '500000000', depth = 17, label = 'Ephemeral Batch') {
    return (await this.bee.stamp.create(amount, depth, { label, waitForUsable: false })).toHex();
  }
  async createMockBatch(ttlSeconds: number, depth: number): Promise<string> {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(this.nodeUrl).hostname))
      throw new Error('Mock batches are loopback-only.');
    if (
      !Number.isSafeInteger(ttlSeconds) ||
      ttlSeconds < 1 ||
      ttlSeconds > 86400 ||
      !Number.isSafeInteger(depth) ||
      depth < 17 ||
      depth > 32
    )
      throw new Error('Invalid mock batch.');
    const response = await fetch(`${this.nodeUrl}/stamps/${ttlSeconds}/${depth}`, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`Mock batch creation failed (${response.status}).`);
    const result = (await response.json()) as { batchID?: unknown };
    if (typeof result.batchID !== 'string' || !/^[a-f0-9]{64}$/.test(result.batchID))
      throw new Error('Invalid mock batch response.');
    return result.batchID;
  }
  async uploadEncryptedDeadDrop(batchId: string, encryptedData: Buffer) {
    if (encryptedData.length > MAX_DOWNLOAD_BYTES) throw new Error('Envelope too large.');
    const result = await this.bee.data.upload(batchId, encryptedData);
    return {
      reference: result.reference.toHex(),
      chunkCount: Math.ceil(encryptedData.length / SWARM_CHUNK_SIZE_BYTES),
      sizeBytes: encryptedData.length,
    };
  }
  async downloadDeadDrop(reference: string): Promise<Buffer> {
    if (!/^[a-fA-F0-9]{64}$/.test(reference)) throw new Error('Invalid reference.');
    const response = await fetch(`${this.nodeUrl}/bytes/${reference}`, {
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error(
        `Dead-drop unavailable (${response.status}). This does not prove global deletion.`,
      );
    if (!response.body) throw new Error('Empty download.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_DOWNLOAD_BYTES) {
          value.fill(0);
          throw new Error('Envelope too large.');
        }
        chunks.push(value);
      }
      return Buffer.concat(chunks);
    } finally {
      try {
        await reader.cancel();
      } finally {
        chunks.forEach((chunk) => chunk.fill(0));
        reader.releaseLock();
      }
    }
  }
}
