// T3 part 3: does Nano work through Firebase on the hosted origin in a stock Chrome profile?
// On-device only, behind the private-evidence guard. No cloud call on this page; the App Check
// check (OVE7) only exchanges a reCAPTCHA Enterprise token, it never calls Gemini.
import { initializeApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';
import { onDeviceOnly } from '@sidenote/private-evidence';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';

const env = import.meta.env;
const app = initializeApp({ apiKey: env.VITE_FB_API_KEY, projectId: env.VITE_FB_PROJECT_ID, appId: env.VITE_FB_APP_ID });
const appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: false });
const ai = getAI(app, { backend: new GoogleAIBackend() });
(window as any).appCheckToken = async () => {
  try { const t = await getToken(appCheck); return { ok: Boolean(t.token), length: t.token.length }; }
  catch (e) { return { ok: false, error: String((e as Error).message ?? e).slice(0, 200) }; }
};
const out = document.getElementById('out')!;
const show = (o: unknown) => { out.textContent = JSON.stringify(o, null, 1); (window as any).hostedResult = o; };

(window as any).runHosted = async () => {
  const lm = (self as any).LanguageModel;
  const availability = lm ? await lm.availability() : 'no LanguageModel API';
  const t0 = performance.now();
  try {
    const r = await onDeviceOnly(() => getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE }).generateContent('Reply with exactly one word: ready'));
    show({ origin: location.origin, availability, text: r.response.text().trim(), source: r.response.inferenceSource, ms: Math.round(performance.now() - t0) });
  } catch (e) { show({ origin: location.origin, availability, error: String((e as Error).message ?? e) }); }
};
document.getElementById('go')!.addEventListener('click', () => (window as any).runHosted());
