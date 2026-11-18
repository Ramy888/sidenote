// T3 offline spike. Online run first (warms Nano, gets an App Check token), then the network is cut
// with Chrome's offline emulation (stands in for Wi-Fi off; re-check with real Wi-Fi off for the demo).
import { launchNano, waitForNano } from './nano-profile.mjs';
const { ctx, close } = await launchNano();
try {
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/spikes/offline.html');
  await waitForNano(page);
  await page.waitForFunction(() => typeof window.offlineSpike === 'function');
  console.log('ONLINE', JSON.stringify(await page.evaluate(() => window.offlineSpike()), null, 1));
  await ctx.setOffline(true);
  console.log('OFFLINE', JSON.stringify(await page.evaluate(() => window.offlineSpike()), null, 1));
} finally { await close(); }
