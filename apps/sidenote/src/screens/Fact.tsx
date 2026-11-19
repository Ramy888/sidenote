// A dated fact: what happened, when, and the words it came from. The patient's and reporter's own words are
// highlighted; anyone else's stay in a "kept on this device" chip (shown here, never sent).
import { useI18n } from '../i18n.ts';
import type { DatedEvent } from '../pipeline/timeline.ts';
import { Icon } from './common.tsx';

const LABEL = { medicine_started: 'factStarted', medicine_stopped: 'factStopped', medicine_restarted: 'factRestarted',
  symptom_started: 'factSymptomStarted', symptom_ongoing: 'factSymptomOngoing', symptom_gone: 'factSymptomGone' } as const;

export function Fact({ e, index = 0 }: { e: DatedEvent; index?: number }) {
  const { t, date } = useI18n();
  const name = e.kind.startsWith('medicine') ? e.medicine : e.symptom;
  const fuzzy = e.basis === 'message' || e.min !== e.max;
  return (
    <li className="fact" style={{ animationDelay: `${index * 140}ms` }}>
      <p className="fact-what">{t(LABEL[e.kind], { name })}</p>
      <p className="fact-when tabular">{fuzzy ? t('factAround', { date: date(e.date) }) : date(e.date)}</p>
      <Quote e={e} />
    </li>
  );
}

/** Own words in the highlighter; anyone else's in a "kept on this device" chip; typed answers say so. */
export function Quote({ e }: { e: DatedEvent }) {
  const { t } = useI18n();
  if (!e.quote) return <p className="quote"><span className="sub">{t('youToldUs')}</span></p>;
  return e.own
    ? <p className="quote"><mark className="quote-own">{e.quote}</mark> <span className="sub">{e.sender} · {t('yourWords')}</span></p>
    : <p className="quote"><span className="quote-kept"><Icon kind="device" /> {e.quote}</span> <span className="sub">{e.sender} · {t('keptOnDevice')}</span></p>;
}
