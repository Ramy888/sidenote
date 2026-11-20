// Check-in (screen 10): two weeks after the draft, "Better / Same / Worse" sets the outcome. The draft is kept
// on this device only when the person asks for the reminder (it holds their own words, never others').
import type { Draft } from './report.ts';

export const CHECKIN_KEY = 'sidenote.checkin';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const plus = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
export const OUTCOME = { better: 'Recovering or recovered', same: 'Not recovered', worse: 'Getting worse' } as const;
export type CheckInAnswer = keyof typeof OUTCOME;

export function saveCheckIn(draft: Draft, today: string, store: Store = localStorage) {
  store.setItem(CHECKIN_KEY, JSON.stringify({ due: plus(today, 14), draft }));
}
export function dueCheckIn(today: string, demo: boolean, store: Store = localStorage): { due: string; draft: Draft } | null {
  try {
    const v = JSON.parse(store.getItem(CHECKIN_KEY) ?? 'null');
    return v && (demo || today >= v.due) ? v : null;
  } catch { return null; }
}
export function applyCheckIn(draft: Draft, answer: CheckInAnswer, store: Store = localStorage): Draft {
  store.removeItem(CHECKIN_KEY);
  return { ...draft, outcome: OUTCOME[answer], missing: draft.missing.filter(m => m !== 'outcome') };
}
