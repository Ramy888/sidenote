// Import (code, on device): a WhatsApp export (.txt, or the .zip iOS makes) -> parsed chat and the route it takes.
import { unzipSync, strFromU8 } from 'fflate';
import { parseWhatsApp, type ParsedChat } from '@sidenote/private-evidence';

export type Region = 'US' | 'UK' | 'EG';
export type ImportResult =
  | { kind: 'chat'; chat: ParsedChat }
  | { kind: 'arabic'; chat: ParsedChat }   // goes to the 5 questions: on-device Arabic reading is unverified
  | { kind: 'notAChat' };

/** The chat text inside an export: the .txt itself, or the .txt inside a .zip (iOS names it _chat.txt). */
export function exportText(name: string, bytes: Uint8Array): string {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  if (!isZip) return strFromU8(bytes);
  const files = unzipSync(bytes, { filter: f => f.name.toLowerCase().endsWith('.txt') });
  const names = Object.keys(files);
  const pick = names.find(n => /(^|\/)_chat\.txt$/i.test(n)) ?? names[0];
  if (!pick) throw new Error(`${name}: no chat text inside the zip`);
  return strFromU8(files[pick]);
}

export function classify(text: string, region: Region): ImportResult {
  const chat = parseWhatsApp(text, { regionDateOrder: region === 'US' ? 'mdy' : 'dmy' });
  if (!chat.isChat || chat.messages.length < 2) return { kind: 'notAChat' };
  return chat.arabicShare > 0.5 ? { kind: 'arabic', chat } : { kind: 'chat', chat };
}

/** Senders by how many messages they wrote, most first. */
export function senders(chat: ParsedChat): { name: string; count: number }[] {
  const n = new Map<string, number>();
  for (const m of chat.messages) n.set(m.sender, (n.get(m.sender) ?? 0) + 1);
  return [...n].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

/** Own words = the patient's (when in the chat) and the reporter's messages; everyone else is "other". */
export const ownSenders = (patient: string | null, reporter: string): ReadonlySet<string> =>
  new Set([patient, reporter].filter((s): s is string => !!s));
