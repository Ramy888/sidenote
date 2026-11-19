// Screen 2, Who's who: the patient and the reporter among the senders; everyone else is "other".
import { useState } from 'react';
import type { ParsedChat } from '@sidenote/private-evidence';
import { useI18n } from '../i18n.ts';
import { senders } from '../app/importChat.ts';

export interface Roles { patient: string | null; reporter: string }
const NOT_IN_CHAT = '\u0000not-in-chat';

export function WhosWho({ chat, forSomeone, onBack, onDone }: { chat: ParsedChat; forSomeone: boolean; onBack: () => void; onDone: (r: Roles) => void }) {
  const { t, date } = useI18n();
  const list = senders(chat);
  const only = list.length === 1 ? list[0].name : '';
  const [patient, setPatient] = useState(only);
  const [you, setYou] = useState(only && !forSomeone ? only : '');
  const patientName = patient === NOT_IN_CHAT ? null : patient;
  const youOptions = list.filter(s => s.name !== patientName || !forSomeone);
  const ready = patient && you;

  const radio = (group: string, value: string, label: string, checked: boolean, set: (v: string) => void, sub?: string) => (
    <label className="choice" key={value}>
      <input type="radio" name={group} value={value} checked={checked} onChange={() => set(value)} />
      <span>{label}{sub && <span className="sub">{sub}</span>}</span>
    </label>
  );

  return (
    <section className="screen">
      <h1>{t('whoTitle')}</h1>
      <p className="hint">{t('chatLoaded', { count: chat.messages.length, from: date(chat.messages[0].at), to: date(chat.messages.at(-1)!.at) })}</p>
      <p className="lead">{t('whoLead')}</p>
      {only && <p className="alert alert-device">{t('oneSender')}</p>}
      <fieldset><legend>{t('whoPatient')}</legend>
        {list.map(s => radio('patient', s.name, s.name, patient === s.name, v => { setPatient(v); if (!forSomeone) setYou(v); }, t('messagesCount', { count: s.count })))}
        {radio('patient', NOT_IN_CHAT, t('whoNotInChat'), patient === NOT_IN_CHAT, v => { setPatient(v); setYou(''); })}
      </fieldset>
      {patient && (forSomeone || patient === NOT_IN_CHAT) && (
        <fieldset><legend>{t('whoYou')}</legend>
          {youOptions.map(s => radio('you', s.name, s.name, you === s.name, setYou, t('messagesCount', { count: s.count })))}
        </fieldset>
      )}
      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>{t('back')}</button>
        <button type="button" className="btn btn-primary" disabled={!ready} aria-disabled={!ready} onClick={() => onDone({ patient: patientName, reporter: you })}>{t('continue')}</button>
      </div>
    </section>
  );
}
