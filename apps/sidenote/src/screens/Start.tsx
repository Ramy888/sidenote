// Screen 1, Start: ways in (import a chat, type or paste), region, "reporting for someone", language.
import { useRef, useState } from 'react';
import { useI18n } from '../i18n.ts';
import { exportText, classify, type ImportResult, type Region } from '../app/importChat.ts';
import { LanguageSwitch } from './common.tsx';
import { ModelStatus } from './ModelStatus.tsx';
import type { useModelState } from '../app/model.ts';

interface Props {
  region: Region; setRegion: (r: Region) => void;
  forSomeone: boolean; setForSomeone: (v: boolean) => void;
  model: ReturnType<typeof useModelState>;
  onImport: (r: Exclude<ImportResult, { kind: 'notAChat' }>) => void;
  onTyped: (text: string) => void;
  onQuestions: () => void; onDemo: () => void; onHow: () => void;
}

export function Start({ region, setRegion, forSomeone, setForSomeone, model, onImport, onTyped, onQuestions, onDemo, onHow }: Props) {
  const { t } = useI18n();
  const file = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const route = (r: ImportResult, typed?: string) => {
    if (r.kind !== 'notAChat') { setError(''); onImport(r); }
    else if (typed !== undefined) onTyped(typed);
    else setError(t('notAChat'));
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try { route(classify(exportText(f.name, new Uint8Array(await f.arrayBuffer())), region)); }
    catch { setError(t('notAChat')); }
  };

  return (
    <section className="screen start">
      <p className="locale-line">
        <label>{t('reportingTo')}{' '}
          <select value={region} onChange={e => setRegion(e.target.value as Region)}>
            <option value="US">{t('regionUS')}</option><option value="UK">{t('regionUK')}</option><option value="EG">{t('regionEG')}</option>
          </select>
        </label>
        <LanguageSwitch className="phone-only" />
      </p>
      <h1>{t('startTitle')}</h1>
      <p className="lead">{t('startLead')}</p>
      <ModelStatus model={model} />
      {model.state === 'unavailable' && <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onQuestions}>{t('fiveQuestions')}</button>
        <button type="button" className="btn btn-secondary" onClick={onDemo}>{t('loadDemo')}</button></div>}

      <h2 className="section-title">{t('waysIn')}</h2>
      <div className="card way">
        <button type="button" className="btn btn-primary" onClick={() => file.current?.click()}>{t('importChat')}</button>
        <input ref={file} type="file" accept=".txt,.zip,text/plain,application/zip" hidden onChange={e => onFile(e.target.files?.[0])} />
        <p className="hint">{t('importHint')}</p>
        {error && <p className="alert alert-warning" role="alert">{error}</p>}
      </div>
      <div className="card way">
        <label className="field-label" htmlFor="typed">{t('typeOrPaste')}</label>
        <textarea id="typed" rows={4} value={text} placeholder={t('pastePlaceholder')} onChange={e => setText(e.target.value)} />
        <p className="hint">{t('pasteWarning')}</p>
        <button type="button" className="btn btn-secondary" disabled={!text.trim()} aria-disabled={!text.trim()} onClick={() => route(classify(text, region), text)}>{t('continue')}</button>
      </div>

      <label className="check"><input type="checkbox" checked={forSomeone} onChange={e => setForSomeone(e.target.checked)} /> {t('forSomeone')}</label>
      <div className="actions">
        <button type="button" className="btn btn-quiet" onClick={onHow}>{t('howLink')}</button>
        {model.state !== 'unavailable' && <button type="button" className="btn btn-quiet" onClick={onDemo}>{t('loadDemo')}</button>}
      </div>
    </section>
  );
}
