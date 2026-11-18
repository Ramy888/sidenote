// Evidence Challenger core: a quote counts only if it appears in a real message, and the sender
// is taken from that message, never from the model's label (OVE1).

export interface LocatableMessage { id: number; sender: string; text: string }
export type Located =
  | { found: false }
  | { found: true; messageId: number; sender: string }
  | { found: true; ambiguous: true; senders: string[]; messageId: number };

const norm = (s: string) => s.normalize('NFKC').toLowerCase()
  .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ').trim();
const trimEnds = (s: string) => s.replace(/^[\s"'.,!?…:;-]+|[\s"'.,!?…:;-]+$/g, '');
const MIN_CHARS = 4;

export function locateQuote(quote: string, messages: LocatableMessage[], hintId?: number): Located {
  const q = trimEnds(norm(quote));
  if (q.length < MIN_CHARS) return { found: false };
  const hits = messages.filter(m => norm(m.text).includes(q));
  if (hits.length === 0) return { found: false };
  const senders = [...new Set(hits.map(m => m.sender))].sort();
  const best = hits.find(m => m.id === hintId) ?? hits[0]; // no hint: the first occurrence dates the evidence
  if (senders.length > 1) return { found: true, ambiguous: true, senders, messageId: best.id };
  return { found: true, messageId: best.id, sender: best.sender };
}
