import { describe, it, expect } from 'vitest';
import { OnDeviceUnavailable } from '@sidenote/private-evidence';
import { createRouter, approve, ROUTES, type ModelFactory, type LedgerRow } from '../src/ai/route';
import { coderPayload, rankerPayload } from '../src/ai/payload';

const terms = new Map([['R1', 'muscle pain']]);
const coder = () => coderPayload('legs ache', { sender: 'M', text: 'legs ache' }, new Set(['M']), terms);
const ranker = () => rankerPayload({ anchor: 'report_date', medicines: [], facts: [], pairs: [], labelFacts: [] }, { medicines: [], terms, labelFacts: new Map() });

// A fake Firebase: records every model it is asked to build and every call, answers from `source`.
function fakeFactory(source: string | null, fail = false) {
  const calls: { mode: string; text: string }[] = [];
  const factory: ModelFactory = (mode) => ({
    generateContent: async (text: string) => {
      calls.push({ mode, text });
      if (fail) throw new Error('model failed');
      return { response: { text: () => '{"ok":true}', inferenceSource: source ?? undefined } };
    },
  });
  return { factory, calls };
}
const deviceReady = { LanguageModel: { availability: async () => 'available' } };
const noDevice = {};

describe('routing: the chat reader never reaches the cloud', () => {
  it('makes no call at all when the on-device model is missing', async () => {
    const { factory, calls } = fakeFactory('in_cloud');
    await expect(createRouter(factory, [], noDevice).generate('reader', 'Sarah: my legs ache')).rejects.toBeInstanceOf(OnDeviceUnavailable);
    expect(calls).toEqual([]);
  });
  it('does not fall back to the cloud when the on-device model fails', async () => {
    const { factory, calls } = fakeFactory('on_device', true);
    await expect(createRouter(factory, [], deviceReady).generate('reader', 'x')).rejects.toThrow('model failed');
    expect(calls.map(c => c.mode)).toEqual(['only_on_device']);
  });
  it('rejects a reader answer that did not come from the device', async () => {
    const { factory } = fakeFactory('in_cloud');
    await expect(createRouter(factory, [], deviceReady).generate('reader', 'x')).rejects.toThrow(/not on_device/);
  });
});

describe('routing: anything that can reach the cloud needs an approved payload', () => {
  it.each(['readerOwnCloud', 'coder', 'ranker'] as const)('%s refuses unapproved text before any call', async (route) => {
    const { factory, calls } = fakeFactory('in_cloud');
    await expect(createRouter(factory, [], deviceReady).generate(route, 'my legs ache' as any)).rejects.toThrow(/needs an approved payload/);
    expect(calls).toEqual([]);
  });
  it('refuses a payload approved for a different route', async () => {
    const { factory, calls } = fakeFactory('in_cloud');
    await expect(createRouter(factory, [], deviceReady).generate('ranker', approve(coder()))).rejects.toThrow(/approved for coder/);
    expect(calls).toEqual([]);
  });
  it('sends exactly the approved bytes', async () => {
    const { factory, calls } = fakeFactory('in_cloud');
    const p = coder();
    await createRouter(factory, [], deviceReady).generate('coder', approve(p));
    expect(calls).toEqual([{ mode: 'prefer_on_device', text: p.text }]);
  });
  it('refuses to approve text the payload builder did not make', () => {
    expect(() => approve({ route: 'coder', text: 'anything at all' } as any)).toThrow(/payload builder/);
  });
});

describe('routing table', () => {
  it('uses the agreed Firebase mode per route', () => {
    expect(Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [k, v.mode]))).toEqual({
      reader: 'only_on_device', readerOwnCloud: 'only_in_cloud', coder: 'prefer_on_device', ranker: 'prefer_in_cloud',
    });
  });
  it('every route is either device-only or gated by approval', () => {
    for (const r of Object.values(ROUTES)) expect(r.mode === 'only_on_device' || r.needsApproval).toBe(true);
  });
});

describe('ledger', () => {
  it('records where each call ran; keeps approved payloads, never the private reader text', async () => {
    const ledger: LedgerRow[] = [];
    await createRouter(fakeFactory('on_device').factory, ledger, deviceReady).generate('reader', 'Sarah: my legs ache');
    const p = ranker();
    await createRouter(fakeFactory('in_cloud').factory, ledger, deviceReady).generate('ranker', approve(p));
    expect(ledger.map(r => [r.route, r.ranWhere, r.bytes, r.payload])).toEqual([
      ['reader', 'device', 19, undefined],
      ['ranker', 'cloud', p.text.length, p.text],
    ]);
    expect(JSON.stringify(ledger)).not.toContain('Sarah');
  });
});
