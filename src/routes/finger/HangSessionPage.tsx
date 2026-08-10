import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { abrahangsTooHeavy, hangProgress, hangSummary } from '../../finger/engine';
import { handIndicators } from '../../finger/summary';
import { maxByHand } from '../../finger/maxTest';
import { programById } from '../../finger/programs';
import { buildHangTimeline } from '../../finger/timeline';
import { useHangTimer } from '../../finger/useHangTimer';
import { mockSource } from '../../finger/sourceManager';
import { useSource } from '../../finger/useSource';
import { useFingerStore } from '../../store/fingerStore';
import { useProgressStore } from '../../store/progressStore';
import { useSettingsStore } from '../../store/settingsStore';
import { todayKey } from '../../game/dates';
import {
  initAudio,
  playComplete,
  playCountdownTick,
  playSegmentStart,
  playSideSwitch,
} from '../../session/audio';
import { ScreenWakeLock } from '../../session/wakeLock';
import { ForceGraph } from '../../components/ForceGraph';
import { DevicePicker } from '../../components/DevicePicker';
import { Icon } from '../../components/Icon';
import { formatClock } from '../../lib/format';
import type { HangProgram } from '../../finger/programs';

const KIND_LABEL: Record<string, string> = {
  prep: 'get ready',
  hang: 'hang',
  rest: 'rest',
  switch: 'switch',
};

const GRIP_LABEL: Record<string, string> = {
  'half-crimp': 'half crimp',
  'front-3-drag': 'front three, drag',
};

/**
 * The gate in front of every hang session.
 *
 * A hang without a board attached is a countdown with nothing on the other end
 * of it, so the session does not exist until something is connected — the
 * clock, the timeline and the whole state machine are only mounted below.
 */
export function HangSessionPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const program = programId ? programById(programId) : undefined;
  const source = useSource();

  if (!program) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <p className="text-ink-soft">Program not found.</p>
      </main>
    );
  }

  if (source.status !== 'connected') {
    return (
      <main className="flex min-h-dvh flex-col px-6 pb-10 pt-6">
        <button
          onClick={() => navigate('/finger')}
          className="mb-10 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
        >
          <Icon name="chevronLeft" size={16} />
          back
        </button>
        <div className="flex flex-1 flex-col items-center justify-center">
          <h1 className="text-xl lowercase">{program.name}</h1>
          <p className="measure mt-2 text-center text-sm leading-relaxed text-ink-soft">
            Pick a board to hang on. Every rep is measured against your max, so there is nothing
            to run without one.
          </p>
          <div className="mt-10 flex justify-center">
            <DevicePicker />
          </div>
        </div>
      </main>
    );
  }

  return <HangSession program={program} />;
}

function HangSession({ program }: { program: HangProgram }) {
  const navigate = useNavigate();
  const finger = useFingerStore();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const prepDurationSec = useSettingsStore((s) => s.prepDurationSec);
  const completeSession = useProgressStore((s) => s.completeSession);
  const recordSession = useFingerStore((s) => s.recordSession);
  const source = useSource();

  const maxes = useMemo(
    () => maxByHand(finger.maxes, 'half-crimp', finger.activeEdgeMm),
    // Recomputing mid-session would change the bands under the person's hands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const segments = useMemo(
    () => buildHangTimeline(program, maxes, prepDurationSec),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [program.id],
  );

  const { state, dispatch } = useHangTimer(segments);
  const startedAtRef = useRef(new Date().toISOString());
  const finishedRef = useRef(false);
  const prevIndexRef = useRef(-1);
  const prevCountdownRef = useRef<number>(Infinity);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [mockLevel, setMockLevel] = useState(0);

  useEffect(() => {
    const lock = new ScreenWakeLock();
    void lock.request();
    return () => lock.release();
  }, []);

  const segment = state.index < segments.length ? segments[state.index] : undefined;

  useEffect(() => {
    if (!soundEnabled || state.index === prevIndexRef.current) return;
    prevIndexRef.current = state.index;
    prevCountdownRef.current = Infinity;
    if (!segment) return;
    if (segment.kind === 'switch') playSideSwitch();
    else if (segment.kind === 'hang') playSegmentStart();
  }, [state.index, segment, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled || segment?.kind !== 'hang') return;
    const secLeft = Math.ceil(state.remainingMs / 1000);
    if (secLeft <= 3 && secLeft >= 1 && secLeft !== prevCountdownRef.current) {
      prevCountdownRef.current = secLeft;
      playCountdownTick();
    }
  }, [state.remainingMs, segment, soundEnabled]);

  // Finalize exactly once. A finger session is an ordinary session as far as
  // the streak, the daily goal and XP are concerned — that is the whole point
  // of routing it through completeSession rather than a parallel system.
  useEffect(() => {
    // An empty timeline — no max measured for this edge — starts life
    // finished, and without this guard that reads as a completed session:
    // a zero-XP summary screen and a badge for a session nobody did.
    if (state.status !== 'finished' || finishedRef.current || segments.length === 0) return;
    finishedRef.current = true;
    if (soundEnabled) playComplete();

    const id = crypto.randomUUID();
    const record = hangSummary({
      state,
      program,
      edgeMm: finger.activeEdgeMm ?? 0,
      maxByHand: maxes,
      startedAt: startedAtRef.current,
      dateKey: todayKey(),
      id,
    });
    recordSession(record);

    const summary = completeSession({
      routine: {
        id: `finger-${program.id}`,
        name: program.name,
        description: program.description,
        category: 'fingers',
        steps: [],
        isCustom: false,
      },
      startedAt: startedAtRef.current,
      activeSec: record.activeSec,
      stepsCompleted: record.setsCompleted,
      stepsTotal: record.setsTotal,
    });

    navigate('/complete', {
      replace: true,
      state: {
        ...summary,
        // The indicators travel with the summary so the completion screen
        // does not have to go looking for a record it was just handed.
        hangIndicators: handIndicators(record, program.hangSec),
        fingerNote:
          program.id === 'abrahangs' && abrahangsTooHeavy(record.sets)
            ? 'that was heavier than the protocol wants. low load was enough in the study — heavier is not better here.'
            : undefined,
      },
    });
  }, [
    state,
    program,
    maxes,
    finger.activeEdgeMm,
    segments.length,
    recordSession,
    completeSession,
    navigate,
    soundEnabled,
  ]);

  if (segments.length === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="measure text-sm leading-relaxed text-ink-soft">
          No max measured yet for this edge, so there is no band to aim at. Run the max test
          first.
        </p>
        <button
          onClick={() => navigate('/finger/test')}
          className="bg-pine-deep px-8 py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110"
        >
          max test
        </button>
      </main>
    );
  }
  if (!segment) return null;

  const paused = state.status === 'paused';
  const progressPct = Math.round(hangProgress(state) * 100);
  const hangIndex = state.results.length + (segment.kind === 'hang' ? 1 : 0);
  const hangTotal = segments.filter((s) => s.kind === 'hang').length;

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-10 pt-6">
      <div className="mb-10 flex items-center gap-4">
        <button
          onClick={() => setConfirmQuit(true)}
          className="text-ink-soft hover:text-ink"
          aria-label="Quit session"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="h-px flex-1 bg-line">
          <div
            className="h-px bg-pine transition-all duration-700 ease-in-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-ink-soft">
          {Math.min(Math.max(1, hangIndex), hangTotal)}/{hangTotal}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          className="text-xs lowercase tracking-[0.18em]"
          style={{
            color: segment.kind === 'hang' ? 'var(--color-pine-deep)' : 'var(--color-fjord-deep)',
          }}
        >
          {KIND_LABEL[segment.kind]}
          {segment.hand ? ` · ${segment.hand}` : ''}
          {segment.grip ? ` · ${GRIP_LABEL[segment.grip]}` : ''}
          {segment.repIndex ? ` · ${segment.repIndex} of ${segment.repTotal}` : ''}
        </span>

        {segment.kind === 'hang' ? (
          <div className="mt-8 w-full">
            {/* Keyed by hang, so each rep starts with a clean trace from the
                left edge instead of inheriting the previous one. */}
            <ForceGraph
              key={segment.setIndex}
              targetLoKg={segment.targetLoKg ?? 0}
              targetHiKg={segment.targetHiKg ?? 0}
              windowMs={segment.durationSec * 1000}
              // Scaled to that hand's max rather than to the band, so a hard
              // pull cannot run off the top of the frame — and so where the
              // band sits shows what fraction of max it is.
              ceilingKg={(segment.hand ? maxes[segment.hand] : undefined) ?? undefined}
            />
          </div>
        ) : (
          <div className="mt-10 flex h-48 flex-col items-center justify-center">
            <span className="text-sm lowercase text-ink-soft">
              {segment.kind === 'rest' ? 'shake it out' : 'set up'}
            </span>
            {segment.hand && (
              <p className="mt-2 text-xl lowercase">
                next · {segment.hand} · {GRIP_LABEL[segment.grip ?? '']}
              </p>
            )}
          </div>
        )}

        <div className="display mt-8 text-6xl tabular-nums leading-none">
          {formatClock(state.remainingMs / 1000)}
        </div>

        {/* The simulated board is now reachable straight from the gate, so the
            thing that drives it has to be reachable from here too — otherwise
            picking it leads to a session nothing can pull on. */}
        {source.kind === 'mock' && (
          <div className="mt-8 w-full max-w-sm">
            <label className="text-xs lowercase text-ink-soft" htmlFor="sim-pull">
              simulated pull · {mockLevel} kg
            </label>
            <input
              id="sim-pull"
              type="range"
              min={0}
              max={80}
              value={mockLevel}
              onChange={(e) => {
                const kg = Number(e.target.value);
                setMockLevel(kg);
                mockSource().setLevel(kg);
              }}
              className="mt-2 w-full accent-pine-deep"
            />
          </div>
        )}

        {/* Only reachable by a board dropping out mid-session — the session
            cannot be started without one. The clock keeps running because
            stopping it would lose the reps already recorded. */}
        {source.status !== 'connected' && (
          <p className="measure mt-6 text-xs leading-relaxed text-clay">
            The board dropped out — the clock still runs, but nothing is being measured.
          </p>
        )}
      </div>

      <div className="mt-10 flex items-center justify-center gap-8">
        <button
          onClick={() => dispatch({ type: 'BACK' })}
          className="border border-line p-4 text-ink-soft hover:bg-surface hover:text-ink"
          aria-label="Previous"
        >
          <Icon name="prev" size={18} />
        </button>
        <button
          onClick={() => {
            initAudio();
            dispatch({ type: paused ? 'RESUME' : 'PAUSE' });
          }}
          className="bg-pine-deep p-6 text-paper hover:brightness-110"
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          <Icon name={paused ? 'play' : 'pause'} size={24} strokeWidth={1.4} />
        </button>
        <button
          onClick={() => dispatch({ type: 'SKIP' })}
          className="border border-line p-4 text-ink-soft hover:bg-surface hover:text-ink"
          aria-label="Skip"
        >
          <Icon name="next" size={18} />
        </button>
      </div>

      {confirmQuit && (
        <div className="animate-reveal fixed inset-0 z-30 flex items-center justify-center bg-paper/90 px-8 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-line bg-surface p-8 text-center">
            <h2 className="text-lg lowercase">leave this session?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Nothing from this session will be saved.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => setConfirmQuit(false)}
                className="bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110"
              >
                keep going
              </button>
              <button
                onClick={() => navigate('/finger')}
                className="border border-line py-3 text-sm lowercase text-ink-soft hover:bg-paper hover:text-ink"
              >
                leave
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
