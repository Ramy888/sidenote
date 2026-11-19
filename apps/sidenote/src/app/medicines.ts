// Medicines (screen 3): typed by the person; the start can be exact, a month, "before the chat", or unknown.
import { TERMS, NO_LABEL_FACTS } from '../vocab/index.ts';
import type { StringKey } from '../strings.ts';

export type StartKind = 'exact' | 'month' | 'before' | 'unknown';
export interface Medicine { name: string; strength: string; startKind: StartKind; /** YYYY-MM-DD, YYYY-MM or '' */ start: string }
export const blankMedicine = (): Medicine => ({ name: '', strength: '', startKind: 'unknown', start: '' });

/** Medicines with bundled label facts, plus those known to have none; other names are allowed too. */
export const SUPPORTED = [...new Set([...TERMS.flatMap(t => t.medicines), ...NO_LABEL_FACTS])].sort();

export function medicineProblems(m: Medicine, today: string): StringKey[] {
  if (!m.name.trim()) return ['medNameNeeded'];
  if (m.startKind === 'exact' && !/^\d{4}-\d{2}-\d{2}$/.test(m.start)) return ['medDateNeeded'];
  if (m.startKind === 'month' && !/^\d{4}-\d{2}$/.test(m.start)) return ['medDateNeeded'];
  if ((m.startKind === 'exact' || m.startKind === 'month') && m.start > today.slice(0, m.start.length)) return ['medDateFuture'];
  return [];
}
