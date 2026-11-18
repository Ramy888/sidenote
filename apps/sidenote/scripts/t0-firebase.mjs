// T0 verify: a Playwright-driven Chrome gets an on-device answer through the Firebase SDK.
// Needs `npm run dev` (Vite on 5173) running.
import { launchNano, waitForNano } from './nano-profile.mjs';
const { ctx, close } = await launchNano();
let ok = false;
try {
  const page = await ctx.newPage();
  page.on('request', r => { if (/googleapis\.com/.test(r.url())) console.log('net:', r.method(), new URL(r.url()).host + new URL(r.url()).pathname); });
  await page.goto('http://localhost:5173/spikes/t0.html');
  await waitForNano(page);
  await page.waitForFunction(() => typeof window.t0 === 'function');
  const r = await page.evaluate(() => window.t0());
  console.log(JSON.stringify(r, null, 1));
  ok = r[0].source === 'on_device' && !r[0].error;
} finally { await close(); }
process.exit(ok ? 0 : 1);
