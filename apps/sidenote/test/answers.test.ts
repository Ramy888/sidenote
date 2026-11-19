import { describe, it, expect } from 'vitest';
import { answers } from '../src/app/answers.ts';
import type { TimelineFact } from '../src/pipeline/timeline.ts';

const f = (kind: TimelineFact['kind'], entity: string, date: string): TimelineFact =>
  ({ kind, entity, date, min: date, max: date, basis: 'phrase', needsConfirming: false, evidence: {} as any });

describe('the three answers a report needs', () => {
  const full = [f('medicine_started', 'atorvastatin', '2026-03-01'), f('symptom_started', 'muscle aches', '2026-03-15'),
    f('medicine_stopped', 'atorvastatin', '2026-04-01'), f('symptom_gone', 'muscle aches', '2026-04-06'),
    f('medicine_restarted', 'atorvastatin', '2026-04-20'), f('symptom_returned', 'muscle aches', '2026-04-23')];
  it('onset, dechallenge and rechallenge with day counts', () => {
    expect(answers(full, 'atorvastatin', 'muscle aches')).toEqual({
      onset: { date: '2026-03-15', daysAfterStart: 14 },
      dechallenge: { answer: 'yes', stopped: '2026-04-01', gone: '2026-04-06', days: 5 },
      rechallenge: { answer: 'yes', restarted: '2026-04-20', returned: '2026-04-23', days: 3 },
    });
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
