import { useEffect, useState, type ReactNode } from 'react';
import { I18nContext, initialLang, makeT, LANG_KEY, type Lang } from './i18n.ts';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* private mode */ }
  }, [lang]);
  return <I18nContext.Provider value={{ ...makeT(lang), setLang }}>{children}</I18nContext.Provider>;
}

