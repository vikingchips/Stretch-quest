import { describe, expect, it } from 'vitest';
import { isMissingColumn } from './cloudSync';

/**
 * The guard that keeps a build deployed ahead of its migration from taking
 * the whole sync down. It cannot be exercised against a real project from
 * here, so the shapes Postgres and PostgREST actually return are pinned.
 */
describe('isMissingColumn', () => {
  it('recognises the undefined-column code', () => {
    expect(isMissingColumn({ code: '42703', message: 'column "finger" does not exist' })).toBe(
      true,
    );
  });

  it('recognises the message alone, in case the code is not passed through', () => {
    expect(
      isMissingColumn({ message: 'column user_state.finger does not exist' }),
    ).toBe(true);
  });

  it('leaves every other failure alone', () => {
    // A network drop or an RLS refusal has to keep surfacing as an error;
    // silently retrying without the column would hide a real problem.
    expect(isMissingColumn(null)).toBe(false);
    expect(isMissingColumn({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
    expect(isMissingColumn({ message: 'Failed to fetch' })).toBe(false);
    expect(isMissingColumn({ code: '42501', message: 'permission denied' })).toBe(false);
  });

  it('does not fire for some other missing column', () => {
    // Only the one this fallback knows how to do without. A different column
    // going missing is a real problem and has to keep surfacing.
    expect(isMissingColumn({ message: 'column "routines" does not exist' })).toBe(false);
    expect(
      isMissingColumn({ code: '42703', message: 'column "sessions" does not exist' }),
    ).toBe(false);
  });
});
