// Suspect ranker: builds its allowlisted input from confirmed, coded facts, and checks its structured answer.
// Code holds the hard rules: a reason is kept only when the input supports it; anything unreadable is
// "no suggestion". All wording on screen comes from templates ("a suggestion, not a diagnosis").
import { LABEL_FACTS } from '../vocab/index.ts';
import { answers } from './answers.ts';
import type { Reviewed } from './review.ts';
import type { Medicine } from './medicines.ts';
import type { RankerInput } from '../ai/payload.ts';

export const REASONS = ['TIMING_FITS', 'STARTED_AFTER_ONSET', 'DECHALLENGE_POSITIVE', 'RECHALLENGE_POSITIVE', 'ON_LABEL', 'NOT_ON_LABEL'] as const;
export type Reason = (typeof REASONS)[number];
export interface Ranked { medicine: string; reasons: Reason[]; facts: number[] }

const days = (from: string, to: string) => Math.round((Date.parse(from) - Date.parse(to)) / 86_400_000);
const lo = (d: number | [number, number]) => (Array.isArray(d) ? d[0] : d);

export function rankerInput(confirmed: Reviewed[], meds: Medicine[], termOf: ReadonlyMap<string, string>, today: string): RankerInput {
  const ok = confirmed.filter(f => f.status === 'confirmed');
  const symptomFacts = ok.filter(f => f.kind.startsWith('symptom') && termOf.has(f.entity));
  const terms = [...new Set(symptomFacts.map(f => termOf.get(f.entity)!))];
  const names = meds.map(m => m.name);
  return {
    anchor: 'report_date',
    medicines: names.map(name => {
      const start = ok.find(f => f.kind === 'medicine_started' && f.entity === name);
      const m = meds.find(x => x.name === name)!;
      return start ? { name, start_kind: 'exact' as const, start: start.min === start.max ? days(start.date, today) : [days(start.min, today), days(start.max, today)] as [number, number] }
        : { name, start_kind: m.startKind, start: null };
    }),
    facts: symptomFacts.map(f => ({ id: f.id, term: termOf.get(f.entity)!, kind: f.kind, day: f.min === f.max ? days(f.date, today) : [days(f.min, today), days(f.max, today)] as [number, number],
      sender: f.evidence.own ? 'own' as const : 'other' as const, confirmed: true })),
    pairs: names.flatMap(medicine => terms.map(term => {
      const entity = [...termOf].find(([, t]) => t === term)![0];
      const a = answers(ok, medicine, entity);
      return { medicine, term, dechallenge: a.dechallenge.answer === 'yes' ? 'yes' as const : 'unknown' as const, rechallenge: a.rechallenge.answer === 'yes' ? 'yes' as const : 'unknown' as const };
    })),
    labelFacts: LABEL_FACTS.filter(l => names.includes(l.medicine) && terms.includes(l.term)).map(l => ({ id: l.id, text: l.text })),
  };
}

/** Parses the model's answer and keeps only what the input supports. null = "no suggestion". */
export function checkRanking(text: string, input: RankerInput): Ranked[] | null {
  let data: any;
  try { data = JSON.parse(text); } catch { return null; }
  if (!Array.isArray(data?.ranked)) return null;
  const onsets = input.facts.filter(f => f.kind === 'symptom_started').map(f => lo(f.day));
  const supports = (medicine: string, r: Reason): boolean => {
    const m = input.medicines.find(x => x.name === medicine)!;
    const start = m.start === null ? null : lo(m.start);
    const pairs = input.pairs.filter(p => p.medicine === medicine);
    const label = LABEL_FACTS.filter(l => l.medicine === medicine);
    switch (r) {
      case 'TIMING_FITS': return start !== null ? onsets.some(o => o > start) : m.start_kind === 'before';
      case 'STARTED_AFTER_ONSET': return start !== null && onsets.length > 0 && onsets.every(o => o < start);
      case 'DECHALLENGE_POSITIVE': return pairs.some(p => p.dechallenge === 'yes');
      case 'RECHALLENGE_POSITIVE': return pairs.some(p => p.rechallenge === 'yes');
      case 'ON_LABEL': return input.labelFacts.some(l => label.some(x => x.id === l.id));
      case 'NOT_ON_LABEL': return label.length > 0 && !input.labelFacts.some(l => label.some(x => x.id === l.id));
    }
  };
  const ids = new Set(input.facts.map(f => f.id));
  const out: Ranked[] = data.ranked
    .filter((r: any) => input.medicines.some(m => m.name === r?.medicine))
    .map((r: any) => ({ medicine: r.medicine,
      reasons: (Array.isArray(r.reasons) ? r.reasons : []).filter((x: any) => REASONS.includes(x) && supports(r.medicine, x)),
      facts: (Array.isArray(r.facts) ? r.facts : []).filter((x: any) => ids.has(x)) }));
  return out.length ? out : null;
}

export const RANKER_SYSTEM = 'You compare which medicine is the more likely suspect for a reaction in a side-effect report. You see coded facts only. Answer with JSON only, using the reason codes given. Never give medical advice.';
export const rankerSchema = (medicines: string[]) => ({
  type: 'object', properties: { ranked: { type: 'array', items: { type: 'object', properties: {
    medicine: { type: 'string', enum: medicines }, reasons: { type: 'array', items: { type: 'string', enum: [...REASONS] } }, facts: { type: 'array', items: { type: 'integer' } },
  }, required: ['medicine', 'reasons', 'facts'] } } }, required: ['ranked'],
});
