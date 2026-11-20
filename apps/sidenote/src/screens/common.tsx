// Small shared pieces: route badges (icon + words, never colour alone) and the language switch.
import { useId } from 'react';
import { useI18n, type Lang } from '../i18n.ts';

// Line icons (24 grid, drawn here; no emoji, DESIGN.md). `dir` icons mirror in Arabic.
const PATHS = {
  device: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z',
  code: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  upload: 'M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l7-7a5 5 0 0 1 7 7zM8.5 8.5l7 7',
  calendar: 'M3 9h18M8 3v4M16 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  chip: 'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM9 9h6v6H9z',
  play: 'M7 4l13 8-13 8z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  type: 'M4 7V5h16v2M9 19h6M12 5v14',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  close: 'M6 6l12 12M18 6L6 18',
} as const;
const DIRECTIONAL = new Set(['arrow', 'back']);
export const Icon = ({ kind, size = 16 }: { kind: keyof typeof PATHS; size?: number }) => (
  <svg className={`icon${DIRECTIONAL.has(kind) ? ' icon-dir' : ''}`} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[kind]} /></svg>
);
export type IconKind = keyof typeof PATHS;

/** The SideNote mark: a note with a highlighted line (the patient's own words), on ink. */
export const Logo = () => (
  <svg className="logo-mark" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="var(--primary)" />
    <path d="M9 8h10l4 4v12H9z" fill="var(--on-primary)" />
    <path d="M19 8v4h4" fill="none" stroke="var(--primary)" strokeWidth="1.2" />
    <rect x="11.5" y="15" width="9" height="3" rx="1" fill="var(--highlight)" />
    <rect x="11.5" y="20" width="6" height="1.6" rx=".8" fill="var(--line)" />
  </svg>
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

/** A date (or month) field that says what it is: a label, a Required marker, a calendar icon and, while empty,
 * "Tap to choose a date" (native date inputs show nothing on Android when empty). */
export function DateField({ label, value, onChange, max, month = false, required = false, invalid = false, autoFocus = false }: {
  label: string; value: string; onChange: (v: string) => void; max?: string; month?: boolean; required?: boolean; invalid?: boolean; autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className={`date-field${value ? '' : ' is-empty'}${invalid ? ' is-invalid' : ''}`}>
      <label htmlFor={id} className="field-label">{label}{required && <span className="req">{t('required')}</span>}</label>
      <div className="date-box">
        <Icon kind="calendar" size={20} />
        <input id={id} className="input" type={month ? 'month' : 'date'} max={max} value={value} required={required} aria-invalid={invalid || undefined}
          autoFocus={autoFocus} onChange={e => onChange(e.target.value)} />
        {!value && <span className="date-hint" aria-hidden="true">{month ? t('monthTap') : t('dateTap')}</span>}
      </div>
    </div>
  );
}
