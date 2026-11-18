import { describe, it, expect } from 'vitest';
import { parseWhatsApp } from '../src/chat/whatsapp';

const NNBSP = ' ', LRM = '‎';

describe('parseWhatsApp', () => {
  it('reads the iOS format, day-first, 24-hour', () => {
    const r = parseWhatsApp('[15/03/2026, 21:12:05] Margaret: my legs ache so much\n[16/03/2026, 08:01:00] Sarah: did you sleep?');
    expect(r.isChat).toBe(true);
    expect(r.dateOrder).toBe('dmy');
    expect(r.dateOrderSource).toBe('detected');
    expect(r.messages).toEqual([
      { id: 0, sender: 'Margaret', at: '2026-03-15T21:12:05', text: 'my legs ache so much', media: false },
      { id: 1, sender: 'Sarah', at: '2026-03-16T08:01:00', text: 'did you sleep?', media: false },
    ]);
  });

  it('reads the Android format, month-first, 12-hour with a narrow no-break space and 2-digit year', () => {
    const r = parseWhatsApp(`3/15/26, 9:12${NNBSP}PM - Margaret: legs ache\n3/16/26, 12:05${NNBSP}AM - Sarah: ok`);
    expect(r.dateOrder).toBe('mdy');
    expect(r.messages.map(m => m.at)).toEqual(['2026-03-15T21:12:00', '2026-03-16T00:05:00']);
  });

  it('joins continuation lines to the message above', () => {
    const r = parseWhatsApp('15/03/2026, 21:12 - Margaret: first line\nsecond line\n\nthird line\n16/03/2026, 08:00 - Sarah: hi');
    expect(r.messages[0].text).toBe('first line\nsecond line\n\nthird line');
    expect(r.messages).toHaveLength(2);
  });

  it('skips system lines and marks media messages', () => {
    const r = parseWhatsApp([
      '15/03/2026, 21:00 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.',
      '15/03/2026, 21:12 - Margaret: <Media omitted>',
      `${LRM}[15/03/2026, 21:13:00] Sarah: ${LRM}image omitted`,
      '15/03/2026, 21:14 - Margaret: nice',
    ].join('\n'));
    expect(r.messages.map(m => [m.sender, m.media])).toEqual([['Margaret', true], ['Sarah', true], ['Margaret', false]]);
    expect(r.skippedLines).toBe(1);
  });

  it('uses the region default when no date component is over 12, and says so', () => {
    const chat = '03/04/2026, 10:00 - Margaret: started the new pill\n05/04/2026, 10:00 - Sarah: good';
    const us = parseWhatsApp(chat, { regionDateOrder: 'mdy' });
    expect(us.dateOrderSource).toBe('region');
    expect(us.messages[0].at).toBe('2026-03-04T10:00:00');
    const uk = parseWhatsApp(chat, { regionDateOrder: 'dmy' });
    expect(uk.messages[0].at).toBe('2026-04-03T10:00:00');
  });

  it('keeps colons inside the message text and names with spaces or phone numbers', () => {
    const r = parseWhatsApp('15/03/2026, 21:12 - +44 7700 900123: time: 9pm\n15/03/2026, 21:13 - Aunt Mary Jo: ok: fine');
    expect(r.messages.map(m => [m.sender, m.text])).toEqual([['+44 7700 900123', 'time: 9pm'], ['Aunt Mary Jo', 'ok: fine']]);
  });

  it('measures how much of the chat is Arabic script', () => {
    const r = parseWhatsApp('15/03/2026, 21:12 - ماما: رجلي بتوجعني جدا\n15/03/2026, 21:13 - Sarah: ok');
    expect(r.arabicShare).toBeGreaterThan(0.7);
  });

  it('says a plain text file is not a chat', () => {
    const r = parseWhatsApp('Dear doctor,\nmy legs ache.\nThanks');
    expect(r.isChat).toBe(false);
    expect(r.messages).toHaveLength(0);
  });

  it('rejects impossible dates instead of inventing them', () => {
    const r = parseWhatsApp('31/02/2026, 10:00 - Margaret: hello\n15/03/2026, 10:00 - Margaret: real');
    expect(r.messages.map(m => m.text)).toEqual(['real']);
  });
});
