// WhatsApp chat export parser (iOS "[date, time] Name: text" and Android "date, time - Name: text").
// Timestamps stay local and naive ("YYYY-MM-DDTHH:mm:ss"): the export carries no time zone, and
// converting would shift dates near midnight.

export type DateOrder = 'dmy' | 'mdy';

export interface ChatMessage {
  id: number;
  sender: string;
  at: string;
  text: string;
  media: boolean;
}

export interface ParsedChat {
  isChat: boolean;
  messages: ChatMessage[];
  dateOrder: DateOrder;
  /** 'detected' when a date part over 12 decided it; 'region' when the caller's default was used. */
  dateOrderSource: 'detected' | 'region';
  skippedLines: number;
  /** Share of letters in Arabic script, 0..1. */
  arabicShare: number;
}

const INVISIBLE = /[‎‏‪-‮﻿]/g;
const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[\s  ]?([AaPp])\.?[Mm]\.?)?`;
const DATE = String.raw`(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})`;
const IOS = new RegExp(String.raw`^\[${DATE},?\s${TIME}\]\s(.*)$`);
const ANDROID = new RegExp(String.raw`^${DATE},?\s${TIME}\s[-–]\s(.*)$`);
const MEDIA = /^(<media omitted>|(image|video|audio|sticker|gif|document|contact card) omitted|<attached: .*>)$/i;

interface Header { a: number; b: number; y: number; h: number; mi: number; s: number; ampm?: string; rest: string }

function header(line: string): Header | null {
  const m = IOS.exec(line) ?? ANDROID.exec(line);
  if (!m) return null;
  const [, a, b, y, h, mi, s, ampm, rest] = m;
  return { a: +a, b: +b, y: +y, h: +h, mi: +mi, s: s ? +s : 0, ampm: ampm?.toLowerCase(), rest };
}

function stamp(hd: Header, order: DateOrder): string | null {
  const day = order === 'dmy' ? hd.a : hd.b;
  const month = order === 'dmy' ? hd.b : hd.a;
  const year = hd.y < 100 ? 2000 + hd.y : hd.y;
  let hour = hd.h;
  if (hd.ampm) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (hd.ampm === 'p' ? 12 : 0);
  }
  if (month < 1 || month > 12 || hour > 23 || hd.mi > 59 || hd.s > 59) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${year}-${p(month)}-${p(day)}T${p(hour)}:${p(hd.mi)}:${p(hd.s)}`;
}

export function parseWhatsApp(text: string, opts: { regionDateOrder?: DateOrder } = {}): ParsedChat {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(INVISIBLE, ''));
  const headers = lines.map(header);

  const hs = headers.filter((h): h is Header => h !== null);
  let dateOrder: DateOrder = opts.regionDateOrder ?? 'mdy';
  let dateOrderSource: ParsedChat['dateOrderSource'] = 'region';
  if (hs.some(h => h.a > 12)) { dateOrder = 'dmy'; dateOrderSource = 'detected'; }
  else if (hs.some(h => h.b > 12)) { dateOrder = 'mdy'; dateOrderSource = 'detected'; }

  const messages: ChatMessage[] = [];
  let skippedLines = 0;
  let current: ChatMessage | null = null;
  lines.forEach((line, i) => {
    const hd = headers[i];
    if (!hd) {
      if (current) current.text += '\n' + line;
      else if (line.trim()) skippedLines++;
      return;
    }
    current = null;
    const at = stamp(hd, dateOrder);
    const sep = hd.rest.indexOf(': ');
    if (!at || sep < 1) { skippedLines++; return; } // impossible date, or a system line with no sender
    const body = hd.rest.slice(sep + 2);
    current = { id: messages.length, sender: hd.rest.slice(0, sep).trim(), at, text: body, media: MEDIA.test(body.trim()) };
    messages.push(current);
  });
  for (const m of messages) m.text = m.text.replace(/\n+$/, '');

  const all = messages.map(m => m.text).join(' ');
  const letters = all.match(/\p{L}/gu)?.length ?? 0;
  const arabic = all.match(/[؀-ۿݐ-ݿࢠ-ࣿ]/g)?.length ?? 0;

  return { isChat: messages.length > 0, messages, dateOrder, dateOrderSource, skippedLines, arabicShare: letters ? arabic / letters : 0 };
}
