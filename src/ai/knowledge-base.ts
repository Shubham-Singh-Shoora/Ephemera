import {
  MAX_INDEX_CHUNKS,
  MAX_PASSAGE_CHARS,
  MAX_RESEARCH_BYTES,
  validateIndexInput,
} from './input-limits.js';

export interface KnowledgeChunk {
  id: string;
  sourceType: string;
  section: string;
  content: string;
  vector: number[];
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  similarity: number;
}

/**
 * Bounded local token-hash index shared across research fixtures.
 * Similarity is lexical, not model inference or a domain-specific conclusion.
 */
export class InMemoryKnowledgeBase {
  private chunks: KnowledgeChunk[] = [];
  private indexedBytes = 0;
  private isDisposed: boolean = false;

  /**
   * Ingests arbitrary text or structured JSON into the in-memory vector index.
   */
  public ingest(data: unknown, sourceType: string = 'generic'): void {
    if (this.isDisposed) {
      throw new Error('KnowledgeBase has been disposed/scrubbed!');
    }

    validateIndexInput(data);
    if (typeof sourceType !== 'string' || sourceType.length > 64)
      throw new Error('Invalid source label.');
    const start = this.chunks.length;
    const previousBytes = this.indexedBytes;
    try {
      if (typeof data === 'string') this.ingestText(data, sourceType);
      else if (typeof data === 'object' && data !== null)
        this.ingestStructuredObject(data, sourceType);
    } catch (error) {
      for (const chunk of this.chunks.splice(start)) {
        chunk.vector.fill(0);
        chunk.content = '';
        chunk.section = '';
      }
      this.indexedBytes = previousBytes;
      throw error;
    }
  }

  private ingestText(text: string, sourceType: string): void {
    // Split markdown or text into paragraphs / sections
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    paragraphs.forEach((p, index) => {
      let sectionName = `Section-${index + 1}`;
      if (p.startsWith('#')) {
        const lines = p.split('\n');
        sectionName = lines[0].replace(/^[#\s]+/, '').slice(0, 40);
      }

      this.addChunk({
        id: `chunk-${this.chunks.length + 1}`,
        sourceType,
        section: sectionName,
        content: p,
      });
    });
  }

  private ingestStructuredObject(obj: object, sourceType: string, prefix: string = ''): void {
    // Flatten nested JSON into semantic passages
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = (prefix ? `${prefix}.${key.slice(0, 80)}` : key).slice(0, 160);

      if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            const summary = Object.entries(item)
              .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join(' | ');
            this.addChunk({
              id: `chunk-${this.chunks.length + 1}`,
              sourceType,
              section: `${currentPath}[${idx}]`,
              content: `[${currentPath} #${idx + 1}] ${summary}`,
            });
          } else {
            this.addChunk({
              id: `chunk-${this.chunks.length + 1}`,
              sourceType,
              section: currentPath,
              content: `${currentPath}[${idx}]: ${item}`,
            });
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        this.ingestStructuredObject(value, sourceType, currentPath);
      } else {
        this.addChunk({
          id: `chunk-${this.chunks.length + 1}`,
          sourceType,
          section: currentPath,
          content: `${currentPath}: ${value}`,
        });
      }
    }
  }

  private addChunk(chunkData: Omit<KnowledgeChunk, 'vector'>): void {
    for (let offset = 0; offset < chunkData.content.length;) {
      let end = Math.min(offset + MAX_PASSAGE_CHARS, chunkData.content.length);
      if (end < chunkData.content.length && /[\uD800-\uDBFF]/.test(chunkData.content[end - 1]))
        end--;
      const content = chunkData.content.slice(offset, end);
      const bytes = Buffer.byteLength(content, 'utf8');
      if (this.chunks.length >= MAX_INDEX_CHUNKS || this.indexedBytes + bytes > MAX_RESEARCH_BYTES)
        throw new Error('Document exceeds the index resource limit.');
      this.chunks.push({
        ...chunkData,
        id: `chunk-${this.chunks.length + 1}`,
        content,
        vector: this.embedText(content),
      });
      this.indexedBytes += bytes;
      offset = end;
    }
  }

  /**
   * Generates a normalized semantic vector embedding for a piece of text.
   * Uses subword & token feature hashing into a dense vector space.
   */
  private embedText(text: string, dimensions: number = 64): number[] {
    const vector = new Array(dimensions).fill(0);
    const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];

    for (const token of tokens) {
      if (token.length < 2) continue;

      // Hash token into dimensions
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % dimensions;
      vector[index] += 1;
    }

    // Normalize vector to unit length (L2 norm)
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  /**
   * Performs in-memory semantic cosine similarity search across all chunks.
   */
  public search(query: string, topK: number = 3): SearchResult[] {
    if (this.isDisposed) {
      throw new Error('KnowledgeBase has been disposed/scrubbed!');
    }
    if (
      typeof query !== 'string' ||
      !query.trim() ||
      query.length > 2000 ||
      !Number.isSafeInteger(topK) ||
      topK < 1 ||
      topK > 10
    )
      throw new Error('Invalid search request.');

    const queryVector = this.embedText(query);
    const scored = this.chunks.map((chunk) => {
      // Cosine similarity between unit vectors is the dot product
      let dotProduct = 0;
      for (let i = 0; i < queryVector.length; i++) {
        dotProduct += queryVector[i] * chunk.vector[i];
      }
      return {
        chunk,
        similarity: dotProduct,
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  public getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Best-effort disposal of owned vectors and references, not forensic erasure.
   */
  public dispose(): void {
    for (const chunk of this.chunks) {
      chunk.vector.fill(0);
      chunk.content = '';
      chunk.section = '';
    }
    this.chunks.length = 0;
    this.indexedBytes = 0;
    this.isDisposed = true;
  }
}
