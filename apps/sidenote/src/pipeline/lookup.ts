// Lookup coder (code, on device): phrase -> vocabulary term. A whole-word match of a label wording or everyday
// synonym wins (longest first); otherwise the closest wording by character trigrams, if close enough.
import { TERMS } from '../vocab/index.ts';

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const FORMS = TERMS.flatMap(t => [...t.label, ...t.everyday].map(f => ({ id: t.id, form: norm(f) })))
  .sort((a, b) => b.form.length - a.form.length);
function trigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i + 3 <= s.length; i++) m.set(s.slice(i, i + 3), (m.get(s.slice(i, i + 3)) ?? 0) + 1);
  return m;
}
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) { na += v * v; dot += v * (b.get(k) ?? 0); }
  for (const v of b.values()) nb += v * v;
  return dot / Math.sqrt(na * nb || 1);
}
const GRAMS = FORMS.map(f => ({ ...f, g: trigrams(f.form) }));

/** Tuned on the local dev set before the scored run (coder PLAN.md); frozen with the vocabulary. */
export const LOOKUP_THRESHOLD = 0.6; // dev sweep Nov 18: best accuracy minus false coding (0.66 / 0.10)

export function lookupTerm(phrase: string, threshold = LOOKUP_THRESHOLD): { id: string | null; score: number; how: 'exact' | 'fuzzy' | 'none' } {
  const p = norm(phrase);
  const exact = FORMS.find(f => p.includes(f.form));
  if (exact) return { id: exact.id, score: 1, how: 'exact' };
  if (p.trim().split(' ').length < 2) return { id: null, score: 0, how: 'none' }; // one word ("pain"): exact matches only
  const pg = trigrams(p);
  let best = { id: null as string | null, score: 0 };
  for (const f of GRAMS) { const s = cosine(pg, f.g); if (s > best.score) best = { id: f.id, score: s }; }
  return best.score >= threshold ? { ...best, how: 'fuzzy' } : { id: null, score: best.score, how: 'none' };
}
