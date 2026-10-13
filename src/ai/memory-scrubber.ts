import crypto from 'crypto';

/**
 * Best-effort cleanup of owned mutable buffers.
 * Does not erase managed strings, engine copies, swap or crash dumps, and
 * provides neither hardware attestation nor a forensic erasure guarantee.
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
      buffer.fill(0);
    }
  }

  /**
   * Deeply cleans an object by scrubbing any Buffers and clearing keys.
   */
  public static scrubObject(obj: unknown, seen = new WeakSet<object>()): void {
    const pending: unknown[] = [obj];
    while (pending.length) {
      const current = pending.pop();
      if (!current || typeof current !== 'object' || seen.has(current)) continue;
      seen.add(current);
      if (Buffer.isBuffer(current) || current instanceof Uint8Array) {
        MemoryScrubber.scrubBuffer(current);
        continue;
      }
      // Use data descriptors so cleanup never invokes a document getter or setter.
      for (const key of Object.keys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !('value' in descriptor)) continue;
        if (descriptor.value && typeof descriptor.value === 'object')
          pending.push(descriptor.value);
        if (descriptor.writable) Reflect.set(current, key, null);
      }
      if (Array.isArray(current) && Object.getOwnPropertyDescriptor(current, 'length')?.writable)
        current.length = 0;
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
