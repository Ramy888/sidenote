// Writes the 20 generated chats (and the templates for the 10 hand-written chats). Gemini writes wording only; code
// stamps every timestamp, pads with everyday filler, renders the export format, and verifies that each
// scripted message contains its phrase and that the phrase resolves back to the event date.
// Run: node --env-file=.env evals/chattest/generate.mts   (dev tooling; synthetic people only)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolveWhen } from '../../packages/private-evidence/src/evidence/when.ts';
import { parseWhatsApp } from '../../packages/private-evidence/src/chat/whatsapp.ts';

const here = new URL('./', import.meta.url);
const { cases } = JSON.parse(readFileSync(new URL('specs.json', here), 'utf8'));
const KEY = process.env.GEMINI_API_KEY; if (!KEY) throw new Error('GEMINI_API_KEY missing (run with --env-file=.env)');
const MODEL = 'gemini-3.5-flash';
let s = 7;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function gemini(prompt: string, schema: object) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY! },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.9 } }) });
    if (r.status === 429 || r.status >= 500) { await sleep(15000 * (attempt + 1)); continue; }
    const j: any = await r.json();
    if (!r.ok) throw new Error(`gemini ${r.status}: ${j.error?.message}`);
    await sleep(7000); // stay under ~9 requests/min
    return JSON.parse(j.candidates[0].content.parts[0].text);
  }
  throw new Error('gemini: gave up after retries');
}

const HEALTH = /\b(pill|tablet|medic|doctor|gp|nurse|pharmac|hospital|dose|mg|prescri|sick|ill|pain|ache|sore|cough|swell|stomach|tummy|sleep|tired|mouth|headache|statin|pril|pine|formin|line|blood|pressure|symptom)/i;
async function fillerPool(): Promise<string[]> {
  const f = new URL('filler.json', here);
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  const pool: string[] = [];
  const topics = ['grandchildren, school runs and birthdays', 'cooking, shopping and the weather', 'gardening, pets and neighbours', 'TV, football and holidays', 'family news, plans and visits'];
  for (const t of topics) {
    const out = await gemini(`Write 120 different short WhatsApp messages (2 to 18 words each) that family members send each other about ${t}. Casual, warm, varied, some with typos. Never mention health, illness, doctors, medicines, sleep or the body. JSON {"messages": [string]}`,
      { type: 'object', properties: { messages: { type: 'array', items: { type: 'string' } } }, required: ['messages'] });
    pool.push(...out.messages.filter((m: string) => !HEALTH.test(m)));
  }
  writeFileSync(f, JSON.stringify(pool, null, 1));
  return pool;
}

function gist(e: { kind: string; entity: string }, patient: string, sender: string, strength: string) {
  const who = sender === patient ? 'I' : patient;
  return {
    medicine_started: `${who} started taking ${e.entity} ${strength}`.trim(),
    medicine_stopped: `${who} stopped taking ${e.entity}`,
    medicine_restarted: `${who} started taking ${e.entity} again`,
    symptom_started: `${who === 'I' ? 'my' : `${patient}'s`} ${e.entity} started`,
    symptom_gone: `${who === 'I' ? 'my' : `${patient}'s`} ${e.entity} has gone`,
    symptom_returned: `${who === 'I' ? 'my' : `${patient}'s`} ${e.entity} is back`,
  }[e.kind as string];
}

function verify(c: any, texts: string[]): string[] {
  const errs: string[] = [];
  c.scripted.forEach((x: any, i: number) => {
    const t = texts[i] ?? '', low = t.toLowerCase();
    if (x.message.mustContain && !low.includes(x.message.mustContain.toLowerCase())) errs.push(`#${i} missing phrase "${x.message.mustContain}"`);
    if (x.event.kind.startsWith('medicine') && !low.includes(x.event.entity.toLowerCase())) errs.push(`#${i} missing medicine ${x.event.entity}`);
    if (x.event.kind.startsWith('symptom') && !c.reaction.keywords.some((k: string) => low.includes(k))) errs.push(`#${i} no reaction word`);
    const r = resolveWhen(t, `${x.message.date}T12:00:00`);
    if (r.date !== x.event.date && !(r.min <= x.event.date && x.event.date <= r.max)) errs.push(`#${i} "${t}" resolves to ${r.date}, event is ${x.event.date}`);
  });
  return errs;
}

async function write(c: any) {
  const items = [...c.scripted.map((x: any) => ({ sender: x.message.sender, gist: gist(x.event, c.patient, x.message.sender, c.medicines.find((m: any) => m.name === x.event.entity)?.strength ?? ''),
      mustContain: x.message.mustContain, mention: x.event.kind.startsWith('medicine') ? x.event.entity : `one of: ${c.reaction.keywords.join(', ')}` })),
    ...c.distractors.map((d: any) => ({ sender: d.sender, gist: d.gist, mustContain: '', mention: '' }))];
  const prompt = `Write WhatsApp messages for a family chat. ${c.patient} is the patient (in their 60s or 70s); ${c.other} is family. For each item write ONE short natural message (6 to 25 words) from that sender, saying what the gist says in everyday words.
Rules: if "mustContain" is not empty, the message must contain it exactly, as the only time expression (no other dates, weekdays or times). Mention what "mention" says. Do not add any other medicine, symptom or date.
Items:
${items.map((it, i) => `${i}. sender=${it.sender}; gist="${it.gist}"; mustContain="${it.mustContain}"; mention="${it.mention}"`).join('\n')}
JSON {"messages": [string]} in the same order.`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const out = await gemini(prompt, { type: 'object', properties: { messages: { type: 'array', items: { type: 'string' } } }, required: ['messages'] });
    const errs = verify(c, out.messages);
    if (!errs.length && out.messages.length === items.length) return out.messages as string[];
    console.log(`  ${c.id} retry ${attempt + 1}: ${errs.slice(0, 2).join('; ')}`);
  }
  throw new Error(`${c.id}: could not get verified messages`);
}

const p2 = (n: number) => String(n).padStart(2, '0');
function render(c: any, texts: string[], pool: string[]) {
  const msgs: { at: number; sender: string; text: string }[] = [];
  const time = (date: string, hLo = 8, hHi = 22) => Date.parse(`${date}T00:00:00Z`) + (hLo + Math.floor(rnd() * (hHi - hLo))) * 3600_000 + Math.floor(rnd() * 3600) * 1000;
  c.scripted.forEach((x: any, i: number) => msgs.push({ at: time(x.message.date), sender: x.message.sender, text: texts[i] }));
  c.distractors.forEach((d: any, i: number) => msgs.push({ at: time(d.date), sender: d.sender, text: texts[c.scripted.length + i] }));
  const t0 = Date.parse(`${c.chatStart}T00:00:00Z`), t1 = Date.parse(`${c.chatEnd}T23:00:00Z`);
  while (msgs.length < 400) msgs.push({ at: t0 + Math.floor(rnd() * (t1 - t0)), sender: rnd() < 0.5 ? c.patient : c.other, text: pool[Math.floor(rnd() * pool.length)] });
  msgs.sort((a, b) => a.at - b.at);
  return msgs.map(m => {
    const d = new Date(m.at), dd = p2(d.getUTCDate()), mm = p2(d.getUTCMonth() + 1), y = d.getUTCFullYear();
    const date = c.dateOrder === 'dmy' ? `${dd}/${mm}/${y}` : `${mm}/${dd}/${y}`;
    const H = d.getUTCHours(), M = p2(d.getUTCMinutes()), S = p2(d.getUTCSeconds());
    return c.format === 'ios' ? `[${date}, ${p2(H)}:${M}:${S}] ${m.sender}: ${m.text}`
      : c.dateOrder === 'mdy' ? `${+mm}/${+dd}/${String(y).slice(2)}, ${(H % 12) || 12}:${M} ${H < 12 ? 'AM' : 'PM'} - ${m.sender}: ${m.text}`
      : `${date}, ${p2(H)}:${M} - ${m.sender}: ${m.text}`;
  }).join('\n') + '\n';
}

mkdirSync(new URL('chats/', here), { recursive: true }); mkdirSync(new URL('hand/', here), { recursive: true });
const pool = await fillerPool();
console.log('filler messages:', pool.length);
for (const c of cases) {
  if (c.source === 'hand') { // template for a person: fill in "text" for each message, keep the rules
    const f = new URL(`hand/${c.id}.json`, here);
    if (!existsSync(f)) writeFileSync(f, JSON.stringify({ id: c.id, patient: c.patient, other: c.other, medicines: c.medicines, reaction: c.reaction.label,
      messages: [...c.scripted.map((x: any) => ({ sender: x.message.sender, date: x.message.date, says: gist(x.event, c.patient, x.message.sender, ''), mustContain: x.message.mustContain, text: '' })),
        ...c.distractors.map((d: any) => ({ sender: d.sender, date: d.date, says: d.gist, mustContain: '', text: '' }))] }, null, 1));
    const filled = JSON.parse(readFileSync(f, 'utf8')).messages.map((m: any) => m.text);
    if (filled.some((t: string) => !t)) continue;
    const errs = verify(c, filled); if (errs.length) { console.log(`${c.id} (hand): ${errs.join('; ')}`); continue; }
    writeFileSync(new URL(`chats/${c.id}.txt`, here), render(c, filled, pool)); continue;
  }
  const out = new URL(`chats/${c.id}.txt`, here);
  if (existsSync(out)) continue;
  const texts = await write(c);
  const chat = render(c, texts, pool);
  const parsed = parseWhatsApp(chat, { regionDateOrder: c.dateOrder });
  if (parsed.messages.length !== 400) throw new Error(`${c.id}: importer read ${parsed.messages.length}/400`);
  writeFileSync(out, chat);
  console.log(`${c.id} ok (${c.variant}, ${c.format}/${c.dateOrder})`);
}
