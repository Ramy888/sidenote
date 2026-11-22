// Shot recorder on top of a Playwright page: grabs JPEG frames over CDP with real timestamps (paused time is cut),
// draws a pointer and a click ripple (headless has none), and writes footage/<shot>.mp4 at 1920x1080, 30 fps.
// A small CDP frame recorder on top of Playwright, so the Nano profile can be driven too.
import type { Page, Locator, CDPSession } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const W = 1440, H = 810, SCALE = 4 / 3; // CSS viewport; frames come out 1920x1080
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const CURSOR = `(() => { if (document.getElementById('rec-cursor')) return;
  const c = document.createElement('div'); c.id = 'rec-cursor';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L17 21l-3 1.4-4-6.6L4 20z" fill="#fff" stroke="#101828" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, {position:'fixed', left:(window.__recX ?? ${W / 2})+'px', top:(window.__recY ?? ${H / 2})+'px', zIndex:2147483647, pointerEvents:'none',
    transition:'left .6s cubic-bezier(.4,0,.2,1), top .6s cubic-bezier(.4,0,.2,1), transform .12s', filter:'drop-shadow(0 2px 3px rgba(0,0,0,.35))'});
  document.documentElement.appendChild(c);
  const r = document.createElement('div'); r.id = 'rec-ripple';
  Object.assign(r.style, {position:'fixed', width:'40px', height:'40px', margin:'-20px 0 0 -20px', borderRadius:'50%', border:'3px solid #1A56C4',
    zIndex:2147483646, pointerEvents:'none', opacity:0});
  document.documentElement.appendChild(r);
})()`;

export async function recorder(page: Page, outDir: string) {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  await page.setViewportSize({ width: W, height: H });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  mkdirSync(outDir, { recursive: true });

  let frames: { t: number; data: string }[] = [];
  let recording = false, polling = false, offset = 0, pausedAt = 0, shotName = '';
  const now = () => performance.now() / 1000;
  const poll = async () => {
    while (polling) {
      if (recording) {
        const t = now();
        const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 }).catch(() => null);
        if (r && recording) frames.push({ t: t - offset, data: r.data });
        await sleep(15);
      } else await sleep(15);
    }
  };
  const ensureCursor = () => page.evaluate(CURSOR).catch(() => {});

  return {
    page,
    async start(name: string) { shotName = name; frames = []; offset = now(); await ensureCursor(); recording = true; polling = true; poll(); },
    pause() { recording = false; pausedAt = now(); },
    async resume() { await ensureCursor(); offset += now() - pausedAt; recording = true; },
    hold: (s: number) => sleep(s * 1000),
    async moveTo(l: Locator) {
      await l.scrollIntoViewIfNeeded().catch(() => {});
      const b = (await l.boundingBox())!;
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await ensureCursor();
      await page.evaluate(([x, y]) => { const c = document.getElementById('rec-cursor')!; c.style.left = x - 4 + 'px'; c.style.top = y - 2 + 'px'; (window as any).__recX = x - 4; (window as any).__recY = y - 2; }, [x, y]);
      await sleep(750);
      return { x, y };
    },
    async click(l: Locator) {
      const { x, y } = await this.moveTo(l);
      await page.evaluate(([x, y]) => { const r = document.getElementById('rec-ripple')!; r.style.transition = 'none'; r.style.left = x + 'px'; r.style.top = y + 'px'; r.style.opacity = '1'; r.style.transform = 'scale(.4)'; r.offsetWidth; r.style.transition = 'opacity .5s, transform .5s'; r.style.opacity = '0'; r.style.transform = 'scale(1.6)'; }, [x, y]);
      await sleep(150);
      await l.click();
      await sleep(450);
    },
    async scrollTo(l: Locator, block: 'start' | 'center' = 'center') {
      await l.evaluate((e, block) => e.scrollIntoView({ behavior: 'smooth', block }), block);
      await sleep(900);
    },
    async stop() {
      recording = false; polling = false; await sleep(80);
      const dir = `${outDir}/${shotName}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
      frames.sort((a, b) => a.t - b.t);
      let list = '';
      frames.forEach((f, i) => {
        const file = `f${String(i).padStart(5, '0')}.jpg`;
        writeFileSync(`${dir}/${file}`, Buffer.from(f.data, 'base64'));
        const d = i + 1 < frames.length ? frames[i + 1].t - f.t : 0.5;
        list += `file '${file}'\nduration ${d.toFixed(4)}\n`;
      });
      list += `file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`; // concat demuxer needs the last file twice
      writeFileSync(`${dir}/list.txt`, list);
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`,
        '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p', '-r', '30', '-c:v', 'libx264', '-crf', '16', `${outDir}/${shotName}.mp4`]);
      rmSync(dir, { recursive: true, force: true });
      const secs = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
      console.log(`${shotName}: ${frames.length} frames, ${secs.toFixed(1)} s, ${(frames.length / Math.max(secs, 0.1)).toFixed(1)} fps`);
    },
  };
}
