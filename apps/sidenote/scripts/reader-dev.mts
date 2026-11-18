// Dev runner: parse each evals/dev chat with the real importer, read it on the device, print events.
// Needs `npx vite --port 5173` running. Fails if any request reaches the Firebase AI Logic endpoint.
import { readFileSync, readdirSync } from 'node:fs';
import { parseWhatsApp } from '../../../packages/private-evidence/src/chat/whatsapp.ts';
import { launchNano, waitForNano } from './nano-profile.mjs';

const dir = new URL('../../../evals/dev/', import.meta.url);
const { ctx, close } = await launchNano();
let aiRequests = 0;
try {
  const page = await ctx.newPage();
  page.on('request', r => { if (r.url().includes('firebasevertexai.googleapis.com')) aiRequests++; });
  await page.goto('http://localhost:5173/spikes/chat.html');
  await waitForNano(page);
  await page.waitForFunction(() => typeof (window as any).readWindow === 'function');
  await page.evaluate(() => (window as any).readWindow([{ id: 0, at: '2026-01-01T00:00:00', sender: 'A', text: 'hello' }])); // warm-up
  for (const f of readdirSync(dir).filter(f => f.endsWith('.txt')).sort()) {
    const chat = parseWhatsApp(readFileSync(new URL(f, dir), 'utf8'), { regionDateOrder: 'dmy' });
    const msgs = chat.messages.filter(m => !m.media).map(({ id, at, sender, text }) => ({ id, at, sender, text }));
    const r = await page.evaluate(m => (window as any).readWindow(m), msgs);
    console.log(`\n== ${f}: ${msgs.length} messages, ${r.ms} ms, ${r.source ?? r.error}`);
    for (const e of r.events ?? []) console.log(`  [${e.message}] ${e.kind.padEnd(19)} med="${e.medicine}" sym="${e.symptom}" when="${e.when}" | "${e.quote}"`);
  }
} finally { await close(); }
console.log('\nrequests to firebasevertexai:', aiRequests);
process.exit(aiRequests === 0 ? 0 : 1);
