// T3: re-measure the Nano reader through the Firebase SDK. Prompt, system text and schema are copied
// byte for byte from ideation/spike-sidenote/web/index.html (fixed Nov 13). On device the SDK ignores
// systemInstruction/responseSchema, so they go in onDeviceParams exactly as the raw spike passed them.
import { getGenerativeModel, InferenceMode } from 'firebase/ai';
import { ai } from '../ai/firebase';

const schema = {type:'object', properties:{
  medicine:{type:'string'},
  side_effects:{type:'array', items:{type:'string'}},
  illness_mentions:{type:'array', items:{type:'string'}}}, required:['medicine','side_effects','illness_mentions']};
const ask = (t: { text: string }) => `A patient wrote this about a medicine:\n"""${t.text}"""\n\nReturn JSON:\n- medicine: the medicine the patient blames.\n- side_effects: every problem the patient says the medicine caused, copied word for word from the text.\n- illness_mentions: the illness the medicine was taken for, and symptoms of that illness, copied word for word.\nNever put the illness or its symptoms in side_effects.`;
const system = 'You extract drug side effects from patient reports for a safety form. Copy phrases exactly.';

(window as any).readOne = async (t: { id: string; text: string }) => {
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), 30000);
  const t0 = performance.now();
  try {
    // Cast: the SDK's types lag the Prompt API (string content, signal); the raw spike passed exactly this.
    const onDeviceParams = {
      createOptions: { initialPrompts: [{ role: 'system', content: system }], signal: ac.signal },
      promptOptions: { responseConstraint: schema, signal: ac.signal } } as any;
    const model = getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE, onDeviceParams });
    const r = await model.generateContent(ask(t));
    return { id: t.id, ms: Math.round(performance.now() - t0), source: r.response.inferenceSource, out: JSON.parse(r.response.text()) };
  } catch (e) {
    return { id: t.id, ms: Math.round(performance.now() - t0), error: String((e as Error).message ?? e) };
  } finally { clearTimeout(timer); }
};

// Control arm: the Nov 13 raw-API path (one base session, clone per post), to measure run-to-run noise.
let base: any;
(window as any).readOneRaw = async (t: { id: string; text: string }) => {
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), 30000);
  const t0 = performance.now(); let s: any;
  try {
    base ??= await (self as any).LanguageModel.create({ initialPrompts: [{ role: 'system', content: system }] });
    s = await base.clone({ signal: ac.signal });
    const out = await s.prompt(ask(t), { responseConstraint: schema, signal: ac.signal });
    return { id: t.id, ms: Math.round(performance.now() - t0), source: 'raw', out: JSON.parse(out) };
  } catch (e) {
    return { id: t.id, ms: Math.round(performance.now() - t0), error: String((e as Error).message ?? e) };
  } finally { clearTimeout(timer); try { s?.destroy(); } catch {} }
};
