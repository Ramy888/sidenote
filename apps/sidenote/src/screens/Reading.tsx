// Screen 4, Reading: the chat is read window by window on this device; facts appear as they are found.
// No on-device model -> the fail-closed screen (11): nothing is sent, the 5 questions are offered instead.
import { useEffect, useRef, useState } from 'react';
import { OnDeviceUnavailable, type ParsedChat } from '@sidenote/private-evidence';
import { useI18n } from '../i18n.ts';
import { readChat } from '../pipeline/chat.ts';
import type { DatedEvent, TimelineFact } from '../pipeline/timeline.ts';
import { readWindow } from '../app/session.ts';
import { Badge } from './common.tsx';
import { Fact } from './Fact.tsx';

export interface ReadResult { events: DatedEvent[]; timeline: TimelineFact[] }

export function Reading({ chat, medicines, own, onBack, onQuestions, onDone }: { chat: ParsedChat; medicines: string[]; own: string[]; onBack: () => void; onQuestions: () => void; onDone: (r: ReadResult) => void }) {
  const { t } = useI18n();
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [found, setFound] = useState<DatedEvent[]>([]);
  const [state, setState] = useState<'reading' | 'done' | 'failClosed' | 'error'>('reading');
  const [result, setResult] = useState<ReadResult | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    const c = new AbortController(); ctl.current = c;
    const mine = () => ctl.current === c; // StrictMode's first (cleaned-up) run must not touch state
    readChat(chat.messages, { medicines, ownSenders: own, read: readWindow, signal: c.signal,
      onWindow: (done, total, events) => { if (mine()) { setProgress({ done, total }); setFound(f => [...f, ...events]); } } })
      .then(r => { if (mine()) { setResult({ events: r.events, timeline: r.timeline }); setState('done'); } })
      .catch(e => { if (mine()) setState(e instanceof OnDeviceUnavailable ? 'failClosed' : 'error'); });
    return () => { c.abort(); if (mine()) ctl.current = null; };
  }, [chat, medicines, own]);

  if (state === 'error') return (
    <section className="screen"><p className="alert alert-warning" role="alert">{t('readingFailed')}</p>
      <button type="button" className="btn btn-secondary" onClick={onBack}>{t('back')}</button></section>);
  if (state === 'failClosed') return (
    <section className="screen"><h1>{t('failClosedTitle')}</h1><p className="alert alert-warning">{t('failClosedBody')}</p>
      <div className="actions"><button type="button" className="btn btn-secondary" onClick={onBack}>{t('back')}</button>
        <button type="button" className="btn btn-primary" onClick={onQuestions}>{t('fiveQuestions')}</button></div></section>);

  return (
    <section className="screen">
      <h1>{t('readingTitle')}</h1>
      <p className="status status-device" role="status" aria-live="polite"><Badge kind="device" /> {state === 'reading' ? t('readingProgress', { done: progress.done, total: progress.total }) : t('readingNotKept', { count: chat.messages.length })}</p>
      {progress.total > 0 && <progress className="bar" max={progress.total} value={progress.done} aria-label={t('readingProgress', { done: progress.done, total: progress.total })} />}
      <ol className="facts">{found.map((e, i) => <Fact key={`${e.messageId}-${e.kind}-${i}`} e={e} index={i % 6} />)}</ol>
      {state === 'reading' && <button type="button" className="btn btn-secondary" onClick={() => ctl.current?.abort()}>{t('readingCancel')}</button>}
      {state === 'done' && result && (result.timeline.length
        ? <><p className="lead">{t('readingDone', { count: result.timeline.length })}</p>
            <div className="actions"><button type="button" className="btn btn-secondary" onClick={onBack}>{t('back')}</button>
              <button type="button" className="btn btn-primary" onClick={() => onDone(result)}>{t('continue')}</button></div></>
        : <><p className="alert alert-warning">{t('readingNothing')}</p><button type="button" className="btn btn-primary" onClick={onQuestions}>{t('fiveQuestions')}</button></>)}
    </section>
  );
}
