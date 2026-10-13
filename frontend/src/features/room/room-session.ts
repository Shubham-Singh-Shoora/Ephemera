/** Browser-only room. No transport, persistence, analytics, or extractable key. */
export const MAX_DOCUMENT_BYTES = 256 * 1024;
export const ROOM_DURATIONS = [5, 15, 60] as const;
export type RoomDuration = (typeof ROOM_DURATIONS)[number];
export type RoomStatus = 'empty' | 'opening' | 'active' | 'closed';
export interface RoomInfo {
  id: string;
  name: string;
  bytes: number;
  expiresAt: number;
}
export interface SearchMatch {
  passage: string;
  matchedWords: number;
}

export class RoomSession {
  #key: CryptoKey | null = null;
  #ciphertext: Uint8Array<ArrayBuffer> | null = null;
  #iv: Uint8Array<ArrayBuffer> | null = null;
  #info: RoomInfo | null = null;
  #status: RoomStatus = 'empty';
  #generation = 0;
  #deadline = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private readonly onClose: () => void = () => {}) {}
  get status(): RoomStatus {
    this.#checkExpiry();
    return this.#status;
  }
  get info(): RoomInfo | null {
    this.#checkExpiry();
    return this.#info ? { ...this.#info } : null;
  }

  async open(
    input: Uint8Array<ArrayBuffer>,
    name: string,
    minutes: RoomDuration,
  ): Promise<RoomInfo> {
    if (this.#status === 'active' || this.#status === 'opening')
      throw new Error('Close your current room first.');
    if (!input.byteLength || input.byteLength > MAX_DOCUMENT_BYTES)
      throw new Error('Choose a non-empty text file up to 256 KB.');
    if (!ROOM_DURATIONS.includes(minutes)) throw new Error('Choose a valid room duration.');
    if (typeof name !== 'string' || !name.trim() || name.length > 120)
      throw new Error('Use a file name between 1 and 120 characters.');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(input);
    if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
      throw new Error('Only readable UTF-8 text is supported.');
    if (!globalThis.crypto?.subtle)
      throw new Error('This room needs HTTPS or localhost and a browser with secure encryption.');
    const generation = ++this.#generation;
    this.#status = 'opening';
    const copy = new Uint8Array(input);
    try {
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, copy),
      );
      if (generation !== this.#generation) {
        ciphertext.fill(0);
        throw new Error('Room opening was cancelled.');
      }
      this.#key = key;
      this.#iv = iv;
      this.#ciphertext = ciphertext;
      this.#info = {
        id: crypto.randomUUID(),
        name,
        bytes: input.byteLength,
        expiresAt: Date.now() + minutes * 60_000,
      };
      this.#deadline = performance.now() + minutes * 60_000;
      this.#status = 'active';
      this.#timer = setTimeout(() => this.close(), minutes * 60_000);
      return { ...this.#info };
    } catch (error) {
      if (generation === this.#generation) this.close();
      throw error;
    } finally {
      copy.fill(0);
    }
  }

  async search(query: string): Promise<SearchMatch[]> {
    this.#checkExpiry();
    if (this.#status !== 'active' || !this.#key || !this.#iv || !this.#ciphertext)
      throw new Error('This room is closed. Open a new room to continue.');
    if (typeof query !== 'string' || !query.trim() || query.length > 200)
      throw new Error('Enter a search between 1 and 200 characters.');
    const generation = this.#generation;
    const plaintext = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.#iv }, this.#key, this.#ciphertext),
    );
    try {
      this.#checkExpiry();
      if (generation !== this.#generation || this.#status !== 'active')
        throw new Error('This room closed during the search.');
      const words = [...new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [])];
      if (!words.length) throw new Error('Search for a word or a number.');
      return new TextDecoder()
        .decode(plaintext)
        .split(/\n\s*\n|\r?\n/)
        .filter((p) => p.trim())
        .map((passage) => {
          const tokens = new Set<string>(
            passage.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [],
          );
          return {
            passage: passage.slice(0, 1800),
            matchedWords: words.filter((w) => tokens.has(w)).length,
          };
        })
        .filter((p) => p.matchedWords > 0)
        .sort((a, b) => b.matchedWords - a.matchedWords || b.passage.length - a.passage.length)
        .slice(0, 3);
    } finally {
      plaintext.fill(0);
    }
  }

  close(): void {
    const changed = this.#status === 'active' || this.#status === 'opening';
    ++this.#generation;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#ciphertext?.fill(0);
    this.#iv?.fill(0);
    this.#key = null;
    this.#ciphertext = null;
    this.#iv = null;
    this.#info = null;
    this.#status = 'closed';
    if (changed) this.onClose();
  }

  #checkExpiry(): void {
    if (
      this.#status === 'active' &&
      this.#info &&
      (Date.now() >= this.#info.expiresAt || performance.now() >= this.#deadline)
    )
      this.close();
  }
}
