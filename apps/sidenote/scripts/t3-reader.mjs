// T3 runner. CADEC text is read from ideation/ (gitignored) and results are written back there.
// Every googleapis request is aborted, so no post can leave this machine even if routing were wrong.
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { launchNano, waitForNano } from './nano-profile.mjs';
const dir = new URL('../../../ideation/spike-sidenote/', import.meta.url);
const tasks = JSON.parse(readFileSync(new URL('web/tasks.json', dir), 'utf8'));
const RAW = process.env.RAW === '1';
const out = new URL(RAW ? 'results-raw-nov16.jsonl' : 'results-firebase.jsonl', dir);
writeFileSync(out, '');
const { ctx, close } = await launchNano();
let blocked = 0;
try {
  const page = await ctx.newPage();
  await page.route(/googleapis\.com/, r => { blocked++; return r.abort(); });
  await page.goto('http://localhost:5173/spikes/t3.html');
  await waitForNano(page);
  await page.waitForFunction(() => typeof window.readOneRaw === 'function');
  for (const [i, t] of tasks.entries()) {
    const rec = await page.evaluate(([fn, t]) => window[fn](t), [RAW ? 'readOneRaw' : 'readOne', t]);
    appendFileSync(out, JSON.stringify(rec) + '\n');
    if (i % 20 === 19) console.log(`${i + 1}/${tasks.length}`);
  }
} finally { await close(); }
console.log('blocked network requests:', blocked);
