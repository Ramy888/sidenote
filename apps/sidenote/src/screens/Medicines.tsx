// Screen 3, Medicines: name, strength and when it started (exact / month / before the chat / don't know).
import { useState } from 'react';
import { useI18n } from '../i18n.ts';
import { SUPPORTED, blankMedicine, medicineProblems, type Medicine, type StartKind } from '../app/medicines.ts';
import { DateField } from './common.tsx';

export function Medicines({ initial, onBack, onDone }: { initial: Medicine[]; onBack: () => void; onDone: (m: Medicine[]) => void }) {
  const { t } = useI18n();
  const [meds, setMeds] = useState<Medicine[]>(initial.length ? initial : [blankMedicine()]);
  const [tried, setTried] = useState(false);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const set = (i: number, patch: Partial<Medicine>) => setMeds(ms => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const problems = meds.map(m => medicineProblems(m, today));
  const kinds: [StartKind, Parameters<typeof t>[0]][] = [['exact', 'medStartExact'], ['month', 'medStartMonth'], ['before', 'medStartBefore'], ['unknown', 'medStartUnknown']];

  return (
    <section className="screen">
      <h1>{t('medsTitle')}</h1>
      <p className="lead">{t('medsLead')}</p>
      <datalist id="supported-medicines">{SUPPORTED.map(n => <option key={n} value={n} />)}</datalist>
      {meds.map((m, i) => (
        <div className="card" key={i}>
          <label className="field-label" htmlFor={`med-${i}`}>{t('medName')}</label>
          <input id={`med-${i}`} className="input" list="supported-medicines" value={m.name} autoComplete="off" onChange={e => set(i, { name: e.target.value })} />
          <label className="field-label" htmlFor={`str-${i}`}>{t('medStrength')}</label>
          <input id={`str-${i}`} className="input" value={m.strength} onChange={e => set(i, { strength: e.target.value })} />
          <fieldset><legend className="field-label">{t('medStarted')}</legend>
            {kinds.map(([k, label]) => (
              <label className="choice" key={k}><input type="radio" name={`start-${i}`} checked={m.startKind === k} onChange={() => set(i, { startKind: k, start: '' })} /><span>{t(label)}</span></label>
            ))}
          </fieldset>
          {m.startKind === 'exact' && <DateField label={t('dateStarted')} required max={today} value={m.start} invalid={tried && problems[i].includes('medDateNeeded')} onChange={v => set(i, { start: v })} />}
          {m.startKind === 'month' && <DateField month label={t('monthStarted')} required max={today.slice(0, 7)} value={m.start} invalid={tried && problems[i].includes('medDateNeeded')} onChange={v => set(i, { start: v })} />}
          {tried && problems[i].map(p => <p key={p} className="alert alert-warning" role="alert">{t(p)}</p>)}
          {meds.length > 1 && <button type="button" className="btn btn-quiet" onClick={() => setMeds(ms => ms.filter((_, j) => j !== i))}>{t('medRemove')}</button>}
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={() => setMeds(ms => [...ms, blankMedicine()])}>{t('medAdd')}</button>
      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>{t('back')}</button>
        <button type="button" className="btn btn-primary" onClick={() => { setTried(true); if (problems.every(p => !p.length)) onDone(meds.map(m => ({ ...m, name: m.name.trim() }))); }}>{t('readChat')}</button>
      </div>
    </section>
  );
}
