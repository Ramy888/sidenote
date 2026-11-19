// Missing-Info (screen 6): at most 5 plain questions when the chat can't be read here. Times come from fixed
// answer choices mapped to day ranges by code (never from free text). Every answer is "you told us".
import type { Reviewed } from './review.ts';

export const WHEN_RANGES = { under1week: [0, 6], week1to2: [7, 14], week2to4: [14, 28], month1to3: [30, 90], longer: [90, 365] } as const;
export type WhenChoice = keyof typeof WHEN_RANGES;
export type When = { date: string } | { choice: WhenChoice };
export interface QuestionAnswers {
  problem: string;
  started: When;
  stopped: 'no' | { when: When };
  wentAway: 'no' | 'unsure' | { when: When };
  restarted: 'no' | { when: When; cameBack: 'no' | When };
}

const shift = (today: string, days: number) => new Date(Date.parse(today) - days * 86_400_000).toISOString().slice(0, 10);
function range(w: When, today: string) {
  if ('date' in w) return { date: w.date, min: w.date, max: w.date };
  const [lo, hi] = WHEN_RANGES[w.choice];
  return { date: shift(today, Math.round((lo + hi) / 2)), min: shift(today, hi), max: shift(today, lo) };
}

export function questionsToFacts(a: QuestionAnswers, medicine: string, reporter: string, today: string): Reviewed[] {
  const out: Reviewed[] = [];
  const add = (kind: Reviewed['kind'], entity: string, w: When) => {
    const r = range(w, today);
    out.push({ id: 1000 + out.length, kind, entity, ...r, basis: 'phrase', needsConfirming: r.min !== r.max, status: 'confirmed', source: 'typed',
      evidence: { kind: kind === 'symptom_returned' ? 'symptom_started' : kind, medicine: kind.startsWith('medicine') ? entity : '', symptom: kind.startsWith('symptom') ? entity : '',
        quote: kind.startsWith('symptom') ? a.problem : '', messageId: -1, sender: reporter, own: true, ...r, basis: 'phrase' } });
  };
  const problem = a.problem.trim();
  add('symptom_started', problem, a.started);
  if (a.stopped !== 'no') {
    add('medicine_stopped', medicine, a.stopped.when);
    if (typeof a.wentAway === 'object') add('symptom_gone', problem, a.wentAway.when);
    if (a.restarted !== 'no') {
      add('medicine_restarted', medicine, a.restarted.when);
      if (a.restarted.cameBack !== 'no') add('symptom_returned', problem, a.restarted.cameBack);
    }
  }
  return out;
}
