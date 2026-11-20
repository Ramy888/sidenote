import { describe, it, expect } from 'vitest';
import { STRINGS } from '../src/strings.ts';
import { makeT } from '../src/i18n.ts';

describe('interface strings', () => {
  it('every string exists in English and Arabic, with the same placeholders', () => {
    for (const [key, s] of Object.entries(STRINGS)) {
      expect(s.en.trim(), key).not.toBe(''); expect(s.ar.trim(), key).not.toBe('');
      const ph = (x: string) => [...x.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
      expect(ph(s.ar), key).toEqual(ph(s.en));
      expect(s.ar, key).toMatch(/[؀-ۿ]/);
    }
  });
  it('fills placeholders with Eastern Arabic digits in Arabic', () => {
    expect(makeT('en').t('messagesCount', { count: 412 })).toBe('412 messages');
    expect(makeT('ar').t('messagesCount', { count: 412 })).toBe('٤١٢ رسالة');
  });
  it('day counts use each language\'s plural forms', () => {
    const en = makeT('en'), ar = makeT('ar');
    expect([1, 5].map(n => en.daySpan({ lo: n, hi: n }))).toEqual(['1 day', '5 days']);
    expect(en.daySpan({ lo: 6, hi: 47 })).toBe('6–47 days');
    expect([1, 2, 3, 11].map(n => ar.daySpan({ lo: n, hi: n }))).toEqual(['يوم واحد', 'يومان', '٣ أيام', '١١ يومًا']);
  });
});
