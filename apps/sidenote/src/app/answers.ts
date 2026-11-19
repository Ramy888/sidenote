// The three answers a suspected-reaction report needs, worked out by code from the timeline: onset (and days
// after the medicine started), dechallenge (did it go after stopping?), rechallenge (did it come back after
// restarting?). Dates stay ranges when the facts are ranges, and day counts span them (never a midpoint).
// "unknown" when the chat doesn't say; the person confirms or changes every answer.
import type { TimelineFact } from '../pipeline/timeline.ts';

export interface Span { min: string; max: string }
export interface DaySpan { lo: number; hi: number }
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const span = (f: TimelineFact): Span => ({ min: f.min, max: f.max });
/** Days from a to b when either may be a range: the shortest and the longest gap. */
const gap = (a: TimelineFact, b: TimelineFact): DaySpan => ({ lo: Math.max(0, days(a.max, b.min)), hi: days(a.min, b.max) });

export function answers(facts: TimelineFact[], medicine: string, symptom: string) {
  const of = (kind: TimelineFact['kind'], entity: string, after = '') =>
    facts.filter(f => f.kind === kind && f.entity === entity && f.max >= after).sort((a, b) => a.min.localeCompare(b.min))[0];
  const start = of('medicine_started', medicine), onsetF = of('symptom_started', symptom);
  const stop = of('medicine_stopped', medicine, start?.min);
  const gone = stop && of('symptom_gone', symptom, stop.min);
  const restart = stop && of('medicine_restarted', medicine, stop.min), back = restart && of('symptom_returned', symptom, restart.min);
  return {
    onset: onsetF ? { when: span(onsetF), daysAfterStart: start ? gap(start, onsetF) : null } : null,
    dechallenge: !stop ? { answer: 'notStopped' as const }
      : gone ? { answer: 'yes' as const, stopped: span(stop), gone: span(gone), days: gap(stop, gone) }
      : { answer: 'unknown' as const, stopped: span(stop) },
    rechallenge: !restart ? { answer: 'notRestarted' as const }
      : back ? { answer: 'yes' as const, restarted: span(restart), returned: span(back), days: gap(restart, back) }
      : { answer: 'unknown' as const, restarted: span(restart) },
  };
}
