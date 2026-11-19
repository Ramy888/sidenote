// Live check of the cloud half in Chrome with Nano: two medicines -> timeline (confirm all) -> outbound
// approval -> ranker (cloud first) -> suggestion. Needs `npx vite --port 5173`. Makes real cloud calls (free tier).
// Usage: node scripts/flow-cloud.mts <outDir> <chatId> <patient> <med1,med2>
import { fileURLToPath } from 'node:url';
import { launchNano, waitForNano } from './nano-profile.mjs';
const [out, id, patient, medsArg] = process.argv.slice(2);
const chat = fileURLToPath(new URL(`../../../evals/chattest/chats/${id}.txt`, import.meta.url));
const nano = await launchNano();
try {
  const page = await nano.ctx.newPage();
  await page.setViewportSize({ width: 1180, height: 900 });
  const cloud: string[] = []; page.on('request', r => { if (r.url().includes('firebasevertexai.googleapis.com')) cloud.push(r.postData()?.slice(0, 120) ?? ''); });
  await page.goto('http://localhost:5173/');
  await waitForNano(page);
  await page.setInputFiles('input[type=file]', chat);
  await page.getByRole('radio', { name: new RegExp(`^${patient}`) }).first().check();
  await page.getByRole('button', { name: 'Continue' }).click();
  const meds = medsArg.split(',');
  for (const [i, m] of meds.entries()) {
    if (i) await page.getByRole('button', { name: 'Add another medicine' }).click();
    await page.getByLabel('Medicine name').nth(i).fill(m);
  }
  await page.getByRole('button', { name: 'Read the chat on this device' }).click();
  await page.getByText(/dated facts/).waitFor({ timeout: 300000 });
  console.log(`after reading: cloud requests ${cloud.length}`);
  await page.getByRole('button', { name: 'Continue' }).click();
  if (await page.getByRole('button', { name: "I'm safe, continue" }).isVisible().catch(() => false)) await page.getByRole('button', { name: "I'm safe, continue" }).click();
  await page.getByRole('heading', { name: 'Your timeline' }).waitFor();
  for (let b = page.locator('.facts').getByRole('button', { name: 'Confirm', exact: true }); await b.count(); ) await b.first().click();
  for (const c of await page.locator('.fact-conflict button.btn-secondary').all()) await c.click().catch(() => {});
  await page.getByRole('button', { name: 'Continue to the report' }).click();
  await page.getByRole('heading', { name: /What leaves this device|Which medicine/ }).waitFor();
  await page.screenshot({ path: `${out}/6-outbound.png`, fullPage: true });
  for (let i = 0; i < 2 && await page.getByRole('button', { name: 'Send these to Google' }).isVisible().catch(() => false); i++) {
    await page.getByRole('button', { name: 'Send these to Google' }).click();
    await page.waitForFunction(() => !document.querySelector('[role=status]')?.textContent?.match(/Finding|Comparing/), null, { timeout: 120000 });
    await page.screenshot({ path: `${out}/6-outbound-${i + 1}.png`, fullPage: true });
  }
  await page.getByRole('heading', { name: 'Which medicine is more likely?' }).waitFor({ timeout: 120000 });
  await page.screenshot({ path: `${out}/7-suggestion.png`, fullPage: true });
  console.log(`cloud requests in total: ${cloud.length}`);
  console.log((await page.locator('.suspect-panel').innerText()).replace(/\s+/g, ' '));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Your report draft' }).waitFor();
  await page.screenshot({ path: `${out}/8-report.png`, fullPage: true });
  await page.getByRole('button', { name: 'Ledger' }).click();
  await page.screenshot({ path: `${out}/9-ledger.png` });
  console.log('ledger rows:', await page.locator('.ledger-rows > li').count(), '| draft:', (await page.locator('.draft').innerText()).replace(/\s+/g, ' ').slice(0, 400));
} finally { await nano.close(); }
