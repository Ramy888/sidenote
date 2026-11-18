// The shipped vocabulary: reaction terms from public-domain FDA labels plus everyday synonyms (vocab-build.mts).
import data from './vocabulary.json' with { type: 'json' };

export interface Term { id: string; name: string; label: string[]; everyday: string[]; medicines: string[] }
export interface LabelFact { id: string; medicine: string; term: string; text: string }
export const TERMS: Term[] = data.terms;
export const LABEL_FACTS: LabelFact[] = data.labelFacts;
/** Medicines with no label text bundled (the UI says "no label facts bundled", not "label says nothing"). */
export const NO_LABEL_FACTS: string[] = data.noLabelFacts;

const byId = new Map(TERMS.map(t => [t.id, t]));
export const termName = (id: string | null) => (id && byId.get(id)?.name) || null;

/** id -> "name (label wordings; a few everyday words)": the list the coder model picks from. */
export function coderTerms(): Map<string, string> {
  return new Map(TERMS.map(t => [t.id, `${t.name} (${[...t.label.slice(1), ...t.everyday.slice(0, 4)].join('; ') || t.name})`]));
}
