// Screen 10, Check-in: two weeks after the draft, "Better / Same / Worse" sets the outcome; "Worse" first shows
// the fixed advice to talk to a doctor or pharmacist (never model text).
import { useState } from 'react';
import { useI18n } from '../i18n.ts';
import type { StringKey } from '../strings.ts';
import { applyCheckIn, type CheckInAnswer } from '../app/checkin.ts';
import type { Draft } from '../app/report.ts';

export function CheckIn({ draft, onDone }: { draft: Draft; onDone: (d: Draft) => void }) {
  const { t } = useI18n();
  const [worse, setWorse] = useState(false);
  // The stored check-in is cleared only when the answer is applied, so this card stays until then.
  if (worse) return <div className="card checkin"><p className="alert alert-warning" role="alert">{t('checkinWorse')}</p>
    <button type="button" className="btn btn-primary" onClick={() => onDone(applyCheckIn(draft, 'worse'))}>{t('continue')}</button></div>;
  return (
    <div className="card checkin">
      <h2 className="section-title">{t('checkinTitle')}</h2>
      <div className="actions">{(['better', 'same', 'worse'] as CheckInAnswer[]).map(a => (
        <button key={a} type="button" className="btn btn-secondary" onClick={() => (a === 'worse' ? setWorse(true) : onDone(applyCheckIn(draft, a)))}>{t(`checkin_${a}` as StringKey)}</button>))}</div>
    </div>
  );
}
