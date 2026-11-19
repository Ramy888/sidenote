// SideNote app shell: one flow, kept in memory only (nothing about the chat is stored).
import { useState } from 'react';
import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import type { ParsedChat } from '@sidenote/private-evidence';
import { useI18n } from './i18n.ts';
import { I18nProvider } from './I18nProvider.tsx';
import type { Region } from './app/importChat.ts';
import { LanguageSwitch } from './screens/common.tsx';
import { useModelState } from './app/model.ts';
import { Start } from './screens/Start.tsx';
import { WhosWho, type Roles } from './screens/WhosWho.tsx';
import { Medicines } from './screens/Medicines.tsx';
import { Reading, type ReadResult } from './screens/Reading.tsx';
import { ownSenders } from './app/importChat.ts';
import type { Medicine } from './app/medicines.ts';
import { startReview, type Reviewed } from './app/review.ts';
import { Timeline } from './screens/Timeline.tsx';
import { Urgent } from './screens/Urgent.tsx';
import { CloudSteps, type CloudResult } from './screens/CloudSteps.tsx';
import { urgentHelp } from './pipeline/safety.ts';
import { router } from './app/session.ts';
import { Report } from './screens/Report.tsx';
import { Ledger } from './screens/Ledger.tsx';
import { buildDraft } from './app/report.ts';
import './App.css';

type Step = { at: 'start' } | { at: 'who'; chat: ParsedChat } | { at: 'arabic'; chat: ParsedChat } | { at: 'typed'; text: string }
  | { at: 'medicines'; chat: ParsedChat; roles: Roles }
  | { at: 'reading'; chat: ParsedChat; roles: Roles; meds: Medicine[]; names: string[]; own: string[] }
  | { at: 'timeline'; chat: ParsedChat; roles: Roles; meds: Medicine[]; read: ReadResult; review: Reviewed[] }
  | { at: 'urgent'; flags: string[]; then: Step }
  | { at: 'cloud'; chat: ParsedChat; roles: Roles; meds: Medicine[]; review: Reviewed[] }
  | { at: 'report'; chat: ParsedChat; roles: Roles; meds: Medicine[]; review: Reviewed[]; cloud: CloudResult };

const defaultRegion = (): Region => { const l = navigator.language?.toLowerCase() ?? ''; return l.endsWith('-us') ? 'US' : l.startsWith('ar') || l.endsWith('-eg') ? 'EG' : 'UK'; };

function Flow() {
  const { t } = useI18n();
  const model = useModelState();
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [forSomeone, setForSomeone] = useState(false);
  const [step, setStep] = useState<Step>({ at: 'start' });
  const [ledger, setLedger] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const restart = () => { setDeleted(false); setStep({ at: 'start' }); };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle><button type="button" className="brand" onClick={restart}>{t('appName')}</button></IonTitle>
          <div slot="end" className="toolbar-end">
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setLedger(true)}>{t('ledgerOpen')}</button>
            <LanguageSwitch className="header-only" />
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main id="main">
          {step.at === 'start' && <Start region={region} setRegion={setRegion} forSomeone={forSomeone} setForSomeone={setForSomeone} model={model}
            onImport={r => setStep(r.kind === 'arabic' ? { at: 'arabic', chat: r.chat } : { at: 'who', chat: r.chat })} onTyped={text => setStep({ at: 'typed', text })} />}
          {step.at === 'who' && <WhosWho chat={step.chat} forSomeone={forSomeone} onBack={restart} onDone={roles => setStep({ at: 'medicines', chat: step.chat, roles })} />}
          {step.at === 'arabic' && <section className="screen"><p className="alert alert-warning">{t('arabicChat')}</p><button type="button" className="btn btn-secondary" onClick={restart}>{t('back')}</button></section>}
          {step.at === 'medicines' && <Medicines initial={[]} onBack={() => setStep({ at: 'who', chat: step.chat })}
            onDone={meds => setStep({ at: 'reading', chat: step.chat, roles: step.roles, meds, names: meds.map(m => m.name), own: [...ownSenders(step.roles.patient, step.roles.reporter)] })} />}
          {step.at === 'reading' && <Reading chat={step.chat} medicines={step.names} own={step.own} onBack={() => setStep({ at: 'medicines', chat: step.chat, roles: step.roles })}
            onDone={read => {
              const next: Step = { at: 'timeline', chat: step.chat, roles: step.roles, meds: step.meds, read, review: startReview(read.timeline, step.meds) };
              // Red flags in the patient's or reporter's own messages open urgent help before the case continues.
              const u = urgentHelp(step.chat.messages.filter(m => step.own.includes(m.sender)), region);
              setStep(u.show ? { at: 'urgent', flags: u.matches, then: next } : next);
            }} />}
          {step.at === 'urgent' && <Urgent flags={step.flags} region={region} onSafe={() => setStep(step.then)} />}
          {step.at === 'timeline' && <Timeline initial={step.review} onBack={() => setStep({ at: 'medicines', chat: step.chat, roles: step.roles })}
            onDone={review => setStep({ at: 'cloud', chat: step.chat, roles: step.roles, meds: step.meds, review })} />}
          {step.at === 'cloud' && <CloudSteps review={step.review} meds={step.meds} own={ownSenders(step.roles.patient, step.roles.reporter)} messageCount={step.chat.messages.length}
            onDone={cloud => setStep({ at: 'report', chat: step.chat, roles: step.roles, meds: step.meds, review: step.review, cloud })} />}
          {step.at === 'report' && <Report draft={buildDraft({ review: step.review, meds: step.meds, coding: step.cloud.coding, ranking: step.cloud.ranking, region })}
            onDelete={() => { router.ledger.length = 0; setStep({ at: 'start' }); setDeleted(true); }} />}
          {deleted && step.at === 'start' && <p className="alert alert-device" role="status">{t('rptDeleted')}</p>}
          {step.at === 'typed' && <section className="screen"><p className="alert alert-device">{t('nextStepSoon')}</p><button type="button" className="btn btn-secondary" onClick={restart}>{t('back')}</button></section>}
          <footer className="not-advice">{t('notAdvice')}</footer>
        </main>
      </IonContent>
      {ledger && <Ledger onClose={() => setLedger(false)} />}
    </IonPage>
  );
}

export default function App() {
  return <IonApp><I18nProvider><Flow /></I18nProvider></IonApp>;
}
