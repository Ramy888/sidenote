// Review state for the evidence timeline: each fact is found, needs confirming, has two dates, confirmed or
// rejected. Only confirmed facts reach the draft. A start the person typed joins as their own answer.
import type { TimelineFact } from '../pipeline/timeline.ts';
import type { Medicine } from './medicines.ts';

export type Status = 'found' | 'needsConfirming' | 'conflict' | 'confirmed' | 'rejected';
export interface Reviewed extends TimelineFact { id: number; status: Status; source: 'chat' | 'typed'; altDate?: string }

const days = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
const typedDate = (m: Medicine) => (m.startKind === 'exact' ? m.start : m.startKind === 'month' ? `${m.start}-01` : '');

export function startReview(timeline: TimelineFact[], meds: Medicine[]): Reviewed[] {
  const out: Reviewed[] = timeline.map((f, id) => ({ ...f, id, source: 'chat', status: f.needsConfirming ? 'needsConfirming' : 'found' }));
  for (const m of meds) {
    const d = typedDate(m);
    if (!d) continue;
    const chat = out.find(f => f.kind === 'medicine_started' && f.entity.toLowerCase() === m.name.toLowerCase());
    if (!chat) {
      const range = m.startKind === 'month' ? { min: d, max: `${m.start}-28` } : { min: d, max: d };
      out.push({ kind: 'medicine_started', entity: m.name, date: d, ...range, basis: 'phrase', needsConfirming: m.startKind === 'month',
        evidence: { kind: 'medicine_started', medicine: m.name, symptom: '', quote: '', messageId: -1, sender: '', own: true, date: d, ...range, basis: 'phrase' },
        id: out.length, source: 'typed', status: 'confirmed' });
    } else if (m.startKind === 'exact' && days(chat.date, d) > 2) { chat.status = 'conflict'; chat.altDate = d; }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const update = (list: Reviewed[], id: number, patch: Partial<Reviewed>) => list.map(f => (f.id === id ? { ...f, ...patch } : f));
export const confirm = (list: Reviewed[], id: number) => update(list, id, { status: 'confirmed' });
export const reject = (list: Reviewed[], id: number) => update(list, id, { status: 'rejected' });
/** The person sets the date: it becomes exact and confirmed. */
export const changeDate = (list: Reviewed[], id: number, date: string) => update(list, id, { date, min: date, max: date, status: 'confirmed', altDate: undefined });
export const pickDate = changeDate;
