// Screen 13, Settings: text size, region, interface language, and the demo trigger for the check-in.
import { useI18n } from '../i18n.ts';
import type { StringKey } from '../strings.ts';
import type { Region } from '../app/importChat.ts';
import { LanguageSwitch } from './common.tsx';

export function Settings({ region, setRegion, textSize, setTextSize, demo, setDemo, onBack }: {
  region: Region; setRegion: (r: Region) => void; textSize: number; setTextSize: (n: number) => void; demo: boolean; setDemo: (v: boolean) => void; onBack: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="screen">
      <h1>{t('settingsTitle')}</h1>
      <fieldset><legend>{t('textSize')}</legend>
        {[100, 125, 150].map(n => <label className="choice" key={n}><input type="radio" name="size" checked={textSize === n} onChange={() => setTextSize(n)} /><span>{t(`text_${n}` as StringKey)}</span></label>)}
      </fieldset>
      <label className="field-label">{t('reportingTo')}{' '}
        <select value={region} onChange={e => setRegion(e.target.value as Region)}>
          <option value="US">{t('regionUS')}</option><option value="UK">{t('regionUK')}</option><option value="EG">{t('regionEG')}</option>
        </select></label>
      <div><p className="field-label">{t('languageSwitch')}</p><LanguageSwitch /></div>
      <label className="check"><input type="checkbox" checked={demo} onChange={e => setDemo(e.target.checked)} /> {t('demoCheckin')}</label>
      <button type="button" className="btn btn-secondary" onClick={onBack}>{t('back')}</button>
    </section>
  );
}
