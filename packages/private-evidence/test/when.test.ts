import { describe, it, expect } from 'vitest';
import { resolveWhen } from '../src/evidence/when';

// 2026-03-15 is a Sunday; 2026-05-09 is a Saturday.
const sun = '2026-03-15T21:12:00', sat = '2026-05-09T13:22:00', wed = '2026-02-18T09:00:00';
const d = (text: string, at = sun) => resolveWhen(text, at);

describe('resolveWhen (code dates every fact against its message, never the model)', () => {
  it('same day words', () => {
    for (const t of ['today', 'this morning', 'tonight', 'Started the atorvastatin again tonight', 'so no more from today'])
      expect(d(t)).toMatchObject({ date: '2026-03-15', basis: 'phrase' });
  });
  it('yesterday and the day before', () => {
    expect(d('since yesterday')).toMatchObject({ date: '2026-03-14' });
    expect(d('last night')).toMatchObject({ date: '2026-03-14' });
    expect(d('the day before yesterday')).toMatchObject({ date: '2026-03-13' });
  });
  it('weekdays and the weekend look back to the most recent one before the message', () => {
    expect(d('since Tuesday', wed)).toMatchObject({ date: '2026-02-17' });
    expect(d('on Monday', wed)).toMatchObject({ date: '2026-02-16' });
    expect(d('since Saturday', sun)).toMatchObject({ date: '2026-03-14' });
    expect(d('since the weekend', wed)).toMatchObject({ date: '2026-02-14' });
    expect(d('since Saturday', sat)).toMatchObject({ date: '2026-05-02' });
  });
  it('counts of days, weeks and months, with ranges for fuzzy words', () => {
    expect(d('3 days ago')).toMatchObject({ date: '2026-03-12', min: '2026-03-12', max: '2026-03-12' });
    expect(d('for about a week')).toMatchObject({ date: '2026-03-08', min: '2026-03-06', max: '2026-03-10' });
    expect(d('three or four days', sat)).toMatchObject({ min: '2026-05-05', max: '2026-05-06' });
    expect(d('the last few days')).toMatchObject({ date: '2026-03-12', min: '2026-03-10', max: '2026-03-13' });
    expect(d('two weeks')).toMatchObject({ date: '2026-03-01' });
    expect(d('a couple of days')).toMatchObject({ date: '2026-03-13' });
  });
  it('explicit dates use the message year, or the year before if they would be in the future', () => {
    expect(d('since March 2nd')).toMatchObject({ date: '2026-03-02' });
    expect(d('on 2 Feb')).toMatchObject({ date: '2026-02-02' });
    expect(d('since 20 December')).toMatchObject({ date: '2025-12-20' });
  });
  it('falls back to the message date and says so when there is no time phrase', () => {
    expect(d('Legs much better already!')).toEqual({ date: '2026-03-15', min: '2026-03-15', max: '2026-03-15', basis: 'message' });
    expect(d('')).toMatchObject({ basis: 'message' });
  });
  it('does not read "a week" out of unrelated words', () => {
    expect(d('weekly bin day, no change')).toMatchObject({ basis: 'message' });
  });
});
