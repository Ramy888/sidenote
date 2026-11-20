// Shared Firebase setup (app, App Check, AI Logic). Config comes from the gitignored .env.local.
import { initializeApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend, type InferenceMode } from 'firebase/ai';
import type { ModelFactory } from './route';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } from 'firebase/app-check';
import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';

const env = import.meta.env;
export const app = initializeApp({
  apiKey: env.VITE_FB_API_KEY, authDomain: env.VITE_FB_AUTH_DOMAIN, projectId: env.VITE_FB_PROJECT_ID,
  storageBucket: env.VITE_FB_STORAGE_BUCKET, messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID, appId: env.VITE_FB_APP_ID,
});
// Dev only: the debug token (registered in App Check, kept in .env.local) stands in for reCAPTCHA.
// The token lives in .env.development.local, so production builds never contain it (checked by grep).
const native = Capacitor.isNativePlatform();
if (import.meta.env.DEV && !native) (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
// Android sets its provider here (iOS does it in AppDelegate): Play Integrity, or the debug provider in emulator
// builds made with VITE_ANDROID_APPCHECK_DEBUG=1 (its secret must be allow-listed in App Check).
let androidInit: Promise<void> | null = null;
const nativeReady = () => (Capacitor.getPlatform() === 'android'
  ? (androidInit ??= FirebaseAppCheck.initialize({ debugToken: env.VITE_ANDROID_APPCHECK_DEBUG === '1', isTokenAutoRefreshEnabled: true }))
  : Promise.resolve());
// In the iOS/Android app reCAPTCHA can't run, so tokens come from the native App Check SDK (App Attest on a
// device; the debug provider on the simulator, set in AppDelegate before FirebaseApp.configure()).
initializeAppCheck(app, { isTokenAutoRefreshEnabled: true, provider: native
  ? new CustomProvider({ getToken: async () => { await nativeReady(); const r = await FirebaseAppCheck.getToken(); return { token: r.token, expireTimeMillis: r.expireTimeMillis ?? Date.now() + 30 * 60_000 }; } })
  : new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY) });
export const ai = getAI(app, { backend: new GoogleAIBackend() });
// firebase 12.19 defaults to gemini-2.5-flash-lite, which the API refuses for new projects (404, Nov 16).
export const CLOUD_MODEL = 'gemini-3.5-flash-lite';

/** Firebase AI Logic behind the routing table: the router picks the mode, this only builds the model. */
export const firebaseModels: ModelFactory = (mode, params) => getGenerativeModel(ai, {
  mode: mode as InferenceMode,
  inCloudParams: { model: CLOUD_MODEL, ...(params.inCloudParams as object | undefined) },
  // Cast: the SDK's types lag the Prompt API (string content in initialPrompts).
  onDeviceParams: params.onDeviceParams as any,
});
