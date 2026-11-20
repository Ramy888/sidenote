// Screen 8, Report draft: the form filled from confirmed facts; missing fields listed; Copy, Print/PDF,
// Open the official form, Delete this report. The draft's text is English, the forms' language.
import { useState } from 'react';
import { useI18n, makeT } from '../i18n.ts';
import type { StringKey } from '../strings.ts';
import { draftText, type Draft } from '../app/report.ts';
import { saveCheckIn } from '../app/checkin.ts';

export function Report({ draft, onDelete }: { draft: Draft; onDelete: () => void }) {
  const { t } = useI18n();
  const { span } = makeT('en'); // the draft is the form's language, whatever the interface language
  const [copied, setCopied] = useState(false);
  const [reminded, setReminded] = useState('');
  const { date: dateUi } = useI18n();
  const d = (x: { min: string; max: string } | null, note = '') => (x ? span(x) : note || '—');
  const copy = async () => { try { await navigator.clipboard.writeText(draftText(draft)); setCopied(true); } catch { setCopied(false); } };
  return (
    <section className="screen report">
      <h1>{t('reportTitle')}</h1>
      <p className="lead">{t('reportLead')}</p>
      <article className="card draft" lang="en" dir="ltr">
        <h2 className="section-title">{draft.form.name}</h2>
        <dl>
          <dt>Suspected reaction</dt><dd>{[...draft.reaction.terms, ...draft.reaction.uncoded].join('; ') || '—'}</dd>
          <dt>Date it started</dt><dd className="tabular">{d(draft.reaction.onset)}</dd>
          {draft.outcome && <><dt>Outcome</dt><dd>{draft.outcome}</dd></>}
        </dl>
        {draft.products.map(p => (
          <dl key={p.name} className="product">
            <dt>Medicine</dt><dd>{p.name}{p.strength && ` ${p.strength}`}{p.suspected && ' (suspected)'}</dd>
            <dt>Started</dt><dd className="tabular">{d(p.started, p.startNote)}</dd>
            <dt>Stopped</dt><dd className="tabular">{d(p.stopped, 'not stopped / not known')}</dd>
            <dt>Did the problem stop after stopping?</dt><dd>{p.dechallenge}</dd>
            <dt>Did it return after starting again?</dt><dd>{p.rechallenge}</dd>
          </dl>
        ))}
        <h3>What happened</h3>
        <ul className="narrative">{draft.narrative.map(l => <li key={l}>{l}</li>)}</ul>
        <p className="sug-not">This is a suspected side effect, not a diagnosis.</p>
      </article>
      <div className="card"><h2 className="section-title">{t('rptMissing')}</h2>
        <ul>{draft.missing.map(m => <li key={m}>{t(`miss_${m}` as StringKey)}</li>)}</ul></div>
      <div className="actions no-print">
        <button type="button" className="btn btn-primary" onClick={copy}>{copied ? t('rptCopied') : t('rptCopy')}</button>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>{t('rptPrint')}</button>
        <a className="btn btn-secondary" href={draft.form.url} target="_blank" rel="noreferrer">{t('rptOpenForm')}</a>
        {!draft.outcome && <button type="button" className="btn btn-secondary" onClick={() => {
          const today = new Date().toISOString().slice(0, 10); saveCheckIn(draft, today);
          setReminded(dateUi(new Date(Date.parse(today) + 14 * 86_400_000).toISOString()));
        }}>{t('rptRemind')}</button>}
        <button type="button" className="btn btn-quiet" onClick={onDelete}>{t('rptDelete')}</button>
      </div>
      {reminded && <p className="alert alert-device" role="status">{t('rptReminded', { date: reminded })}</p>}
    </section>
  );
}
