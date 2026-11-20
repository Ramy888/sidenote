// Wayfinding: where you are in the six steps. A sidebar with a privacy note on desktop; on every size a bar with
// Back, the current step and Close (which asks first, since nothing is kept).
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

export function StepProgress({ current, onBack, onClose }: { current: number; onBack: () => void; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="step-progress">
      <div className="flow-bar">
        <button type="button" className="btn-tool" onClick={onBack}><Icon kind="back" size={20} /><span className="flow-label">{t('back')}</span></button>
        <span className="flow-step" role="status">{t('stepOf', { n: current + 1, total: STEPS.length })} · <strong>{t(STEPS[current][0])}</strong></span>
        <button type="button" className="btn-tool" aria-label={t('closeFlow')} onClick={onClose}><Icon kind="close" size={20} /></button>
      </div>
      <span className="step-track"><span style={{ inlineSize: `${((current + 1) / STEPS.length) * 100}%` }} /></span>
    </div>
  );
}

/** Asked before leaving a report: closing throws away what was confirmed (nothing is stored). */
export function LeaveDialog({ onLeave, onStay }: { onLeave: () => void; onStay: () => void }) {
  const { t } = useI18n();
  return (
    <div className="sheet-backdrop center" onClick={onStay}>
      <section className="dialog card" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" onClick={e => e.stopPropagation()}>
        <h2 id="leave-title" className="section-title">{t('leaveTitle')}</h2>
        <p className="hint">{t('leaveBody')}</p>
        <div className="actions">
          <button type="button" className="btn btn-secondary" autoFocus onClick={onStay}>{t('stay')}</button>
          <button type="button" className="btn btn-primary" onClick={onLeave}>{t('leave')}</button>
        </div>
      </section>
    </div>
  );
}
