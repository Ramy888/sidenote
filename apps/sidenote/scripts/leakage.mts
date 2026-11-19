// Leakage test (design doc, Verification) over all 30 chat-test chats: build every cloud payload the app
// could send from the saved Reader output of a scored run, then check none shares text with another sender.
// Usage: node scripts/leakage.mts [results/run-*.json]   (default: the run with Reader output covering the most chats)
import { readFileSync, readdirSync } from 'node:fs';
import { parseWhatsApp, locateQuote } from '@sidenote/private-evidence';
import { buildTimeline } from '../src/pipeline/timeline.ts';
import { coderPayload, ownWordsPayload, rankerPayload, rankerInstruction, CODER_INSTRUCTION } from '../src/ai/payload.ts';
import { leaks } from '../src/ai/leakage.ts';
import { coderTerms, TERMS, LABEL_FACTS } from '../src/vocab/index.ts';
import { lookupTerm } from '../src/pipeline/lookup.ts';
import { buildDraft, draftText } from '../src/app/report.ts';
import { startReview } from '../src/app/review.ts';

const evals = new URL('../../../evals/chattest/', import.meta.url);
const specs = JSON.parse(readFileSync(new URL('specs.json', evals), 'utf8'));
const runs = readdirSync(new URL('results/', evals)).filter(f => /^run-.*\.json$/.test(f)).sort().reverse()
  .map(f => ({ f, r: JSON.parse(readFileSync(new URL(`results/${f}`, evals), 'utf8')) }));
const { f: runFile, r: run } = process.argv[2] ? { f: process.argv[2], r: JSON.parse(readFileSync(process.argv[2], 'utf8')) } : runs.filter(x => x.r.cases.every((c: any) => c.readerEvents)).sort((a, b) => b.r.cases.length - a.r.cases.length)[0];
const days = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

let payloads = 0, refused = 0;
const found: string[] = [];
for (const c of specs.cases) {
  const rc = run.cases.find((x: any) => x.id === c.id);
  if (!rc) continue;
  const { messages } = parseWhatsApp(readFileSync(new URL(`chats/${c.id}.txt`, evals), 'utf8'), { regionDateOrder: c.dateOrder });
  const own = new Set([c.patient, c.reporter]);
  // Own lines also count with their sender label: the own-words payload writes "Dad: did u ...", which can
  // match another sender's "Hey dad did u ..." without carrying any of that sender's words (G20, Nov 18).
  const ownText = messages.filter(m => own.has(m.sender)).flatMap(m => [m.text, `${m.sender}: ${m.text}`]);
  const otherText = messages.filter(m => !own.has(m.sender)).map(m => m.text);
  const medicines = c.medicines.map((m: any) => m.name);
  const terms = coderTerms();
  // Public text the app adds itself: vocabulary wordings, medicine names, the fixed coder prompt, label excerpts.
  const allow = [...terms.values(), ...TERMS.flatMap(t => [...t.label, ...t.everyday]), ...medicines, CODER_INSTRUCTION,
    'NONE: no term below names this reaction', ...LABEL_FACTS.map(l => l.text), rankerInstruction(medicines)];
  const out: string[] = [ownWordsPayload(messages, own).text];
  for (const e of rc.readerEvents.filter((e: any) => e.symptom)) {
    const loc = locateQuote(e.quote, messages);
    const msg = loc.found ? messages.find(m => m.id === loc.messageId)! : null;
    try { if (msg) out.push(coderPayload(e.symptom, msg, own, terms).text); } catch { refused++; }
  }
  const evs = rc.readerEvents.map((e: any, i: number) => ({ ...e, messageId: i, sender: '', own: false, min: e.date, max: e.date, basis: 'phrase' }));
  const tl = buildTimeline(evs, medicines);
  const start = (m: string) => tl.find(f => f.kind === 'medicine_started' && f.entity === m);
  out.push(rankerPayload({
    anchor: 'report_date',
    medicines: medicines.map((m: string) => ({ name: m, start_kind: start(m) ? 'exact' : 'unknown', start: start(m) ? days(start(m)!.date, c.chatEnd) : null })),
    facts: tl.filter(f => f.kind.startsWith('symptom') && lookupTerm(f.entity).id)
      .map((f, id) => ({ id, term: lookupTerm(f.entity).id!, kind: f.kind, day: days(f.date, c.chatEnd), sender: 'own', confirmed: true })),
    pairs: medicines.flatMap((m: string) => [...new Set(tl.map(f => lookupTerm(f.entity).id).filter(Boolean))].map(t => ({ medicine: m, term: t!, dechallenge: 'unknown', rechallenge: 'unknown' }))),
    labelFacts: LABEL_FACTS.filter(l => medicines.includes(l.medicine)).slice(0, 5).map(l => ({ id: l.id, text: l.text })),
  }, { medicines, terms, labelFacts: new Map(LABEL_FACTS.map(l => [l.id, l.text])) }).text);
  // The report export: every fact confirmed (worst case), coded by the lookup; other people's quotes must not appear.
  const review = startReview(tl, []).map(f => ({ ...f, status: 'confirmed' as const }));
  out.push(draftText(buildDraft({ review, meds: medicines.map((name: string) => ({ name, strength: '', startKind: 'unknown' as const, start: '' })),
    coding: [...new Set(tl.filter(f => f.kind.startsWith('symptom')).map(f => f.entity))].map(entity => ({ entity, term: lookupTerm(entity).id })), ranking: null, region: 'US' })));
  payloads += out.length;
  for (const p of out) for (const l of leaks(p, otherText, ownText, allow)) found.push(`${c.id}: "${l}"`);
}
console.log(`run ${runFile}: ${payloads} payloads from ${run.cases.length} chats; ${refused} coder phrases refused (other sender, too long or not verbatim)`);
console.log(found.length ? `LEAKS (${found.length}):\n${found.join('\n')}` : 'no leaks');
process.exit(found.length ? 1 : 0);
