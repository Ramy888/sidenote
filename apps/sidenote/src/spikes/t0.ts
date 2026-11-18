import { getGenerativeModel, InferenceMode } from 'firebase/ai';
import { ai, CLOUD_MODEL } from '../ai/firebase';

async function call(mode: InferenceMode, prompt: string) {
  const t0 = performance.now();
  try {
    const r = await getGenerativeModel(ai, { mode, inCloudParams: { model: CLOUD_MODEL } }).generateContent(prompt);
    return { mode, text: r.response.text().trim(), source: r.response.inferenceSource, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { mode, error: String((e as Error).message ?? e), ms: Math.round(performance.now() - t0) };
  }
}
(window as any).t0 = async () => [
  await call(InferenceMode.ONLY_ON_DEVICE, 'Reply with exactly one word: ready'),
  await call(InferenceMode.ONLY_IN_CLOUD, 'Reply with exactly one word: ready'),
];
