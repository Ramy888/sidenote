import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import data from '../src/vocab/vocabulary.json' with { type: 'json' };
import { TERMS, LABEL_FACTS, NO_LABEL_FACTS, termName } from '../src/vocab/index.ts';
import { lookupTerm } from '../src/pipeline/lookup.ts';

describe('shipped vocabulary', () => {
  it('comes only from single-ingredient labels', () => {
    for (const l of data.labels) expect(l.generic_name).not.toMatch(/\b(AND|WITH)\b|[,/]/);
  });
  it('marks medicines without label text instead of leaving them empty', () => {
    expect(NO_LABEL_FACTS).toContain('vitamin D');
    expect(LABEL_FACTS.some(f => f.medicine === 'vitamin D')).toBe(false);
  });
  it('every label fact belongs to a kept term and a labelled medicine', () => {
    const ids = new Set(TERMS.map(t => t.id)), meds = new Set(data.labels.map(l => l.medicine));
    for (const f of LABEL_FACTS) { expect(ids.has(f.term)).toBe(true); expect(meds.has(f.medicine)).toBe(true); }
  });
  it('codes every chat-test reaction with the on-device lookup', () => {
    const specs = JSON.parse(readFileSync(new URL('../../../evals/chattest/specs.json', import.meta.url), 'utf8'));
    const labels = [...new Set<string>(specs.cases.map((c: any) => c.reaction.label))];
    for (const r of labels) expect(termName(lookupTerm(r).id), r).not.toBeNull();
  });
});
