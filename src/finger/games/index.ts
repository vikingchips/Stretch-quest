import { cometRun } from './comet';
import { orbitDecay } from './decay';
import { pulsar } from './pulsar';
import type { GameId, GameSpec } from './types';

/**
 * Every game the shell can mount. A module registers here and nowhere else —
 * the list page, the routes and the score keys all follow from this map.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAMES: Partial<Record<GameId, GameSpec<any>>> = {
  'comet-run': cometRun,
  pulsar,
  'orbit-decay': orbitDecay,
};
