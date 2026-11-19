// The three answers a suspected-reaction report needs, worked out by code from the timeline: onset (and days
// after the medicine started), dechallenge (did it go after stopping?), rechallenge (did it come back after
// restarting?). "unknown" when the chat doesn't say; the person confirms or changes every answer.
import type { TimelineFact } from '../pipeline/timeline.ts';

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function answers(facts: TimelineFact[], medicine: string, symptom: string) {
  const of = (kind: TimelineFact['kind'], entity: string, after = '') =>
    facts.filter(f => f.kind === kind && f.entity === entity && f.date >= after).sort((a, b) => a.date.localeCompare(b.date))[0];
  const start = of('medicine_started', medicine), onsetF = of('symptom_started', symptom);
  const stop = of('medicine_stopped', medicine, start?.date), gone = stop && of('symptom_gone', symptom, stop.date);
  const restart = stop && of('medicine_restarted', medicine, stop.date), back = restart && of('symptom_returned', symptom, restart.date);
  return {
    onset: onsetF ? { date: onsetF.date, daysAfterStart: start ? days(start.date, onsetF.date) : null } : null,
    dechallenge: !stop ? { answer: 'notStopped' as const }
      : gone ? { answer: 'yes' as const, stopped: stop.date, gone: gone.date, days: days(stop.date, gone.date) }
      : { answer: 'unknown' as const, stopped: stop.date },
    rechallenge: !restart ? { answer: 'notRestarted' as const }
      : back ? { answer: 'yes' as const, restarted: restart.date, returned: back.date, days: days(restart.date, back.date) }
      : { answer: 'unknown' as const, restarted: restart.date },
  };
}
