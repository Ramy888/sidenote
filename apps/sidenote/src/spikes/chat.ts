// Dev page for the Reader: runs one window through the routing table (reader = ONLY_ON_DEVICE behind the guard).
import { firebaseModels } from '../ai/firebase';
import { createRouter, approve } from '../ai/route';
import { coderPayload } from '../ai/payload';
import { READER_SCHEMA, READER_SYSTEM, readerPrompt, parseReaderOutput, type WindowMessage } from '../pipeline/reader';

const router = createRouter(firebaseModels);
const onDeviceParams = { createOptions: { initialPrompts: [{ role: 'system', content: READER_SYSTEM }] }, promptOptions: { responseConstraint: READER_SCHEMA } };

(window as any).readWindow = async (messages: WindowMessage[]) => {
  const t0 = performance.now();
  try {
    const r = await router.generate('reader', readerPrompt(messages), { onDeviceParams });
    return { ms: Math.round(performance.now() - t0), source: r.inferenceSource, events: parseReaderOutput(r.text()) };
  } catch (e) {
    return { ms: Math.round(performance.now() - t0), error: String((e as Error).message ?? e) };
  }
};

// Dev probe for the coder route (PREFER_ON_DEVICE): one approved phrase against a stand-in term list.
(window as any).codeOnce = async (phrase: string) => {
  const t0 = performance.now();
  const terms = new Map([['R1', 'muscle pain'], ['R2', 'ankle swelling'], ['R3', 'dry cough']]);
  const r = await router.generate('coder', approve(coderPayload(phrase, { sender: 'Me', text: phrase }, new Set(['Me']), terms)));
  return { ms: Math.round(performance.now() - t0), source: r.inferenceSource, answer: r.text().trim(), ledger: router.ledger.at(-1) };
};
