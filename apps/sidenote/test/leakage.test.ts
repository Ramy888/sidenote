import { describe, it, expect } from 'vitest';
import { leaks } from '../src/ai/leakage';

describe('leakage check', () => {
  const other = ['Dad said his chest hurts when he climbs the stairs'];
  it('flags a shared 3-gram from another sender', () => {
    expect(leaks('patient reports chest hurts when walking', other, [], [])).toContain('chest hurts when');
  });
  it('flags a 15-character run even without 3 shared words', () => {
    expect(leaks('climbsthestairs: climbs the stairs', other, [], []).some(x => x.includes('climbs the stai'))).toBe(true);
  });
  it('allows an echo the patient wrote too, and allowlisted vocabulary', () => {
    expect(leaks('my chest hurts when I walk', other, ['yes my chest hurts when I walk'], [])).toEqual([]);
    expect(leaks('term: chest pain on exertion', ['I get chest pain on exertion'], [], ['chest pain on exertion'])).toEqual([]);
  });
  it('passes text with nothing in common', () => {
    expect(leaks('{"term":"R001","day":-3}', other, [], [])).toEqual([]);
  });
});
