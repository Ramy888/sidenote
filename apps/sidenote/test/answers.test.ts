import { describe, it, expect } from 'vitest';
import { answers } from '../src/app/answers.ts';
import type { TimelineFact } from '../src/pipeline/timeline.ts';

const f = (kind: TimelineFact['kind'], entity: string, date: string, min = date, max = date): TimelineFact =>
  ({ kind, entity, date, min, max, basis: 'phrase', needsConfirming: min !== max, evidence: {} as any });

describe('the three answers a report needs', () => {
  const full = [f('medicine_started', 'atorvastatin', '2026-03-01'), f('symptom_started', 'muscle aches', '2026-03-15'),
    f('medicine_stopped', 'atorvastatin', '2026-04-01'), f('symptom_gone', 'muscle aches', '2026-04-06'),
    f('medicine_restarted', 'atorvastatin', '2026-04-20'), f('symptom_returned', 'muscle aches', '2026-04-23')];
  it('onset, dechallenge and rechallenge with day counts', () => {
    expect(answers(full, 'atorvastatin', 'muscle aches')).toEqual({
      onset: { when: { min: '2026-03-15', max: '2026-03-15' }, started: { min: '2026-03-01', max: '2026-03-01' }, daysAfterStart: { lo: 14, hi: 14 } },
      dechallenge: { answer: 'yes', stopped: { min: '2026-04-01', max: '2026-04-01' }, gone: { min: '2026-04-06', max: '2026-04-06' }, days: { lo: 5, hi: 5 } },
      rechallenge: { answer: 'yes', restarted: { min: '2026-04-20', max: '2026-04-20' }, returned: { min: '2026-04-23', max: '2026-04-23' }, days: { lo: 3, hi: 3 } },
    });
  });
  it('a range stays a range, and day counts span it (never a midpoint)', () => {
    const a = answers([f('medicine_started', 'x', '2026-03-01', '2026-03-01', '2026-03-28'), f('symptom_started', 's', '2026-04-10', '2026-04-03', '2026-04-17')], 'x', 's');
    expect(a.onset).toEqual({ when: { min: '2026-04-03', max: '2026-04-17' }, started: { min: '2026-03-01', max: '2026-03-28' }, daysAfterStart: { lo: 6, hi: 47 } });
  });
  it('stopped with no sign it went: unknown; never stopped: not stopped; restarted without a return: unknown', () => {
    const a = answers(full.filter(x => x.kind !== 'symptom_gone' && x.kind !== 'symptom_returned'), 'atorvastatin', 'muscle aches');
    expect(a.dechallenge.answer).toBe('unknown');
    expect(a.rechallenge.answer).toBe('unknown');
    expect(answers(full.slice(0, 2), 'atorvastatin', 'muscle aches').dechallenge.answer).toBe('notStopped');
    expect(answers(full.slice(0, 4), 'atorvastatin', 'muscle aches').rechallenge.answer).toBe('notRestarted');
  });
  it('a gone date before the stop does not count as dechallenge', () => {
    const a = answers([f('medicine_started', 'x', '2026-01-01'), f('symptom_started', 's', '2026-01-05'), f('symptom_gone', 's', '2026-01-10'), f('medicine_stopped', 'x', '2026-01-20')], 'x', 's');
    expect(a.dechallenge.answer).toBe('unknown');
  });
  it('no onset found', () => {
    expect(answers([f('medicine_started', 'x', '2026-01-01')], 'x', 's').onset).toBeNull();
  });
});
