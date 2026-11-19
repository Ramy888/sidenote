// Small shared pieces: route badges (icon + words, never colour alone) and the language switch.
import { useI18n, type Lang } from '../i18n.ts';

// 16px line icons (no emoji, DESIGN.md): lock = on this device, cloud = Google cloud, cog = worked out by the app.
const PATHS = {
  device: 'M5 7V5a3 3 0 0 1 6 0v2M4 7h8v6H4z',
  cloud: 'M4.5 12h7a2.5 2.5 0 0 0 .3-5A3.5 3.5 0 0 0 5 6.2 2.9 2.9 0 0 0 4.5 12z',
  code: 'M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
} as const;
export const Icon = ({ kind }: { kind: keyof typeof PATHS }) => (
  <svg className="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[kind]} /></svg>
);
export function Badge({ kind }: { kind: 'device' | 'cloud' | 'code' }) {
  const { t } = useI18n();
  const label = { device: t('badgeDevice'), cloud: t('badgeCloud'), code: t('badgeCode') }[kind];
  return <span className={`badge badge-${kind}`}><Icon kind={kind} /> {label}</span>;
}

export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const opt = (l: Lang, label: string) => (
    <button type="button" lang={l} aria-pressed={lang === l} className={lang === l ? 'selected' : ''} onClick={() => setLang(l)}>{label}</button>
  );
  return <div className={`language-switch ${className}`} role="group" aria-label={t('languageSwitch')}>{opt('en', 'English')}{opt('ar', 'العربية')}</div>;
}
