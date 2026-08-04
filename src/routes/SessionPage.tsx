import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoutinesStore } from '../store/routinesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useProgressStore } from '../store/progressStore';
import { EXERCISE_BY_ID } from '../data/exercises';
import { buildTimeline } from '../session/timeline';
import { overallProgress } from '../session/sessionReducer';
import { useSessionTimer } from '../session/useSessionTimer';
import {
  initAudio,
  playComplete,
  playCountdownTick,
  playSegmentStart,
  playSideSwitch,
} from '../session/audio';
import { ScreenWakeLock } from '../session/wakeLock';
import { ExerciseArt } from '../components/ExerciseArt';
import { formatClock } from '../lib/format';

const KIND_STYLE: Record<string, { label: string; color: string }> = {
  prep: { label: 'Get ready', color: 'var(--color-gold)' },
  stretch: { label: 'Stretch', color: 'var(--color-brand)' },
  switch: { label: 'Switch sides', color: 'var(--color-gold)' },
  rest: { label: 'Rest', color: 'var(--color-frost)' },
};

export function SessionPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  const getRoutine = useRoutinesStore((s) => s.getRoutine);
  const settings = useSettingsStore();
  const completeSession = useProgressStore((s) => s.completeSession);

  const routine = routineId ? getRoutine(routineId) : undefined;
  const segments = useMemo(
    () => (routine ? buildTimeline(routine, settings) : []),
    // Settings changes mid-session are ignored on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routine?.id],
  );

  const { state, dispatch } = useSessionTimer(segments, routine?.steps.length ?? 0);
  const startedAtRef = useRef(new Date().toISOString());
  const finishedRef = useRef(false);
  const prevIndexRef = useRef(0);
  const prevCountdownRef = useRef<number>(Infinity);
  const [confirmQuit, setConfirmQuit] = useState(false);

  // Keep the screen awake for the whole session.
  useEffect(() => {
    const lock = new ScreenWakeLock();
    void lock.request();
    return () => lock.release();
  }, []);

  // Audio: segment-change cues.
  const segment = state.index < segments.length ? segments[state.index] : undefined;
  useEffect(() => {
    if (!settings.soundEnabled || state.index === prevIndexRef.current) return;
    prevIndexRef.current = state.index;
    prevCountdownRef.current = Infinity;
    if (!segment) return;
    if (segment.kind === 'switch') playSideSwitch();
    else playSegmentStart();
  }, [state.index, segment, settings.soundEnabled]);

  // Audio: 3-2-1 countdown ticks near the end of stretch segments.
  useEffect(() => {
    if (!settings.soundEnabled || segment?.kind !== 'stretch') return;
    const secLeft = Math.ceil(state.remainingMs / 1000);
    if (secLeft <= 3 && secLeft >= 1 && secLeft !== prevCountdownRef.current) {
      prevCountdownRef.current = secLeft;
      playCountdownTick();
    }
  }, [state.remainingMs, segment, settings.soundEnabled]);

  // Finalize exactly once when the machine reaches 'finished'.
  useEffect(() => {
    if (state.status !== 'finished' || finishedRef.current || !routine) return;
    finishedRef.current = true;
    if (settings.soundEnabled) playComplete();
    const summary = completeSession({
      routine,
      startedAt: startedAtRef.current,
      activeSec: Math.round(state.activeMs / 1000),
      stepsCompleted: state.completedSteps.length,
      stepsTotal: routine.steps.length,
    });
    navigate('/complete', { replace: true, state: summary });
  }, [state.status, state.activeMs, state.completedSteps, routine, completeSession, navigate, settings.soundEnabled]);

  if (!routine || segments.length === 0) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="font-bold text-ink-dim">Routine not found.</p>
      </main>
    );
  }
  if (!segment) return null;

  const exercise = segment.exerciseId ? EXERCISE_BY_ID[segment.exerciseId] : undefined;
  const upNext =
    segment.kind !== 'stretch'
      ? segments.slice(state.index + 1).find((s) => s.kind === 'stretch')
      : undefined;
  const upNextExercise = upNext?.exerciseId ? EXERCISE_BY_ID[upNext.exerciseId] : undefined;
  const style = KIND_STYLE[segment.kind];
  const paused = state.status === 'paused';
  const progressPct = Math.round(overallProgress(state) * 100);

  return (
    <main className="flex min-h-dvh flex-col px-4 pb-8 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setConfirmQuit(true)}
          className="text-xl text-ink-dim"
          aria-label="Quit session"
        >
          ✕
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-line/60">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-extrabold text-ink-dim">
          {Math.min(state.completedSteps.length + 1, routine.steps.length)}/{routine.steps.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          className="mb-3 rounded-full px-4 py-1 text-sm font-extrabold uppercase tracking-wider"
          style={{ backgroundColor: `${style.color.startsWith('var') ? 'transparent' : style.color}`, color: style.color, border: `2px solid ${style.color}` }}
        >
          {style.label}
          {segment.sideLabel ? ` · ${segment.sideLabel}` : ''}
        </span>

        {segment.kind === 'stretch' && exercise ? (
          <>
            <ExerciseArt art={exercise.art} size="xl" />
            <h1 className="mt-4 text-2xl font-extrabold">{exercise.name}</h1>
            <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-ink-dim">
              {exercise.instructions}
            </p>
          </>
        ) : (
          <>
            <div className="flex h-40 w-40 items-center justify-center text-8xl">
              {segment.kind === 'rest' ? '😮‍💨' : segment.kind === 'switch' ? '🔁' : '🚦'}
            </div>
            {upNextExercise && (
              <p className="mt-4 text-sm font-bold text-ink-dim">
                Up next: <span className="text-ink">{upNextExercise.name}</span>
                {upNext?.sideLabel ? ` (${upNext.sideLabel})` : ''}
              </p>
            )}
          </>
        )}

        <div
          className="mt-6 text-7xl font-extrabold tabular-nums"
          style={{ color: style.color }}
        >
          {formatClock(state.remainingMs / 1000)}
        </div>
        {exercise?.tips && segment.kind === 'stretch' && (
          <p className="mt-3 max-w-sm text-xs font-semibold text-ink-dim">💡 {exercise.tips}</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          onClick={() => dispatch({ type: 'BACK' })}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-2xl active:scale-95"
          aria-label="Previous"
        >
          ⏮
        </button>
        <button
          onClick={() => {
            initAudio();
            dispatch({ type: paused ? 'RESUME' : 'PAUSE' });
          }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-4xl text-surface shadow-lg shadow-brand/30 active:scale-95"
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? '▶' : '⏸'}
        </button>
        <button
          onClick={() => dispatch({ type: 'SKIP' })}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-2xl active:scale-95"
          aria-label="Skip"
        >
          ⏭
        </button>
      </div>

      {confirmQuit && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-surface/80 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center animate-pop-in">
            <span className="text-4xl">🥺</span>
            <h2 className="mt-2 text-lg font-extrabold">Quit this session?</h2>
            <p className="mt-1 text-sm font-semibold text-ink-dim">
              Progress from this session won't be saved.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmQuit(false)}
                className="flex-1 rounded-2xl bg-brand py-3 font-extrabold text-surface"
              >
                Keep going
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex-1 rounded-2xl bg-line/60 py-3 font-extrabold text-ink-dim"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
