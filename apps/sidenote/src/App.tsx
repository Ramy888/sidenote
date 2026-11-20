// SideNote app shell: one flow, kept in memory only (nothing about the chat is stored).
import { useEffect, useState } from 'react';
import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import type { ParsedChat } from '@sidenote/private-evidence';
import { useI18n } from './i18n.ts';
import { I18nProvider } from './I18nProvider.tsx';
import type { Region } from './app/importChat.ts';
import { LanguageSwitch, Logo, Icon } from './screens/common.tsx';
import { StepSidebar, StepProgress } from './screens/Shell.tsx';
import { useModelState } from './app/model.ts';
import { Start } from './screens/Start.tsx';
import { WhosWho, type Roles } from './screens/WhosWho.tsx';
import { Medicines } from './screens/Medicines.tsx';
import { Reading } from './screens/Reading.tsx';
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
import { Questions } from './screens/Questions.tsx';
import { HowWeKnow } from './screens/HowWeKnow.tsx';
import { questionsToFacts } from './app/questions.ts';
import { buildTimeline } from './pipeline/timeline.ts';
import { parseWhatsApp } from '@sidenote/private-evidence';
import demoCase from './demo/demo-case.json' with { type: 'json' };
import { Settings } from './screens/Settings.tsx';
import { CheckIn } from './screens/CheckIn.tsx';
import { dueCheckIn } from './app/checkin.ts';
import { initialTextSize, saveTextSize, initialDemo, saveDemo } from './app/prefs.ts';
import type { Draft } from './app/report.ts';
import demoChat from './demo/demo-chat.txt?raw';
import './App.css';

// Later steps carry the chat when there is one; the 5-question path has none.
type Case = { chat: ParsedChat | null; roles: Roles; meds: Medicine[] };
type Step = { at: 'start' } | { at: 'how' } | { at: 'settings' } | { at: 'checkinReport'; draft: Draft } | { at: 'who'; chat: ParsedChat } | { at: 'arabic'; chat: ParsedChat }
  | { at: 'medicines'; chat: ParsedChat | null; roles: Roles; mode: 'read' | 'questions'; prefill: string }
  | { at: 'reading'; chat: ParsedChat; roles: Roles; meds: Medicine[]; names: string[]; own: string[] }
  | { at: 'questions'; roles: Roles; meds: Medicine[]; prefill: string }
  | ({ at: 'timeline'; review: Reviewed[] } & Case)
  | { at: 'urgent'; flags: string[]; then: Step }
  | ({ at: 'cloud'; review: Reviewed[] } & Case)
  | ({ at: 'report'; review: Reviewed[]; cloud: CloudResult } & Case);

const ME: Roles = { patient: null, reporter: '' }; // the 5-question path: everything typed is the reporter's own words
const today = () => new Date().toISOString().slice(0, 10);

const defaultRegion = (): Region => { const l = navigator.language?.toLowerCase() ?? ''; return l.endsWith('-us') ? 'US' : l.startsWith('ar') || l.endsWith('-eg') ? 'EG' : 'UK'; };

function Flow() {
  const { t } = useI18n();
  const model = useModelState();
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [forSomeone, setForSomeone] = useState(false);
  const [step, setStep] = useState<Step>({ at: 'start' });
  const [ledger, setLedger] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [textSize, setTextSize] = useState(initialTextSize);
  const [demo, setDemo] = useState(initialDemo);
  useEffect(() => saveTextSize(textSize), [textSize]);
  useEffect(() => saveDemo(demo), [demo]);
  const checkin = step.at === 'start' ? dueCheckIn(today(), demo) : null;
  const STEP_OF: Partial<Record<Step['at'], number>> = { who: 1, medicines: 1, questions: 1, arabic: 1, reading: 2, urgent: 2, timeline: 3, cloud: 4, report: 5, checkinReport: 5 };
  const stepIndex = STEP_OF[step.at] ?? 0;
  const restart = () => { setDeleted(false); setStep({ at: 'start' }); };
  const questions = (prefill: string) => setStep({ at: 'medicines', chat: null, roles: ME, mode: 'questions', prefill });
  const caseOf = (x: Case): Case => ({ chat: x.chat, roles: x.roles, meds: x.meds });
  // Judges without on-device AI (O4b): a synthetic chat and the facts Nano found in it on a laptop.
  const loadDemo = () => {
    const chat = parseWhatsApp(demoChat, { regionDateOrder: demoCase.dateOrder as 'dmy' | 'mdy' });
    const meds = demoCase.medicines as Medicine[];
    const timeline = buildTimeline(demoCase.events as Parameters<typeof buildTimeline>[0], meds.map(m => m.name));
    setStep({ at: 'timeline', chat, roles: { patient: demoCase.patient, reporter: demoCase.reporter }, meds, review: startReview(timeline, meds) });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle><button type="button" className="brand" onClick={restart}><Logo /><span>{t('appName')}</span></button></IonTitle>
          <div slot="end" className="toolbar-end">
            <button type="button" className="btn-tool" aria-label={t('ledgerOpen')} onClick={() => setLedger(true)}><Icon kind="list" size={18} /><span>{t('ledgerOpen')}</span></button>
            <button type="button" className="btn-tool" aria-label={t('settingsOpen')} onClick={() => setStep({ at: 'settings' })}><Icon kind="sliders" size={18} /><span>{t('settingsOpen')}</span></button>
            <LanguageSwitch className="header-only" />
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {stepIndex > 0 && <StepProgress current={stepIndex} />}
        <div className={stepIndex > 0 ? 'layout with-sidebar' : 'layout'}>
        {stepIndex > 0 && <StepSidebar current={stepIndex} />}
        <main id="main">
          {step.at === 'start' && <Start region={region} setRegion={setRegion} forSomeone={forSomeone} setForSomeone={setForSomeone} model={model}
            onImport={r => {
              const next: Step = r.kind === 'arabic' ? { at: 'arabic', chat: r.chat } : { at: 'who', chat: r.chat };
              // Red flags anywhere in the chat (anyone's message, on-device code) open urgent help before anything else.
              const u = urgentHelp(r.chat.messages, region);
              setStep(u.show ? { at: 'urgent', flags: u.matches, then: next } : next);
            }}
            onTyped={text => questions(text)} onQuestions={() => questions('')} onDemo={loadDemo} onHow={() => setStep({ at: 'how' })} />}
          {checkin && <CheckIn draft={checkin.draft} onDone={draft => setStep({ at: 'checkinReport', draft })} />}
          {step.at === 'how' && <HowWeKnow onBack={restart} />}
          {step.at === 'settings' && <Settings region={region} setRegion={setRegion} textSize={textSize} setTextSize={setTextSize} demo={demo} setDemo={setDemo} onBack={restart} />}
          {step.at === 'checkinReport' && <Report draft={step.draft} onDelete={() => { setStep({ at: 'start' }); setDeleted(true); }} />}
          {step.at === 'who' && <WhosWho chat={step.chat} forSomeone={forSomeone} onBack={restart} onDone={roles => setStep({ at: 'medicines', chat: step.chat, roles, mode: 'read', prefill: '' })} />}
          {step.at === 'arabic' && <section className="screen"><p className="alert alert-warning">{t('arabicChat')}</p>
            <div className="actions"><button type="button" className="btn btn-secondary" onClick={restart}>{t('back')}</button>
              <button type="button" className="btn btn-primary" onClick={() => questions('')}>{t('fiveQuestions')}</button></div></section>}
          {step.at === 'medicines' && <Medicines initial={[]} onBack={() => (step.chat && step.mode === 'read' ? setStep({ at: 'who', chat: step.chat }) : restart())}
            onDone={meds => setStep(step.mode === 'read' && step.chat
              ? { at: 'reading', chat: step.chat, roles: step.roles, meds, names: meds.map(m => m.name), own: [...ownSenders(step.roles.patient, step.roles.reporter)] }
              : { at: 'questions', roles: step.roles, meds, prefill: step.prefill })} />}
          {step.at === 'reading' && <Reading chat={step.chat} medicines={step.names} own={step.own} onBack={() => setStep({ at: 'medicines', chat: step.chat, roles: step.roles, mode: 'read', prefill: '' })}
            onQuestions={() => setStep({ at: 'questions', roles: step.roles, meds: step.meds, prefill: '' })}
            onDone={read => setStep({ at: 'timeline', chat: step.chat, roles: step.roles, meds: step.meds, review: startReview(read.timeline, step.meds) })} />}
          {step.at === 'questions' && <Questions medicine={step.meds[0]?.name ?? ''} prefill={step.prefill} onBack={() => setStep({ at: 'medicines', chat: null, roles: step.roles, mode: 'questions', prefill: step.prefill })}
            onDone={a => {
              const review = [...startReview([], step.meds), ...questionsToFacts(a, step.meds[0]?.name ?? '', '', today())].sort((x, y) => x.date.localeCompare(y.date));
              const next: Step = { at: 'timeline', chat: null, roles: step.roles, meds: step.meds, review };
              const u = urgentHelp([{ text: a.problem }], region);
              setStep(u.show ? { at: 'urgent', flags: u.matches, then: next } : next);
            }} />}
          {step.at === 'urgent' && <Urgent flags={step.flags} region={region} onSafe={() => setStep(step.then)} />}
          {step.at === 'timeline' && <Timeline initial={step.review} onBack={() => setStep({ at: 'medicines', chat: step.chat, roles: step.roles, mode: step.chat ? 'read' : 'questions', prefill: '' })}
            onDone={review => setStep({ ...caseOf(step), at: 'cloud', review })} />}
          {step.at === 'cloud' && <CloudSteps review={step.review} meds={step.meds} own={step.chat ? ownSenders(step.roles.patient, step.roles.reporter) : new Set([''])} messageCount={step.chat?.messages.length ?? 0}
            onDone={cloud => setStep({ ...caseOf(step), at: 'report', review: step.review, cloud })} />}
          {step.at === 'report' && <Report draft={buildDraft({ review: step.review, meds: step.meds, coding: step.cloud.coding, region,
              ranking: step.cloud.rankedBy === 'cloud' || step.cloud.rankedBy === 'device' ? step.cloud.ranking : null /* code-only reasons are not a rank */ })}
            onDelete={() => { router.ledger.length = 0; setStep({ at: 'start' }); setDeleted(true); }} />}
          {deleted && step.at === 'start' && <p className="alert alert-device" role="status">{t('rptDeleted')}</p>}
          <footer className="not-advice">{t('notAdvice')}</footer>
        </main>
        </div>
      </IonContent>
      {ledger && <Ledger onClose={() => setLedger(false)} />}
    </IonPage>
  );
}

export default function App() {
  return <IonApp><I18nProvider><Flow /></I18nProvider></IonApp>;
}
