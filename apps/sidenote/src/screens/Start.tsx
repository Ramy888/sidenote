// Screen 1, Start: the headline, the on-device status and three ways in. What SideNote does and a preview of
// the result live in the "How it works" sheet (app bar), so the choices come first.
import { useRef, useState } from 'react';
import { useI18n } from '../i18n.ts';
import { exportText, classify, type ImportResult, type Region } from '../app/importChat.ts';
import { Icon, LanguageSwitch, type IconKind } from './common.tsx';
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

function Entry({ icon, title, body, onClick, primary = false }: { icon: IconKind; title: string; body: string; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" className={`entry${primary ? ' entry-primary' : ''}`} onClick={onClick}>
      <span className="entry-icon"><Icon kind={icon} size={22} /></span>
      <span className="entry-text"><span className="entry-title">{title}</span><span className="entry-body">{body}</span></span>
      <Icon kind="arrow" size={20} />
    </button>
  );
}

export function Start({ region, setRegion, forSomeone, setForSomeone, model, onImport, onTyped, onQuestions, onDemo, onHow }: Props) {
  const { t } = useI18n();
  const file = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const canRead = model.state !== 'unavailable';

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
    <section className="start">
      <div className="hero"><h1>{t('startTitle')}</h1></div>

      <ModelStatus model={model} />

      <div className="entries">
        {canRead && <Entry primary icon="upload" title={t('entryImportTitle')} body={t('entryImportBody')} onClick={() => file.current?.click()} />}
        <Entry primary={!canRead} icon="list" title={t('entryQuestionsTitle')} body={t('entryQuestionsBody')} onClick={onQuestions} />
        <Entry icon="play" title={t('entryDemoTitle')} body={t('entryDemoBody')} onClick={onDemo} />
        {!canRead && <Entry icon="upload" title={t('entryImportTitle')} body={t('entryImportBody')} onClick={() => file.current?.click()} />}
      </div>
      <input ref={file} type="file" accept=".txt,.zip,text/plain,application/zip" hidden onChange={e => onFile(e.target.files?.[0])} />
      {error && <p className="alert alert-warning" role="alert"><Icon kind="alert" /> {error}</p>}

      <details className="card typed">
        <summary><Icon kind="type" /> {t('typeTitle')}</summary>
        <textarea id="typed" rows={4} value={text} placeholder={t('pastePlaceholder')} onChange={e => setText(e.target.value)} aria-label={t('typeOrPaste')} />
        <p className="hint">{t('pasteWarning')}</p>
        <button type="button" className="btn btn-secondary" disabled={!text.trim()} aria-disabled={!text.trim()} onClick={() => route(classify(text, region), text)}>{t('continue')}</button>
      </details>

      <div className="start-footer">
        <label className="region">{t('reportingTo')}
          <select value={region} onChange={e => setRegion(e.target.value as Region)}>
            <option value="US">{t('regionUS')}</option><option value="UK">{t('regionUK')}</option><option value="EG">{t('regionEG')}</option>
          </select>
        </label>
        <LanguageSwitch className="phone-only" />
        <label className="check"><input type="checkbox" checked={forSomeone} onChange={e => setForSomeone(e.target.checked)} /> {t('forSomeone')}</label>
        <button type="button" className="btn btn-quiet" onClick={onHow}>{t('howLink')}</button>
      </div>
    </section>
  );
}
