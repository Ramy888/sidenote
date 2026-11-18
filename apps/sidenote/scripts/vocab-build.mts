// Builds the shipped vocabulary from public-domain FDA labels (openFDA): a seed term is kept only when a
// single-ingredient label for a supported medicine uses it, and that label sentence becomes a label fact.
// Run at build time only (network): node scripts/vocab-build.mts  ->  src/vocab/vocabulary.json
import { writeFileSync } from 'node:fs';
import { SEED } from '../src/vocab/seed.ts';

const MEDICINES = [
  ['atorvastatin', 'atorvastatin'], ['simvastatin', 'simvastatin'], ['amlodipine', 'amlodipine'], ['lisinopril', 'lisinopril'],
  ['ramipril', 'ramipril'], ['metformin', 'metformin'], ['sertraline', 'sertraline'], ['amitriptyline', 'amitriptyline'],
  ['vitamin D', 'cholecalciferol'],
] as const;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

async function label(generic: string) {
  const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22${encodeURIComponent(generic)}%22&limit=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${generic}: openFDA ${res.status}`);
  const { results } = await res.json() as { results: any[] };
  // Single ingredient only: a combination label (amlodipine/atorvastatin, lisinopril/HCTZ) lists another drug's reactions.
  const single = results.filter(r => r.openfda?.substance_name?.length === 1 && r.openfda?.generic_name?.length === 1
    && !/\b(and|with)\b|[,/]/i.test(r.openfda.generic_name[0]) && r.openfda.generic_name[0].toLowerCase().includes(generic));
  single.sort((a, b) => b.effective_time.localeCompare(a.effective_time));
  const pick = single.find(r => r.adverse_reactions) ?? single[0];
  if (!pick) return null;
  const text = clean([pick.adverse_reactions, pick.warnings_and_cautions, pick.warnings].flat().filter(Boolean).join(' '));
  return { set_id: pick.set_id as string, effective_time: pick.effective_time as string, generic_name: pick.openfda.generic_name[0] as string, text };
}

/** The sentence around the first match, at most ~300 characters. */
function excerpt(text: string, at: number, len: number): string {
  const sentence = text.lastIndexOf('. ', at) + 2;
  let s = Math.max(sentence, at - 150, 0);
  if (s > sentence) s = text.indexOf(' ', s) + 1; // never start mid-word
  let e = text.indexOf('. ', at + len); e = e < 0 ? text.length : e + 1;
  if (e > at + len + 150) e = text.lastIndexOf(' ', at + len + 150); // never end mid-word
  return clean(text.slice(s, e));
}

const labels: Record<string, NonNullable<Awaited<ReturnType<typeof label>>>> = {};
for (const [name, generic] of MEDICINES) {
  const l = await label(generic);
  if (l && l.text.length > 500) labels[name] = l;
}

const terms: any[] = [], labelFacts: any[] = [], dropped: string[] = [];
SEED.forEach(([forms, everyday], i) => {
  const id = `SN${String(i + 1).padStart(3, '0')}`;
  const medicines: string[] = [];
  for (const [name, l] of Object.entries(labels)) {
    for (const f of forms) {
      const m = new RegExp(`\\b${esc(f)}s?\\b`, 'i').exec(l.text);
      if (m) { medicines.push(name); labelFacts.push({ id: `L-${name.replace(/\W/g, '').toUpperCase()}-${id}`, medicine: name, term: id, text: excerpt(l.text, m.index, m[0].length) }); break; }
    }
  }
  if (medicines.length) terms.push({ id, name: forms[0], label: forms, everyday, medicines });
  else dropped.push(forms[0]);
});

const out = {
  note: 'Reaction terms and label excerpts from public-domain FDA drug labels (openFDA); everyday synonyms written for SideNote.',
  built: new Date().toISOString().slice(0, 10),
  labels: Object.entries(labels).map(([medicine, l]) => ({ medicine, generic_name: l.generic_name, set_id: l.set_id, effective_time: l.effective_time })),
  noLabelFacts: MEDICINES.map(([n]) => n).filter(n => !labels[n]),
  terms, labelFacts,
};
writeFileSync(new URL('../src/vocab/vocabulary.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`labels: ${Object.keys(labels).join(', ')}; no label facts: ${out.noLabelFacts.join(', ') || 'none'}`);
console.log(`terms kept ${terms.length}/${SEED.length}, label facts ${labelFacts.length}; dropped: ${dropped.join(', ')}`);
