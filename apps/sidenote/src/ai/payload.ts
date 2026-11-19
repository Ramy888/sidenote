// Payload builder: the only code that produces text for a route that can reach the cloud. Each builder
// copies allowlisted fields into a fresh object (never spreads its input) and throws on anything else.
// The result is what the outbound screen shows and what approve() seals; adapters send it unchanged.
import type { TimelineKind } from '../pipeline/timeline';
import type { Route } from './route';
import { REASONS } from '../app/ranker.ts';

/** Text built here for one route. Only these can be approved (route.ts approve()); a plain string cannot. */
export interface Payload { readonly route: Route; readonly text: string; /** the JSON part, for showing "the exact data" */ readonly json?: string }
const BUILT = new WeakSet<object>();
const seal = (route: Route, text: string, json?: string): Payload => { const p = Object.freeze({ route, text, json }); BUILT.add(p); return p; };
export const isBuiltPayload = (x: unknown): x is Payload => typeof x === 'object' && x !== null && BUILT.has(x);

export type OwnSenders = ReadonlySet<string>;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Fixed wording of the coder prompt (allowlisted in the leakage test). */
export const CODER_INSTRUCTION = 'A patient described a side effect in their own words. Pick the one term below that names the same reaction. If no term names that reaction (a different body part, a different problem, or too vague), answer NONE. A related or nearby term is not the same reaction. Answer with the term id only, or NONE.';

/** Cloud coder: one phrase of at most 8 words, from the patient's or reporter's own message, plus the public term list. */
export function coderPayload(phrase: string, message: { sender: string; text: string }, own: OwnSenders, terms: ReadonlyMap<string, string>): Payload {
  const p = norm(phrase);
  if (!p || p.split(' ').length > 8) throw new Error('coder: the phrase must be 1 to 8 words');
  if (!own.has(message.sender)) throw new Error("coder: only the patient's or reporter's own words may be sent");
  if (!norm(message.text).includes(p)) throw new Error('coder: the phrase is not in the message');
  const list = ['NONE: no term below names this reaction', ...[...terms].map(([id, label]) => `${id}: ${label}`)].join('\n');
  return seal('coder', `${CODER_INSTRUCTION}\nPhrase: ${JSON.stringify(p)}\nTerms:\n${list}`);
}

/** Reader in the cloud (no on-device model): only own-words messages, exactly as the person saw them. */
export function ownWordsPayload(messages: { id: number; at: string; sender: string; text: string }[], own: OwnSenders): Payload {
  return seal('readerOwnCloud', messages.filter(m => own.has(m.sender)).map(m => `[${m.id}] ${m.at.slice(0, 10)} ${m.sender}: ${m.text.replace(/\n/g, ' ')}`).join('\n'));
}

type Offset = number | [number, number];
type YesNoUnknown = 'yes' | 'no' | 'unknown';
export interface RankerInput {
  anchor: 'report_date' | { medicine: string };
  medicines: { name: string; start_kind: 'exact' | 'month' | 'before' | 'unknown'; start: Offset | null }[];
  /** Only facts the person confirmed may reach the ranker. */
  facts: { id: number; term: string; kind: TimelineKind; day: Offset; sender: 'own' | 'other'; confirmed: boolean }[];
  pairs: { medicine: string; term: string; dechallenge: YesNoUnknown; rechallenge: YesNoUnknown }[];
  labelFacts: { id: string; text: string }[];
}
export interface RankerContext {
  /** The confirmed Medicines list. */ medicines: readonly string[];
  /** The shipped vocabulary: term id -> label. */ terms: ReadonlyMap<string, string>;
  /** Bundled public-domain FDA label facts: id -> text. */ labelFacts: ReadonlyMap<string, string>;
}

const KINDS = ['medicine_started', 'medicine_stopped', 'medicine_restarted', 'symptom_started', 'symptom_gone', 'symptom_returned'];
function oneOf<T extends string>(field: string, v: unknown, allowed: readonly T[]): T {
  if (!allowed.includes(v as T)) throw new Error(`ranker: ${field} must be one of ${allowed.join(', ')}`);
  return v as T;
}
function whole(field: string, v: unknown): number {
  if (!Number.isInteger(v) || (v as number) < 0) throw new Error(`ranker: ${field} must be a whole number`);
  return v as number;
}
function offset(field: string, v: unknown): Offset {
  if (Number.isInteger(v)) return v as number;
  if (Array.isArray(v) && v.length === 2 && v.every(Number.isInteger) && v[0] <= v[1]) return [v[0], v[1]];
  throw new Error(`ranker: ${field} must be a whole number of days or a [min, max] range`);
}

/** Suspect ranker: confirmed, coded facts as JSON. No free text except bundled label excerpts, checked by id. */
export function rankerPayload(input: RankerInput, ctx: RankerContext): Payload {
  const medicine = (v: unknown) => { if (!ctx.medicines.includes(v as string)) throw new Error('ranker: medicine is not on the confirmed list'); return v as string; };
  const term = (v: unknown) => { if (!ctx.terms.has(v as string)) throw new Error('ranker: term is not a vocabulary id'); return v as string; };
  const out = {
    anchor: input.anchor === 'report_date' ? 'report_date' as const : { medicine: medicine(input.anchor?.medicine) },
    medicines: input.medicines.map(m => ({ name: medicine(m.name), start_kind: oneOf('start_kind', m.start_kind, ['exact', 'month', 'before', 'unknown'] as const),
      start: m.start === null ? null : offset('start', m.start) })),
    facts: input.facts.map(f => { if (f.confirmed !== true) throw new Error('ranker: only confirmed facts may be sent'); return f; }).map(f => ({ id: whole('fact id', f.id), term: term(f.term), kind: oneOf('kind', f.kind, KINDS) as TimelineKind, day: offset('day', f.day),
      sender: oneOf('sender', f.sender, ['own', 'other'] as const) })),
    pairs: input.pairs.map(p => ({ medicine: medicine(p.medicine), term: term(p.term),
      dechallenge: oneOf('dechallenge', p.dechallenge, ['yes', 'no', 'unknown'] as const), rechallenge: oneOf('rechallenge', p.rechallenge, ['yes', 'no', 'unknown'] as const) })),
    labelFacts: input.labelFacts.map(l => {
      if (ctx.labelFacts.get(l.id) !== l.text) throw new Error('ranker: label text does not match the bundled label fact');
      return { id: l.id, text: l.text };
    }),
  };
  const json = JSON.stringify(out);
  return seal('ranker', `${rankerInstruction(out.medicines.map(m => m.name))}\n${json}`, json);
}

/** Fixed wording around the ranker's JSON (allowlisted in the leakage test). */
export const rankerInstruction = (medicines: string[]) => `Coded facts for a suspected side-effect report follow as JSON (day numbers are days before the report; negative = in the past). Rank the medicines ${medicines.join(', ')} from most to least likely suspect. For each, list the reason codes that apply, from: ${REASONS.join(', ')}; and the ids of the facts you used. Answer as {"ranked":[{"medicine":"...","reasons":["..."],"facts":[1]}]}.`;
