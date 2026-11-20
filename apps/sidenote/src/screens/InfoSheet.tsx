// "How it works": a sheet that drops down from the app bar with what SideNote does, the privacy promise and a
// preview of the result (also shown beside the Start headline on wide screens). Closes with the button, the backdrop or Escape.
import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n.ts';
import { Badge, Icon } from './common.tsx';

export function Preview({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="preview card" aria-hidden="true">
      <p className="preview-title"><Icon kind="calendar" /> {t('pvTitle')}{compact && <Badge kind="device" />}</p>
      <svg viewBox="0 0 300 92" className="preview-chart">
        <text x="0" y="12" className="chart-label">{t('pvMed')}</text>
        <rect x="0" y="20" width="132" height="9" rx="4.5" className="chart-bar" />
        <rect x="196" y="20" width="104" height="9" rx="4.5" className="chart-bar" />
        <text x="0" y="56" className="chart-label">{t('pvSym')}</text>
        <circle cx="58" cy="70" r="7" className="chart-on" /><circle cx="160" cy="70" r="7" className="chart-gone" /><circle cx="214" cy="70" r="7" className="chart-on" />
      </svg>
      <ul className="preview-answers">
        {(compact ? ['pvA1'] as const : ['pvA1', 'pvA2', 'pvA3'] as const).map(k => <li key={k}><span className="tick"><Icon kind="check" size={14} /></span>{t(k)}</li>)}
      </ul>
    </div>
  );
}

/** Beside the Start headline on wide screens: two chat messages become the timeline, in one frame. */
export function HeroVisual() {
  const { t } = useI18n();
  const bubble = (who: string, before: string, mark: string, after: string, cls: string) => (
    <div className={`hero-bubble card ${cls}`}>
      <p className="hero-who">{who}</p>
      <p>{before}<mark className="quote-own">{mark}</mark>{after}</p>
    </div>
  );
  return (
    <div className="hero-visual" aria-hidden="true">
      {bubble(t('hvWho1'), '', t('hvMsg1'), t('hvMsg1b'), 'b1')}
      {bubble(t('hvWho2'), t('hvMsg2a'), t('hvMsg2'), '', 'b2')}
      <Preview compact />
    </div>
  );
}

export function InfoSheet({ onClose, onHow }: { onClose: () => void; onHow: () => void }) {
  const { t } = useI18n();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => { // once on open: focus Close, and Escape closes
    closeBtn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    addEventListener('keydown', esc); return () => removeEventListener('keydown', esc);
  }, []);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="info-title" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 id="info-title">{t('infoTitle')}</h2>
          <button ref={closeBtn} type="button" className="btn-tool" aria-label={t('close')} onClick={onClose}><Icon kind="close" size={20} /></button>
        </div>
        <div className="sheet-body">
          <div className="sheet-copy">
            <p className="lead">{t('startLead')}</p>
            <ul className="trust">
              <li><Icon kind="device" /> {t('trustDevice')}</li>
              <li><Icon kind="shield" /> {t('trustApprove')}</li>
              <li><Icon kind="file" /> {t('trustForms')}</li>
            </ul>
            <button type="button" className="btn btn-quiet" onClick={() => { onClose(); onHow(); }}>{t('howLink')}</button>
          </div>
          <Preview />
        </div>
      </section>
    </div>
  );
}
