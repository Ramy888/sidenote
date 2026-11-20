import { describe, it, expect } from 'vitest';
import { saveCheckIn, dueCheckIn, applyCheckIn, CHECKIN_KEY } from '../src/app/checkin.ts';
import { buildDraft, draftText } from '../src/app/report.ts';

const store = new Map<string, string>();
const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
const draft = buildDraft({ review: [], meds: [{ name: 'ramipril', strength: '', startKind: 'unknown', start: '' }], coding: [], ranking: null, region: 'UK' });

describe('2-week check-in', () => {
  it('is due 14 days after saving, or at once with the demo flag', () => {
    saveCheckIn(draft, '2026-11-20', ls);
    expect(JSON.parse(store.get(CHECKIN_KEY)!).due).toBe('2026-12-04');
    expect(dueCheckIn('2026-12-03', false, ls)).toBeNull();
    expect(dueCheckIn('2026-12-04', false, ls)?.draft.form.name).toBe('MHRA Yellow Card');
    expect(dueCheckIn('2026-11-21', true, ls)).not.toBeNull();
  });
  it('the answer sets the outcome on the draft and clears the stored copy', () => {
    const d = applyCheckIn(draft, 'better', ls);
    expect(d.outcome).toBe('Recovering or recovered');
    expect(d.missing).not.toContain('outcome');
    expect(draftText(d)).toContain('Outcome: Recovering or recovered');
    expect(store.has(CHECKIN_KEY)).toBe(false);
  });
});
