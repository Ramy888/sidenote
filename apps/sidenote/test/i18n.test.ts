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
});
