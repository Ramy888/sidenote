import { describe, it, expect } from 'vitest';
import { readChat } from '../src/pipeline/chat.ts';
import type { ReaderEvent } from '../src/pipeline/reader.ts';

const msgs = [
  { id: 0, at: '2026-03-01T09:00:00', sender: 'M', text: 'started the atorvastatin today', media: false },
  ...Array.from({ length: 30 }, (_, i) => ({ id: i + 1, at: '2026-03-02T09:00:00', sender: 'S', text: `see you at ${i}`, media: false })),
  { id: 31, at: '2026-03-10T09:00:00', sender: 'M', text: 'my legs ache since yesterday', media: false },
];
const read = async (w: { id: number; text: string }[]): Promise<ReaderEvent[]> => w.flatMap(m =>
  m.text.includes('atorvastatin') ? [{ kind: 'medicine_started' as const, medicine: 'atorvastatin', symptom: '', quote: m.text, message: m.id, when: 'today' }]
  : m.text.includes('ache') ? [{ kind: 'symptom_started' as const, medicine: '', symptom: 'legs ache', quote: m.text, message: m.id, when: 'since yesterday' }] : []);

describe('readChat progress and cancel', () => {
  it('reports 0 of N before the first window, then each window', async () => {
    const seen: [number, number][] = [];
    await readChat(msgs, { medicines: ['atorvastatin'], ownSenders: ['M'], read, onWindow: (d, t) => seen.push([d, t]) });
    expect(seen[0]).toEqual([0, 2]);
    expect(seen.at(-1)).toEqual([2, 2]);
  });
  it('stops between windows when cancelled and keeps what was read', async () => {
    const ctl = new AbortController();
    const r = await readChat(msgs, { medicines: ['atorvastatin'], ownSenders: ['M'], read, signal: ctl.signal, onWindow: d => { if (d === 1) ctl.abort(); } });
    expect(r.cancelled).toBe(true);
    expect(r.events.map(e => e.kind)).toEqual(['medicine_started']);
  });
});
