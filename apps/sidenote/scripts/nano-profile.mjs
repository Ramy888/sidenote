// T0: start Chrome on the dedicated profile (Nano cloned in, outside the repo) with Chrome's own
// defaults, then drive it over CDP. Playwright's launch defaults disable OptimizationHints and
// component updates, which serve Nano, so we don't let Playwright launch it.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROFILE = process.env.SIDENOTE_CHROME_PROFILE ?? join(homedir(), '.cache', 'sidenote-chrome');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

export async function launchNano() {
  const proc = spawn(CHROME, [`--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  let browser;
  for (let i = 0; i < 50 && !browser; i++) {
    try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`); }
    catch { await new Promise(r => setTimeout(r, 200)); }
  }
  if (!browser) { proc.kill(); throw new Error('Chrome did not open the debugging port'); }
  const ctx = browser.contexts()[0];
  const close = async () => { try { await browser.close(); } finally { proc.kill(); } };
  return { browser, ctx, close };
}

// Serves `body` at http://localhost:5199/ (a secure context) without a server.
export async function localPage(ctx, body = '<!doctype html><title>sidenote</title>') {
  const page = await ctx.newPage();
  await page.route('http://localhost:5199/**', r => r.fulfill({ contentType: 'text/html', body }));
  await page.goto('http://localhost:5199/');
  return page;
}

// A fresh launch reports 'downloadable' for a few seconds while Chrome registers the cloned model.
export async function waitForNano(page, timeoutMs = 60000) {
  const end = Date.now() + timeoutMs;
  let a;
  while (Date.now() < end) {
    // Vite may reload the page once after optimising deps; a destroyed context just means "ask again".
    a = await page.evaluate(() => ('LanguageModel' in self ? LanguageModel.availability() : 'no-api')).catch(e => `reload: ${e.message.slice(0, 40)}`);
    if (a === 'available') return a;
    await page.waitForTimeout(1000);
  }
  throw new Error(`Nano not available after ${timeoutMs} ms (last: ${a})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { ctx, close } = await launchNano();
  let ok = false;
  try {
    const page = await localPage(ctx);
    await waitForNano(page);
    const r = await page.evaluate(async () => {
      if (!('LanguageModel' in self)) return { api: false };
      const availability = await LanguageModel.availability();
      if (availability !== 'available') return { api: true, availability };
      const t0 = performance.now();
      const s = await LanguageModel.create();
      const answer = await s.prompt('Reply with exactly one word: ready');
      s.destroy();
      return { api: true, availability, answer: answer.trim(), ms: Math.round(performance.now() - t0) };
    });
    console.log(JSON.stringify(r));
    ok = Boolean(r.answer);
  } finally { await close(); }
  process.exit(ok ? 0 : 1);
}
