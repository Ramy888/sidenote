// T1 scorer. Correct fact = right kind, right medicine or reaction, date within ±1 day of the spec.
// Unsupported claim = a shown fact with no located quote (the challenger already drops those) or one
// that contradicts the spec. Baselines: "5-question patient" dates only events in the last 7 days of
// the case; "kinder" dates every event up to 30 days old (±7 days, counted as correct).
const DAY = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / DAY);

export interface Fact { kind: string; entity: string; date: string; evidence: { quote: string } }

export function scoreCase(spec: any, facts: Fact[]) {
  const specEvents = spec.scripted.map((x: any) => x.event);
  const used = new Set<number>();
  const matches = (f: Fact, e: any) => f.kind === e.kind && Math.abs(days(f.date, e.date)) <= 1 &&
    (e.kind.startsWith('medicine') ? f.entity.toLowerCase() === e.entity.toLowerCase()
      : spec.reaction.keywords.some((k: string) => `${f.entity} ${f.evidence.quote}`.toLowerCase().includes(k)));
  let correct = 0;
  const wrong: Fact[] = [];
  for (const f of facts) {
    const i = specEvents.findIndex((e: any, j: number) => !used.has(j) && matches(f, e));
    if (i >= 0) { used.add(i); correct++; } else wrong.push(f);
  }
  const age = (e: any) => days(spec.chatEnd, e.date);
  return {
    id: spec.id, source: spec.source, variant: spec.variant, events: specEvents.length,
    correct, shown: facts.length, unsupported: wrong.length,
    baseline5q: specEvents.filter((e: any) => age(e) <= 7).length,
    baselineKinder: specEvents.filter((e: any) => age(e) <= 30).length,
    missed: specEvents.filter((_: any, j: number) => !used.has(j)).map((e: any) => `${e.kind} ${e.date}`),
    wrongFacts: wrong.map(f => `${f.kind} ${f.entity} ${f.date}`),
  };
}

/** Mean of per-case gaps with a 95% bootstrap interval (seeded, 2,000 resamples). */
export function meanGap(gaps: number[]) {
  let s = 99; const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const boots = Array.from({ length: 2000 }, () => mean(gaps.map(() => gaps[Math.floor(rnd() * gaps.length)]))).sort((a, b) => a - b);
  return { mean: mean(gaps), lo: boots[50], hi: boots[1949] };
}

export function summarize(rows: ReturnType<typeof scoreCase>[]) {
  const sum = (k: keyof (typeof rows)[0]) => rows.reduce((a, r) => a + (r[k] as number), 0);
  const shown = sum('shown');
  return {
    cases: rows.length, events: sum('events'), correct: sum('correct'), shown, unsupported: sum('unsupported'),
    unsupportedRate: shown ? sum('unsupported') / shown : 0,
    gapVs5q: meanGap(rows.map(r => r.correct - r.baseline5q)),
    gapVsKinder: meanGap(rows.map(r => r.correct - r.baselineKinder)),
  };
}
