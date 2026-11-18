import { reportsRecovery } from './lexicon.ts';

// Timeline agent (code): located, dated events -> one fact per onset / stop / restart / gone / back.
export type TimelineKind = 'medicine_started' | 'medicine_stopped' | 'medicine_restarted' | 'symptom_started' | 'symptom_gone' | 'symptom_returned';

export interface DatedEvent {
  kind: 'medicine_started' | 'medicine_stopped' | 'medicine_restarted' | 'symptom_started' | 'symptom_ongoing' | 'symptom_gone';
  medicine: string; symptom: string; quote: string;
  messageId: number; sender: string; own: boolean;
  date: string; min: string; max: string; basis: 'phrase' | 'message';
}
export interface TimelineFact {
  kind: TimelineKind; entity: string; date: string; min: string; max: string; basis: 'phrase' | 'message';
  /** True when the date is a range or only the message date: the UI shows the range and asks the patient. */
  needsConfirming: boolean;
  evidence: DatedEvent;
}

const SYN: Record<string, string> = { swollen: 'swell', swelling: 'swell', puffy: 'swell', tummy: 'stomach', coughing: 'cough', tickly: 'cough', // everyday names for aching muscles are one symptom ("legs sore" then "muscle ache", run 4 G24)
  achy: 'ache', aching: 'ache', aches: 'ache', muscle: 'ache', muscles: 'ache', cramp: 'ache', cramps: 'ache', ankles: 'ankle', feet: 'foot', sleeping: 'sleep', insomnia: 'sleep', awake: 'sleep', wake: 'sleep', slept: 'sleep' };
const STOP = new Set(['my', 'his', 'her', 'the', 'and', 'really', 'so', 'much', 'bit', 'very', 'still', 'all', 'too', 'a', 'of', 'in', 'is', 'are', 'got', 'have', 'been']);
// "Sore" or "legs" alone means aching muscles ("legs sore", run 4 G24), but not next to another body site or
// reaction: "sore throat", "legs swollen" and "sore stomach" stay their own symptoms.
const OTHER_SITES = new Set(['throat', 'swell', 'ankle', 'foot', 'stomach', 'cough', 'mouth', 'head', 'chest', 'skin', 'rash', 'sleep']);
export const stems = (s: string) => {
  const out = new Set(s.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => SYN[w] ?? w.replace(/(ing|es|s)$/, '')));
  if ((out.has('sore') || out.has('leg')) && ![...out].some(w => OTHER_SITES.has(w))) out.add('ache');
  return out;
};
const overlaps = (a: Set<string>, b: Set<string>) => [...a].some(x => b.has(x));
const daysBetween = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

export function canonicalMedicine(name: string, medicines: string[]): string | null {
  const n = name.toLowerCase().trim();
  if (!n) return null;
  return medicines.find(m => n.includes(m.toLowerCase()) || m.toLowerCase().includes(n)) ?? null;
}

export function buildTimeline(events: DatedEvent[], medicines: string[]): TimelineFact[] {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.messageId - b.messageId);
  const facts: TimelineFact[] = [];
  const add = (kind: TimelineKind, entity: string, e: DatedEvent) => {
    if (facts.some(f => f.kind === kind && f.entity === entity && daysBetween(f.date, e.date) <= 2)) return; // same fact told twice
    facts.push({ kind, entity, date: e.date, min: e.min, max: e.max, basis: e.basis, needsConfirming: e.basis === 'message' || e.min !== e.max, evidence: e });
  };
  // Medicines: a small state machine, so the model's start/restart labels can't contradict each other.
  const medState = new Map<string, 'none' | 'on' | 'off'>();
  for (const e of sorted.filter(e => e.kind.startsWith('medicine'))) {
    const med = canonicalMedicine(e.medicine, medicines);
    if (!med) continue;
    const st = medState.get(med) ?? 'none';
    if (e.kind === 'medicine_stopped') { if (st !== 'off') { add('medicine_stopped', med, e); medState.set(med, 'off'); } }
    else if (st === 'none') { add('medicine_started', med, e); medState.set(med, 'on'); }      // first start, however labelled
    else if (st === 'off') { add('medicine_restarted', med, e); medState.set(med, 'on'); }     // taking it after a stop = restart
    // already on: a repeat of the same start or restart, ignored
  }
  // Symptoms: group by shared word stems; a start after a "gone" is a return.
  const clusters: { stems: Set<string>; label: string; state: 'none' | 'on' | 'gone' }[] = [];
  for (const e of sorted.filter(e => e.kind.startsWith('symptom'))) {
    if (e.kind === 'symptom_ongoing' && reportsRecovery(`${e.symptom}. ${e.quote}`)) continue; // good news, not a symptom
    const st = stems(e.symptom || e.quote);
    let c = clusters.find(c => overlaps(c.stems, st));
    if (!c) { c = { stems: st, label: e.symptom || e.quote, state: 'none' }; clusters.push(c); }
    else st.forEach(x => c!.stems.add(x));
    // "had trouble sleeping for four days" may be the first we hear of it: then it is the onset (run 4 G14).
    if (e.kind === 'symptom_ongoing') { if (c.state === 'none') { add('symptom_started', c.label, e); c.state = 'on'; } }
    else if (e.kind === 'symptom_started') {
      if (c.state === 'none') { add('symptom_started', c.label, e); c.state = 'on'; }
      else if (c.state === 'gone') { add('symptom_returned', c.label, e); c.state = 'on'; }
      // "the aches are back": a return even if the message saying it had gone was missed.
      else if (/\b(back|again|returned|came back)\b/i.test(e.quote) && !facts.some(f => f.kind === 'symptom_returned' && f.entity === c!.label)) add('symptom_returned', c.label, e);
    } else if (e.kind === 'symptom_gone' && c.state === 'on') { add('symptom_gone', c.label, e); c.state = 'gone'; }
  }
  return facts.sort((a, b) => a.date.localeCompare(b.date));
}
