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
import './App.css';

type Step = { at: 'start' } | { at: 'who'; chat: ParsedChat } | { at: 'arabic'; chat: ParsedChat } | { at: 'typed'; text: string }
  | { at: 'medicines'; chat: ParsedChat; roles: Roles }
  | { at: 'reading'; chat: ParsedChat; roles: Roles; meds: Medicine[]; names: string[]; own: string[] }
  | { at: 'timeline'; chat: ParsedChat; roles: Roles; meds: Medicine[]; read: ReadResult; review: Reviewed[] }
  | { at: 'report'; chat: ParsedChat; roles: Roles; meds: Medicine[]; review: Reviewed[] };

const defaultRegion = (): Region => { const l = navigator.language?.toLowerCase() ?? ''; return l.endsWith('-us') ? 'US' : l.startsWith('ar') || l.endsWith('-eg') ? 'EG' : 'UK'; };

function Flow() {
  const { t } = useI18n();
  const model = useModelState();
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [forSomeone, setForSomeone] = useState(false);
  const [step, setStep] = useState<Step>({ at: 'start' });
  const restart = () => setStep({ at: 'start' });

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle><button type="button" className="brand" onClick={restart}>{t('appName')}</button></IonTitle>
          <div slot="end"><LanguageSwitch className="header-only" /></div>
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
            onDone={read => setStep({ at: 'timeline', chat: step.chat, roles: step.roles, meds: step.meds, read, review: startReview(read.timeline, step.meds) })} />}
          {step.at === 'timeline' && <Timeline initial={step.review} onBack={() => setStep({ at: 'medicines', chat: step.chat, roles: step.roles })}
            onDone={review => setStep({ at: 'report', chat: step.chat, roles: step.roles, meds: step.meds, review })} />}
          {(step.at === 'typed' || step.at === 'report') && <section className="screen"><p className="alert alert-device">{t('nextStepSoon')}</p><button type="button" className="btn btn-secondary" onClick={restart}>{t('back')}</button></section>}
          <footer className="not-advice">{t('notAdvice')}</footer>
        </main>
      </IonContent>
    </IonPage>
  );
}

export default function App() {
  return <IonApp><I18nProvider><Flow /></I18nProvider></IonApp>;
}
