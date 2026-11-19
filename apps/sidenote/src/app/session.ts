// One routing table and one ledger per session; the Reader always goes through the on-device-only route.
import { firebaseModels } from '../ai/firebase.ts';
import { createRouter } from '../ai/route.ts';
import { READER_SCHEMA, READER_SYSTEM, readerPrompt, parseReaderOutput, type WindowMessage } from '../pipeline/reader.ts';

export const router = createRouter(firebaseModels);
const onDeviceParams = { createOptions: { initialPrompts: [{ role: 'system', content: READER_SYSTEM }] }, promptOptions: { responseConstraint: READER_SCHEMA } };
export const readWindow = async (w: WindowMessage[]) =>
  parseReaderOutput((await router.generate('reader', readerPrompt(w), { onDeviceParams })).text());
