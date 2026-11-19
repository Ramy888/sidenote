// Screen 9, Ledger: every model call with where it ran, time and size; approved payloads kept exactly,
// on-device text never kept. A drawer on desktop, a full sheet on phones.
import { useI18n } from '../i18n.ts';
import type { StringKey } from '../strings.ts';
import { router } from '../app/session.ts';
import { Badge } from './common.tsx';

export function Ledger({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const rows = router.ledger;
  return (
    <aside className="ledger" role="dialog" aria-modal="true" aria-labelledby="ledger-title">
      <div className="ledger-head"><h2 id="ledger-title">{t('ledgerTitle')}</h2>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('ledgerClose')}</button></div>
      <p className="hint">{t('ledgerLead')}</p>
      {!rows.length && <p>{t('ledgerEmpty')}</p>}
      <ol className="ledger-rows">
        {rows.map((r, i) => (
          <li key={i} className="card">
            <p className="answer-a">{t(`agent_${r.route}` as StringKey)} <Badge kind={r.ranWhere} /></p>
            <p className="mono">{t('ledgerRow', { ms: r.ms, bytes: r.bytes })}</p>
            {r.payload && <details><summary>{t('ledgerSent')}</summary><pre className="mono data">{r.payload}</pre></details>}
          </li>
        ))}
      </ol>
    </aside>
  );
}
