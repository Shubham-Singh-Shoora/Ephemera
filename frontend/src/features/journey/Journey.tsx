'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  CornerDownRight,
  FileText,
  Grip,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { RoomWorkbench } from '../room/RoomWorkbench';
import {
  CHAPTERS,
  COPY_PLACES,
  PASSAGES,
  ROLES,
  STORY_DURATIONS,
  chapterAt,
  illustratedTime,
  nextCopy,
  type JourneyRole,
} from './story';

const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => (
    <div className="scene-preparing" aria-hidden="true">
      <span />
    </div>
  ),
});

function Mark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 2 25 8.5v11L14 26 3 19.5v-11L14 2Z" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="m3 8.5 11 6.4 11-6.4M14 14.9V26M8.5 5.3l11 6.5v11"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path d="m8.5 22.8 11-6.5V5.3" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function Boundaries() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="quiet-button boundary-trigger">
        <ShieldCheck size={14} /> The real limits
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="limits-dialog">
          <Dialog.Title>
            Trust the boundaries.
            <br />
            Question the magic.
          </Dialog.Title>
          <Dialog.Description>
            This is a research prototype. The story uses fictional documents to explain the idea.
          </Dialog.Description>
          <div className="limit-row">
            <span>01</span>
            <div>
              <h3>The working room stays on your device.</h3>
              <p>
                It encrypts and searches text inside this browser. It creates no server copy,
                browser storage entry, or AI request.
              </p>
            </div>
          </div>
          <div className="limit-row">
            <span>02</span>
            <div>
              <h3>An ending isn’t a global eraser.</h3>
              <p>
                Closing releases the app’s key and clears its room. It cannot delete your original
                file, screenshots, copies already made, or all traces in device memory.
              </p>
            </div>
          </div>
          <div className="limit-row">
            <span>03</span>
            <div>
              <h3>The people are the plan.</h3>
              <p>
                Owners, reviewers, and security leads describe the intended customers. Invitations,
                shared access, live Swarm storage, and verified confidential AI are not implemented
                in this browser prototype.
              </p>
            </div>
          </div>
          <div className="limit-row">
            <span>04</span>
            <div>
              <h3>One room, before many industries.</h3>
              <p>
                Start with one shared set of protections. Specific industry rules can follow after
                the core workflow is validated.
              </p>
            </div>
          </div>
          <Dialog.Close className="dialog-close" aria-label="Close the boundaries">
            <X size={21} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Journey() {
  const track = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const [copies, setCopies] = useState(1);
  const [sealed, setSealed] = useState(false);
  const [role, setRole] = useState<JourneyRole>('owner');
  const [duration, setDuration] = useState(1);
  const [passage, setPassage] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const roomOpener = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  const animate = !reducedMotion && !paused;
  const durationLabel = ['5 min', '15 min', '1 hour'][duration];
  const finished = elapsed === 100;

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    update();
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (track.current)
          setChapter(
            chapterAt(
              -track.current.getBoundingClientRect().top,
              track.current.clientHeight / CHAPTERS.length,
            ),
          );
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const go = useCallback(
    (next: number) => {
      if (!track.current) return;
      const bounded = Math.min(CHAPTERS.length - 1, Math.max(0, next));
      window.scrollTo({
        top:
          window.scrollY +
          track.current.getBoundingClientRect().top +
          (bounded * track.current.clientHeight) / CHAPTERS.length,
        behavior: animate ? 'smooth' : 'instant',
      });
    },
    [animate],
  );

  const touchDocument = () => {
    if (chapter === 0) go(1);
    if (chapter === 1) setCopies(nextCopy);
    if (chapter === 2) setSealed((s) => !s);
    if (chapter === 3) setPassage((p) => (p === null ? 0 : (p + 1) % PASSAGES.length));
  };

  function replay() {
    setCopies(1);
    setSealed(false);
    setDuration(1);
    setRole('owner');
    setPassage(null);
    setElapsed(0);
    go(0);
  }

  return (
    <Dialog.Root
      open={roomOpen}
      onOpenChange={(open) => {
        if (open)
          roomOpener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setRoomOpen(open);
      }}
    >
      <a className="skip-link" href="#journey-controls">
        Skip to journey controls
      </a>
      <main ref={track} id="main" className="journey-track">
        <div
          className={`journey-viewport chapter-${chapter} ${finished && chapter === 4 ? 'ending-complete' : ''}`}
          data-motion={animate ? 'on' : 'off'}
        >
          <header className="experience-header">
            <button
              className="ephemera-wordmark"
              onClick={() => go(0)}
              aria-label="ephemera, back to the beginning"
            >
              <Mark />
              <span>
                ephemera<span className="wordmark-dot">.</span>
              </span>
            </button>
            <span className="header-note">a study in leaving less behind</span>
            <Dialog.Trigger className="open-room-trigger">
              Enter the room
              <ArrowUpRight size={16} />
            </Dialog.Trigger>
          </header>
          <div className="canvas-grain" aria-hidden="true" />
          <svg
            className="journey-path"
            viewBox="0 0 1440 900"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M -40 720 C 170 720, 210 690, 260 580 S 180 310, 490 310 S 560 670, 855 670 S 1280 560, 1170 330 S 1230 140, 1490 210" />
            <motion.path
              d="M -40 720 C 170 720, 210 690, 260 580 S 180 310, 490 310 S 560 670, 855 670 S 1280 560, 1170 330 S 1230 140, 1490 210"
              initial={false}
              animate={{ pathLength: (chapter + 1) / 5 }}
              transition={{ duration: animate ? 1.4 : 0, ease: 'easeInOut' }}
              className="path-traveled"
            />
          </svg>
          <div className="canvas-corner corner-tl" aria-hidden="true" />
          <div className="canvas-corner corner-br" aria-hidden="true" />
          <div className="chapter-rail" aria-hidden="true">
            <span>THE LIFE OF A FILE</span>
            <i />
            <span>0{chapter + 1} — 05</span>
          </div>
          <div className="canvas-scene">
            <Scene
              chapter={chapter}
              copies={copies}
              sealed={sealed}
              elapsed={elapsed}
              motion={animate && !roomOpen && pageVisible}
              onDocumentClick={touchDocument}
            />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={chapter}
              className={`chapter-content content-${chapter}`}
              initial={{ opacity: 0, y: animate ? 20 : 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: animate ? -12 : 0 }}
              transition={{ duration: animate ? 0.38 : 0 }}
            >
              {chapter === 0 && (
                <>
                  <div className="intro-copy">
                    <span className="story-kicker">
                      <i /> EVERY STORY STARTS SOMEWHERE
                    </span>
                    <h1>
                      A file.
                      <br />A little <em>trust.</em>
                    </h1>
                    <p>
                      It’s just a document.
                      <br />
                      Until you let it go.
                    </p>
                    <button className="story-action" onClick={() => go(1)}>
                      Follow the file
                      <ArrowRight size={19} />
                    </button>
                    <span className="interaction-note">A short story. You’re part of it.</span>
                  </div>
                  <div className="artifact-caption">
                    <span className="annotation-line" />
                    <span>
                      ONE SMALL FILE.
                      <br />A LOT YOU CARE ABOUT.
                    </span>
                  </div>
                  <div className="intro-margin-note">
                    <span>
                      ephemeral <i>/ɪˈfɛmərəl/</i>
                    </span>
                    <p>lasting for only a short time.</p>
                  </div>
                  <span className="canvas-instruction">
                    <Grip size={14} /> Try touching the document
                  </span>
                </>
              )}
              {chapter === 1 && (
                <>
                  <div className="copies-copy">
                    <span className="story-kicker">01 / THE THING ABOUT SHARING</span>
                    <h2>
                      You sent <em>one.</em>
                      <br />
                      How many stayed?
                    </h2>
                    <p>
                      An attachment. A download. A forward.
                      <br />
                      Useful work quietly becomes a trail of copies.
                    </p>
                  </div>
                  <div className="copy-inventory">
                    <span className="tiny-label">A FICTIONAL FILE’S JOURNEY</span>
                    <div className="copy-count">
                      <span>{String(copies).padStart(2, '0')}</span>
                      <small>
                        {copies === 1 ? 'copy' : 'copies'}
                        <br />
                        and counting
                      </small>
                    </div>
                    <div className="copy-ledger">
                      {COPY_PLACES.slice(0, copies).map((place, i) => (
                        <motion.div
                          key={place}
                          initial={{ opacity: 0, x: animate ? 8 : 0 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <span>0{i + 1}</span>
                          {place}
                          <Copy size={11} />
                        </motion.div>
                      ))}
                    </div>
                    <button
                      className="story-action action-outline"
                      disabled={copies === COPY_PLACES.length}
                      onClick={() => setCopies(nextCopy)}
                    >
                      <Copy size={15} />
                      {copies === COPY_PLACES.length
                        ? 'That’s already a lot of copies'
                        : 'Send another copy'}
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="chapter-bottom-copy">
                    <p>
                      You can end the conversation.
                      <br />
                      <strong>The copies don’t get the message.</strong>
                    </p>
                    <button className="text-action" onClick={() => go(2)}>
                      Let’s draw a boundary
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
              {chapter === 2 && (
                <>
                  <div className="boundary-copy">
                    <span className="story-kicker">02 / A DIFFERENT KIND OF SPACE</span>
                    <h2>
                      Give the work
                      <br />a <em>boundary.</em>
                    </h2>
                    <p>
                      One temporary room.
                      <br />A purpose. A time limit. A way out.
                    </p>
                    <div className="boundary-control">
                      <div>
                        <span>How long does the work need?</span>
                        <strong>{durationLabel}</strong>
                      </div>
                      <Slider.Root
                        className="story-slider"
                        min={0}
                        max={2}
                        step={1}
                        value={[duration]}
                        onValueChange={(values) => setDuration(values[0])}
                        aria-label="Illustrated room duration"
                      >
                        <Slider.Track className="slider-track">
                          <Slider.Range className="slider-range" />
                        </Slider.Track>
                        <Slider.Thumb
                          className="slider-thumb"
                          aria-label="Illustrated room duration"
                        />
                      </Slider.Root>
                      <div className="slider-labels">
                        <span>5 minutes</span>
                        <span>An hour</span>
                      </div>
                      <button
                        className={`story-action ${sealed ? 'action-outline' : ''}`}
                        onClick={() => setSealed((s) => !s)}
                      >
                        {sealed ? <Check size={17} /> : <LockKeyhole size={17} />}
                        {sealed ? 'Boundary set. Open it again?' : 'Draw the boundary'}
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                  </div>
                  <Tabs.Root
                    value={role}
                    onValueChange={(value) => setRole(value as JourneyRole)}
                    className="role-folio"
                  >
                    <span className="tiny-label">A ROOM HAS DIFFERENT MEANINGS.</span>
                    <Tabs.List className="role-tab-list" aria-label="Who would use ephemera?">
                      {(Object.keys(ROLES) as JourneyRole[]).map((key) => (
                        <Tabs.Trigger className="role-tab" key={key} value={key}>
                          {ROLES[key].name}
                        </Tabs.Trigger>
                      ))}
                    </Tabs.List>
                    {(Object.keys(ROLES) as JourneyRole[]).map((key) => (
                      <Tabs.Content key={key} value={key} className="role-tab-content">
                        <span className="role-person-label">{ROLES[key].person}</span>
                        <h3>{ROLES[key].line}</h3>
                        <p>{ROLES[key].detail}</p>
                      </Tabs.Content>
                    ))}
                    <small>Intended roles. Shared access is still to be built.</small>
                  </Tabs.Root>
                  <span className="canvas-instruction">
                    <Grip size={14} />{' '}
                    <span className="desktop-hint">
                      Drag to turn the room · illustrated, not live
                    </span>
                    <span className="touch-hint">Tap the file to set its boundary</span>
                  </span>
                </>
              )}
              {chapter === 3 && (
                <>
                  <div className="work-copy">
                    <span className="story-kicker">03 / JUST ENOUGH TO MOVE FORWARD</span>
                    <h2>
                      Take the insight.
                      <br />
                      <em>Leave the archive.</em>
                    </h2>
                    <p>
                      The point was the answer.
                      <br />
                      It was never another folder.
                    </p>
                  </div>
                  <div className="passage-folio">
                    <div className="folio-top">
                      <FileText size={16} />
                      <span>NORTHSTAR / FICTIONAL PROJECT</span>
                      <span className="folio-dot" />
                    </div>
                    <h3>What do you need to know?</h3>
                    <div className="question-options">
                      {PASSAGES.map((p, i) => (
                        <button
                          key={p.label}
                          aria-pressed={passage === i}
                          onClick={() => setPassage(i)}
                        >
                          {p.label}
                          <ArrowUpRight size={13} />
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={passage ?? 'empty'}
                        className={`passage-answer ${passage === null ? 'answer-empty' : ''}`}
                        initial={{ opacity: 0, y: animate ? 8 : 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: animate ? 0.2 : 0 }}
                        aria-live="polite"
                      >
                        {passage === null ? (
                          <>
                            <CornerDownRight size={20} />
                            <p>
                              Choose a question.
                              <br />
                              <span>Find a passage worth keeping in mind.</span>
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="tiny-label">FROM THE ORIGINAL WORDS</span>
                            <blockquote>“{PASSAGES[passage].answer}”</blockquote>
                            <span className="passage-source">{PASSAGES[passage].source}</span>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                    <span className="folio-note">
                      Illustrative passages. The working room uses local keyword search.
                    </span>
                  </div>
                  <div className="room-annotation">
                    <span className="annotation-line" />
                    <span>
                      THE WORK HAPPENS HERE.
                      <br />
                      THE FILE STAYS WITH YOU.
                    </span>
                  </div>
                </>
              )}
              {chapter === 4 && (
                <>
                  <div className="ending-copy">
                    <span className="story-kicker">04 / AN ENDING, BY DESIGN</span>
                    <h2>
                      {finished ? (
                        <>
                          A little less
                          <br />
                          <em>left behind.</em>
                        </>
                      ) : (
                        <>
                          Some things should
                          <br />
                          be <em>temporary.</em>
                        </>
                      )}
                    </h2>
                    <p>
                      {finished
                        ? 'That is the idea behind ephemera.'
                        : 'Move time forward. Watch this room let go.'}
                    </p>
                  </div>
                  <div className="ending-control">
                    <div className="time-readout">
                      <span>{finished ? 'SESSION CLOSED' : 'ILLUSTRATED SESSION'}</span>
                      <strong>{illustratedTime(STORY_DURATIONS[duration], elapsed)}</strong>
                      <LockKeyhole size={16} />
                    </div>
                    <Slider.Root
                      className="story-slider time-slider"
                      min={0}
                      max={100}
                      step={1}
                      value={[elapsed]}
                      onValueChange={(values) => setElapsed(values[0])}
                      aria-label="Move the illustrated session through time"
                    >
                      <Slider.Track className="slider-track">
                        <Slider.Range className="slider-range" />
                      </Slider.Track>
                      <Slider.Thumb
                        className="slider-thumb"
                        aria-label="Move the illustrated session through time"
                      />
                    </Slider.Root>
                    <div className="slider-labels">
                      <span>A fresh start</span>
                      <button className="text-action" onClick={() => setElapsed(100)}>
                        Let it end <ArrowRight size={13} />
                      </button>
                    </div>
                    <p className="ending-truth">
                      {finished
                        ? 'Access ends in the app. Your original file and any copies already made still exist.'
                        : 'An illustration of ending access. Not a promise to erase every copy.'}
                    </p>
                    <Dialog.Trigger className="story-action">
                      Now try a real test room
                      <ArrowUpRight size={17} />
                    </Dialog.Trigger>
                    <button className="replay-button" onClick={replay}>
                      <RotateCcw size={13} /> Follow the file again
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="journey-bottom-bar">
            <span className="scroll-invitation">
              <ArrowDown size={13} /> Scroll, or choose your next step.
            </span>
            <div className="experience-utilities">
              <button
                className="quiet-button"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                disabled={Boolean(reducedMotion)}
                aria-label={
                  reducedMotion
                    ? 'Motion paused by your device preference'
                    : paused
                      ? 'Resume motion'
                      : 'Pause motion'
                }
              >
                {paused || reducedMotion ? <Play size={12} /> : <Pause size={12} />}
                {paused || reducedMotion ? 'Motion paused' : 'Pause motion'}
              </button>
              <Boundaries />
            </div>
          </div>
          <nav id="journey-controls" className="journey-navigation" aria-label="Journey chapters">
            <button
              className="journey-prev"
              disabled={chapter === 0}
              onClick={() => go(chapter - 1)}
              aria-label="Previous chapter"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="chapter-stops">
              {CHAPTERS.map((name, i) => (
                <button
                  key={name}
                  className={chapter === i ? 'current' : ''}
                  aria-current={chapter === i ? 'step' : undefined}
                  aria-label={`Chapter ${i + 1}: ${name}`}
                  onClick={() => go(i)}
                >
                  <span className="stop-number">0{i + 1}</span>
                  <i />
                  <span className="stop-name">{name}</span>
                </button>
              ))}
            </div>
            <button
              className="journey-next"
              onClick={(event) => {
                if (chapter === 4) {
                  roomOpener.current = event.currentTarget;
                  setRoomOpen(true);
                } else go(chapter + 1);
              }}
              aria-label={chapter === 4 ? 'Open the working test room' : 'Next chapter'}
            >
              <ArrowRight size={17} />
            </button>
          </nav>
          <span className="journey-a11y-status sr-only" aria-live="polite">
            Chapter {chapter + 1} of 5: {CHAPTERS[chapter]}
          </span>
        </div>
      </main>
      <footer className="experience-footer">
        <span>
          <Mark /> ephemera.
        </span>
        <p>A testnet exploration. One room, before everything else.</p>
        <button className="text-action" onClick={replay}>
          Back to the beginning
          <ArrowUpRight size={14} />
        </button>
      </footer>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay room-overlay" />
        <Dialog.Content
          className="room-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (roomOpener.current?.isConnected) roomOpener.current.focus();
            else document.querySelector<HTMLButtonElement>('.open-room-trigger')?.focus();
          }}
        >
          <div className="room-dialog-header">
            <div>
              <Dialog.Title>Your temporary room.</Dialog.Title>
              <Dialog.Description>
                Use a fictional or non-sensitive text file. Closing this window ends its local
                session.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="dialog-close"
              aria-label="Close the test room and end the session"
            >
              <X size={21} />
            </Dialog.Close>
          </div>
          <RoomWorkbench initialDuration={STORY_DURATIONS[duration]} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
