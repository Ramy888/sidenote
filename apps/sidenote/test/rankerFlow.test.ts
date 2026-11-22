import { describe, it, expect } from 'vitest';
import { planCoding } from '../src/app/coding.ts';
import { rankerInput, checkRanking } from '../src/app/ranker.ts';
import type { Reviewed } from '../src/app/review.ts';

let n = 0;
const fact = (kind: Reviewed['kind'], entity: string, date: string, quote = '', own = true): Reviewed => ({
  id: n++, kind, entity, date, min: date, max: date, basis: 'phrase', needsConfirming: false, status: 'confirmed', source: 'chat',
  evidence: { kind: kind as any, medicine: kind.startsWith('medicine') ? entity : '', symptom: kind.startsWith('symptom') ? entity : '', quote, messageId: 1, sender: own ? 'Dad' : 'Tom', own, date, min: date, max: date, basis: 'phrase' },
});

describe('coding the symptoms', () => {
  it('lookup first, on the name or any quote; the model only for own words; others stay uncoded', () => {
    const plan = planCoding([
      fact('symptom_started', 'ankle swelling', '2026-03-05', 'my ankles are swollen'),
      fact('symptom_started', 'funny turns', '2026-03-06', 'having funny turns again'),
      fact('symptom_started', 'odd twitch', '2026-03-07', 'Dad has an odd twitch near his eye', false),
    ]);
    expect(plan.map(p => [p.entity, p.how, p.term ?? null])).toEqual([
      ['ankle swelling', 'lookup', 'SN051'], ['funny turns', 'model', null], ['odd twitch', 'uncoded', null]]);
    expect(plan[1].message).toEqual({ sender: 'Dad', text: 'having funny turns again' });
  });
});

describe('suspect ranker: input and the check on its answer', () => {
  const facts = [fact('medicine_started', 'amlodipine', '2026-03-01'), fact('medicine_started', 'metformin', '2025-01-01'),
    fact('symptom_started', 'ankle swelling', '2026-03-10', 'my ankles are swollen'), fact('medicine_stopped', 'amlodipine', '2026-04-01'),
    fact('symptom_gone', 'ankle swelling', '2026-04-05', 'ankles back to normal')];
  const terms = new Map([['ankle swelling', 'SN051']]);
  const meds = [{ name: 'amlodipine', strength: '', startKind: 'unknown' as const, start: '' }, { name: 'metformin', strength: '', startKind: 'before' as const, start: '' }];
  const input = rankerInput(facts, meds, terms, '2026-05-01');
  it('sends symptom facts as term ids with day offsets, and the yes/no/unknown per pair', () => {
    expect(input.facts.map(f => [f.term, f.kind, f.day])).toEqual([['SN051', 'symptom_started', -52], ['SN051', 'symptom_gone', -26]]);
    expect(input.pairs).toEqual(expect.arrayContaining([{ medicine: 'amlodipine', term: 'SN051', dechallenge: 'yes', rechallenge: 'unknown' }, { medicine: 'metformin', term: 'SN051', dechallenge: 'unknown', rechallenge: 'unknown' }]));
    expect(input.medicines).toEqual([{ name: 'amlodipine', start_kind: 'exact', start: -61 }, { name: 'metformin', start_kind: 'exact', start: -485 }]);
    expect(input.labelFacts.some(l => l.id === 'L-AMLODIPINE-SN051')).toBe(true);
  });
  it('keeps only reasons the data supports, and drops unknown medicines', () => {
    const out = checkRanking(JSON.stringify({ ranked: [
      { medicine: 'amlodipine', reasons: ['TIMING_FITS', 'DECHALLENGE_POSITIVE', 'ON_LABEL', 'RECHALLENGE_POSITIVE'], facts: [input.facts[0].id, 999] },
      { medicine: 'aspirin', reasons: ['TIMING_FITS'], facts: [] },
      { medicine: 'metformin', reasons: ['DECHALLENGE_POSITIVE', 'TIMING_FITS'], facts: [] }] }), input);
    expect(out).toEqual([
      { medicine: 'amlodipine', reasons: ['TIMING_FITS', 'DECHALLENGE_POSITIVE', 'ON_LABEL'], facts: [input.facts[0].id] },
      { medicine: 'metformin', reasons: ['TIMING_FITS'], facts: [] }]);
  });
  it('a medicine ranked twice keeps only its first place (seen from Nano offline, Nov 22)', () => {
    const out = checkRanking(JSON.stringify({ ranked: [
      { medicine: 'amlodipine', reasons: ['TIMING_FITS'], facts: [] },
      { medicine: 'metformin', reasons: ['TIMING_FITS'], facts: [] },
      { medicine: 'metformin', reasons: [], facts: [] }] }), input);
    expect(out?.map(r => r.medicine)).toEqual(['amlodipine', 'metformin']);
  });
  it('unreadable output is no suggestion', () => {
    expect(checkRanking('not json', input)).toBeNull();
    expect(checkRanking('{"ranked":[]}', input)).toBeNull();
  });
});
