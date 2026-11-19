// Screenshots of the flow at the acceptance widths, English and Arabic, with a horizontal-scroll check
// (DESIGN.md: 360, 402, 744, 1512). Needs `npx vite --port 5173`. Usage: node scripts/shots.mts <outDir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'shots'; mkdirSync(out, { recursive: true });
import { fileURLToPath } from 'node:url';
const chat = fileURLToPath(new URL('../../../evals/chattest/chats/G13.txt', import.meta.url));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems: string[] = [];
for (const lang of ['en', 'ar']) for (const width of [360, 402, 744, 1512]) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 744 ? 844 : 900 }, deviceScaleFactor: 1, isMobile: width < 744, hasTouch: width < 744 });
  await ctx.addInitScript(l => localStorage.setItem('sidenote.lang', l), lang);
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('h1');
  const check = async (step: string) => {
    // Ionic scrolls inside ion-content, so also look for any element sticking out of the viewport.
    const over = await page.evaluate(() => {
      const out = [...document.querySelectorAll('#main *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); });
      return { page: document.documentElement.scrollWidth - innerWidth, els: out.slice(0, 3).map(e => `${e.tagName.toLowerCase()}.${e.className}`) };
    });
    if (over.page > 0 || over.els.length) problems.push(`${lang} ${width} ${step}: page +${over.page}px, outside: ${over.els.join(', ')}`);
    await page.screenshot({ path: `${out}/${step}-${lang}-${width}.png`, fullPage: true });
  };
  await check('1-start');
  await page.setInputFiles('input[type=file]', chat);
  await page.waitForSelector('fieldset');
  await page.locator('.choice').first().click();
  await check('2-who');
  // The demo case runs the rest of the flow without on-device AI: timeline, approval, suggestion, report.
  await page.locator('.brand').click();
  await page.locator('.start .actions button').filter({ hasText: /demo|التجريبية/ }).first().click();
  await page.waitForSelector('.answers');
  await check('3-timeline');
  for (let b = page.locator('.facts .fact-actions .btn-primary'); await b.count(); ) await b.first().click();
  await page.locator('.sticky-actions .btn-primary').click();
  await page.waitForSelector('.out-items, .suspect-panel');
  await check('4-outbound');
  if (await page.locator('.out-items').count()) await page.locator('.actions .btn-secondary').last().click(); // keep it on my phone
  await page.waitForSelector('.suspect-panel');
  await check('5-suggestion');
  await page.locator('.screen > .btn-primary').click();
  await page.waitForSelector('.draft');
  await check('6-report');
  await ctx.close();
}
await browser.close();
console.log(problems.length ? problems.join('\n') : 'no sideways scroll at any width');
