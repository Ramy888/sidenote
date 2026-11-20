// The timeline chart (decorative: aria-hidden; the answers say the same in words). Time runs left to right in
// both languages (DESIGN.md Languages). Medicine bars in ink; symptom marks: filled = started or back, hollow = gone.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n.ts';
import type { Reviewed } from '../app/review.ts';

const PAD = 24, DAY = 86_400_000;

export function TimelineChart({ facts }: { facts: Reviewed[] }) {
  const { t, date } = useI18n();
  // Draw at the card's real width, so labels stay readable on phones (no scaled-down desktop drawing).
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  if (!facts.length) return null;
  const ds = facts.map(f => Date.parse(f.date));
  const lo = Math.min(...ds) - 3 * DAY, hi = Math.max(...ds) + 3 * DAY;
  const x = (d: string) => PAD + ((Date.parse(d) - lo) / (hi - lo)) * (W - 2 * PAD);
  const meds = [...new Set(facts.filter(f => f.kind.startsWith('medicine')).map(f => f.entity))];
  const syms = [...new Set(facts.filter(f => f.kind.startsWith('symptom')).map(f => f.entity))];
  const rows = [...meds, ...syms];
  const H = 40 + rows.length * 44;
  const end = new Date(hi).toISOString().slice(0, 10);

  const bars = (m: string) => {
    const ev = facts.filter(f => f.entity === m).sort((a, b) => a.date.localeCompare(b.date));
    const out: [string, string][] = []; let on: string | null = null;
    for (const f of ev) {
      if (f.kind === 'medicine_started' || f.kind === 'medicine_restarted') on ??= f.date;
      if (f.kind === 'medicine_stopped' && on) { out.push([on, f.date]); on = null; }
    }
    if (on) out.push([on, end]);
    return out;
  };

  return (
    <figure className="chart card" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" preserveAspectRatio="xMinYMin meet">
        {rows.map((r, i) => {
          const y = 34 + i * 44;
          return (
            <g key={r}>
              <text x={PAD} y={y - 10} className="chart-label">{r}</text>
              {meds.includes(r)
                ? bars(r).map(([a, b]) => <rect key={a} x={x(a)} y={y - 5} width={Math.max(3, x(b) - x(a))} height="10" rx="2" className="chart-bar" />)
                : facts.filter(f => f.entity === r).map(f => <circle key={f.id} cx={x(f.date)} cy={y} r="6" className={f.kind === 'symptom_gone' ? 'chart-gone' : 'chart-on'} />)}
            </g>
          );
        })}
        <line x1={PAD} x2={W - PAD} y1={H - 22} y2={H - 22} className="chart-axis" />
        <text x={PAD} y={H - 6} className="chart-tick">{date(new Date(lo).toISOString())}</text>
        <text x={W - PAD} y={H - 6} textAnchor="end" className="chart-tick">{date(end)}</text>
      </svg>
      <figcaption className="sr-only">{t('chartSummary')}</figcaption>
    </figure>
  );
}
