// Screen 5, Evidence timeline (hero): the three answers first, then the chart, then every fact with
// Confirm / Change date / Not right. Only confirmed facts go on to the report.
import { useState } from 'react';
import { useI18n } from '../i18n.ts';
import type { StringKey } from '../strings.ts';
import { answers } from '../app/answers.ts';
import { confirm, reject, changeDate, type Reviewed, type Status } from '../app/review.ts';
import { Badge, Icon } from './common.tsx';
import { Quote } from './Fact.tsx';
import { TimelineChart } from './TimelineChart.tsx';

const KIND_LABEL: Record<Reviewed['kind'], StringKey> = { medicine_started: 'factStarted', medicine_stopped: 'factStopped', medicine_restarted: 'factRestarted',
  symptom_started: 'factSymptomStarted', symptom_gone: 'factSymptomGone', symptom_returned: 'factSymptomReturned' };
const STATUS_LABEL: Record<Status, StringKey> = { found: 'statusFound', needsConfirming: 'statusNeedsConfirming', conflict: 'statusConflict', confirmed: 'statusConfirmed', rejected: 'statusRejected' };

function StatusChip({ s }: { s: Status }) {
  const { t } = useI18n();
  return <span className={`chip chip-${s}`}>{s === 'confirmed' || s === 'found' ? <Icon kind="device" /> : null}{t(STATUS_LABEL[s])}</span>;
}

export function Timeline({ initial, onBack, onDone }: { initial: Reviewed[]; onBack: () => void; onDone: (r: Reviewed[]) => void }) {
  const { t, date, span, daySpan } = useI18n();
  const [review, setReview] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);
  const active = review.filter(f => f.status !== 'rejected');
  const meds = [...new Set(active.filter(f => f.kind.startsWith('medicine')).map(f => f.entity))];
  const syms = [...new Set(active.filter(f => f.kind.startsWith('symptom')).map(f => f.entity))];
  const [med, setMed] = useState(meds[0] ?? '');
  const [sym, setSym] = useState(syms[0] ?? '');
  const a = answers(active, med, sym);
  const find = (kind: Reviewed['kind'], entity: string, w?: { min: string; max: string }) => active.find(f => f.kind === kind && f.entity === entity && f.min === w?.min && f.max === w?.max);

  const rows: { q: StringKey; text: string; facts: (Reviewed | undefined)[] }[] = [
    { q: 'qOnset', facts: [a.onset ? find('symptom_started', sym, a.onset.when) : undefined],
      text: !a.onset ? t('aOnsetNone') : a.onset.daysAfterStart === null ? t('aOnsetNoStart', { date: span(a.onset.when) })
        : t('aOnset', { date: span(a.onset.when), days: daySpan(a.onset.daysAfterStart), medicine: med }) },
    { q: 'qDechallenge', facts: a.dechallenge.answer === 'notStopped' ? [] : [find('medicine_stopped', med, a.dechallenge.stopped), a.dechallenge.answer === 'yes' ? find('symptom_gone', sym, a.dechallenge.gone) : undefined],
      text: a.dechallenge.answer === 'yes' ? t('aDeYes', { days: daySpan(a.dechallenge.days), date: span(a.dechallenge.stopped) })
        : a.dechallenge.answer === 'unknown' ? t('aDeUnknown', { date: span(a.dechallenge.stopped) }) : t('aDeNotStopped', { medicine: med }) },
    { q: 'qRechallenge', facts: a.rechallenge.answer === 'notRestarted' ? [] : [find('medicine_restarted', med, a.rechallenge.restarted), a.rechallenge.answer === 'yes' ? find('symptom_returned', sym, a.rechallenge.returned) : undefined],
      text: a.rechallenge.answer === 'yes' ? t('aReYes', { days: daySpan(a.rechallenge.days), date: span(a.rechallenge.restarted) })
        : a.rechallenge.answer === 'unknown' ? t('aReUnknown', { date: span(a.rechallenge.restarted) }) : t('aReNotRestarted', { medicine: med }) },
  ];
  const rowStatus = (fs: Reviewed[]): Status => (fs.some(f => f.status === 'conflict') ? 'conflict' : fs.some(f => f.status === 'needsConfirming') ? 'needsConfirming' : fs.every(f => f.status === 'confirmed') ? 'confirmed' : 'found');
  const left = active.filter(f => f.status !== 'confirmed').length;

  return (
    <section className="screen timeline">
      <h1>{t('timelineTitle')}</h1>
      <p className="lead">{t('timelineLead')}</p>
      {(meds.length > 1 || syms.length > 1) && (
        <div className="pickers">
          {meds.length > 1 && <label>{t('pickMedicine')} <select value={med} onChange={e => setMed(e.target.value)}>{meds.map(m => <option key={m}>{m}</option>)}</select></label>}
          {syms.length > 1 && <label>{t('pickSymptom')} <select value={sym} onChange={e => setSym(e.target.value)}>{syms.map(s => <option key={s}>{s}</option>)}</select></label>}
        </div>
      )}

      <ol className="answers">
        {rows.map(r => {
          const fs = r.facts.filter((f): f is Reviewed => !!f);
          const st = fs.length ? rowStatus(fs) : null;
          return (
            <li key={r.q} className={`answer card ${st === 'confirmed' ? 'is-confirmed' : ''}`}>
              <p className="answer-q">{t(r.q)}</p>
              <p className="answer-a">{r.text}</p>
              <div className="answer-meta">
                {st ? <StatusChip s={st} /> : <Badge kind="code" />}
                {st && st !== 'confirmed' && st !== 'conflict' && <button type="button" className="btn btn-primary" onClick={() => setReview(rv => fs.reduce((acc, f) => confirm(acc, f.id), rv))}>{t('confirmAnswer')}</button>}
              </div>
            </li>
          );
        })}
      </ol>

      <TimelineChart facts={active} />

      <h2 className="section-title">{t('factsTitle')}</h2>
      <ol className="facts">
        {review.map(f => (
          <li key={f.id} className={`fact card fact-${f.status}`}>
            <p className="fact-what">{t(KIND_LABEL[f.kind], { name: f.entity })}</p>
            <p className="fact-when tabular">{span(f)}</p>
            <Quote e={f.evidence} />
            <div className="fact-actions">
              <StatusChip s={f.status} />
              {f.status === 'conflict' && [f.date, f.altDate!].map(d => <button key={d} type="button" className="btn btn-secondary" onClick={() => setReview(rv => changeDate(rv, f.id, d))}>{t('pickThisDate', { date: date(d) })}</button>)}
              {f.status !== 'confirmed' && f.status !== 'rejected' && f.status !== 'conflict' && <button type="button" className="btn btn-primary" onClick={() => setReview(rv => confirm(rv, f.id))}>{t('actConfirm')}</button>}
              {f.status !== 'rejected' && <button type="button" className="btn btn-secondary" onClick={() => setEditing(editing === f.id ? null : f.id)}>{t('actChangeDate')}</button>}
              {f.status !== 'rejected'
                ? <button type="button" className="btn btn-quiet" onClick={() => setReview(rv => reject(rv, f.id))}>{t('actNotRight')}</button>
                : <button type="button" className="btn btn-quiet" onClick={() => setReview(rv => rv.map(x => (x.id === f.id ? { ...x, status: 'found' } : x)))}>{t('actUndo')}</button>}
            </div>
            {editing === f.id && <input className="input" type="date" defaultValue={f.date} aria-label={t('actChangeDate')} onChange={e => { if (e.target.value) { setReview(rv => changeDate(rv, f.id, e.target.value)); setEditing(null); } }} />}
          </li>
        ))}
      </ol>

      <div className="actions sticky-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>{t('back')}</button>
        {left > 0 && <span className="hint">{t('stillToCheck', { count: left })}</span>}
        <button type="button" className="btn btn-primary" onClick={() => onDone(review)}>{t('toReport')}</button>
      </div>
    </section>
  );
}
