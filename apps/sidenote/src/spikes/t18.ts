// T18 (OVE3/OVE7): Firebase JS SDK inside the Capacitor WebView, App Check tokens from the native SDK
// via CustomProvider. Init order: native App Check first, then the JS app. Results go to the native log.
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';

const log = (step: string, data: unknown) => console.log('[T18]', step, JSON.stringify(data));
const env = import.meta.env;

export async function runT18() {
  try {
    await FirebaseAppCheck.initialize({ debugToken: true }); // debug provider on the simulator only
    const { token } = await FirebaseAppCheck.getToken();
    log('native token', { ok: Boolean(token), length: token?.length ?? 0 });
  } catch (e) { log('native app check failed', String(e)); return; }

  const app = initializeApp({ apiKey: env.VITE_FB_API_KEY, authDomain: env.VITE_FB_AUTH_DOMAIN, projectId: env.VITE_FB_PROJECT_ID,
    storageBucket: env.VITE_FB_STORAGE_BUCKET, messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID, appId: env.VITE_FB_APP_ID });
  initializeAppCheck(app, { isTokenAutoRefreshEnabled: true, provider: new CustomProvider({
    getToken: async () => { const r = await FirebaseAppCheck.getToken(); return { token: r.token, expireTimeMillis: r.expireTimeMillis ?? Date.now() + 30 * 60_000 }; },
  }) });
  const ai = getAI(app, { backend: new GoogleAIBackend() });

  for (const mode of [InferenceMode.ONLY_IN_CLOUD, InferenceMode.ONLY_ON_DEVICE]) {
    const t0 = performance.now();
    try {
      const r = await getGenerativeModel(ai, { mode, inCloudParams: { model: 'gemini-3.5-flash-lite' } }).generateContent('Reply with exactly one word: ready');
      log(mode, { text: r.response.text().trim(), source: r.response.inferenceSource, ms: Math.round(performance.now() - t0) });
    } catch (e) { log(mode, { error: String((e as Error).message ?? e).slice(0, 200), ms: Math.round(performance.now() - t0) }); }
  }
  log('done', {});
}
