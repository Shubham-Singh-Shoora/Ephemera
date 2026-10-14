'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Database,
  MoveUpRight,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Network,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import {
  CHAPTERS,
  SCENARIOS,
  DATA_KINDS,
  TRAINING_WINDOWS,
  advanceTraining,
  chapterAt,
  clampProgress,
  defaultScenario,
  trainingStatus,
  validateBrief,
  type DataKind,
  type Participant,
  type Scenario,
  type TrainingBrief,
} from './story';

const Scene = dynamic(() => import('./Scene'), { ssr: false });

function Chapter({
  id,
  number,
  children,
  reduced,
}: {
  id: string;
  number: number;
  children: ReactNode;
  reduced: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 0.45, 1], [0, 0, -60]);
  return (
    <section
      id={id}
      ref={ref}
      className={`chapter chapter-${number}`}
      aria-labelledby={`title-${number}`}
    >
      <div className="chapter-stage">
        <motion.div className="chapter-content" style={reduced ? undefined : { y }}>
          {children}
        </motion.div>
      </div>
    </section>
  );
}

function Eyebrow({ children, number }: { children: ReactNode; number: string }) {
  return (
    <p className="eyebrow">
      <span>{number}</span>
      <i />
      {children}
    </p>
  );
}

function Range({
  value,
  max,
  label,
  valueText,
  onChange,
  disabled = false,
}: {
  value: number;
  max: number;
  label: string;
  valueText?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Slider.Root
      className="range"
      value={[value]}
      min={0}
      max={max}
      step={1}
      onValueChange={([next]) => onChange(next)}
      disabled={disabled}
    >
      <Slider.Track className="range-track">
        <Slider.Range className="range-fill" />
      </Slider.Track>
      <Slider.Thumb
        className="range-thumb"
        aria-label={label}
        aria-valuetext={valueText}
        aria-disabled={disabled}
      />
    </Slider.Root>
  );
}

function Limits() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="text-button">
        <ShieldCheck size={15} />
        <span>What’s real today</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-panel limits-panel">
          <p className="eyebrow">A clear boundary</p>
          <Dialog.Title>The vision, and where we are.</Dialog.Title>
          <Dialog.Description>
            Ephemera is a testnet research project. This experience illustrates the product we are
            building.
          </Dialog.Description>
          <div className="truth-row">
            <span>01</span>
            <div>
              <h3>This is an interactive concept.</h3>
              <p>
                The connections, training and session plan here are demonstrations. No institution
                is contacted and no model is actually trained.
              </p>
            </div>
          </div>
          <div className="truth-row">
            <span>02</span>
            <div>
              <h3>There is no dataset upload here.</h3>
              <p>
                Your choices stay in this page’s memory and reset when you reload. This experience
                does not send or store a dataset.
              </p>
            </div>
          </div>
          <div className="truth-row">
            <span>03</span>
            <div>
              <h3>Private training must be proven.</h3>
              <p>
                No real TEE or training service is connected to this page. Verified computing
                environments, participant permissions and output checks are required before real
                data can be used. A trained model can retain information from its training data.
              </p>
            </div>
          </div>
          <Dialog.Close className="dialog-close" aria-label="Close project limits">
            <X />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Planner({
  open,
  onOpenChange,
  scenario,
  hours,
  onPreview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: Scenario;
  hours: 1 | 3 | 6;
  onPreview: (brief: TrainingBrief) => void;
}) {
  const [route, setRoute] = useState(scenario);
  const [kind, setKind] = useState<DataKind>('Images');
  const [windowHours, setWindowHours] = useState(hours);
  useEffect(() => {
    if (open) {
      setRoute(scenario);
      setWindowHours(hours);
    }
  }, [open, scenario, hours]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-panel planner-panel">
          <p className="eyebrow">Your starting point</p>
          <Dialog.Title>Imagine your collaboration.</Dialog.Title>
          <Dialog.Description>
            Build a sample session. These choices only change this demonstration.
          </Dialog.Description>
          <label className="field-label" htmlFor="plan-route">
            What would you like to do?
          </label>
          <select
            id="plan-route"
            value={route}
            onChange={(event) => setRoute(event.target.value as Scenario)}
          >
            {Object.entries(SCENARIOS).map(([key, item]) => (
              <option value={key} key={key}>
                {item.label}
              </option>
            ))}
          </select>
          <fieldset className="choice-field">
            <legend>What kind of data?</legend>
            <div className="choice-options">
              {DATA_KINDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={kind === item}
                  onClick={() => setKind(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="choice-field">
            <legend>How long is the training window?</legend>
            <div className="choice-options">
              {TRAINING_WINDOWS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={windowHours === item}
                  onClick={() => setWindowHours(item)}
                >
                  {item} {item === 1 ? 'hour' : 'hours'}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="brief-preview">
            {SCENARIOS[route].role === 'trainer' ? <Network size={22} /> : <Database size={22} />}
            <div>
              <strong>{SCENARIOS[route].from}</strong>
              <p>{SCENARIOS[route].responsibility}</p>
            </div>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              const brief = { scenario: route, dataKind: kind, hours: windowHours };
              if (validateBrief(brief)) onPreview(brief);
            }}
          >
            Preview this collaboration <ArrowRight size={18} />
          </button>
          <p className="small-note">Local draft only. Nothing is sent, booked or trained.</p>
          <Dialog.Close className="dialog-close" aria-label="Close session planner">
            <X />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const IDS = ['enter', 'meet', 'connect', 'terms', 'train', 'forward'];

export function Journey() {
  const prefersReduced = useReducedMotion();
  const [motionPaused, setMotionPaused] = useState(false);
  const reduced = Boolean(prefersReduced) || motionPaused;
  const progress = useMotionValue(0);
  const progressRef = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [role, setRole] = useState<Participant>('provider');
  const [scenario, setScenario] = useState<Scenario>('own-model');
  const [hours, setHours] = useState<1 | 3 | 6>(3);
  const [kind, setKind] = useState<DataKind>('Images');
  const [approved, setApproved] = useState(false);
  const [training, setTraining] = useState(0);
  const [running, setRunning] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [draft, setDraft] = useState(false);
  const trainingRef = useRef(0);
  const backgroundColor = useTransform(
    progress,
    [0, 0.39, 0.57, 0.82, 0.99],
    ['#f1f0e8', '#f1f0e8', '#182d2c', '#182d2c', '#f1f0e8'],
  );
  const color = useTransform(
    progress,
    [0, 0.42, 0.56, 0.84, 0.99],
    ['#25372f', '#25372f', '#f1f0e8', '#f1f0e8', '#25372f'],
  );
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  const go = useCallback(
    (index: number) => {
      document
        .getElementById(IDS[index])
        ?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    },
    [reduced],
  );

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const stops = IDS.map((id) => document.getElementById(id)?.offsetTop ?? 0);
      const y = window.scrollY;
      let index = 0;
      while (index < stops.length - 1 && y >= stops[index + 1]) index++;
      const fraction =
        index === stops.length - 1
          ? 0
          : clampProgress((y - stops[index]) / Math.max(1, stops[index + 1] - stops[index]));
      const next = clampProgress((index + fraction) / (stops.length - 1));
      progressRef.current = next;
      progress.set(next);
      setChapter(chapterAt(next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    update();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resize.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [progress]);

  useEffect(() => {
    trainingRef.current = training;
  }, [training]);
  useEffect(() => {
    if (chapter !== 4 || reduced) setRunning(false);
  }, [chapter, reduced]);
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      if (document.hidden) {
        setRunning(false);
        return;
      }
      const next = advanceTraining(trainingRef.current, (now - previous) / 1000);
      previous = now;
      trainingRef.current = next;
      setTraining(next);
      if (next >= 100) setRunning(false);
      else frame = requestAnimationFrame(step);
    };
    const visibility = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [running]);

  const reset = () => {
    setApproved(false);
    setRunning(false);
    setTraining(0);
    trainingRef.current = 0;
  };
  const chooseScenario = (next: Scenario) => {
    reset();
    setScenario(next);
    setRole(SCENARIOS[next].role);
  };
  const chooseRole = (next: Participant) => {
    chooseScenario(defaultScenario(next));
  };
  const preview = (brief: TrainingBrief) => {
    chooseScenario(brief.scenario);
    setKind(brief.dataKind);
    setHours(brief.hours);
    setDraft(true);
    setPlannerOpen(false);
    requestAnimationFrame(() => go(3));
  };
  const sceneParticipant = (next: Participant) => {
    chooseRole(next);
    go(2);
  };
  const route = SCENARIOS[scenario];

  return (
    <motion.div className="journey" style={{ color }} data-reduced-motion={reduced}>
      <a className="skip-link" href="#meet">
        Skip the introduction
      </a>
      <motion.div className="world-backdrop" style={{ backgroundColor }}>
        <Scene
          progressRef={progressRef}
          training={training}
          role={role}
          scenario={scenario}
          approved={approved}
          reduced={reduced}
          onParticipant={sceneParticipant}
        />
        <div className="world-grain" />
      </motion.div>
      <motion.header className="site-header" style={{ backgroundColor }}>
        <a
          href="#enter"
          className="brand-link"
          aria-label="Ephemera, return to the beginning"
          onClick={(event) => {
            event.preventDefault();
            go(0);
          }}
        >
          <Logo />
        </a>
        <span className="header-caption">room for a different kind of connection</span>
        <button className="header-link" onClick={() => setPlannerOpen(true)}>
          Find your path <ArrowUpRight size={18} />
        </button>
      </motion.header>
      <nav className="chapter-navigation" aria-label="Journey chapters">
        {CHAPTERS.map((label, index) => (
          <button
            key={label}
            className={index === chapter ? 'active' : ''}
            aria-label={`${index + 1}. ${label}`}
            aria-current={index === chapter ? 'step' : undefined}
            onClick={() => go(index)}
          >
            <span className="nav-number">0{index + 1}</span>
            <i />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      <main>
        <Chapter id="enter" number={0} reduced={reduced}>
          <div className="hero-copy">
            <Eyebrow number="01 / 06">An invitation to come closer</Eyebrow>
            <h1 id="title-0">
              Potential,
              <br />
              waiting to
              <br />
              <em>connect.</em>
            </h1>
            <p className="hero-description">
              On one side, knowledge.
              <br />
              On the other, what it could become.
            </p>
            <button className="journey-link" onClick={() => go(1)}>
              <span className="round-arrow">
                <ArrowDown size={20} />
              </span>{' '}
              Step into the possibility
            </button>
          </div>
          <div className="world-caption hero-world-caption scene-key">
            <span>
              <i className="data-key" /> Provider’s dataset
            </span>
            <span>
              <i className="model-key" /> AI model
            </span>
          </div>
          <div className="chapter-footnote">
            <span>Scroll to travel. Take your time.</span>
            <span>AN INTERACTIVE RESEARCH CONCEPT</span>
          </div>
        </Chapter>

        <Chapter id="meet" number={1} reduced={reduced}>
          <div className="meet-heading">
            <Eyebrow number="02 / 06">The people on either side</Eyebrow>
            <h2 id="title-1">
              Different starting points.
              <br />
              <em>Shared possibility.</em>
            </h2>
            <p>Good models need good data. Good data needs the right people to put it to work.</p>
          </div>
          <div className="participant-columns">
            <button
              className={`participant provider ${role === 'provider' ? 'selected' : ''}`}
              aria-pressed={role === 'provider'}
              onClick={() => chooseRole('provider')}
            >
              <span className="participant-symbol">
                <Database size={24} />
              </span>
              <span className="participant-overline">THE DATA SIDE</span>
              <strong>Data providers</strong>
              <span>
                Institutions and organizations with useful datasets. Train your own model, or find a
                team to help.
              </span>
              <span className="participant-action">
                I bring data <ArrowUpRight size={19} />
              </span>
            </button>
            <div className="meeting-note">
              <span />
              <i>meet here</i>
              <span />
            </div>
            <button
              className={`participant trainer ${role === 'trainer' ? 'selected' : ''}`}
              aria-pressed={role === 'trainer'}
              onClick={() => chooseRole('trainer')}
            >
              <span className="participant-symbol">
                <Network size={24} />
              </span>
              <span className="participant-overline">THE MODEL SIDE</span>
              <strong>AI training teams</strong>
              <span>
                People building models who need the right data. Connect with providers and agree on
                a way to train.
              </span>
              <span className="participant-action">
                I train models <ArrowUpRight size={19} />
              </span>
            </button>
          </div>
          <button className="journey-link meet-next" onClick={() => go(2)}>
            Explore your route <ArrowRight size={18} />
          </button>
        </Chapter>

        <Chapter id="connect" number={2} reduced={reduced}>
          <div className="route-heading">
            <Eyebrow number="03 / 06">A connection works both ways</Eyebrow>
            <h2 id="title-2">
              Where do
              <br />
              <em>you begin?</em>
            </h2>
          </div>
          <Tabs.Root
            className="routes"
            orientation="vertical"
            value={scenario}
            onValueChange={(value) => chooseScenario(value as Scenario)}
          >
            <Tabs.List aria-label="Choose a training arrangement" className="route-tabs">
              {Object.entries(SCENARIOS).map(([key, item]) => (
                <Tabs.Trigger key={key} value={key}>
                  <span>{item.number}</span>
                  {item.label}
                  <ArrowUpRight size={16} />
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {Object.entries(SCENARIOS).map(([key, item]) => (
              <Tabs.Content key={key} value={key} className="route-detail">
                <span className="route-index">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="route-flow">
                  <span>{item.from}</span>
                  <ArrowRight size={18} />
                  <span>{item.via}</span>
                  <ArrowRight size={18} />
                  <span>{item.to}</span>
                </div>
                <button className="journey-link" onClick={() => go(3)}>
                  Bring this into the playground <ArrowRight size={18} />
                </button>
              </Tabs.Content>
            ))}
          </Tabs.Root>
          <div className="chapter-footnote">
            <span>A place to connect. A shared environment to train.</span>
            <span>THREE ROUTES / ONE PLAYGROUND</span>
          </div>
        </Chapter>

        <Chapter id="terms" number={3} reduced={reduced}>
          <div className="terms-copy">
            <Eyebrow number="04 / 06">Before the door opens</Eyebrow>
            <h2 id="title-3">
              A shared space.
              <br />
              <em>Agreed boundaries.</em>
            </h2>
            <p>
              Ephemera is designed to bring the model to the data in a controlled training
              environment. Both sides decide what can happen there.
            </p>
            <span className="environment-label">
              <ShieldCheck size={16} /> PRIVATE TRAINING · PRODUCT VISION
            </span>
          </div>
          <div className="agreement">
            <div className="agreement-heading">
              <span>{draft ? 'YOUR SAMPLE SESSION' : 'A SAMPLE AGREEMENT'}</span>
              <span className="status-dot" /> ILLUSTRATION
            </div>
            <div className="agreement-row">
              <span>The arrangement</span>
              <strong>{route.label}</strong>
            </div>
            <div className="agreement-row">
              <span>The purpose</span>
              <strong>Train a model to recognize patterns</strong>
            </div>
            <div className="agreement-row">
              <span>The data</span>
              <strong>
                {kind} <small>· sample category only</small>
              </strong>
            </div>
            <div className="agreement-row">
              <span>The result</span>
              <strong>A trained model, used under agreed terms</strong>
            </div>
            <div className="window-control">
              <div>
                <label id="window-label">Training access window</label>
                <strong>
                  {hours} {hours === 1 ? 'hour' : 'hours'}
                </strong>
              </div>
              <Range
                value={TRAINING_WINDOWS.indexOf(hours)}
                max={2}
                label="Training access window"
                valueText={`${hours} ${hours === 1 ? 'hour' : 'hours'}`}
                onChange={(index) => {
                  reset();
                  setHours(TRAINING_WINDOWS[index]);
                }}
              />
              <div className="range-labels">
                <span>1 hour</span>
                <span>3 hours</span>
                <span>6 hours</span>
              </div>
            </div>
            <button
              className={`primary-button ${approved ? 'approved-button' : ''}`}
              onClick={() => {
                setApproved(true);
                go(4);
              }}
            >
              {approved ? (
                <>
                  <Check size={18} /> Demo setup agreed
                </>
              ) : (
                <>
                  Agree to this demo setup <ArrowRight size={18} />
                </>
              )}
            </button>
            <p className="small-note">A walkthrough, not a signed agreement or a live data room.</p>
          </div>
        </Chapter>

        <Chapter id="train" number={4} reduced={reduced}>
          <div className="training-heading">
            <Eyebrow number="05 / 06">Inside the playground</Eyebrow>
            <h2 id="title-4">
              Let the model learn.
              <br />
              <em>Keep the data boundary.</em>
            </h2>
            <p>
              The idea: the model learns within the agreed environment. The provider’s original
              dataset is not handed to the training team.
            </p>
          </div>
          <div className="training-label">
            <span className="status-dot" />
            <span>{trainingStatus(training)}</span>
            <strong>
              {Math.round(training)}
              <small>%</small>
            </strong>
          </div>
          <div className="training-console">
            <div className="console-header">
              <span>TRAINING ILLUSTRATION</span>
              <span>18-second preview · no real model</span>
            </div>
            <div className="training-stages">
              <span className={training < 25 ? 'current' : ''}>01 Prepare</span>
              <span className={training >= 25 && training < 75 ? 'current' : ''}>02 Learn</span>
              <span className={training >= 75 && training < 90 ? 'current' : ''}>03 Check</span>
              <span className={training >= 90 ? 'current' : ''}>04 Release</span>
            </div>
            <Range
              value={training}
              max={100}
              label="Explore training progress"
              valueText={`${Math.round(training)} percent, ${trainingStatus(training)}`}
              disabled={!approved}
              onChange={(value) => {
                setRunning(false);
                setTraining(value);
              }}
            />
            <div className="training-actions">
              {!approved ? (
                <button className="light-button" onClick={() => go(3)}>
                  First, agree to the demo setup <ArrowLeft size={17} />
                </button>
              ) : (
                <button
                  className="light-button"
                  disabled={reduced}
                  onClick={() => {
                    if (training >= 100) {
                      setTraining(0);
                      trainingRef.current = 0;
                    }
                    setRunning(!running);
                  }}
                >
                  {running ? <Pause size={17} /> : <Play size={17} />}
                  {reduced
                    ? 'Use the timeline to explore'
                    : running
                      ? 'Pause preview'
                      : training >= 100
                        ? 'Replay preview'
                        : training > 0
                          ? 'Continue preview'
                          : 'Start training preview'}
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Reset training preview"
                disabled={!approved}
                onClick={() => {
                  setRunning(false);
                  setTraining(0);
                }}
              >
                <RotateCcw size={18} />
              </button>
              <button className="text-button output-button" onClick={() => go(5)}>
                Follow the model out <ArrowRight size={17} />
              </button>
            </div>
            <p className="small-note">
              {reduced
                ? 'Motion is paused. Use the progress slider to explore each stage.'
                : 'You control the pace. Play, pause, or drag the timeline.'}
            </p>
          </div>
        </Chapter>

        <Chapter id="forward" number={5} reduced={reduced}>
          <div className="ending-copy">
            <Eyebrow number="06 / 06">Something useful leaves with you</Eyebrow>
            <h2 id="title-5">
              The learning
              <br />
              <em>goes forward.</em>
            </h2>
            <p>
              After training, the model can be used under the terms both sides agreed. The training
              session ends. The possibilities keep going.
            </p>
            <div className="ending-distinction">
              <span>
                <Network size={18} /> The trained model moves forward.
              </span>
              <span>
                <Database size={18} /> The original dataset stays with its provider.
              </span>
            </div>
            <p className="output-caveat">
              Models can retain information from training data. Privacy testing and output checks
              are essential before release.
            </p>
            <button className="primary-button" onClick={() => setPlannerOpen(true)}>
              Find your starting point <MoveUpRight size={19} />
            </button>
          </div>
          <div className="ending-model-label">
            <span>THE TRAINED MODEL</span>
            <i>
              Ready for its
              <br />
              agreed purpose.
            </i>
          </div>
          <div className="ending-footer">
            <Logo />
            <p>
              Data providers. AI teams.
              <br />A place to build something together.
            </p>
            <button className="text-button" onClick={() => go(0)}>
              Back to the beginning <ArrowUpRight size={16} />
            </button>
          </div>
        </Chapter>
      </main>

      <motion.footer className="journey-hud" style={{ backgroundColor }}>
        <div className="hud-location">
          <span className="status-dot" /> TESTNET CONCEPT <span className="hud-divider" />{' '}
          <span>0{chapter + 1} / 06</span>
        </div>
        <div className="hud-controls">
          <button
            className="text-button"
            aria-pressed={reduced}
            onClick={() => setMotionPaused(!motionPaused)}
            disabled={Boolean(prefersReduced)}
          >
            {reduced ? <Play size={14} /> : <Pause size={14} />}
            <span>
              {prefersReduced ? 'Reduced motion' : motionPaused ? 'Resume motion' : 'Pause motion'}
            </span>
          </button>
          <Limits />
        </div>
        <motion.div className="journey-progress" style={{ scaleX }} />
      </motion.footer>
      <Planner
        open={plannerOpen}
        onOpenChange={setPlannerOpen}
        scenario={scenario}
        hours={hours}
        onPreview={preview}
      />
    </motion.div>
  );
}

export default Journey;
