import { describe, expect, it } from 'vitest';
import {
  isValidName,
  isValidPin,
  nameToIdentity,
  nameToSlug,
  pinToPassword,
} from './identity';

describe('nameToSlug', () => {
  it('folds Swedish characters to their base letters', () => {
    expect(nameToSlug('Måns Brandt')).toBe('mans-brandt');
    expect(nameToSlug('Åsa Öberg')).toBe('asa-oberg');
  });

  it('is stable across casing, spacing and punctuation', () => {
    const forms = ['Måns Brandt', 'måns  brandt', '  MÅNS BRANDT  ', 'Måns-Brandt'];
    const slugs = new Set(forms.map(nameToSlug));
    expect(slugs.size).toBe(1);
  });

  it('collapses runs of separators and trims the edges', () => {
    expect(nameToSlug('  --a   b--  ')).toBe('a-b');
  });

  it('drops characters with no ascii equivalent', () => {
    expect(nameToSlug('王 Wang')).toBe('wang');
  });

  it('caps length so the address stays sane', () => {
    expect(nameToSlug('a'.repeat(200))).toHaveLength(64);
  });
});

describe('isValidName', () => {
  it('accepts ordinary names', () => {
    expect(isValidName('Måns')).toBe(true);
    expect(isValidName('Jo')).toBe(true);
  });

  it('rejects names that fold away to nothing usable', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
    expect(isValidName('-')).toBe(false);
    expect(isValidName('a')).toBe(false);
  });
});

describe('isValidPin', () => {
  it('accepts exactly four digits', () => {
    expect(isValidPin('0000')).toBe(true);
    expect(isValidPin(' 1234 ')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});

describe('credentials', () => {
  it('builds an address from the folded name', () => {
    expect(nameToIdentity('Måns Brandt')).toBe('mans-brandt@stretchquest.app');
  });

  it('uses a real top-level domain, since Supabase validates it', () => {
    expect(nameToIdentity('a b')).not.toMatch(/\.(invalid|local|test|example)$/);
  });

  it('pads the pin past the six-character minimum', () => {
    expect(pinToPassword('1234').length).toBeGreaterThanOrEqual(6);
    expect(pinToPassword(' 1234 ')).toBe(pinToPassword('1234'));
  });
});
