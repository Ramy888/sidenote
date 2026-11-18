// Chat pipeline: Importer output -> Prefilter windows -> Reader (on device) -> Evidence Challenger -> dates -> Timeline.
import { cueWindows, locateQuote, resolveWhen, type ChatMessage } from '@sidenote/private-evidence';
import { cueMatcher, SYMPTOM_WORDS, sentenceAround, isGeneralClaim, reportsRecovery } from './lexicon.ts';
import { buildTimeline, type DatedEvent } from './timeline.ts';
import type { ReaderEvent, WindowMessage } from './reader.ts';

function packWindows<M extends { text: string }>(windows: M[][], maxChars: number): M[][] {
  const packed: M[][] = [];
  let cur: M[] = [], chars = 0;
  for (const w of windows) {
    const n = w.reduce((a, m) => a + m.text.length, 0);
    if (cur.length && chars + n > maxChars) { packed.push(cur); cur = []; chars = 0; }
    cur.push(...w); chars += n;
  }
  if (cur.length) packed.push(cur);
  return packed;
}

export interface ReadChatOptions {
  medicines: string[];
  ownSenders: string[];
  read: (window: WindowMessage[]) => Promise<ReaderEvent[]>;
  /** Pack windows into calls of up to this many characters; 0 = one call per window. */
  packChars?: number;
  onWindow?: (done: number, total: number, events: DatedEvent[]) => void;
}

export async function readChat(messages: ChatMessage[], opts: ReadChatOptions) {
  const text = messages.filter(m => !m.media).map(({ id, at, sender, text }) => ({ id, at, sender, text }));
  // One Reader call per cue window: packing a whole chat into one call was faster (23 s) but Nano then
  // missed a quarter of the events (75/106 vs 97/106, Nov 16), so windows stay separate.
  const windows = packWindows(cueWindows(text, cueMatcher(opts.medicines), { before: 1, after: 1, maxChars: 1800 }), opts.packChars ?? 0);
  const events: DatedEvent[] = [];
  const rejected: { event: ReaderEvent; reason: string }[] = [];
  for (const [i, w] of windows.entries()) {
    const found: DatedEvent[] = [];
    for (const e of await opts.read(w)) {
      const loc = locateQuote(e.quote, w, e.message);
      if (!loc.found) { rejected.push({ event: e, reason: 'quote not in chat' }); continue; }
      const msg = w.find(m => m.id === loc.messageId)!;
      if (e.kind.startsWith('symptom') && !SYMPTOM_WORDS.test(msg.text)) { rejected.push({ event: e, reason: 'no symptom named in the message' }); continue; }
      const sentence = sentenceAround(msg.text, e.quote);
      if (sentence.endsWith('?')) { rejected.push({ event: e, reason: 'a question, not an event' }); continue; }
      if (isGeneralClaim(sentence, msg.text, e.kind)) { rejected.push({ event: e, reason: 'a general statement, not an event' }); continue; }
      const kind = e.kind === 'symptom_started' && reportsRecovery(sentence) ? 'symptom_gone' : e.kind;
      const sender = 'ambiguous' in loc ? '' : loc.sender;
      // The model only copies the phrase; code dates it against the message it is in.
      const phrase = e.when && msg.text.toLowerCase().includes(e.when.toLowerCase()) ? e.when : e.quote;
      let r = resolveWhen(phrase, msg.at);
      if (r.basis === 'message') r = resolveWhen(msg.text, msg.at);
      // "stop it for two weeks ... stopped it today": a planned duration yields to a same-day word.
      if (/\bfor (about |around )?\w+ (day|week|month)s?\b/i.test(phrase) && !/\b(ago|since|past|last)\b/i.test(phrase)
        && /\b(today|tonight|this morning)\b/i.test(msg.text)) r = resolveWhen('today', msg.at);
      found.push({ kind, medicine: e.medicine, symptom: e.symptom, quote: e.quote, messageId: msg.id, sender,
        own: sender !== '' && opts.ownSenders.includes(sender), ...r });
    }
    events.push(...found);
    opts.onWindow?.(i + 1, windows.length, found);
  }
  return { windows: windows.length, events, rejected, timeline: buildTimeline(events, opts.medicines) };
}
