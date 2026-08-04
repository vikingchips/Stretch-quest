import type { Segment } from './timeline';

export type SessionStatus = 'running' | 'paused' | 'finished';

export interface SessionState {
  segments: Segment[];
  index: number;
  remainingMs: number;
  /** Time spent in the current segment. The display for self-paced work. */
  elapsedMs: number;
  status: SessionStatus;
  /** Accumulated stretch time (only 'stretch' segments count). */
  activeMs: number;
  /** Step indexes fully completed (every stretch segment of the step finished). */
  completedSteps: number[];
  stepsTotal: number;
}

export type SessionEvent =
  | { type: 'TICK'; deltaMs: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SKIP' }
  | { type: 'BACK' }
  /** Finish a self-paced segment — the rep-work equivalent of the clock running out. */
  | { type: 'ADVANCE' };

export function initSession(segments: Segment[], stepsTotal: number): SessionState {
  return {
    segments,
    index: 0,
    remainingMs: (segments[0]?.durationSec ?? 0) * 1000,
    elapsedMs: 0,
    status: segments.length > 0 ? 'running' : 'finished',
    activeMs: 0,
    completedSteps: [],
    stepsTotal,
  };
}

function firstSegmentOfStep(segments: Segment[], stepIndex: number): number {
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s.stepIndex === stepIndex && s.kind !== 'prep' && s.kind !== 'rest') return i;
  }
  return -1;
}

/** True when no stretch segment for this step exists after position `index`. */
function stepFinishedAt(segments: Segment[], index: number, stepIndex: number): boolean {
  for (let i = index + 1; i < segments.length; i++) {
    if (segments[i].stepIndex === stepIndex && segments[i].kind === 'stretch') return false;
  }
  return true;
}

function enterSegment(state: SessionState, index: number): SessionState {
  if (index >= state.segments.length) {
    return {
      ...state,
      index: state.segments.length,
      remainingMs: 0,
      elapsedMs: 0,
      status: 'finished',
    };
  }
  return {
    ...state,
    index,
    remainingMs: state.segments[index].durationSec * 1000,
    elapsedMs: 0,
    status: 'running',
  };
}

function completeCurrentSegment(state: SessionState): SessionState {
  const segment = state.segments[state.index];
  let completedSteps = state.completedSteps;
  if (
    segment.kind === 'stretch' &&
    stepFinishedAt(state.segments, state.index, segment.stepIndex) &&
    !completedSteps.includes(segment.stepIndex)
  ) {
    completedSteps = [...completedSteps, segment.stepIndex];
  }
  return enterSegment({ ...state, completedSteps }, state.index + 1);
}

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  if (state.status === 'finished') return state;

  switch (event.type) {
    case 'TICK': {
      if (state.status !== 'running') return state;
      const segment = state.segments[state.index];
      const elapsedMs = state.elapsedMs + event.deltaMs;

      // Self-paced work never times out — it counts up and waits for ADVANCE.
      if (segment.selfPaced) {
        const activeMs =
          segment.kind === 'stretch' ? state.activeMs + event.deltaMs : state.activeMs;
        return { ...state, elapsedMs, activeMs };
      }

      const consumed = Math.min(event.deltaMs, state.remainingMs);
      const activeMs =
        segment.kind === 'stretch' ? state.activeMs + consumed : state.activeMs;
      const remainingMs = state.remainingMs - event.deltaMs;
      if (remainingMs > 0) {
        return { ...state, remainingMs, elapsedMs, activeMs };
      }
      return completeCurrentSegment({ ...state, activeMs });
    }

    case 'ADVANCE': {
      // Only self-paced segments end on demand; elsewhere SKIP is the escape
      // hatch, and it deliberately does not count the step as completed.
      if (!state.segments[state.index]?.selfPaced) return state;
      return completeCurrentSegment(state);
    }

    case 'PAUSE':
      return state.status === 'running' ? { ...state, status: 'paused' } : state;

    case 'RESUME':
      return state.status === 'paused' ? { ...state, status: 'running' } : state;

    case 'SKIP': {
      // Jump to the first segment of the next step; skipped steps never
      // enter completedSteps. Skipping the last step ends the session.
      const currentStep = state.segments[state.index].stepIndex;
      const target = firstSegmentOfStep(state.segments, currentStep + 1);
      if (target === -1) {
        return { ...state, index: state.segments.length, remainingMs: 0, status: 'finished' };
      }
      return enterSegment(state, target);
    }

    case 'BACK': {
      const segment = state.segments[state.index];
      if (segment.kind === 'rest') {
        // A rest belongs to the upcoming step; BACK redoes the step just done.
        const prevStep = segment.stepIndex - 1;
        const prev = firstSegmentOfStep(state.segments, prevStep);
        if (prev === -1) return state;
        return enterSegment(
          { ...state, completedSteps: state.completedSteps.filter((s) => s !== prevStep) },
          prev,
        );
      }
      const currentStart = firstSegmentOfStep(state.segments, segment.stepIndex);
      // Within the first 2s of a step, BACK jumps to the previous step;
      // afterwards it restarts the current step.
      const atStepStart = state.index === currentStart && state.elapsedMs < 2000;
      if (atStepStart && segment.stepIndex > 0) {
        const prev = firstSegmentOfStep(state.segments, segment.stepIndex - 1);
        return enterSegment(
          { ...state, completedSteps: state.completedSteps.filter((s) => s !== segment.stepIndex - 1) },
          prev,
        );
      }
      if (currentStart === -1 || segment.kind === 'prep') return state;
      return enterSegment(state, currentStart);
    }

    default:
      return state;
  }
}

/** Fraction [0,1] of the whole timeline that has elapsed. */
export function overallProgress(state: SessionState): number {
  const totalMs = state.segments.reduce((sum, s) => sum + s.durationSec * 1000, 0);
  if (totalMs === 0) return 1;
  let elapsed = 0;
  for (let i = 0; i < state.index && i < state.segments.length; i++) {
    elapsed += state.segments[i].durationSec * 1000;
  }
  if (state.index < state.segments.length) {
    const segment = state.segments[state.index];
    // A self-paced segment can run past its estimate; it never reads as more
    // than its own share of the bar.
    elapsed += segment.selfPaced
      ? Math.min(state.elapsedMs, segment.durationSec * 1000)
      : segment.durationSec * 1000 - state.remainingMs;
  }
  return Math.min(1, elapsed / totalMs);
}
