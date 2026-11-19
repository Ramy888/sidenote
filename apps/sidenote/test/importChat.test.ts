import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { exportText, classify, senders, ownSenders } from '../src/app/importChat.ts';

const chat = '[03/05/2026, 09:12:01] Margaret: started the atorvastatin tonight\n[03/05/2026, 09:15:44] Sarah: ok mum x\n[04/05/2026, 10:00:00] Margaret: legs ache\n';

describe('import', () => {
  it('reads a plain .txt export', () => expect(exportText('chat.txt', strToU8(chat))).toBe(chat));
  it('reads _chat.txt inside an iOS .zip export, ignoring other files', () => {
    const zip = zipSync({ 'notes.txt': strToU8('not this'), '_chat.txt': strToU8(chat), 'IMG-001.jpg': new Uint8Array([1, 2]) });
    expect(exportText('WhatsApp Chat.zip', zip)).toBe(chat);
  });
  it('routes chats, Arabic chats and non-chats', () => {
    expect(classify(chat, 'UK').kind).toBe('chat');
    expect(classify('[03/05/2026, 09:12:01] منى: الدوا ده تعبني\n[03/05/2026, 09:13:01] أحمد: سلامتك يا ماما\n', 'EG').kind).toBe('arabic');
    expect(classify('my legs have ached since I started the statin', 'US').kind).toBe('notAChat');
  });
  it('lists senders by message count and builds own words from the roles', () => {
    const r = classify(chat, 'UK'); if (r.kind !== 'chat') throw new Error();
    expect(senders(r.chat)).toEqual([{ name: 'Margaret', count: 2 }, { name: 'Sarah', count: 1 }]);
    expect([...ownSenders(null, 'Sarah')]).toEqual(['Sarah']);
    expect([...ownSenders('Margaret', 'Margaret')]).toEqual(['Margaret']);
  });
});
