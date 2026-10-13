export const MAX_RESEARCH_BYTES = 2 * 1024 * 1024;
export const MAX_STRUCTURE_DEPTH = 32;
export const MAX_STRUCTURE_NODES = 8192;
export const MAX_INDEX_CHUNKS = 2048;
export const MAX_PASSAGE_CHARS = 4096;

/** Inspect JSON-like input without recursion, getters, or implicit serialization. */
export function validateIndexInput(data: unknown): void {
  const pending = [{ value: data, depth: 0 }];
  const seen = new WeakSet<object>();
  let nodes = 0;
  let bytes = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++nodes > MAX_STRUCTURE_NODES || depth > MAX_STRUCTURE_DEPTH)
      throw new Error('Document structure exceeds the indexing limit.');
    if (typeof value === 'string') bytes += Buffer.byteLength(value, 'utf8');
    else if (value !== null && typeof value === 'object') {
      if (seen.has(value)) throw new Error('Cyclic or shared objects cannot be indexed.');
      seen.add(value);
      if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
        throw new Error('Only plain JSON objects can be indexed.');
      const keys = Object.keys(value);
      if (keys.length + nodes + pending.length > MAX_STRUCTURE_NODES)
        throw new Error('Document structure exceeds the indexing limit.');
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!('value' in descriptor)) throw new Error('Document accessors are not supported.');
        bytes += Buffer.byteLength(key, 'utf8');
        pending.push({ value: descriptor.value, depth: depth + 1 });
      }
    } else if (
      value !== null &&
      typeof value !== 'boolean' &&
      !(typeof value === 'number' && Number.isFinite(value))
    ) {
      throw new Error('Unsupported document value.');
    }
    if (bytes > MAX_RESEARCH_BYTES) throw new Error('Document exceeds the 2 MB research limit.');
  }
}
