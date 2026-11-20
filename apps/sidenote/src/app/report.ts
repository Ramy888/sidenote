// Report draft (screen 8): the regulator's form filled from confirmed facts only. The narrative uses fixed
// "suspected" wording plus the patient's or reporter's own words; other people's words are never placed here.
import { termName } from '../vocab/index.ts';
import { answers, type Span } from './answers.ts';
import type { Reviewed } from './review.ts';
import type { Medicine } from './medicines.ts';
import type { Ranked } from './ranker.ts';
import type { Region } from './importChat.ts';

export const FORMS: Record<Region, { name: string; url: string }> = {
  US: { name: 'FDA MedWatch Form 3500B (consumer)', url: 'https://www.accessdata.fda.gov/scripts/medwatch/index.cfm' },
  UK: { name: 'MHRA Yellow Card', url: 'https://yellowcard.mhra.gov.uk/' },
  EG: { name: 'Egyptian Drug Authority, pharmacovigilance report', url: 'https://www.edaegypt.gov.eg/' },
};

export interface Draft {
  form: { name: string; url: string };
  reaction: { onset: Span | null; terms: string[]; uncoded: string[] };
  products: { name: string; strength: string; suspected: boolean; started: Span | null; startNote: string; stopped: Span | null; dechallenge: string; rechallenge: string }[];
  narrative: string[];
  /** Fields the person fills on the official form (they are not in a chat). */
  missing: string[];
  /** Set by the 2-week check-in. */
  outcome?: string;
}

export function buildDraft({ review, meds, coding, ranking, region }: { review: Reviewed[]; meds: Medicine[]; coding: { entity: string; term: string | null }[]; ranking: Ranked[] | null; region: Region }): Draft {
  const ok = review.filter(f => f.status === 'confirmed');
  const sym = ok.filter(f => f.kind.startsWith('symptom')).sort((a, b) => a.date.localeCompare(b.date))[0]?.entity ?? '';
  const top = ranking?.[0]?.medicine;
  const products = meds.map(m => {
    const a = answers(ok, m.name, sym);
    const start = ok.find(f => f.kind === 'medicine_started' && f.entity === m.name);
    const stop = ok.find(f => f.kind === 'medicine_stopped' && f.entity === m.name);
    return {
      name: m.name, strength: m.strength, suspected: !top || top === m.name,
      started: start ? { min: start.min, max: start.max } : m.startKind === 'exact' ? { min: m.start, max: m.start } : null,
      startNote: start ? '' : m.startKind === 'month' ? `in ${m.start}` : m.startKind === 'before' ? 'before the period covered' : m.startKind === 'unknown' ? 'unknown' : '',
      stopped: stop ? { min: stop.min, max: stop.max } : null,
      dechallenge: a.dechallenge.answer === 'yes' ? 'Yes' : a.dechallenge.answer === 'notStopped' ? "Doesn't apply" : 'Unknown',
      rechallenge: a.rechallenge.answer === 'yes' ? 'Yes' : a.rechallenge.answer === 'notRestarted' ? "Didn't restart" : 'Unknown',
    };
  });
  const coded = coding.filter(c => c.term);
  // A symptom is named by its vocabulary term; uncoded, by its wording only when that came from own words.
  const ownWording = (entity: string) => ok.some(f => f.entity === entity && f.evidence.own && f.evidence.quote.toLowerCase().includes(entity.toLowerCase()));
  const symptomName = (entity: string) => {
    const c = coding.find(x => x.entity === entity);
    return c?.term ? termName(c.term)! : ownWording(entity) ? entity : "a symptom described in someone else's messages (not coded)";
  };
  const narrative = [...ok].sort((a, b) => a.date.localeCompare(b.date)).map(f => {
    const s = f.kind.startsWith('symptom') ? symptomName(f.entity) : f.entity;
    const what = { medicine_started: `Medicine started: ${s}`, medicine_stopped: `Medicine stopped: ${s}`, medicine_restarted: `Medicine restarted: ${s}`,
      symptom_started: `Suspected reaction began: ${s}`, symptom_gone: `Reaction resolved: ${s}`, symptom_returned: `Reaction recurred: ${s}` }[f.kind];
    const own = f.evidence.own && f.evidence.quote ? ` In their own words: "${f.evidence.quote}"` : '';
    return `${spanText({ min: f.min, max: f.max })}: ${what}.${own}`;
  });
  return {
    form: FORMS[region],
    reaction: { onset: (o => (o ? { min: o.min, max: o.max } : null))(ok.find(f => f.kind === 'symptom_started' && f.entity === sym)), terms: coded.map(c => termName(c.term)!), uncoded: coding.filter(c => !c.term).map(c => symptomName(c.entity)) },
    products, narrative,
    missing: ['outcome', 'seriousness', 'age', 'sex', 'weight', 'reporterContact'],
  };
}

/** A date, or "between A and B" when only a range is known (never a made-up exact day). */
export const spanText = (s: Span) => (s.min === s.max ? s.min : `between ${s.min} and ${s.max}`);

/** Plain text for Copy and print: English, the language of the forms. */
export function draftText(d: Draft): string {
  return [
    `${d.form.name}: draft of a suspected side-effect report`, '',
    `Reaction (suspected): ${[...d.reaction.terms, ...d.reaction.uncoded].join('; ') || 'not coded'}`,
    `Date it started: ${d.reaction.onset ? spanText(d.reaction.onset) : 'not known'}`,
    ...(d.outcome ? [`Outcome: ${d.outcome}`] : []), '',
    ...d.products.flatMap(p => [`Medicine: ${p.name}${p.strength ? ` ${p.strength}` : ''}${p.suspected ? ' (suspected)' : ''}`,
      `  Started: ${p.started ? spanText(p.started) : p.startNote}  Stopped: ${p.stopped ? spanText(p.stopped) : 'not stopped / not known'}`,
      `  Did the problem stop after stopping? ${p.dechallenge}`, `  Did it return after starting again? ${p.rechallenge}`]),
    '', 'What happened:', ...d.narrative.map(l => `  ${l}`), '',
    `Still to fill in on the official form: ${d.missing.join(', ')}`,
    'This is a suspected side effect, not a diagnosis.',
  ].join('\n');
}
