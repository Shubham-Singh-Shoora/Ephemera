import { SwarmDeadDropClient } from '../swarm/client.js';
import { unpackEncryptedData, decryptAES256GCM } from '../crypto/aes.js';
import { MemoryScrubber } from './memory-scrubber.js';

export type DetectedContentType = 'json' | 'markdown' | 'code' | 'plaintext';

export interface DecryptedDeadDropSession {
  contentType: DetectedContentType;
  rawText: string;
  parsedData: any;
  byteSize: number;
  swarmReference: string;
  dispose: () => void;
}

export class DirectRAMStreamReader {
  private client: SwarmDeadDropClient;

  constructor(beeUrl: string = process.env.BEE_URL || 'http://localhost:1633') {
    this.client = new SwarmDeadDropClient(beeUrl);
  }

  /**
   * Fetches the encrypted dead-drop from Swarm directly into RAM,
   * decrypts it on the fly, and returns the session object.
   * 
   * NEVER writes anything to disk.
   * 
   * @param swarmReference 64-char Swarm hash
   * @param ephemeralKey 64-char hex AES-256 key
   */
  public async readAndDecrypt(swarmReference: string, ephemeralKey: string): Promise<DecryptedDeadDropSession> {
    // Step 1: Download raw encrypted bytes from Swarm into RAM Buffer
    let rawEncryptedBuffer: Buffer | null = await this.client.downloadDeadDrop(swarmReference);

    try {
      // Step 2: Unpack and decrypt in-memory
      const unpacked = unpackEncryptedData(rawEncryptedBuffer);
      let decryptedBuffer: Buffer | null = decryptAES256GCM(unpacked, ephemeralKey);

      const rawText = decryptedBuffer.toString('utf-8');
      const byteSize = decryptedBuffer.length;

      // Detect format
      let contentType: DetectedContentType = 'plaintext';
      let parsedData: any = null;

      try {
        parsedData = JSON.parse(rawText);
        contentType = 'json';
      } catch {
        if (rawText.includes('# ') || rawText.includes('## ') || rawText.includes('**')) {
          contentType = 'markdown';
        } else if (rawText.includes('function ') || rawText.includes('contract ') || rawText.includes('import ')) {
          contentType = 'code';
        } else {
          contentType = 'plaintext';
        }
      }

      // Track buffer for disposal
      const bufferToScrub = decryptedBuffer;

      const session: DecryptedDeadDropSession = {
        contentType,
        rawText,
        parsedData,
        byteSize,
        swarmReference,
        dispose: () => {
          MemoryScrubber.scrubBuffer(bufferToScrub);
          decryptedBuffer = null;
          rawEncryptedBuffer = null;
        }
      };

      return session;
    } finally {
      // Immediately scrub the encrypted buffer once decrypted
      if (rawEncryptedBuffer) {
        MemoryScrubber.scrubBuffer(rawEncryptedBuffer);
        rawEncryptedBuffer = null;
      }
    }
  }
}
