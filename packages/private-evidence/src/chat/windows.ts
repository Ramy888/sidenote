// Prefilter: group messages near cue messages into windows short enough for the on-device model
// (Gemini Nano in Chrome takes about 9,216 tokens; windows stay far below that).
export interface WindowOptions { before?: number; after?: number; maxChars?: number }

export function cueWindows<M extends { text: string }>(messages: M[], isCue: (m: M) => boolean, opts: WindowOptions = {}): M[][] {
  const { before = 2, after = 2, maxChars = 2000 } = opts;
  const keep = new Array<boolean>(messages.length).fill(false);
  messages.forEach((m, i) => {
    if (!isCue(m)) return;
    for (let j = Math.max(0, i - before); j <= Math.min(messages.length - 1, i + after); j++) keep[j] = true;
  });
  const windows: M[][] = [];
  let cur: M[] = [], chars = 0;
  const flush = () => { if (cur.length) windows.push(cur); cur = []; chars = 0; };
  messages.forEach((m, i) => {
    if (!keep[i]) { flush(); return; }
    if (cur.length && chars + m.text.length > maxChars) flush();
    cur.push(m); chars += m.text.length;
  });
  flush();
  return windows;
}
