import { describe, it, expect } from 'vitest';
import { buildDraft, draftText } from '../src/app/report.ts';
import type { Reviewed } from '../src/app/review.ts';

let n = 0;
const fact = (kind: Reviewed['kind'], entity: string, date: string, quote = '', own = true, status: Reviewed['status'] = 'confirmed'): Reviewed => ({
  id: n++, kind, entity, date, min: date, max: date, basis: 'phrase', needsConfirming: false, status, source: 'chat',
  evidence: { kind: kind as any, medicine: '', symptom: '', quote, messageId: 1, sender: own ? 'Margaret' : 'Sarah', own, date, min: date, max: date, basis: 'phrase' },
});
const review = [
  fact('medicine_started', 'atorvastatin', '2026-06-26', 'took my first atorvastatin tonight'),
  fact('symptom_started', 'muscle aches', '2026-07-11', 'my legs have been aching since Saturday'),
  fact('medicine_stopped', 'atorvastatin', '2026-07-19', 'stopped it yesterday'),
  fact('symptom_gone', 'muscle aches', '2026-07-24', 'Mum says the aches have gone', false),
  fact('symptom_started', 'headache', '2026-07-01', 'bad head', true, 'rejected'),
];
const meds = [{ name: 'atorvastatin', strength: '20 mg', startKind: 'unknown' as const, start: '' }];
const coding = [{ entity: 'muscle aches', term: 'SN001', where: 'code' as const }];

describe('report draft (MedWatch 3500B)', () => {
  const d = buildDraft({ review, meds, coding, ranking: null, region: 'US' });
  it('fills dates and the two challenge answers from confirmed facts only', () => {
    expect(d.reaction).toMatchObject({ onset: '2026-07-11', terms: ['myalgia'] });
    expect(d.products[0]).toMatchObject({ name: 'atorvastatin', strength: '20 mg', started: '2026-06-26', stopped: '2026-07-19', dechallenge: 'Yes', rechallenge: "Didn't restart" });
    expect(JSON.stringify(d)).not.toContain('headache');
  });
  it("uses only the patient's or reporter's own words; other people's quotes never enter the export", () => {
    const text = draftText(d);
    expect(text).toContain('my legs have been aching since Saturday');
    expect(text).not.toContain('Mum says');
    expect(text).toMatch(/suspected/i);
  });
  it('lists the fields the person must still fill in', () => {
    expect(d.missing).toEqual(expect.arrayContaining(['outcome', 'age', 'sex']));
  });
});

describe('report draft: symptoms named only by others', () => {
  it('never uses their wording; a coded term or a neutral placeholder instead', () => {
    const r = [fact('symptom_started', 'tickly dry cough', '2026-03-05', "Mum's got that tickly dry cough", false), fact('symptom_started', 'odd twitch', '2026-03-06', 'Dad has an odd twitch', false)];
    const text = draftText(buildDraft({ review: r, meds: [], coding: [{ entity: 'tickly dry cough', term: 'SN041' }, { entity: 'odd twitch', term: null }], ranking: null, region: 'UK' }));
    expect(text).not.toMatch(/tickly|twitch/);
    expect(text).toContain('cough');
    expect(text).toContain("a symptom described in someone else's messages (not coded)");
  });
});
