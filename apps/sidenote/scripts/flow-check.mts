// Live end-to-end check in Chrome with Gemini Nano: import a planted chat, Who's who, Medicines, Reading.
// Needs `npx vite --port 5173`. Usage: node scripts/flow-check.mts <outDir> <patient> <medicine>   (e.g. shots Ahmed metformin)
// Asserts nothing: prints facts shown and cloud requests (must be 0), and saves screenshots.
import { fileURLToPath } from 'node:url';
import { launchNano, waitForNano } from './nano-profile.mjs';
const [out, patient, medicine] = process.argv.slice(2);
const chat = fileURLToPath(new URL('../../../evals/chattest/chats/G13.txt', import.meta.url));
const nano = await launchNano();
try {
  const page = await nano.ctx.newPage();
  await page.setViewportSize({ width: 402, height: 860 });
  let cloud = 0; page.on('request', r => { if (r.url().includes('firebasevertexai.googleapis.com')) cloud++; });
  await page.goto('http://localhost:5173/');
  await waitForNano(page);
  await page.waitForSelector('.status-device', { timeout: 30000 });
  await page.screenshot({ path: `${out}/0-start-nano.png` });
  await page.setInputFiles('input[type=file]', chat);
  await page.getByRole('radio', { name: new RegExp(`^${patient}`) }).first().check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Medicine name').fill(medicine);
  await page.getByRole('button', { name: 'Read the chat on this device' }).click();
  await page.waitForSelector('.fact', { timeout: 120000 });
  await page.screenshot({ path: `${out}/3-reading-mid.png`, fullPage: true });
  const t0 = Date.now();
  await page.getByText(/dated facts/).waitFor({ timeout: 300000 });
  console.log(`done ${Math.round((Date.now() - t0) / 1000)} s after the first fact; facts shown: ${await page.locator('.fact').count()}; cloud requests: ${cloud}`);
  await page.screenshot({ path: `${out}/4-reading-done.png`, fullPage: true });
} finally { await nano.close(); }
