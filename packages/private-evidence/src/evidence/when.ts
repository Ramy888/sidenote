// Resolves an English time phrase against the message it came from. Code owns every date:
// the model only copies the phrase. Dates are local calendar days ("YYYY-MM-DD").

export interface Resolved { date: string; min: string; max: string; basis: 'phrase' | 'message' }

const DAY = 86_400_000;
const toDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);
const NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2 };
const UNIT: Record<string, number> = { day: 1, week: 7, month: 30 };
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const num = (w: string) => (/^\d+$/.test(w) ? +w : NUM[w]);

export function resolveWhen(text: string, messageAt: string): Resolved {
  const base = toDay(messageAt);
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ')} `;
  const at = (offset: number, lo = offset, hi = offset): Resolved =>
    ({ date: fmt(base - offset * DAY), min: fmt(base - hi * DAY), max: fmt(base - lo * DAY), basis: 'phrase' });

  // Explicit dates: "March 2nd", "2 Feb", "20 December".
  const md = new RegExp(String.raw` (\d{1,2})(?:st|nd|rd|th)? (${MONTHS.join('|')})[a-z]* | (${MONTHS.join('|')})[a-z]* (\d{1,2})(?:st|nd|rd|th)? `).exec(t);
  if (md) {
    const day = +(md[1] ?? md[4]), month = MONTHS.indexOf(md[2] ?? md[3]);
    let y = +messageAt.slice(0, 4), when = Date.UTC(y, month, day);
    if (when > base) when = Date.UTC(--y, month, day);
    const off = Math.round((base - when) / DAY);
    return at(off);
  }
  if (/ day before yesterday /.test(t)) return at(2);
  if (/ (yesterday|last night) /.test(t)) return at(1);

  // "since Tuesday", "on Monday", "since the weekend": the most recent one strictly before the message day.
  const wd = new RegExp(String.raw` (${WEEKDAYS.join('|')}|weekend) `).exec(t);
  if (wd) {
    const target = wd[1] === 'weekend' ? 6 : WEEKDAYS.indexOf(wd[1]);
    const today = new Date(base).getUTCDay();
    return at(((today - target + 6) % 7) + 1);
  }

  // Counts: "3 days ago", "for about a week", "three or four days", "a few days", "a couple of days".
  const fuzzy = / (about|around|roughly|almost|nearly) /.test(t);
  const cnt = new RegExp(String.raw` (\d+|${Object.keys(NUM).join('|')}|few|several)(?: or (\d+|${Object.keys(NUM).join('|')}))?(?: of)? (day|week|month)s? `).exec(t);
  if (cnt) {
    const unit = UNIT[cnt[3]];
    if (cnt[1] === 'few' || cnt[1] === 'several') {
      const [lo, mid, hi] = cnt[1] === 'few' ? [2, 3, 5] : [3, 5, 7];
      return at(mid * unit, lo * unit, hi * unit);
    }
    const n = num(cnt[1]), m = cnt[2] ? num(cnt[2]) : n;
    if (m !== n) return at(Math.round((n + m) / 2 * unit), n * unit, m * unit);
    const spread = unit === 1 ? (fuzzy ? 1 : 0) : unit === 7 ? 2 * n : 7 * n;
    return at(n * unit, n * unit - spread, n * unit + spread);
  }
  if (/ (today|this morning|this afternoon|this evening|tonight|now|just now) /.test(t)) return at(0);
  return { ...at(0), basis: 'message' };
}
