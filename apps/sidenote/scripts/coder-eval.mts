// Coder re-measure (evals/coder/PLAN.md). Data is local only: the spike's CADEC phrase set and the crosswalk live
// in ideation/ (gitignored); per-phrase results are written there too. Only aggregates are printed.
// Usage: node scripts/coder-eval.mts <lookup|nano|cloud> <dev|test> [limit]     (nano/cloud need `npx vite --port 5173`)
//        node scripts/coder-eval.mts score
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { launchNano, waitForNano } from './nano-profile.mjs';
import { lookupTerm } from '../src/pipeline/lookup.ts';
import { TERMS } from '../src/vocab/index.ts';

const local = new URL('../../../ideation/spike-coder/', import.meta.url);
const set = JSON.parse(readFileSync(new URL('set.json', local), 'utf8'));
const xwalk = JSON.parse(readFileSync(new URL('crosswalk-sn.json', local), 'utf8'));
const ids = new Set(TERMS.map(t => t.id));
const toItem = (t: any) => ({ phrase: t.phrase as string, gold: [...new Set<string>(t.gold.map((c: string) => xwalk[c]).filter((v: string) => v && v !== 'NONE'))] });
const pick = (which: string) => which === 'test' ? set.unseen.map(toItem)
  // dev: training phrases whose concepts the crosswalk covers, a fixed spread (every 25th) to keep runs short
  : set.train.filter((t: any) => t.gold.every((c: string) => c in xwalk)).filter((_: any, i: number) => i % 25 === 0).map(toItem);

/** Strict: a vocabulary id or NONE; anything else is INVALID (scored wrong). */
const parse = (a: string) => { const s = a.trim().toUpperCase(); return s === 'NONE' || ids.has(s) ? s : 'INVALID'; };
const freezeHash = () => createHash('sha256').update(['src/vocab/vocabulary.json', 'src/vocab/index.ts', 'src/pipeline/lookup.ts', 'src/ai/payload.ts']
  .map(f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n')).digest('hex').slice(0, 16);

async function run(arm: string, which: string, limit: number) {
  const items = pick(which).slice(0, limit);
  const out = new URL(`results-${arm}-${which}.jsonl`, local);
  const done = existsSync(out) ? readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  const todo = items.filter((it: any) => !done.some((d: any) => d.phrase === it.phrase));
  const hash = freezeHash();
  if (arm === 'lookup') {
    for (const it of todo) appendFileSync(out, JSON.stringify({ ...it, answer: lookupTerm(it.phrase).id ?? 'NONE', source: 'code', hash }) + '\n');
    return;
  }
  const expected = arm === 'nano' ? 'on_device' : 'in_cloud';
  const nano = arm === 'nano' ? await launchNano() : null;
  const browser = nano ? null : await chromium.launch({ channel: 'chrome', headless: true });
  const page = nano ? await nano.ctx.newPage() : await browser!.newPage();
  await page.goto('http://localhost:5173/spikes/chat.html');
  if (nano) await waitForNano(page);
  await page.waitForFunction(() => typeof (window as any).codeOnce === 'function');
  try {
    for (const [i, it] of todo.entries()) {
      const t0 = Date.now();
      const r: any = await page.evaluate((p: string) => (window as any).codeOnce(p), it.phrase);
      const answer = r.error ? (/8 words/.test(r.error) ? 'NONE' : 'ERROR') : parse(r.answer);
      if (!r.error && r.source !== expected) throw new Error(`row ${i}: ran ${r.source}, expected ${expected}; stopping`);
      appendFileSync(out, JSON.stringify({ ...it, answer, raw: r.answer ?? r.error, source: r.source ?? 'none', ms: r.ms, hash }) + '\n');
      if (i % 10 === 0) console.log(`${arm} ${which} ${i + 1}/${todo.length} ${r.ms} ms`);
      if (arm === 'cloud') await new Promise(res => setTimeout(res, Math.max(0, 5000 - (Date.now() - t0)))); // ≤ 12 a minute
    }
  } finally { await (nano ? nano.close() : browser!.close()); }
}

function score() {
  const which = 'test';
  const rows = (arm: string) => { const f = new URL(`results-${arm}-${which}.jsonl`, local); return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []; };
  const items = pick(which);
  const arms = ['lookup', 'nano', 'cloud'].map(a => ({ a, by: new Map(rows(a).map((r: any) => [r.phrase, r])) })).filter(x => x.by.size);
  const ok = (r: any, it: any) => it.gold.length ? it.gold.includes(r?.answer) : r?.answer === 'NONE';
  const mapped = items.filter((it: any) => it.gold.length), none = items.filter((it: any) => !it.gold.length);
  const res: any = {};
  for (const { a, by } of arms) {
    const m = mapped.filter((it: any) => by.has(it.phrase)), n = none.filter((it: any) => by.has(it.phrase));
    res[a] = { mapped: `${m.filter((it: any) => ok(by.get(it.phrase), it)).length}/${m.length}`, accuracy: +(m.filter((it: any) => ok(by.get(it.phrase), it)).length / m.length).toFixed(3),
      falseCoding: +(n.filter((it: any) => by.get(it.phrase)?.answer !== 'NONE').length / n.length).toFixed(3), invalid: [...by.values()].filter((r: any) => r.answer === 'INVALID' || r.answer === 'ERROR').length,
      medianMs: [...by.values()].map((r: any) => r.ms ?? 0).sort((x, y) => x - y)[by.size >> 1], hashes: [...new Set([...by.values()].map((r: any) => r.hash))] };
  }
  const look = arms.find(x => x.a === 'lookup');
  let seed = 20261118; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  for (const { a, by } of arms.filter(x => x.a !== 'lookup')) {
    const m = mapped.filter((it: any) => by.has(it.phrase) && look!.by.has(it.phrase));
    const d = m.map((it: any) => +ok(by.get(it.phrase), it) - +ok(look!.by.get(it.phrase), it));
    const boots = Array.from({ length: 10000 }, () => { let s = 0; for (let i = 0; i < d.length; i++) s += d[Math.floor(rnd() * d.length)]; return s / d.length; }).sort((x, y) => x - y);
    const gap = d.reduce((x, y) => x + y, 0) / d.length;
    res[a].gapVsLookup = { mean: +gap.toFixed(3), lo: +boots[250].toFixed(3), hi: +boots[9750].toFixed(3), verdict: gap >= 0.15 && boots[250] > 0 ? 'PASS' : 'FAIL' };
  }
  console.log(JSON.stringify(res, null, 1));
}

const [arm, which = 'test', limit = '100000'] = process.argv.slice(2);
if (arm === 'score') score(); else await run(arm, which, +limit);
