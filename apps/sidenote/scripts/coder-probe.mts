// Live check of the coder route (PREFER_ON_DEVICE): Chrome with Nano should answer on the device, Chrome
// without a model should fall back to the cloud by itself. Needs `npx vite --port 5173`. SKIP_NANO=1 runs only
// the no-model half. Makes one real cloud call (free tier).
import { chromium } from 'playwright';
import { launchNano, waitForNano } from './nano-profile.mjs';
async function probe(page: any, label: string) {
  let cloud = 0; page.on('request', (r: any) => { if (r.url().includes('firebasevertexai.googleapis.com')) cloud++; });
  await page.goto('http://localhost:5173/spikes/chat.html');
  await page.waitForFunction(() => typeof (window as any).codeOnce === 'function');
  const avail = await page.evaluate(() => ('LanguageModel' in self ? (self as any).LanguageModel.availability() : 'no-api'));
  const r = await page.evaluate(() => (window as any).codeOnce('legs have been aching')).catch((e: Error) => ({ error: e.message.slice(0, 200) }));
  console.log(label, JSON.stringify({ availability: avail, ...r, cloudRequests: cloud }));
}
const SKIP_NANO = process.env.SKIP_NANO === '1';
const nano = SKIP_NANO ? null : await launchNano();
if (nano) { const p1 = await nano.ctx.newPage(); await p1.goto('http://localhost:5173/spikes/chat.html'); await waitForNano(p1);
await probe(p1, 'Chrome+Nano:'); await nano.close(); }
const plain = await chromium.launch({ channel: 'chrome', headless: true }); await probe(await plain.newPage(), 'No Nano:   '); await plain.close();
