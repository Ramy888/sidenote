// Leakage check (design doc, Verification): a payload leaks when it shares a word 3-gram or a 15+ character
// run with another sender's message, unless that text is allowlisted (vocabulary, confirmed medicine names,
// bundled label text, fixed prompt wording) or also appears in the patient's or reporter's own messages.
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
function grams(s: string): Set<string> {
  const w = words(s), out = new Set<string>();
  for (let i = 0; i + 3 <= w.length; i++) out.add(w.slice(i, i + 3).join(' '));
  return out;
}
function runs(s: string, n = 15): Set<string> {
  const t = norm(s), out = new Set<string>();
  for (let i = 0; i + n <= t.length; i++) out.add(t.slice(i, i + n));
  return out;
}

export function leaks(payload: string, other: string[], own: string[], allow: string[]): string[] {
  const okGrams = new Set([...own, ...allow].flatMap(s => [...grams(s)]));
  const okText = [...own, ...allow].map(norm).join('\n');
  const pGrams = grams(payload), pRuns = runs(payload), found = new Set<string>();
  for (const m of other) {
    for (const g of grams(m)) if (pGrams.has(g) && !okGrams.has(g)) found.add(g);
    for (const r of runs(m)) if (pRuns.has(r) && !okText.includes(r.trim())) found.add(r.trim());
  }
  return [...found];
}
