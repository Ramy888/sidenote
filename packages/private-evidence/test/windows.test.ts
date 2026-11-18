import { describe, it, expect } from 'vitest';
import { cueWindows } from '../src/chat/windows';

const msgs = Array.from({ length: 30 }, (_, id) => ({ id, text: [3, 4, 20].includes(id) ? 'CUE here' : 'chatter' }));
const isCue = (m: { text: string }) => m.text.includes('CUE');

describe('cueWindows (prefilter: only messages near a cue are read)', () => {
  it('takes each cue with its neighbours and merges overlaps', () => {
    expect(cueWindows(msgs, isCue, { before: 1, after: 1 }).map(w => w.map(m => m.id))).toEqual([[2, 3, 4, 5], [19, 20, 21]]);
  });
  it('splits a window that would be too long, keeping every cue', () => {
    const long = Array.from({ length: 12 }, (_, id) => ({ id, text: 'CUE ' + 'x'.repeat(100) }));
    const ws = cueWindows(long, isCue, { before: 0, after: 0, maxChars: 350 });
    expect(ws.flat().map(m => m.id)).toEqual(long.map(m => m.id));
    expect(ws.every(w => w.reduce((n, m) => n + m.text.length, 0) <= 350)).toBe(true);
  });
  it('returns nothing when no message is a cue', () => {
    expect(cueWindows(msgs.filter(m => !isCue(m)), isCue)).toEqual([]);
  });
});
