// Wayfinding: where you are in the six steps. A sidebar with a privacy note on desktop, a slim progress bar on
// phones and tablets.
import { useI18n } from '../i18n.ts';
import type { StringKey } from '../strings.ts';
import { Icon, type IconKind } from './common.tsx';

const STEPS: [StringKey, IconKind][] = [['nav_start', 'play'], ['nav_case', 'users'], ['nav_read', 'chip'], ['nav_check', 'calendar'], ['nav_share', 'shield'], ['nav_report', 'file']];

export function StepSidebar({ current }: { current: number }) {
  const { t } = useI18n();
  return (
    <aside className="sidebar" aria-label={t('stepOf', { n: current + 1, total: STEPS.length })}>
      <ol className="steps">
        {STEPS.map(([key, icon], i) => (
          <li key={key} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
            <span className="step-dot">{i < current ? <Icon kind="check" size={14} /> : <Icon kind={icon} size={14} />}</span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ol>
      <div className="privacy-card">
        <p className="privacy-title"><Icon kind="shield" size={18} /> {t('privacyTitle')}</p>
        <p>{t('privacyBody')}</p>
      </div>
    </aside>
  );
}

export function StepProgress({ current }: { current: number }) {
  const { t } = useI18n();
  return (
    <div className="step-progress" role="status">
      <span>{t('stepOf', { n: current + 1, total: STEPS.length })} · <strong>{t(STEPS[current][0])}</strong></span>
      <span className="step-track"><span style={{ inlineSize: `${((current + 1) / STEPS.length) * 100}%` }} /></span>
    </div>
  );
}
