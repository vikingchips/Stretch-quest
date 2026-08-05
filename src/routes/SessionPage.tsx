import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Modality } from '../types';
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
import { BodyMark } from '../components/BodyMark';
import { PoseFigure } from '../components/PoseFigure';
import { hasAnimation, VIEW_AZIMUTH } from '../anim/poses';
import { Icon } from '../components/Icon';
import { formatClock } from '../lib/format';

const KIND_STYLE: Record<string, { label: string; color: string }> = {
  prep: { label: 'get ready', color: 'var(--color-fjord-deep)' },
  stretch: { label: 'work', color: 'var(--color-pine-deep)' },
  switch: { label: 'switch sides', color: 'var(--color-fjord-deep)' },
  rest: { label: 'rest', color: 'var(--color-ink-soft)' },
};

/** The work segment is named after what you are actually doing. */
const MODALITY_LABEL: Record<Modality, string> = {
  dynamic: 'move',
  static: 'hold',
  loaded: 'load',
  eccentric: 'lower slowly',
  activation: 'activate',
  potentiation: 'prime',
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
      <main className="flex min-h-dvh items-center justify-center px-6">
        <p className="text-ink-soft">Routine not found.</p>
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
  const phaseLabel =
    segment.kind === 'stretch' && exercise ? MODALITY_LABEL[exercise.modality] : style.label;
  const paused = state.status === 'paused';
  const progressPct = Math.round(overallProgress(state) * 100);
  const selfPaced = Boolean(segment.selfPaced);
  const animated = Boolean(segment.exerciseId && hasAnimation(segment.exerciseId));
  const clock = selfPaced ? state.elapsedMs / 1000 : state.remainingMs / 1000;

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
          {Math.min(state.completedSteps.length + 1, routine.steps.length)}/{routine.steps.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="text-xs lowercase tracking-[0.18em]" style={{ color: style.color }}>
          {phaseLabel}
          {segment.sideLabel ? ` · ${segment.sideLabel}` : ''}
          {segment.setTotal ? ` · set ${segment.setIndex} of ${segment.setTotal}` : ''}
        </span>

        {segment.kind === 'stretch' && exercise ? (
          <>
            <div className="mt-8 flex flex-col items-center">
              {animated ? (
                <PoseFigure
                  exerciseId={segment.exerciseId!}
                  size={150}
                  azimuth={
                    settings.viewAngle === 'auto' ? undefined : VIEW_AZIMUTH[settings.viewAngle]
                  }
                />
              ) : (
                <BodyMark areas={exercise.targetAreas} size="xl" />
              )}
              {animated && (
                <div className="mt-3 flex gap-5">
                  {(['front', 'three-quarter', 'side'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => settings.setViewAngle(view)}
                      className={`text-[11px] lowercase ${
                        settings.viewAngle === view ? 'text-ink' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      {view === 'three-quarter' ? 'angled' : view}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <h1 className="mt-8 text-2xl lowercase">{exercise.name}</h1>
            <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
              {exercise.instructions}
            </p>
          </>
        ) : (
          <div className="mt-10 flex h-48 flex-col items-center justify-center">
            {upNextExercise ? (
              <>
                <span className="text-xs lowercase text-ink-soft">up next</span>
                <p className="mt-2 text-xl lowercase">
                  {upNextExercise.name}
                  {upNext?.sideLabel ? ` · ${upNext.sideLabel}` : ''}
                </p>
              </>
            ) : (
              <span className="text-sm lowercase text-ink-soft">breathe</span>
            )}
          </div>
        )}

        {segment.reps && (
          <div className="mt-8 text-sm lowercase text-ink-soft">{segment.reps} reps</div>
        )}

        <div className="display mt-6 text-7xl tabular-nums leading-none">{formatClock(clock)}</div>
        {selfPaced && (
          <div className="mt-2 text-xs lowercase text-ink-soft">
            counting up · take the tempo you need
          </div>
        )}

        {exercise?.tips && segment.kind === 'stretch' && (
          <p className="measure mt-6 border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-soft">
            {exercise.tips}
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
            dispatch(selfPaced ? { type: 'ADVANCE' } : { type: paused ? 'RESUME' : 'PAUSE' });
          }}
          className="bg-pine-deep p-6 text-paper hover:brightness-110"
          aria-label={selfPaced ? 'Set done' : paused ? 'Resume' : 'Pause'}
        >
          <Icon
            name={selfPaced ? 'check' : paused ? 'play' : 'pause'}
            size={24}
            strokeWidth={1.4}
          />
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
                keep stretching
              </button>
              <button
                onClick={() => navigate(-1)}
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
