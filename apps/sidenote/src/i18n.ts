// Interface language: English or Arabic, switchable any time without a reload or lost input, remembered on
// this device. Sets <html lang dir> so the whole layout mirrors (logical CSS properties only).
import { createContext, useContext } from 'react';
import { STRINGS, type StringKey } from './strings.ts';

export type Lang = 'en' | 'ar';
export const LANG_KEY = 'sidenote.lang';
export function initialLang(): Lang {
  try { const saved = localStorage.getItem(LANG_KEY); if (saved === 'en' || saved === 'ar') return saved; } catch { /* private mode */ }
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

const locale = (lang: Lang) => (lang === 'ar' ? 'ar-EG' : 'en-GB'); // ar-EG: Eastern Arabic digits in the interface
export function makeT(lang: Lang) {
  const num = (n: number) => new Intl.NumberFormat(locale(lang)).format(n);
  const date = (iso: string) => new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso.slice(0, 10)));
  const t = (key: StringKey, vars: Record<string, string | number> = {}) =>
    STRINGS[key][lang].replace(/\{(\w+)\}/g, (_, k) => (typeof vars[k] === 'number' ? num(vars[k] as number) : String(vars[k] ?? '')));
  /** A date, or "between A and B" for a range; day counts as "6–47" when they span a range. */
  const span = (x: { min: string; max: string }) => (x.min === x.max ? date(x.min) : t('between', { a: date(x.min), b: date(x.max) }));
  // Day counts with their unit, using each language's plural rules (Arabic: one, two, few, many, other).
  const plural = new Intl.PluralRules(locale(lang));
  const AR_DAYS: Record<string, (n: string) => string> = { zero: n => `${n} يوم`, one: () => 'يوم واحد', two: () => 'يومان', few: n => `${n} أيام`, many: n => `${n} يومًا`, other: n => `${n} يوم` };
  const days = (n: number, text: string) => (lang === 'ar' ? AR_DAYS[plural.select(n)](text) : `${text} ${plural.select(n) === 'one' ? 'day' : 'days'}`);
  const daySpan = (d: { lo: number; hi: number }) => (d.lo === d.hi ? days(d.lo, num(d.lo)) : days(d.hi, `${num(d.lo)}–${num(d.hi)}`));
  return { lang, t, num, date, span, daySpan };
}

export type I18n = ReturnType<typeof makeT> & { setLang: (l: Lang) => void };
export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}
