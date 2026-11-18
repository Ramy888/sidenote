// T1 chat test runner. Reads every planted chat on the device through the real pipeline modules,
// scores against the code-owned specs, and records reading time, power state and file hashes.
// Needs `npx vite --port 5173`. Usage: node scripts/chattest.mts [caseId ...]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { parseWhatsApp } from '@sidenote/private-evidence';
import { readChat } from '../src/pipeline/chat.ts';
import { READER_VERSION } from '../src/pipeline/reader.ts';
import { scoreCase, summarize } from '../../../evals/chattest/score.mts';
import { launchNano, waitForNano } from './nano-profile.mjs';

const root = new URL('../../../', import.meta.url);
const evals = new URL(process.env.CHATTEST_DIR ?? 'evals/chattest/', root);
const { seed, cases } = JSON.parse(readFileSync(new URL('specs.json', evals), 'utf8'));
const only = process.argv.slice(2);
const todo = cases.filter((c: any) => existsSync(new URL(`chats/${c.id}.txt`, evals)) && (!only.length || only.includes(c.id)));

const frozen = ['apps/sidenote/src/pipeline/reader.ts', 'apps/sidenote/src/pipeline/lexicon.ts', 'apps/sidenote/src/pipeline/timeline.ts', 'apps/sidenote/src/pipeline/chat.ts',
  'packages/private-evidence/src/evidence/locate.ts', 'packages/private-evidence/src/evidence/when.ts', 'packages/private-evidence/src/chat/windows.ts', 'evals/chattest/score.mts', 'evals/chattest/specs.json'];
const hash = createHash('sha256'); for (const f of frozen) hash.update(readFileSync(new URL(f, root)));
const power = execSync('pmset -g batt | tail -1; pmset -g | grep -i lowpowermode; sysctl -n vm.loadavg').toString().replace(/\s+/g, ' ').trim();
const run = { started: new Date().toISOString(), reader: READER_VERSION, specSeed: seed, filesHash: hash.digest('hex').slice(0, 16), power };
console.log(JSON.stringify(run));

mkdirSync(new URL('results/', evals), { recursive: true });
// Each case is appended as it finishes, so a Chrome crash loses at most one case; RESUME=<file> continues a run.
const partial = new URL(process.env.RESUME ? `results/${process.env.RESUME}` : `results/partial-${run.started.replace(/[:.]/g, '-')}.jsonl`, evals);
const done = existsSync(partial) ? readFileSync(partial, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const rows: any[] = done.map(({ timeline: _timeline, ...r }) => r);
const out: any[] = [...done];
let aiRequests = 0;

async function openReader() {
  const nano = await launchNano();
  const page = await nano.ctx.newPage();
  page.on('request', r => { if (r.url().includes('firebasevertexai.googleapis.com')) aiRequests++; });
  await page.goto('http://localhost:5173/spikes/chat.html');
  await waitForNano(page);
  await page.waitForFunction(() => typeof (window as any).readWindow === 'function');
  await page.evaluate(() => (window as any).readWindow([{ id: 0, at: '2026-01-01T00:00:00', sender: 'A', text: 'hello' }])); // warm the model
  return { page, close: nano.close };
}

let reader = await openReader();
try {
  for (const c of todo.filter((c: any) => !done.some(d => d.id === c.id))) {
    const chat = parseWhatsApp(readFileSync(new URL(`chats/${c.id}.txt`, evals), 'utf8'), { regionDateOrder: c.dateOrder });
    let res: Awaited<ReturnType<typeof readChat>> | null = null, errors = 0, ms = 0, crashes = 0;
    while (!res) {
      errors = 0;
      const t0 = Date.now();
      try {
        res = await readChat(chat.messages, {
          medicines: c.medicines.map((m: any) => m.name), ownSenders: [c.patient],
          read: async w => { const r = await reader.page.evaluate(m => (window as any).readWindow(m), w); if (r.error) { errors++; return []; } return r.events; },
        });
        ms = Date.now() - t0;
      } catch (e) {
        if (++crashes > 1) throw e;
        console.log(`${c.id}: Chrome closed (${String((e as Error).message).slice(0, 60)}), relaunching and retrying once`);
        await reader.close().catch(() => {});
        reader = await openReader();
      }
    }
    const row = { ...scoreCase(c, res.timeline), windows: res.windows, readerErrors: errors, rejectedQuotes: res.rejected.length, rawEvents: res.events.length + res.rejected.length, ms, crashes };
    rows.push(row);
    const rec = { ...row, timeline: res.timeline.map(f => ({ kind: f.kind, entity: f.entity, date: f.date, quote: f.evidence.quote })),
      // Audit trail for misses: what the Reader said and why code dropped it (synthetic chats only).
      readerEvents: res.events.map(e => ({ kind: e.kind, symptom: e.symptom, medicine: e.medicine, quote: e.quote, date: e.date })),
      rejected: res.rejected.map(r => ({ kind: r.event.kind, quote: r.event.quote, reason: r.reason })) };
    out.push(rec);
    writeFileSync(partial, JSON.stringify(rec) + '\n', { flag: 'a' });
    console.log(`${c.id} ${c.source.padEnd(9)} ${c.variant.padEnd(13)} correct ${row.correct}/${row.events} shown ${row.shown} unsupported ${row.unsupported} | 5q ${row.baseline5q} kinder ${row.baselineKinder} | ${res.windows} windows ${Math.round(ms / 1000)}s err ${errors}`);
  }
} finally { await reader.close().catch(() => {}); }


const summary = { run, aiRequests, all: summarize(rows), generated: summarize(rows.filter(r => r.source === 'generated')), hand: rows.some(r => r.source === 'hand') ? summarize(rows.filter(r => r.source === 'hand')) : null,
  readingSeconds: { median: rows.map(r => r.ms).sort((a, b) => a - b)[Math.floor(rows.length / 2)] / 1000, max: Math.max(...rows.map(r => r.ms)) / 1000 } };
writeFileSync(new URL(`results/run-${run.started.replace(/[:.]/g, '-')}.json`, evals), JSON.stringify({ summary, cases: out }, null, 1));
console.log(JSON.stringify(summary, null, 1));
process.exit(aiRequests === 0 ? 0 : 1);
