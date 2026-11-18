// T3 cold offline: fresh Chrome, all Google endpoints blocked before the page loads (cached app shell +
// Wi-Fi off), so no App Check token and no warm Nano exist when the first call runs.
import { launchNano, waitForNano } from './nano-profile.mjs';
const { ctx, close } = await launchNano();
let blocked = 0;
try {
  const page = await ctx.newPage();
  await page.route(/googleapis\.com|gstatic\.com|google\.com/, r => { blocked++; return r.abort('internetdisconnected'); });
  await page.goto('http://localhost:5173/spikes/offline.html');
  await waitForNano(page);
  await page.waitForFunction(() => typeof window.offlineSpike === 'function');
  console.log('COLD OFFLINE', JSON.stringify(await page.evaluate(() => window.offlineSpike()), null, 1));
} finally { await close(); }
console.log('blocked requests:', blocked);
