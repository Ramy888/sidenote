// Screen 12, Urgent help: shown before the case continues when a red flag appears (red is used only here).
import { useI18n } from '../i18n.ts';
import { URGENT, URGENT_PHONE } from '../pipeline/safety.ts';
import type { Region } from '../app/importChat.ts';

export function Urgent({ flags, region, onSafe }: { flags: string[]; region: Region; onSafe: () => void }) {
  const { t, lang } = useI18n();
  const phone = URGENT_PHONE[region];
  return (
    <section className="screen urgent" role="alertdialog" aria-labelledby="urgent-title">
      <div className="urgent-panel">
        <h1 id="urgent-title">{t('urgentTitle')}</h1>
        <p className="lead">{URGENT[lang]}</p>
        <a className="btn btn-urgent" href={`tel:${phone.split(' ')[0]}`}>{t('urgentCall', { phone })}</a>
        <p className="hint">{t('urgentWhy', { flags: flags.join(', ') })}</p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={onSafe}>{t('urgentSafe')}</button>
    </section>
  );
}
