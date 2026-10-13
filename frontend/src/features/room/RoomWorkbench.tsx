'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Clock3,
  FileText,
  LockKeyhole,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import {
  MAX_DOCUMENT_BYTES,
  RoomSession,
  type RoomDuration,
  type RoomInfo,
  type SearchMatch,
} from './room-session';
import { SAMPLE_NAME, SAMPLE_TEXT } from './sample';

export function RoomWorkbench({ initialDuration = 15 }: { initialDuration?: RoomDuration }) {
  const session = useRef<RoomSession | null>(null);
  const operation = useRef(0);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [duration, setDuration] = useState<RoomDuration>(initialDuration);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const current = new RoomSession(() => {
      ++operation.current;
      setRoom(null);
      setMatches(null);
      setQuery('');
      setClosed(true);
      setConfirmClose(false);
      setBusy(false);
      setError('');
      heading.current?.focus();
    });
    session.current = current;
    const leave = () => {
      ++operation.current;
      current.close();
    };
    const refresh = () => {
      const info = current.info;
      if (info) setRemaining(Math.max(0, Math.ceil((info.expiresAt - Date.now()) / 1000)));
    };
    const timer = setInterval(refresh, 1000);
    window.addEventListener('pagehide', leave);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      leave();
      session.current = null;
    };
  }, []);

  async function openRoom(file?: File) {
    if (busy || room) return;
    const token = ++operation.current;
    setBusy(true);
    setError('');
    let bytes: Uint8Array<ArrayBuffer> | undefined;
    try {
      if (file && (!/\.(txt|md|csv|json)$/i.test(file.name) || file.size > MAX_DOCUMENT_BYTES))
        throw new Error('Choose a .txt, .md, .csv, or .json file up to 256 KB.');
      bytes = file
        ? new Uint8Array(await file.arrayBuffer())
        : new TextEncoder().encode(SAMPLE_TEXT);
      if (token !== operation.current || !session.current) return;
      const info = await session.current.open(bytes, file?.name || SAMPLE_NAME, duration);
      if (token !== operation.current) return;
      setRoom(info);
      setClosed(false);
      setMatches(null);
      setRemaining(duration * 60);
      requestAnimationFrame(() => searchInput.current?.focus());
    } catch (e) {
      if (token === operation.current)
        setError(
          e instanceof Error ? e.message : 'The room could not be opened. Please try again.',
        );
    } finally {
      bytes?.fill(0);
      if (token === operation.current) setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (busy || !session.current) return;
    const token = operation.current;
    setBusy(true);
    setError('');
    setMatches(null);
    try {
      const results = await session.current.search(query);
      if (token === operation.current) setMatches(results);
    } catch (e) {
      if (token === operation.current) setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      if (token === operation.current) setBusy(false);
    }
  }

  return (
    <section id="try-room" className="workbench-section section-anchor">
      <div className="section-heading">
        <span className="eyebrow">
          <span className="tiny-square" /> THE WORKING PROTOTYPE
        </span>
        <span className="section-number">03 / TRY IT YOURSELF</span>
      </div>
      <div className="workbench-intro">
        <h2>
          A little room.
          <br />A lot less exposure.
        </h2>
        <p>
          Bring a sample. Set a timer. Find what you need.
          <br />
          One room, on your device, for as long as you choose.
        </p>
      </div>
      <div className="workbench">
        <aside className="room-sidebar">
          <div className="room-mark">
            <LockKeyhole size={20} />
            <span>YOUR PRIVATE ROOM</span>
          </div>
          <div className="room-step">
            <span>01</span>
            <div>
              <strong>Bring a document</strong>
              <small>Plain text, up to 256 KB</small>
            </div>
          </div>
          <div className={`room-step ${room ? '' : 'muted'}`}>
            <span>02</span>
            <div>
              <strong>Find an answer</strong>
              <small>Search the original passages</small>
            </div>
          </div>
          <div className="room-step muted">
            <span>03</span>
            <div>
              <strong>End the session</strong>
              <small>Close your local session</small>
            </div>
          </div>
          <div className="local-note">
            <ShieldCheck size={20} />
            <p>
              No account. No upload.
              <br />
              No server copy.
            </p>
            <small>This prototype does not send your document or search to a server.</small>
          </div>
        </aside>
        <div className="room-body" aria-busy={busy}>
          <div className="room-topline">
            <span className={`status-pill ${room ? 'active' : ''}`}>
              <i />
              {room ? 'ROOM OPEN' : closed ? 'ROOM CLOSED' : 'READY WHEN YOU ARE'}
            </span>
            <span className="mono">LOCAL / TEST MODE</span>
          </div>
          <h3 ref={heading} tabIndex={-1}>
            {room
              ? 'What are you looking for?'
              : closed
                ? 'Your session has ended.'
                : 'Start with something small.'}
          </h3>
          {!room ? (
            <>
              <p className="room-description">
                {closed
                  ? 'The key and room contents have been released from this app. Start again with a new document.'
                  : 'Explore with our fictional project brief, or choose your own test document. Keep sensitive information out of this prototype.'}
              </p>
              <div
                className={`dropzone ${dragging ? 'is-dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files.length !== 1)
                    setError('Choose one document for this room.');
                  else void openRoom(e.dataTransfer.files[0]);
                }}
              >
                <div className="upload-symbol">
                  <Upload size={25} strokeWidth={1.4} />
                </div>
                <strong>One file. One temporary room.</strong>
                <span>
                  Drop a text file here, or{' '}
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    browse files
                  </button>
                </span>
                <small>.TXT · .MD · .CSV · .JSON / MAX 256 KB</small>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  className="sr-only"
                  aria-label="Choose a text document"
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.files?.[0]) void openRoom(e.target.files[0]);
                  }}
                />
              </div>
              <div className="room-options">
                <fieldset disabled={busy}>
                  <legend>Keep this room open for</legend>
                  <div className="duration-control">
                    {([5, 15, 60] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={duration === n}
                        className={duration === n ? 'selected' : ''}
                        onClick={() => setDuration(n)}
                      >
                        {n === 60 ? '1 hour' : `${n} min`}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button
                  className="button button-dark"
                  disabled={busy}
                  onClick={() => void openRoom()}
                >
                  {busy ? 'Opening room…' : 'Try the sample room'}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="document-row">
                <FileText size={22} />
                <div>
                  <strong>{room.name}</strong>
                  <small>{(room.bytes / 1024).toFixed(1)} KB · encrypted in this tab</small>
                </div>
                <span className="countdown" aria-label={`${remaining} seconds remaining`}>
                  <Clock3 size={15} />
                  {Math.floor(remaining / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(remaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <form className="search-form" onSubmit={search}>
                <label htmlFor="room-search">Find a word or phrase in your document</label>
                <div>
                  <Search size={19} />
                  <input
                    ref={searchInput}
                    id="room-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={200}
                    placeholder="Try “launch” or “responsibilities”"
                    required
                    autoComplete="off"
                  />
                  <button
                    className="button button-dark"
                    disabled={busy || !query.trim()}
                    type="submit"
                  >
                    {busy ? 'Searching…' : 'Find'}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
              <div className="search-results" aria-live="polite">
                {matches === null ? (
                  <div className="search-empty">
                    <Search size={27} />
                    <p>
                      Your document has the answers.
                      <br />
                      <small>Local keyword search. No AI-generated claims.</small>
                    </p>
                  </div>
                ) : matches.length ? (
                  matches.map((m, i) => (
                    <article key={i}>
                      <span className="eyebrow">MATCH {String(i + 1).padStart(2, '0')}</span>
                      <p>{m.passage}</p>
                    </article>
                  ))
                ) : (
                  <div className="search-empty">
                    <p>
                      No matching passages.
                      <br />
                      <small>Try a word that appears in your document.</small>
                    </p>
                  </div>
                )}
              </div>
              <div className="room-close-row">
                <span>
                  <Check size={14} /> Nothing sent to a server
                </span>
                {confirmClose ? (
                  <div
                    className="close-confirm"
                    role="group"
                    aria-label="Confirm closing this room"
                  >
                    <span>End this session?</span>
                    <button className="text-button danger" onClick={() => session.current?.close()}>
                      Yes, close room
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Keep room open"
                      onClick={() => setConfirmClose(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button className="text-button danger" onClick={() => setConfirmClose(true)}>
                    Close room <X size={15} />
                  </button>
                )}
              </div>
            </>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
      <p className="room-footnote">
        <ArrowDownToLine size={14} /> No downloads or browser storage are created by this app.
        Refreshing closes the room. Your original file stays on your device.
      </p>
    </section>
  );
}
