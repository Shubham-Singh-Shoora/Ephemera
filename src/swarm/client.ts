import { Bee, BatchId } from '@ethersphere/bee-js';
import { SWARM_CHUNK_SIZE_BYTES, formatTTL } from './postage.js';

export class SwarmDeadDropClient {
  private bee: Bee;
  public nodeUrl: string;

  constructor(nodeUrl: string = process.env.BEE_URL || 'http://localhost:1633') {
    this.nodeUrl = nodeUrl;
    this.bee = new Bee(nodeUrl);
  }

  /**
   * Checks if the connected Bee node is reachable and responsive
   */
  public async checkHealth(): Promise<{ isConnected: boolean; version?: string }> {
    try {
      const isConnected = await this.bee.isConnected();
      if (!isConnected) return { isConnected: false };
      const health = await this.bee.getHealth();
      return { isConnected: true, version: health.version };
    } catch (err: any) {
      console.error('[SwarmDeadDropClient] Health check error:', err?.message || err);
      return { isConnected: false };
    }
  }

  /**
   * Retrieves all available postage batches from the Bee node
   */
  public async getPostageBatches() {
    try {
      const batches = await this.bee.getAllPostageBatch();
      return batches.map(b => {
        const batchIdHex = typeof b.batchID === 'string' ? b.batchID : (b.batchID as any).toHex?.() || String(b.batchID);
        const ttlSec = (b as any).duration?.toSeconds ? (b as any).duration.toSeconds() : (b as any).ttl || 0;
        return {
          batchId: batchIdHex,
          depth: b.depth,
          bucketDepth: b.bucketDepth,
          utilization: b.utilization,
          usable: b.usable,
          ttl: ttlSec,
          ttlFormatted: formatTTL(ttlSec),
          label: b.label
        };
      });
    } catch (err: any) {
      throw new Error(`Failed to query postage stamp batches: ${err.message}`);
    }
  }

  /**
   * Creates a new postage stamp batch (e.g. for a short-lived dead-drop)
   * 
   * @param amount Token amount funding the batch (determines TTL)
   * @param depth Depth of batch (determines storage size, e.g. 17 = ~512MB)
   * @param label Human-readable description
   */
  public async createPostageBatch(amount: string = '500000000', depth: number = 17, label: string = 'Ephemeral Batch') {
    try {
      const batchId = await this.bee.createPostageBatch(amount as any, depth, {
        label,
        waitForUsable: false
      });
      return typeof batchId === 'string' ? batchId : (batchId as any).toHex?.() || String(batchId);
    } catch (err: any) {
      throw new Error(`Failed to create postage stamp batch: ${err.message}`);
    }
  }

  /**
   * Uploads an encrypted dead-drop payload buffer to Swarm
   * 
   * @param batchId 64-char hex postage batch ID
   * @param encryptedData Serialized ciphertext Buffer
   * @returns Swarm reference hash and chunk statistics
   */
  public async uploadEncryptedDeadDrop(batchId: string, encryptedData: Buffer): Promise<{
    reference: string;
    chunkCount: number;
    sizeBytes: number;
  }> {
    try {
      const chunkCount = Math.ceil(encryptedData.length / SWARM_CHUNK_SIZE_BYTES);

      // Upload raw binary data via bee.uploadData
      const uploadResult = await this.bee.uploadData(batchId as BatchId, encryptedData);
      const referenceHex = typeof uploadResult.reference === 'string' 
        ? uploadResult.reference 
        : (uploadResult.reference as any).toHex?.() || String(uploadResult.reference);

      return {
        reference: referenceHex,
        chunkCount,
        sizeBytes: encryptedData.length
      };
    } catch (err: any) {
      throw new Error(`Failed to upload dead-drop to Swarm: ${err.message}`);
    }
  }

  /**
   * Downloads raw encrypted dead-drop data from Swarm by its reference hash
   * 
   * @param reference 64-character Swarm reference hash
   * @returns Raw Buffer
   */
  public async downloadDeadDrop(reference: string): Promise<Buffer> {
    try {
      const data = await this.bee.downloadData(reference);
      const rawBytes = (data as any).bytes || (data as any).toUint8Array?.() || data;
      return Buffer.from(rawBytes);
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('404')) {
        throw new Error(`DEAD-DROP NOT FOUND (404): The data chunks have been purged or the postage batch has expired.`);
      }
      throw new Error(`Failed to download dead-drop from Swarm: ${err.message}`);
    }
  }
}
