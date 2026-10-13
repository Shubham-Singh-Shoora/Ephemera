import crypto from 'crypto';

/**
 * Forensic In-Memory Sanitization & RAM Scrubber
 * 
 * In a Trusted Execution Environment (TEE) or confidential data room,
 * sensitive patient, financial, or source code data must NEVER linger
 * in RAM after processing completes.
 * 
 * Standard garbage collection simply removes pointers; the actual memory
 * pages remain intact until overwritten. This module enforces proactive
 * DoD 5220.22-M-style cryptographic wiping of in-memory buffers.
 */

export class MemoryScrubber {
  /**
   * Overwrites a Buffer with random bytes, then completely zeroes it out.
   * 
   * @param buffer The Buffer containing plaintext or cryptographic keys
   */
  public static scrubBuffer(buffer: Buffer | Uint8Array | null | undefined): void {
    if (!buffer || buffer.length === 0) return;

    try {
      // Pass 1: Overwrite with cryptographic pseudo-random noise
      crypto.randomFillSync(buffer);

      // Pass 2: Overwrite with zeroes (0x00)
      if (Buffer.isBuffer(buffer)) {
        buffer.fill(0);
      } else {
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = 0;
        }
      }
    } catch (err) {
      // Fallback zero fill
      if (Buffer.isBuffer(buffer)) {
        buffer.fill(0);
      }
    }
  }

  /**
   * Deeply cleans an object by scrubbing any Buffers and clearing keys.
   */
  public static scrubObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) {
      MemoryScrubber.scrubBuffer(obj);
      return;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'object') {
          MemoryScrubber.scrubObject(obj[i]);
        }
        obj[i] = null;
      }
      obj.length = 0;
      return;
    }

    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        MemoryScrubber.scrubObject(obj[key]);
      }
      obj[key] = null;
    }
  }

  /**
   * Verifies that a buffer has been completely zeroed out.
   */
  public static isBufferZeroed(buffer: Buffer): boolean {
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] !== 0) return false;
    }
    return true;
  }
}
