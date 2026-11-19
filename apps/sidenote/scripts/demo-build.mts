// Builds the demo case (O4b): the synthetic chat G11 and the facts Gemini Nano found in it during the scored
// chat-test run (run 4), so judges without on-device AI see the real reading result. Output: src/demo/.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { parseWhatsApp, locateQuote } from '@sidenote/private-evidence';
const ev = new URL('../../../evals/chattest/', import.meta.url);
const id = 'G11', run = 'run-2026-11-17T22-00-24-197Z.json';
const spec = JSON.parse(readFileSync(new URL('specs.json', ev), 'utf8')).cases.find((c: any) => c.id === id);
const text = readFileSync(new URL(`chats/${id}.txt`, ev), 'utf8');
const { messages } = parseWhatsApp(text, { regionDateOrder: spec.dateOrder });
const found = JSON.parse(readFileSync(new URL(`results/${run}`, ev), 'utf8')).cases.find((c: any) => c.id === id).readerEvents;
const events = found.map((e: any) => {
  const loc = locateQuote(e.quote, messages);
  if (!loc.found) throw new Error(`quote not found: ${e.quote}`);
  const sender = 'ambiguous' in loc ? '' : loc.sender;
  return { ...e, messageId: loc.messageId, sender, own: sender === spec.patient || sender === spec.reporter, min: e.date, max: e.date, basis: 'phrase' };
});
copyFileSync(new URL(`chats/${id}.txt`, ev), new URL('../src/demo/demo-chat.txt', import.meta.url));
writeFileSync(new URL('../src/demo/demo-case.json', import.meta.url), JSON.stringify({
  note: `Synthetic chat ${id}; facts found by Gemini Nano on a laptop (chat test ${run}).`, dateOrder: spec.dateOrder,
  patient: spec.patient, reporter: spec.reporter, medicines: spec.medicines.map((m: any) => ({ name: m.name, strength: m.strength, startKind: 'unknown', start: '' })), events,
}, null, 1) + '\n');
console.log(`demo: ${messages.length} messages, ${events.length} facts, medicines ${spec.medicines.map((m: any) => m.name).join(', ')}`);
