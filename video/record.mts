// Records the app shots for the demo video into video/footage/. Needs `npx vite --port 5173` in apps/sidenote
// (local build; its App Check debug token lets cloud calls through without reCAPTCHA). Synthetic demo data only.
//   node video/record.mts plain   S02 start page, S04 timeline, S05 approval → cloud suggestion, S09 report
//   node video/record.mts start   S02 again in the Nano profile, so the start page says on-device AI is ready
//   node video/record.mts nano    S03 live on-device reading, S06 offline: the ranker moves to Nano, ledger
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { recorder } from './rec.mts';
import { launchNano, waitForNano } from '../apps/sidenote/scripts/nano-profile.mjs';

const OUT = fileURLToPath(new URL('footage/', import.meta.url));
const URL_ = 'http://localhost:5173/';
const CHAT = fileURLToPath(new URL('../apps/sidenote/src/demo/demo-chat.txt', import.meta.url));
const which = process.argv[2];

if (which === 'plain') {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await b.newContext({ locale: 'en-US' })).newPage();
  const r = await recorder(page, OUT);
  await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.locator('.entries').waitFor(); await page.waitForTimeout(1500);

  await r.start('S02');                                   // the start page: the chat beside the timeline it becomes
  await r.hold(3.5);
  await r.moveTo(page.locator('.hero-visual .preview'));
  await r.hold(1.5);
  await r.click(page.getByRole('button', { name: /Try the demo case/ }));
  await page.locator('.answers').waitFor(); await r.hold(1.2);
  await r.stop();

  await r.start('S04');                                   // the three answers, confirmed one by one, then the chart
  await r.hold(2);
  for (let i = 0; i < 3; i++) { await r.click(page.locator('.answer .btn-primary').first()); await r.hold(0.6); }
  await r.scrollTo(page.locator('.chart'));
  await r.hold(4);
  await r.stop();

  for (let x = page.locator('.facts .fact-actions .btn-primary'); await x.count();) await x.first().click(); // off camera
  await page.getByRole('button', { name: 'Continue to the report' }).click();
  await page.locator('.out-items').waitFor(); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);

  await r.start('S05');                                   // what leaves this device → send → the cloud's suggestion
  await r.hold(2.5);
  await r.moveTo(page.locator('.not-sent')); await r.hold(1.8);
  await r.click(page.locator('details.card summary')); await r.hold(2.5);
  await r.click(page.getByRole('button', { name: 'Send these to Google' }));
  r.pause(); await page.getByRole('heading', { name: 'Which medicine is more likely?' }).waitFor({ timeout: 90000 }); await r.resume();
  await r.hold(1); await r.moveTo(page.locator('.suspect-panel .badge').first()); await r.hold(4);
  await r.stop();

  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('.draft').waitFor(); await page.waitForTimeout(800);
  await r.start('S09');                                   // the report draft, then the Arabic interface
  await r.hold(2.5);
  await r.scrollTo(page.locator('.draft'), 'start'); await r.hold(2);
  await r.click(page.getByRole('button', { name: 'العربية' }).first()); await r.hold(3);
  await r.stop();
  await b.close();
}

if (which === 'nano') {
  const nano = await launchNano();
  try {
    const page = await nano.ctx.newPage();
    let cloud = 0; page.on('request', q => { if (q.url().includes('firebasevertexai.googleapis.com')) cloud++; });
    const r = await recorder(page, OUT);
    await page.goto(URL_); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('sidenote.lang', 'en'); }); await page.reload();
    await waitForNano(page); await page.waitForSelector('.status-device', { timeout: 30000 });
    await page.setInputFiles('input[type=file]', CHAT);
    await page.getByRole('radio', { name: /^Grandpa Joe/ }).first().check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Medicine name').first().fill('lisinopril');
    await page.getByRole('button', { name: 'Add another medicine' }).click();
    await page.getByLabel('Medicine name').nth(1).fill('aspirin');
    await page.getByRole('button', { name: 'Read the chat on this device' }).click();

    await page.locator('.fact').first().waitFor({ timeout: 180000 });
    if (!process.env.ONLY_S06) {
      await r.start('S03');                               // facts appear with their quotes, read on this device
      await r.hold(11);
      await r.stop();
    }
    await page.getByText(/dated facts/).waitFor({ timeout: 400000 });
    console.log('cloud requests while reading:', cloud);

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.locator('.answers').waitFor();
    for (let x = page.locator('.answer .btn-primary, .facts .fact-actions .btn-primary'); await x.count();) await x.first().click();
    await page.getByRole('button', { name: 'Continue to the report' }).click();
    // the coder may ask first (phrases the lookup can't code): approve it on the device, off camera
    for (let i = 0; i < 2 && await page.getByRole('heading', { name: 'What leaves this device' }).isVisible(); i++) {
      if (await page.getByText(/to suggest which medicine/).count()) break;
      await page.getByRole('button', { name: 'Send these to Google' }).click(); await page.waitForTimeout(3000);
    }
    await page.context().setOffline(true);
    await page.locator('.out-items').waitFor(); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
    await r.start('S06');                                 // network off: the cloud-first ranker runs on Nano; the ledger says so
    await r.hold(1.5);
    await r.click(page.getByRole('button', { name: 'Send these to Google' }));
    r.pause(); await page.getByRole('heading', { name: 'Which medicine is more likely?' }).waitFor({ timeout: 180000 }); await r.resume();
    await r.moveTo(page.locator('.suspect-panel .badge').first()); await r.hold(2.5);
    await r.click(page.getByRole('button', { name: 'Ledger' })); await r.hold(1);
    await page.locator('.ledger li').last().evaluate(e => e.scrollIntoView({ behavior: 'smooth', block: 'end' })); await r.hold(3);
    await r.stop();
    console.log('ranker badge:', await page.locator('.suspect-panel .badge').first().innerText().catch(() => '?'));
  } finally { await nano.close(); }
}

if (which === 'start') {
  const nano = await launchNano();
  try {
    const page = await nano.ctx.newPage();
    const r = await recorder(page, OUT);
    await page.goto(URL_); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('sidenote.lang', 'en'); }); await page.reload();
    await waitForNano(page); await page.waitForSelector('.status-device', { timeout: 30000 }); await page.waitForTimeout(1500);
    await r.start('S02');                                 // the start page: the chat beside the timeline it becomes
    await r.hold(3);
    await r.moveTo(page.locator('.hero-visual .preview'));
    await r.hold(2);
    await r.moveTo(page.getByRole('button', { name: /Import a family chat/ }));
    await r.hold(2.5);
    await r.stop();
  } finally { await nano.close(); }
}
