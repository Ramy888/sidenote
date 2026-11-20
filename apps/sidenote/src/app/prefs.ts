// Per-device preferences (localStorage, wrapped: private windows may refuse it): text size and the demo check-in.
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

export const initialTextSize = () => { const n = Number(get('sidenote.textSize')); return [100, 125, 150].includes(n) ? n : 100; };
export const saveTextSize = (pct: number) => { document.documentElement.style.fontSize = `${pct}%`; set('sidenote.textSize', String(pct)); };
export const initialDemo = () => get('sidenote.demoCheckin') === '1';
export const saveDemo = (v: boolean) => set('sidenote.demoCheckin', v ? '1' : '0');
