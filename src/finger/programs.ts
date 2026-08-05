import { ABRAHANGS_BAND, MAX_HANGS_BAND } from './constants';
import type { Grip } from './types';

export type ProgramId = 'abrahangs' | 'max-hangs';

export interface HangProgram {
  id: ProgramId;
  name: string;
  description: string;
  /** Fraction of that hand's own max. Never a fraction of bodyweight. */
  band: { lo: number; hi: number; target?: number };
  hangSec: number;
  restSec: number;
  reps: number;
  /** Worked in order; both hands within each grip. */
  grips: Grip[];
  /** When to run it. Shown before you start, like Routine.guidance. */
  guidance: string;
  caution?: string;
}

export const PROGRAMS: Record<ProgramId, HangProgram> = {
  abrahangs: {
    id: 'abrahangs',
    name: 'abrahangs',
    description: 'the daily base. light, frequent, both grips.',
    band: ABRAHANGS_BAND,
    hangSec: 10,
    restSec: 20,
    reps: 6,
    grips: ['half-crimp', 'front-3-drag'],
    guidance:
      'twice a day, at least six hours apart. it should feel easy — this is a collagen stimulus, not a strength one.',
    caution:
      'low load is the point. the study got its result at about forty percent of max; heavier is not better here.',
  },
  'max-hangs': {
    id: 'max-hangs',
    name: 'max hangs',
    description: 'the strength stimulus. heavy, half crimp, fully rested.',
    band: MAX_HANGS_BAND,
    hangSec: 10,
    restSec: 120,
    reps: 6,
    grips: ['half-crimp'],
    guidance: 'two or three times a week, fresh. warm up properly first.',
    caution: 'not on a day your fingers already feel worked.',
  },
};

export const PROGRAM_LIST: HangProgram[] = [PROGRAMS.abrahangs, PROGRAMS['max-hangs']];

/**
 * The headline finding, and the reason both programs exist rather than the
 * heavier one alone: the combination was the study's only large effect.
 */
export const COMBINATION_MESSAGE =
  'the one large finding was the combination: abrahangs and max hangs together beat either on its own.';

export function programById(id: string): HangProgram | undefined {
  return PROGRAMS[id as ProgramId];
}
