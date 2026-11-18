// Seeded case specs for the T1 chat test. Code owns the ground truth: every event's date, the message
// that states it, that message's sender and date, and the time phrase the message must contain.
// Run: node evals/chattest/specs.mts  (writes evals/chattest/specs.json; deterministic)
import { writeFileSync } from 'node:fs';

export const SEED = 20261116;
let s = SEED;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Medicine / reaction pairs with label-listed reactions (public FDA labels), plus bystanders.
const PAIRS = [
  { med: 'atorvastatin', strength: '20mg', reaction: 'muscle aches', keywords: ['ache', 'aching', 'achy', 'muscle', 'legs', 'sore'] },
  { med: 'simvastatin', strength: '40mg', reaction: 'muscle pain', keywords: ['pain', 'ache', 'aching', 'muscle', 'sore'] },
  { med: 'amlodipine', strength: '5mg', reaction: 'ankle swelling', keywords: ['swollen', 'swelling', 'ankles', 'puffy', 'feet'] },
  { med: 'lisinopril', strength: '10mg', reaction: 'dry cough', keywords: ['cough', 'coughing', 'tickly'] },
  { med: 'ramipril', strength: '5mg', reaction: 'dry cough', keywords: ['cough', 'coughing', 'tickly'] },
  { med: 'metformin', strength: '500mg', reaction: 'stomach upset', keywords: ['stomach', 'tummy', 'diarrhoea', 'diarrhea', 'sick'] },
  { med: 'sertraline', strength: '50mg', reaction: 'trouble sleeping', keywords: ['sleep', 'sleeping', 'insomnia', 'awake'] },
  { med: 'amitriptyline', strength: '10mg', reaction: 'dry mouth', keywords: ['dry mouth', 'mouth', 'thirsty'] },
] as const;
const BYSTANDERS = ['levothyroxine', 'omeprazole', 'aspirin', 'vitamin D'];
const PEOPLE = [['Margaret', 'Sarah'], ['Ahmed', 'Mona'], ['Dad', 'Tom'], ['Linda', 'James'], ['Mum', 'Priya'], ['Grandpa Joe', 'Ellie']];

// Phrase that, written in a message sent `lag` days after the event, resolves back to the event date.
function phrase(lag: number, eventDay: number, kind: string): string {
  if (lag === 0) return pick(kind.startsWith('medicine') ? ['today', 'this morning', 'tonight'] : ['today', 'this morning', '']);
  if (lag === 1) return pick(['yesterday', 'since yesterday', 'last night']);
  if (lag <= 6 && rnd() < 0.5) return `since ${WEEKDAYS[new Date(eventDay).getUTCDay()]}`;
  const words = ['', '', 'two', 'three', 'four', 'five', 'six'];
  return lag <= 6 ? pick([`${words[lag]} days ago`, `for ${words[lag]} days`]) : 'about a week';
}

export type Variant = 'full' | 'no_restart' | 'no_pause' | 'other_sender' | 'two_medicines';
const VARIANTS: Variant[] = ['full', 'full', 'no_restart', 'no_pause', 'other_sender', 'two_medicines'];

function makeCase(n: number, source: 'hand' | 'generated') {
  const pair = PAIRS[n % PAIRS.length];
  const [patient, other] = PEOPLE[n % PEOPLE.length];
  const variant = VARIANTS[n % VARIANTS.length];
  const start = Date.UTC(2026, int(0, 6), int(1, 28));
  const events: { kind: string; entity: string; day: number }[] = [];
  const add = (kind: string, entity: string, day: number) => events.push({ kind, entity, day });
  let d = start;
  add('medicine_started', pair.med, d);
  d += int(7, 21) * DAY; add('symptom_started', pair.reaction, d);
  if (variant !== 'no_pause') {
    d += int(8, 20) * DAY; add('medicine_stopped', pair.med, d);
    d += int(3, 7) * DAY; add('symptom_gone', pair.reaction, d);
    if (variant !== 'no_restart') {
      d += int(7, 16) * DAY; add('medicine_restarted', pair.med, d);
      d += int(1, 4) * DAY; add('symptom_returned', pair.reaction, d);
    }
  }
  const bystander = variant === 'two_medicines' ? pick(BYSTANDERS) : null;
  if (bystander) add('medicine_started', bystander, start + int(2, 10) * DAY);
  // Recency spread, fixed up front: the chat ends 0-40 days after the last event (the baselines depend on it).
  const end = Math.max(...events.map(e => e.day)) + [1, 3, 6, 10, 15, 25, 40][n % 7] * DAY;

  const scripted = events.sort((a, b) => a.day - b.day).map((e, i) => {
    const lag = e.kind === 'medicine_started' && i === 0 ? int(0, 1) : pick([0, 0, 1, 2, 3, 4, 5]);
    const sentDay = Math.min(e.day + lag * DAY, end);
    const sender = variant === 'other_sender' && e.kind.startsWith('symptom') ? other : (rnd() < 0.85 ? patient : other);
    const realLag = Math.round((sentDay - e.day) / DAY);
    return { event: { kind: e.kind, entity: e.entity, date: iso(e.day) }, message: { sender, date: iso(sentDay), mustContain: phrase(realLag, e.day, e.kind) } };
  });
  // Distractors the Reader must not turn into events: questions and general statements.
  const distractors = [
    { sender: other, date: iso(events[1].day + 2 * DAY), gist: `asks ${patient} how the ${pair.reaction} is` },
    { sender: other, date: iso(events[1].day + 4 * DAY), gist: `says they read online that ${pair.med} can cause ${pair.reaction} in general` },
  ];
  return { id: `${source === 'hand' ? 'H' : 'G'}${String(n).padStart(2, '0')}`, source, variant, patient, other,
    reporter: patient, format: n % 2 ? 'android' : 'ios', dateOrder: n % 3 ? 'dmy' : 'mdy',
    medicines: [{ name: pair.med, strength: pair.strength }, ...(bystander ? [{ name: bystander, strength: '' }] : [])],
    reaction: { label: pair.reaction, keywords: pair.keywords }, chatStart: iso(start - 3 * DAY), chatEnd: iso(end),
    scripted, distractors };
}

const cases = [...Array.from({ length: 10 }, (_, i) => makeCase(i, 'hand')), ...Array.from({ length: 20 }, (_, i) => makeCase(i + 10, 'generated'))];
writeFileSync(new URL('specs.json', import.meta.url), JSON.stringify({ seed: SEED, cases }, null, 1) + '\n');
const recency = cases.map(c => Math.round((Date.parse(c.chatEnd) - Date.parse(c.scripted.at(-1)!.event.date)) / DAY));
console.log('cases', cases.length, '| variants', Object.entries(cases.reduce((a: any, c) => (a[c.variant] = (a[c.variant] ?? 0) + 1, a), {})).map(([k, v]) => `${k}:${v}`).join(' '),
  '| events', cases.reduce((a, c) => a + c.scripted.length, 0), '| days from last event to chat end', recency.join(','));
