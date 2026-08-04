/** XP required to advance from level L to L+1. */
export function xpForLevelUp(level: number): number {
  return 100 + 50 * (level - 1);
}

export function levelForXp(xp: number): number {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevelUp(level)) {
    remaining -= xpForLevelUp(level);
    level++;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP earned within the current level. */
  intoLevel: number;
  /** XP needed to reach the next level. */
  toNext: number;
}

export function progressWithinLevel(xp: number): LevelProgress {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevelUp(level)) {
    remaining -= xpForLevelUp(level);
    level++;
  }
  return { level, intoLevel: remaining, toNext: xpForLevelUp(level) };
}

const TITLES: Array<[number, string]> = [
  [30, 'Human Noodle'],
  [25, 'Elastic Legend'],
  [20, 'Pretzel Master'],
  [15, 'Rubber Band'],
  [12, 'Limber Lynx'],
  [10, 'Elastic Hero'],
  [8, 'Supple Sportsperson'],
  [6, 'Flexible Friend'],
  [5, 'Bendy Beginner'],
  [3, 'Limber Larva'],
  [2, 'Warming Up'],
  [1, 'Stiff Board'],
];

export function titleForLevel(level: number): string {
  for (const [min, title] of TITLES) {
    if (level >= min) return title;
  }
  return 'Stiff Board';
}
