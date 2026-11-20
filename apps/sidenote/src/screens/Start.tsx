// Screen 1, Start: a product hero (headline, trust points, a preview of the result) and three ways in.
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

/** Decorative: what SideNote produces, so the value reads at a glance (the real answers are on the timeline). */
function Preview() {
  const { t } = useI18n();
  return (
    <div className="preview card" aria-hidden="true">
      <p className="preview-title"><Icon kind="calendar" /> {t('pvTitle')}</p>
      <svg viewBox="0 0 300 92" className="preview-chart">
        <text x="0" y="12" className="chart-label">{t('pvMed')}</text>
        <rect x="0" y="20" width="132" height="9" rx="4.5" className="chart-bar" />
        <rect x="196" y="20" width="104" height="9" rx="4.5" className="chart-bar" />
        <text x="0" y="56" className="chart-label">{t('pvSym')}</text>
        <circle cx="58" cy="70" r="7" className="chart-on" /><circle cx="160" cy="70" r="7" className="chart-gone" /><circle cx="214" cy="70" r="7" className="chart-on" />
      </svg>
      <ul className="preview-answers">
        {(['pvA1', 'pvA2', 'pvA3'] as const).map(k => <li key={k}><span className="tick"><Icon kind="check" size={14} /></span>{t(k)}</li>)}
      </ul>
    </div>
  );
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
      <div className="hero">
        <div className="hero-copy">
          <h1>{t('startTitle')}</h1>
          <p className="lead">{t('startLead')}</p>
          <ul className="trust">
            <li><Icon kind="device" /> {t('trustDevice')}</li>
            <li><Icon kind="shield" /> {t('trustApprove')}</li>
            <li><Icon kind="file" /> {t('trustForms')}</li>
          </ul>
        </div>
        <Preview />
      </div>

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
