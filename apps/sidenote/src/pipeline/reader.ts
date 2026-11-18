// Reader agent: one window of chat messages -> medicine and symptom events, read on the device.
// The prompt and schema are versioned; tune only on evals/dev, freeze before the scored run.
export const READER_VERSION = 'v2';

export const EVENT_KINDS = ['medicine_started', 'medicine_stopped', 'medicine_restarted', 'symptom_started', 'symptom_ongoing', 'symptom_gone'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export interface WindowMessage { id: number; at: string; sender: string; text: string }
export interface ReaderEvent { kind: EventKind; medicine: string; symptom: string; quote: string; message: number; when: string }

export const READER_SYSTEM = 'You extract medicine and symptom events from a family chat for a side-effect report. Copy words exactly. Never guess.';

export const READER_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: [...EVENT_KINDS] },
          medicine: { type: 'string' },
          symptom: { type: 'string' },
          quote: { type: 'string' },
          message: { type: 'integer' },
          when: { type: 'string' },
        },
        required: ['kind', 'medicine', 'symptom', 'quote', 'message', 'when'],
      },
    },
  },
  required: ['events'],
} as const;

export function readerPrompt(messages: WindowMessage[]): string {
  // Several excerpts of one chat can share a call; "…" marks skipped messages between them.
  const lines = messages.map((m, i) => (i > 0 && m.id !== messages[i - 1].id + 1 ? '…\n' : '') + `[${m.id}] ${m.at.slice(0, 10)} ${m.sender}: ${m.text.replace(/\n/g, ' ')}`).join('\n');
  return `Excerpts from a family chat. Each line: [message number] date sender: text. "…" means messages were skipped.
"""
${lines}
"""
List every event these messages state about a medicine or a symptom:
- kind: "medicine_started", "medicine_stopped", "medicine_restarted", "symptom_started", "symptom_ongoing" or "symptom_gone"
- medicine: the medicine's name if the event is about a medicine, else ""
- symptom: the symptom in a few words if the event is about a symptom, else ""
- quote: the words that state the event, copied exactly from one message
- message: that message's number
- when: the words in that message that say when it happened (for example "today", "since the weekend", "for about a week"), copied exactly, or "" if there are none
Rules:
- A message saying a symptom is better, has cleared or has gone is "symptom_gone". A symptom that comes back is "symptom_started".
- Only events that happened to the person in this chat. Questions, advice, plans and things someone read about are not events.
- One event per thing that happened; do not repeat an event that another message already states.`;
}

/** Parses the model's JSON; drops events that don't match the schema instead of repairing them. */
export function parseReaderOutput(text: string): ReaderEvent[] {
  const data = JSON.parse(text) as { events?: unknown };
  if (!Array.isArray(data.events)) throw new Error('reader output has no events array');
  return data.events.filter((e): e is ReaderEvent => {
    const x = e as Record<string, unknown>;
    return EVENT_KINDS.includes(x.kind as EventKind) && typeof x.quote === 'string' && x.quote.trim() !== ''
      && Number.isInteger(x.message) && ['medicine', 'symptom', 'when'].every(k => typeof x[k] === 'string');
  });
}
