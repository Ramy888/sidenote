import { describe, it, expect } from 'vitest';
import { coderPayload, rankerPayload, ownWordsPayload, type RankerInput } from '../src/ai/payload';

const own = new Set(['Margaret', 'Sarah']);
const terms = new Map([['R001', 'muscle pain'], ['R002', 'ankle swelling']]);
const ctx = { medicines: ['atorvastatin', 'amlodipine'], terms, labelFacts: new Map([['L-ATOR-1', 'Myopathy and rhabdomyolysis have been reported.']]) };
const ranker = (): RankerInput => ({
  anchor: 'report_date',
  medicines: [{ name: 'atorvastatin', start_kind: 'exact', start: -40 }],
  facts: [{ term: 'R001', kind: 'symptom_started', day: [-30, -28], sender: 'own', confirmed: true }],
  pairs: [{ medicine: 'atorvastatin', term: 'R001', dechallenge: 'yes', rechallenge: 'unknown' }],
  labelFacts: [{ id: 'L-ATOR-1', text: 'Myopathy and rhabdomyolysis have been reported.' }],
});

describe('coder payload: one short phrase of own words', () => {
  const msg = { sender: 'Margaret', text: 'ugh my legs have been aching since Saturday' };
  it('builds the prompt from the phrase and the public term list only', () => {
    const p = coderPayload('legs have been aching', msg, own, terms).text;
    expect(p).toContain('"legs have been aching"');
    expect(p).toContain('R002: ankle swelling');
    expect(p).not.toContain('Saturday');
  });
  it('refuses a phrase over 8 words', () => {
    expect(() => coderPayload('ugh my legs have been aching so badly since Saturday', { ...msg, text: 'ugh my legs have been aching so badly since Saturday' }, own, terms)).toThrow(/8 words/);
  });
  it("refuses another sender's words", () => {
    expect(() => coderPayload('legs have been aching', { sender: 'Tom', text: msg.text }, own, terms)).toThrow(/own words/);
  });
  it('refuses a phrase that is not in the message', () => {
    expect(() => coderPayload('legs hurt a lot', msg, own, terms)).toThrow(/not in the message/);
  });
});

describe('ranker payload: confirmed, coded facts only', () => {
  it('serialises the allowlisted fields and nothing else', () => {
    const input = ranker() as any;
    input.note = 'Sarah said her legs were killing her';
    input.facts[0].quote = 'my legs are killing me';
    const json = rankerPayload(input, ctx).text;
    expect(json).not.toMatch(/killing|Sarah/);
    expect(Object.keys(JSON.parse(json))).toEqual(['anchor', 'medicines', 'facts', 'pairs', 'labelFacts']);
    expect(Object.keys(JSON.parse(json).facts[0])).toEqual(['term', 'kind', 'day', 'sender']);
  });
  it('refuses a medicine that is not on the confirmed list', () => {
    const input = ranker(); input.medicines[0].name = 'my nan\'s heart pill';
    expect(() => rankerPayload(input, ctx)).toThrow(/medicine/);
  });
  it('refuses free text where a term id belongs', () => {
    const input = ranker(); input.facts[0].term = 'legs killing me';
    expect(() => rankerPayload(input, ctx)).toThrow(/term/);
  });
  it('refuses label text that is not the bundled text for that id', () => {
    const input = ranker(); input.labelFacts[0].text = 'Margaret has had muscle pain since Saturday';
    expect(() => rankerPayload(input, ctx)).toThrow(/label/);
  });
  it('refuses a day offset that is not a whole number or range', () => {
    const input = ranker(); input.facts[0].day = 'last Saturday' as any;
    expect(() => rankerPayload(input, ctx)).toThrow(/day/);
  });
  it('refuses a fact the person has not confirmed', () => {
    const input = ranker(); input.facts[0].confirmed = false;
    expect(() => rankerPayload(input, ctx)).toThrow(/confirmed/);
  });
  it('refuses unknown enum values', () => {
    const input = ranker(); input.pairs[0].dechallenge = 'she stopped it' as any;
    expect(() => rankerPayload(input, ctx)).toThrow(/dechallenge/);
  });
});

describe('own-words payload (no on-device model)', () => {
  it('keeps only the patient and reporter messages', () => {
    const p = ownWordsPayload([
      { id: 1, at: '2026-07-01T09:00:00', sender: 'Margaret', text: 'legs aching' },
      { id: 2, at: '2026-07-01T09:05:00', sender: 'Tom', text: 'Dad says his chest hurts' },
    ], own).text;
    expect(p).toContain('legs aching');
    expect(p).not.toContain('chest');
  });
});
