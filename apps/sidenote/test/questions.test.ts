import { describe, it, expect } from 'vitest';
import { questionsToFacts, WHEN_RANGES } from '../src/app/questions.ts';

const today = '2026-11-19';
describe('the 5 questions become "you told us" facts', () => {
  it('a known date is exact; a choice is a range of days before today', () => {
    expect(WHEN_RANGES.week1to2).toEqual([7, 14]);
    const f = questionsToFacts({ problem: 'my ankles swell up', started: { date: '2026-11-01' }, stopped: { when: { choice: 'week1to2' } }, wentAway: { when: { choice: 'under1week' } }, restarted: 'no' }, 'amlodipine', 'Dad', today);
    expect(f.map(x => [x.kind, x.entity, x.min, x.max, x.status, x.source])).toEqual([
      ['symptom_started', 'my ankles swell up', '2026-11-01', '2026-11-01', 'confirmed', 'typed'],
      ['medicine_stopped', 'amlodipine', '2026-11-05', '2026-11-12', 'confirmed', 'typed'],
      ['symptom_gone', 'my ankles swell up', '2026-11-13', '2026-11-19', 'confirmed', 'typed'],
    ]);
    expect(f[0].evidence).toMatchObject({ own: true, quote: 'my ankles swell up', sender: 'Dad' });
  });
  it('restarted and it came back adds both facts; not stopped adds none', () => {
    const f = questionsToFacts({ problem: 'cough', started: { choice: 'month1to3' }, stopped: 'no', wentAway: 'unsure', restarted: { when: { date: '2026-11-10' }, cameBack: { date: '2026-11-12' } } }, 'ramipril', 'Me', today);
    expect(f.map(x => x.kind)).toEqual(['symptom_started']);
  });
});
