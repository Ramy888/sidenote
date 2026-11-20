// Screen 7, What leaves this device: the exact payload of each model call, labelled by source, with a byte
// total and "Show the exact data"; nothing is sent until "Send these to Google". Then the results: coded
// terms and the suspect suggestion ("a suggestion, not a diagnosis"; wording from templates only).
import { useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n.ts';
import type { StringKey } from '../strings.ts';
import { router } from '../app/session.ts';
import { approve } from '../ai/route.ts';
import { coderPayload, rankerPayload, type Payload, type RankerInput } from '../ai/payload.ts';
import { coderTerms, TERMS, LABEL_FACTS, termName } from '../vocab/index.ts';
import { planCoding } from '../app/coding.ts';
import { rankerInput, checkRanking, rankerSchema, REASONS, type Ranked } from '../app/ranker.ts';
import type { Reviewed } from '../app/review.ts';
import type { Medicine } from '../app/medicines.ts';
import { Badge, Icon } from './common.tsx';

type Where = 'device' | 'cloud' | 'code';
export interface CloudResult { coding: { entity: string; term: string | null; where: Where | null }[]; ranking: Ranked[] | null; rankedBy: Where | null }
const ids = new Set(TERMS.map(t => t.id));
const today = () => new Date().toISOString().slice(0, 10);

function Approval({ items, payloads, notSent, onSend, onKeep }: { items: ReactNode[]; payloads: Payload[]; notSent: number; onSend: () => void; onKeep: () => void }) {
  const { t } = useI18n();
  const bytes = payloads.reduce((n, p) => n + new TextEncoder().encode(p.text).length, 0);
  return (
    <>
      <ul className="out-items">{items.map((it, i) => <li key={i} className="card">{it}</li>)}</ul>
      <p className="status status-device not-sent"><Icon kind="device" /><span>{t('outNotSent', { count: notSent })}</span></p>
      <p className="mono">{t('outBytes', { bytes })}</p>
      <details className="card"><summary>{t('outShowData')}</summary>{payloads.map((p, i) => <pre key={i} className="mono data">{p.text}</pre>)}</details>
      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={onKeep}>{t('outKeep')}</button>
        <button type="button" className="btn btn-cloud" onClick={onSend}>{t('outSend')}</button>
      </div>
    </>
  );
}

export function CloudSteps({ review, meds, own, messageCount, onDone }: { review: Reviewed[]; meds: Medicine[]; own: ReadonlySet<string>; messageCount: number; onDone: (r: CloudResult) => void }) {
  const { t } = useI18n();
  const names = meds.map(m => m.name);
  const confirmed = useMemo(() => review.filter(f => f.status === 'confirmed'), [review]);
  const plan = useMemo(() => planCoding(confirmed), [confirmed]);
  const coderJobs = useMemo(() => plan.filter(s => s.how === 'model').flatMap(s => {
    try { return [{ entity: s.entity, payload: coderPayload(s.phrase!, s.message!, own, coderTerms()) }]; } catch { return []; }
  }), [plan, own]);

  /** After coding: the cloud ranker when there are 2+ medicines to compare, else the reasons code can verify. */
  const afterCoding = (coded: CloudResult['coding']): Stage => {
    const input = rankerInput(confirmed, meds, new Map(coded.filter(c => c.term).map(c => [c.entity, c.term!])), today());
    if (names.length >= 2 && input.facts.length) {
      try { return { phase: 'ranker', coded, input, payload: rankerPayload(input, { medicines: names, terms: coderTerms(), labelFacts: new Map(LABEL_FACTS.map(l => [l.id, l.text])) }) }; } catch { /* fall through */ }
    }
    const r = input.facts.length ? checkRanking(JSON.stringify({ ranked: names.map(medicine => ({ medicine, reasons: [...REASONS], facts: [] })) }), input) : null;
    return { phase: 'done', coded, input, ranking: r, by: r ? 'code' : null };
  };
  const [stage, setStage] = useState<Stage>(() => {
    const coded = plan.map(s => ({ entity: s.entity, term: s.term ?? null, where: s.how === 'lookup' ? 'code' as const : null }));
    return coderJobs.length ? { phase: 'coder', coded } : afterCoding(coded);
  });
  const [error, setError] = useState('');
  const fail = (e: unknown) => setError(t('outFailed', { why: String((e as Error).message ?? e).slice(0, 80) }));

  const runCoder = async () => {
    setStage({ ...stage, phase: 'running', what: 'coder' }); setError('');
    const coded = [...stage.coded];
    for (const job of coderJobs) {
      try {
        const r = await router.generate('coder', approve(job.payload));
        const ans = r.text().trim().toUpperCase();
        coded[coded.findIndex(c => c.entity === job.entity)] = { entity: job.entity, term: ids.has(ans) ? ans : null, where: r.inferenceSource === 'on_device' ? 'device' : 'cloud' };
      } catch (e) { fail(e); }
    }
    setStage(afterCoding(coded));
  };

  const runRanker = async () => {
    if (stage.phase !== 'ranker') return;
    const { payload, input, coded } = stage;
    setStage({ ...stage, phase: 'running', what: 'ranker' }); setError('');
    const schema = rankerSchema(names);
    const params = { inCloudParams: { generationConfig: { responseMimeType: 'application/json', responseSchema: schema } }, onDeviceParams: { promptOptions: { responseConstraint: schema } } };
    for (let attempt = 0; attempt < 2; attempt++) { // an answer that fails the checks is retried once, then "no suggestion"
      try {
        const r = await router.generate('ranker', approve(payload), params);
        const ok = checkRanking(r.text(), input);
        if (ok) return setStage({ phase: 'done', coded, input, ranking: ok, by: r.inferenceSource === 'on_device' ? 'device' : 'cloud' });
      } catch (e) { fail(e); break; }
    }
    setStage({ phase: 'done', coded, input, ranking: null, by: null });
  };
  const keepRanking = () => { if (stage.phase === 'ranker') { const r = checkRanking(JSON.stringify({ ranked: names.map(medicine => ({ medicine, reasons: [...REASONS], facts: [] })) }), stage.input); setStage({ phase: 'done', coded: stage.coded, input: stage.input, ranking: r, by: r ? 'code' : null }); } };

  const others = stage.phase === 'ranker' ? [...new Set(confirmed.filter(f => f.kind.startsWith('symptom') && !f.evidence.own && stage.input.facts.some(x => x.id === f.id)).map(f => f.evidence.sender))] : [];

  return (
    <section className="screen">
      <h1>{stage.phase === 'done' ? t('sugTitle') : t('outTitle')}</h1>
      {stage.phase !== 'done' && <p className="lead">{t('outLead')}</p>}
      {error && <p className="alert alert-warning" role="alert">{error}</p>}

      {stage.phase === 'coder' && <Approval notSent={messageCount} payloads={coderJobs.map(j => j.payload)} onSend={runCoder} onKeep={() => setStage(afterCoding(stage.coded))}
        items={coderJobs.map(j => <><p className="answer-a">{t('outCoderItem', { phrase: j.entity })}</p><p className="hint"><Badge kind="device" /> {t('outCoderWhere')}</p></>)} />}
      {stage.phase === 'ranker' && <Approval notSent={messageCount} payloads={[stage.payload]} onSend={runRanker} onKeep={keepRanking}
        items={[<><p className="answer-a">{t('outRankerItem', { facts: stage.input.facts.length, meds: names.length })}</p>{others.length > 0 && <p className="hint">{t('outFromOther', { names: others.join(', ') })}</p>}<p className="hint"><Badge kind="cloud" /></p></>]} />}
      {stage.phase === 'running' && <p className="status status-device" role="status">{stage.what === 'coder' ? t('outCoding') : t('outRanking')}</p>}

      {stage.phase === 'done' && (
        <>
          <ul className="coding">{stage.coded.map(c => <li key={c.entity}>{c.term ? <>{t('codedAs', { name: c.entity, term: termName(c.term)! })} <Badge kind={c.where ?? 'code'} /></> : t('uncodedKept', { name: c.entity })}</li>)}</ul>
          <div className="suspect-panel card">
            {stage.ranking ? (
              <>
                {stage.by && <Badge kind={stage.by} />}
                {stage.by === 'code' && <p className="hint">{t('sugWhatWeKnow')}</p>}
                {(() => {
                  const items = stage.ranking.map(x => (
                    <li key={x.medicine}><p className="answer-a">{x.medicine}</p>
                      <ul>{x.reasons.slice(0, 3).map(r => <li key={r}>{t(`r${r}` as StringKey, { medicine: x.medicine })}</li>)}</ul></li>));
                  return stage.by === 'code' ? <ul className="ranked unranked">{items}</ul> : <ol className="ranked">{items}</ol>; // code-only reasons are not a rank
                })()}
                <p className="sug-not">{t('sugNot')}</p>
              </>
            ) : <p>{t('sugNone')}</p>}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => onDone({ coding: stage.coded, ranking: stage.ranking, rankedBy: stage.by })}>{t('continue')}</button>
        </>
      )}
    </section>
  );
}

type Coded = CloudResult['coding'];
type Stage =
  | { phase: 'coder'; coded: Coded }
  | { phase: 'ranker'; coded: Coded; input: RankerInput; payload: Payload }
  | { phase: 'running'; what: 'coder' | 'ranker'; coded: Coded; input?: RankerInput; payload?: Payload }
  | { phase: 'done'; coded: Coded; input: RankerInput; ranking: Ranked[] | null; by: Where | null };
