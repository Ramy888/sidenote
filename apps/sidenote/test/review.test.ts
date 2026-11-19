import { describe, it, expect } from 'vitest';
import { startReview, confirm, reject, changeDate, pickDate } from '../src/app/review.ts';
import type { TimelineFact } from '../src/pipeline/timeline.ts';
import type { Medicine } from '../src/app/medicines.ts';

const f = (kind: TimelineFact['kind'], entity: string, date: string, extra: Partial<TimelineFact> = {}): TimelineFact =>
  ({ kind, entity, date, min: date, max: date, basis: 'phrase', needsConfirming: false, evidence: {} as any, ...extra });
const med = (name: string, startKind: Medicine['startKind'], start = ''): Medicine => ({ name, strength: '', startKind, start });

describe('reviewing the timeline', () => {
  it('chat facts start as found or needs confirming', () => {
    const r = startReview([f('medicine_started', 'ramipril', '2026-03-01'), f('symptom_started', 'cough', '2026-03-09', { needsConfirming: true, min: '2026-03-07', max: '2026-03-11' })], []);
    expect(r.map(x => x.status)).toEqual(['found', 'needsConfirming']);
  });
  it("adds a typed start the chat didn't have, as the person's own answer", () => {
    const r = startReview([f('symptom_started', 'cough', '2026-03-09')], [med('ramipril', 'exact', '2026-03-01'), med('metformin', 'unknown')]);
    expect(r.map(x => [x.kind, x.entity, x.date, x.status, x.source])).toEqual([
      ['medicine_started', 'ramipril', '2026-03-01', 'confirmed', 'typed'], ['symptom_started', 'cough', '2026-03-09', 'found', 'chat']]);
  });
  it('a typed date that disagrees with the chat by more than 2 days becomes "two dates" until one is picked', () => {
    const r = startReview([f('medicine_started', 'ramipril', '2026-03-01')], [med('ramipril', 'exact', '2026-02-20')]);
    expect(r[0]).toMatchObject({ status: 'conflict', date: '2026-03-01', altDate: '2026-02-20' });
    expect(pickDate(r, r[0].id, '2026-02-20')[0]).toMatchObject({ status: 'confirmed', date: '2026-02-20', min: '2026-02-20', max: '2026-02-20' });
    expect(startReview([f('medicine_started', 'ramipril', '2026-03-01')], [med('ramipril', 'exact', '2026-03-02')])[0].status).toBe('found');
  });
  it('confirm, change date and not right', () => {
    const r = startReview([f('symptom_started', 'cough', '2026-03-09', { needsConfirming: true, min: '2026-03-07', max: '2026-03-11' })], []);
    expect(confirm(r, r[0].id)[0].status).toBe('confirmed');
    expect(changeDate(r, r[0].id, '2026-03-08')[0]).toMatchObject({ status: 'confirmed', date: '2026-03-08', min: '2026-03-08', max: '2026-03-08' });
    expect(reject(r, r[0].id)[0].status).toBe('rejected');
  });
});
