// Live check of the paths for browsers without on-device AI (headless Chrome, empty profile): the 5 questions
// through to the report, and the demo case. Needs `npx vite --port 5173`. Usage: node scripts/flow-questions.mts <outDir>
import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await (await browser.newContext({ viewport: { width: 402, height: 860 }, locale: 'en-GB' })).newPage();
  const cloud: string[] = []; page.on('request', r => { if (r.url().includes('firebasevertexai')) cloud.push(r.url()); });
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Answer 5 short questions' }).click();
  await page.getByLabel('Medicine name').fill('amlodipine');
  await page.getByRole('button', { name: 'Read the chat on this device' }).click();
  await page.getByRole('textbox').fill('my ankles are swollen by the evening');
  await page.screenshot({ path: `${out}/q1.png` });
  const next = () => page.getByRole('button', { name: /^(Next|Continue)$/ }).click();
  await next();
  await page.getByLabel('2 to 4 weeks ago').check(); await next();
  await page.getByLabel('Yes').check(); await page.getByLabel('1 to 2 weeks ago').check(); await next();
  await page.getByLabel('Yes').check(); await page.getByLabel('Less than a week ago').check(); await next();
  await page.getByLabel('No').first().check(); await next();
  await page.getByRole('heading', { name: 'Your timeline' }).waitFor();
  await page.screenshot({ path: `${out}/q-timeline.png`, fullPage: true });
  console.log('answers:', (await page.locator('.answer .answer-a').allInnerTexts()).join(' | '));
  await page.getByRole('button', { name: 'Continue to the report' }).click();
  await page.getByRole('heading', { name: /What leaves this device|Which medicine/ }).waitFor();
  if (await page.getByRole('button', { name: 'Keep it on my phone' }).isVisible()) {
    console.log('approval asked for:', (await page.locator('.out-items').innerText()).replace(/\s+/g, ' ').slice(0, 160));
    await page.getByRole('button', { name: 'Keep it on my phone' }).click();
  }
  await page.getByRole('heading', { name: 'Which medicine is more likely?' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Your report draft' }).waitFor();
  await page.screenshot({ path: `${out}/q-report.png`, fullPage: true });
  console.log('report:', (await page.locator('.draft').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await page.getByRole('button', { name: 'SideNote' }).click();
  await page.getByRole('button', { name: /Load the demo case/ }).first().click();
  await page.getByRole('heading', { name: 'Your timeline' }).waitFor();
  console.log('demo facts:', await page.locator('.facts .fact').count(), '| cloud requests in total:', cloud.length);
} finally { await browser.close(); }
