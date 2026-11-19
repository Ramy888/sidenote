// Screen 15, How we know (X3): the measured numbers, each labelled with its real source.
// Numbers from evals/chattest/RESULT.md (held-out run), the leakage script, route tests and evals/coder/RESULT.md.
import { useI18n } from '../i18n.ts';
import { Badge } from './common.tsx';

export function HowWeKnow({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <section className="screen">
      <h1>{t('howTitle')}</h1>
      <p className="lead">{t('howLead')}</p>
      <div className="card"><Badge kind="device" /><p className="answer-a">{t('howChat', { correct: 43, total: 49, gap: 3.3 })}</p><p className="hint">{t('howChatSource')}</p></div>
      <div className="card"><Badge kind="code" /><p className="answer-a">{t('howLeak', { payloads: 135 })}</p><p className="hint">{t('howChatSource')}</p></div>
      <div className="card"><Badge kind="code" /><p className="answer-a">{t('howRouting')}</p></div>
      <div className="card"><Badge kind="cloud" /><p className="answer-a">{t('howCoder', { lookup: 27, nano: 58, cloud: 72 })}</p><p className="hint">{t('howCoderSource')}</p></div>
      <button type="button" className="btn btn-secondary" onClick={onBack}>{t('back')}</button>
    </section>
  );
}
