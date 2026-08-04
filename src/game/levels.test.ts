import { describe, expect, it } from 'vitest';
import { levelForXp, progressWithinLevel, xpForLevelUp } from './levels';

describe('levels', () => {
  it('costs 100 XP to leave level 1 and 150 to leave level 2', () => {
    expect(xpForLevelUp(1)).toBe(100);
    expect(xpForLevelUp(2)).toBe(150);
  });

  it('derives levels from cumulative XP', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(249)).toBe(2);
    expect(levelForXp(250)).toBe(3);
  });

  it('reports progress within the current level', () => {
    expect(progressWithinLevel(120)).toEqual({ level: 2, intoLevel: 20, toNext: 150 });
    expect(progressWithinLevel(0)).toEqual({ level: 1, intoLevel: 0, toNext: 100 });
  });
});
