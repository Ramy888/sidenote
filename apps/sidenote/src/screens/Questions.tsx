// Screen 6, A few questions: at most 5, one per screen, each with read-aloud. Used when the chat can't be
// read here (no on-device model, Arabic chat, typed text, or nothing found).
import { useState } from 'react';
import { useI18n } from '../i18n.ts';
import type { StringKey } from '../strings.ts';
import { WHEN_RANGES, type QuestionAnswers, type When, type WhenChoice } from '../app/questions.ts';

function WhenPicker({ value, onChange, name }: { value: When | null; onChange: (w: When) => void; name: string }) {
  const { t } = useI18n();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const isDate = !!value && 'date' in value;
  return (
    <fieldset><legend className="field-label">{t('whenWhen')}</legend>
      {(Object.keys(WHEN_RANGES) as WhenChoice[]).map(c => (
        <label className="choice" key={c}><input type="radio" name={name} checked={!!value && 'choice' in value && value.choice === c} onChange={() => onChange({ choice: c })} /><span>{t(`when_${c}` as StringKey)}</span></label>
      ))}
      <label className="choice"><input type="radio" name={name} checked={isDate} onChange={() => onChange({ date: today })} /><span>{t('whenDate')}</span></label>
      {isDate && <input className="input" type="date" max={today} value={(value as { date: string }).date} onChange={e => e.target.value && onChange({ date: e.target.value })} aria-label={t('whenDate')} />}
    </fieldset>
  );
}

const Choice = ({ name, label, checked, onPick }: { name: string; label: string; checked: boolean; onPick: () => void }) =>
  <label className="choice"><input type="radio" name={name} checked={checked} onChange={onPick} /><span>{label}</span></label>;

export function Questions({ medicine, prefill, onBack, onDone }: { medicine: string; prefill: string; onBack: () => void; onDone: (a: QuestionAnswers) => void }) {
  const { t, lang } = useI18n();
  const [i, setI] = useState(0);
  const [problem, setProblem] = useState(prefill);
  const [started, setStarted] = useState<When | null>(null);
  const [stopped, setStopped] = useState<'no' | When | null>(null);
  const [wentAway, setWentAway] = useState<'no' | 'unsure' | When | null>(null);
  const [restarted, setRestarted] = useState<'no' | When | null>(null);
  const [cameBack, setCameBack] = useState<'no' | When | null>(null);
  const yesNo = (v: unknown) => (v === null ? null : v === 'no' ? 'no' : v === 'unsure' ? 'unsure' : 'yes');

  const qs: { key: string; text: string; ready: boolean; body: React.ReactNode }[] = [
    { key: 'problem', text: t('q1Problem'), ready: problem.trim().length > 1, body: <textarea rows={3} value={problem} onChange={e => setProblem(e.target.value)} aria-label={t('q1Problem')} /> },
    { key: 'started', text: t('q2Started'), ready: !!started, body: <WhenPicker name="started" value={started} onChange={setStarted} /> },
    { key: 'stopped', text: t('q3Stopped', { medicine }), ready: stopped !== null, body: <>
      <Choice name="stopped" label={t('ansNo')} checked={stopped === 'no'} onPick={() => setStopped('no')} />
      <Choice name="stopped" label={t('ansYes')} checked={yesNo(stopped) === 'yes'} onPick={() => setStopped({ choice: 'under1week' })} />
      {yesNo(stopped) === 'yes' && <WhenPicker name="stoppedWhen" value={stopped as When} onChange={setStopped} />}</> },
  ];
  if (yesNo(stopped) === 'yes') qs.push(
    { key: 'wentAway', text: t('q4WentAway'), ready: wentAway !== null, body: <>
      <Choice name="went" label={t('ansNo')} checked={wentAway === 'no'} onPick={() => setWentAway('no')} />
      <Choice name="went" label={t('ansUnsure')} checked={wentAway === 'unsure'} onPick={() => setWentAway('unsure')} />
      <Choice name="went" label={t('ansYes')} checked={yesNo(wentAway) === 'yes'} onPick={() => setWentAway({ choice: 'under1week' })} />
      {yesNo(wentAway) === 'yes' && <WhenPicker name="wentWhen" value={wentAway as When} onChange={setWentAway} />}</> },
    { key: 'restarted', text: t('q5Restarted', { medicine }), ready: restarted === 'no' || (restarted !== null && cameBack !== null), body: <>
      <Choice name="re" label={t('ansNo')} checked={restarted === 'no'} onPick={() => setRestarted('no')} />
      <Choice name="re" label={t('ansYes')} checked={yesNo(restarted) === 'yes'} onPick={() => setRestarted({ choice: 'under1week' })} />
      {yesNo(restarted) === 'yes' && <><WhenPicker name="reWhen" value={restarted as When} onChange={setRestarted} />
        <p className="field-label">{t('q5CameBack')}</p>
        <Choice name="back" label={t('ansNo')} checked={cameBack === 'no'} onPick={() => setCameBack('no')} />
        <Choice name="back" label={t('ansYes')} checked={yesNo(cameBack) === 'yes'} onPick={() => setCameBack({ choice: 'under1week' })} />
        {yesNo(cameBack) === 'yes' && <WhenPicker name="backWhen" value={cameBack as When} onChange={setCameBack} />}</>}</> });

  const q = qs[Math.min(i, qs.length - 1)];
  const last = i >= qs.length - 1;
  const speak = () => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(q.text); u.lang = lang === 'ar' ? 'ar-EG' : 'en-GB'; speechSynthesis.speak(u); } catch { /* no speech here */ } };
  const finish = () => onDone({ problem, started: started!, stopped: stopped === 'no' || stopped === null ? 'no' : { when: stopped },
    wentAway: wentAway === null ? 'unsure' : typeof wentAway === 'string' ? wentAway : { when: wentAway },
    restarted: restarted === 'no' || restarted === null ? 'no' : { when: restarted, cameBack: cameBack ?? 'no' } });

  return (
    <section className="screen">
      <p className="hint">{t('questionOf', { n: i + 1, total: qs.length })}</p>
      <h1 className="question">{q.text}</h1>
      <button type="button" className="btn btn-quiet" onClick={speak}>{t('readAloud')}</button>
      {q.body}
      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={() => (i ? setI(i - 1) : onBack())}>{t('back')}</button>
        <button type="button" className="btn btn-primary" disabled={!q.ready} aria-disabled={!q.ready} onClick={() => (last ? finish() : setI(i + 1))}>{last ? t('continue') : t('next')}</button>
      </div>
    </section>
  );
}
