// T3 offline spike: the coder-shaped call (one phrase -> JSON) in each mode, run online then offline.
import { getGenerativeModel, InferenceMode, Schema } from 'firebase/ai';
import { ai, CLOUD_MODEL } from '../ai/firebase';

const json = { type: 'object', properties: { term: { type: 'string' } }, required: ['term'] };
const prompt = 'Give the standard medical term for this patient phrase as JSON {"term": ...}: "my legs ache so much"';

async function call(mode: InferenceMode) {
  const t0 = performance.now();
  try {
    const m = getGenerativeModel(ai, { mode,
      inCloudParams: { model: CLOUD_MODEL, generationConfig: { responseMimeType: 'application/json',
        responseSchema: Schema.object({ properties: { term: Schema.string() } }) } },
      onDeviceParams: { promptOptions: { responseConstraint: json } } });
    const r = await m.generateContent(prompt);
    const text = r.response.text();
    let valid = false; try { valid = typeof JSON.parse(text).term === 'string'; } catch {}
    return { mode, source: r.response.inferenceSource, valid, text: text.slice(0, 80), ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { mode, error: String((e as Error).message ?? e).slice(0, 160), ms: Math.round(performance.now() - t0) };
  }
}
(window as any).offlineSpike = async () => {
  const out = [];
  for (const mode of [InferenceMode.PREFER_IN_CLOUD, InferenceMode.ONLY_ON_DEVICE, InferenceMode.ONLY_IN_CLOUD]) out.push(await call(mode));
  return out;
};
