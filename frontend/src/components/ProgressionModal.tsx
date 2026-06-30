import { useState, useMemo, useCallback, useEffect, useRef, useId } from 'react';
import type { Section, ProgressSnapshot } from '../data';
import { useLocale } from '../i18n';
import { fetchSnapshots } from '../api';
import styles from './ProgressionModal.module.css';

const CHART_MAX_DAYS = 26 * 7;

// Map known player names to CSS variables, fall back to generic slots
const PLAYER_VAR: Record<string, string> = {
  Bibulle: '--u-bibulle',
  Vincent: '--u-vincent',
  Guiz: '--u-guiz',
};
const FALLBACK_VARS = ['--u-p1', '--u-p2', '--u-p3', '--u-p4', '--u-p5'];

function playerColor(name: string, idx: number): string {
  return `var(${PLAYER_VAR[name] ?? FALLBACK_VARS[idx % FALLBACK_VARS.length]})`;
}

type Metric = 'cumul' | 'weekly';

interface DataPoint {
  date: string;
  label: string;
  counts: number[];
}

let MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function weekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return `${monday.getUTCDate()} ${MONTHS[monday.getUTCMonth()]}`;
}

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function niceMax(v: number): number {
  if (v === 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const n of [1, 2, 5, 10]) {
    if (n * mag >= v) return n * mag;
  }
  return Math.ceil(v / mag) * mag;
}

function buildSeries(
  players: readonly string[],
  snapshots: ProgressSnapshot[],
  filterSection: string | null,
  metric: Metric,
): DataPoint[] {
  const level0 = snapshots.filter(s => s.level === 0 && (filterSection === null || s.nodeKey === filterSection));

  const nowDate = toDateStr(new Date());
  const minDate = toDateStr(addDays(new Date(), -(CHART_MAX_DAYS - 1)));
  const firstDate = level0.length > 0
    ? level0.reduce((min, s) => s.date < min ? s.date : min, level0[0].date)
    : nowDate;
  const startDate = firstDate > minDate ? firstDate : minDate;

  // Build day keys: one entry per day from startDate to today
  const dayKeys: string[] = [];
  for (let d = new Date(startDate + 'T00:00:00Z'); toDateStr(d) <= nowDate; d = addDays(d, 1)) {
    dayKeys.push(toDateStr(d));
  }
  if (dayKeys.length === 0) dayKeys.push(nowDate);

  // Per-player cumulative counts per day (carry forward last known)
  const dayMap = new Map<string, number[]>();
  dayKeys.forEach(d => dayMap.set(d, players.map(() => 0)));

  for (const player of players) {
    const pi = players.indexOf(player);
    const playerSnaps = level0.filter(s => s.player === player);
    const nodeKeys = [...new Set(playerSnaps.map(s => s.nodeKey))];

    for (const nodeKey of nodeKeys) {
      const byDate = playerSnaps
        .filter(s => s.nodeKey === nodeKey)
        .sort((a, b) => a.date.localeCompare(b.date));

      let snapIdx = 0;
      let lastCount = 0;
      for (const day of dayKeys) {
        while (snapIdx < byDate.length && byDate[snapIdx].date <= day) {
          lastCount = byDate[snapIdx].count;
          snapIdx++;
        }
        dayMap.get(day)![pi] += lastCount;
      }
    }
  }

  // Choose label granularity based on span
  const spanDays = dayKeys.length;
  const getLabelFn = spanDays <= 14 ? dayLabel : spanDays <= 90 ? weekLabel : monthLabel;

  const cumulPoints: DataPoint[] = dayKeys.map(d => ({
    date: d,
    label: getLabelFn(d),
    counts: dayMap.get(d)!,
  }));

  if (metric === 'cumul') return cumulPoints;

  // Weekly delta: diff from 7 days prior
  return cumulPoints.map((pt, i) => {
    const prev7 = i >= 7 ? cumulPoints[i - 7].counts : players.map(() => 0);
    return {
      date: pt.date,
      label: pt.label,
      counts: pt.counts.map((c, pi) => Math.max(0, c - prev7[pi])),
    };
  });
}

// Custom dropdown for section filtering
interface SectionDropdownProps {
  sections: Section[];
  value: string | null;
  onChange: (v: string | null) => void;
  t: { sections: Record<string, string>; allSections: string };
}

function SectionDropdown({ sections, value, onChange, t }: SectionDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const label = value ? (t.sections[value] ?? value) : t.allSections;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const select = (v: string | null) => { onChange(v); setOpen(false); };

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        className={styles.ddTrigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span className={styles.ddVal}>{label}</span>
        <span className={`${styles.ddCaret} ${open ? styles.ddCaretOpen : ''}`}>▾</span>
      </button>
      {open && (
        <ul className={styles.ddMenu} role="listbox" id={id}>
          {[{ id: '', label: t.allSections }, ...sections.map(s => ({ id: s.id, label: t.sections[s.id] ?? s.label }))].map(s => {
            const active = (s.id === '' ? null : s.id) === value;
            return (
              <li key={s.id} role="option" aria-selected={active}>
                <button
                  className={`${styles.ddOpt} ${active ? styles.ddOptActive : ''}`}
                  onClick={() => select(s.id === '' ? null : s.id)}
                  type="button"
                >
                  <span className={styles.ddTick}>◆</span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  players: readonly string[];
  sections: Section[];
}

const W = 700;
const H = 260;
const PAD = { top: 16, right: 24, bottom: 36, left: 44 };

export default function ProgressionModal({ open, onClose, players, sections }: Props) {
  const { t } = useLocale();
  MONTHS = t.months;
  const [metric, setMetric] = useState<Metric>('cumul');
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<ProgressSnapshot[]>([]);
  const chartRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetchSnapshots().then(setSnapshots).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const series = useMemo(
    () => buildSeries(players, snapshots, filterSection, metric),
    [players, snapshots, filterSection, metric]
  );

  // Totals per player (last cumulative value)
  const totals = useMemo(() => {
    const cumulSeries = buildSeries(players, snapshots, filterSection, 'cumul');
    const last = cumulSeries[cumulSeries.length - 1];
    return last ? last.counts : players.map(() => 0);
  }, [players, snapshots, filterSection]);

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = useMemo(() => {
    const m = series.reduce((acc, pt) => Math.max(acc, ...pt.counts), 0);
    return niceMax(m);
  }, [series]);

  const xScale = useCallback((i: number) =>
    series.length < 2 ? PAD.left + chartW / 2 : PAD.left + (i / (series.length - 1)) * chartW,
    [series.length, chartW]
  );
  const yScale = useCallback((v: number) =>
    PAD.top + chartH - (v / maxVal) * chartH,
    [chartH, maxVal]
  );

  const paths = useMemo(() =>
    players.map((_, pi) => {
      if (series.length === 0) return '';
      return series.map((pt, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(pt.counts[pi]).toFixed(1)}`).join(' ');
    }),
    [players, series, xScale, yScale]
  );

  // X-axis labels: deduplicate consecutive identical labels, show ~6
  const xLabels = useMemo(() => {
    if (series.length === 0) return [];
    const step = Math.max(1, Math.floor(series.length / 6));
    const seen = new Set<string>();
    return series
      .map((pt, i) => ({ pt, i }))
      .filter(({ i }) => i % step === 0 || i === series.length - 1)
      .filter(({ pt }) => { if (seen.has(pt.label)) return false; seen.add(pt.label); return true; })
      .map(({ pt, i }) => ({ label: pt.label, x: xScale(i) }));
  }, [series, xScale]);

  const yTicks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, i) => ({
      v: Math.round((maxVal / count) * i),
      y: yScale(Math.round((maxVal / count) * i)),
    }));
  }, [maxVal, yScale]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (series.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const mx = svgX - PAD.left;
    const idx = Math.max(0, Math.min(series.length - 1, Math.round((mx / chartW) * (series.length - 1))));
    setHoverIdx(idx);
  }, [series.length, chartW]);

  const tipPos = useMemo(() => {
    if (hoverIdx === null || !chartRef.current || !wrapRef.current) return null;
    const svgRect = chartRef.current.getBoundingClientRect();
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const svgScale = svgRect.width / W;
    const x = PAD.left + (series.length < 2 ? chartW / 2 : (hoverIdx / (series.length - 1)) * chartW);
    return {
      x: svgRect.left - wrapRect.left + x * svgScale,
      y: svgRect.top - wrapRect.top + PAD.top * svgScale,
    };
  }, [hoverIdx, series.length, chartW]);

  const hoverPt = hoverIdx !== null ? series[hoverIdx] : null;

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.goldBar} />

        <div className={styles.head}>
          <div>
            <div className={styles.eyebrow}>{t.progression}</div>
            <h2 className={styles.title}>{t.progressionTitle}</h2>
          </div>
          <button className={styles.close} onClick={onClose} aria-label={t.close}>✕</button>
        </div>

        <div className={styles.controls}>
          <div className={styles.segment}>
            <button
              className={`${styles.segBtn} ${metric === 'cumul' ? styles.segActive : ''}`}
              onClick={() => setMetric('cumul')}
            >{t.cumulative}</button>
            <button
              className={`${styles.segBtn} ${metric === 'weekly' ? styles.segActive : ''}`}
              onClick={() => setMetric('weekly')}
            >{t.weekly}</button>
          </div>
          <SectionDropdown sections={sections} value={filterSection} onChange={setFilterSection} t={t} />

          <div className={styles.legend}>
            {players.map((p, i) => (
              <span key={p} className={styles.legendItem}>
                <span className={styles.legendSw} style={{ background: playerColor(p, i) }} />
                <span className={styles.legendName}>{p}</span>
                <strong className={styles.legendTotal}>{totals[i]}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className={styles.chartWrap} ref={wrapRef} onMouseLeave={() => setHoverIdx(null)}>
          {series.length === 0 ? (
            <div className={styles.noData}>{t.noProgressData}</div>
          ) : (
            <svg
              ref={chartRef}
              viewBox={`0 0 ${W} ${H}`}
              className={`${styles.chart} ${hoverIdx !== null ? styles.showHover : ''}`}
              onMouseMove={handleMouseMove}
            >
              {yTicks.map(tick => (
                <g key={tick.v}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={tick.y} y2={tick.y} className={styles.gridLine} />
                  <text x={PAD.left - 6} y={tick.y + 4} className={styles.axisLabel} textAnchor="end">{tick.v}</text>
                </g>
              ))}

              {xLabels.map(({ label, x }, i) => (
                <text key={i} x={x} y={H - PAD.bottom + 14} className={styles.axisLabel} textAnchor="middle">{label}</text>
              ))}

              {paths.map((d, i) => d && (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={playerColor(players[i], i)}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {hoverIdx !== null && (
                <line
                  className={styles.guide}
                  x1={xScale(hoverIdx)} x2={xScale(hoverIdx)}
                  y1={PAD.top} y2={H - PAD.bottom}
                />
              )}

              {hoverIdx !== null && hoverPt && players.map((p, i) => (
                <circle
                  key={i}
                  className={styles.hdot}
                  cx={xScale(hoverIdx)}
                  cy={yScale(hoverPt.counts[i])}
                  r={4}
                  fill={playerColor(p, i)}
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                />
              ))}
            </svg>
          )}

          {tipPos && hoverPt && (
            <div
              className={styles.tip}
              style={{ left: tipPos.x, top: tipPos.y }}
            >
              <div className={styles.tipWeek}>{hoverPt.date}</div>
              {players.map((p, i) => (
                <div key={p} className={styles.tipRow}>
                  <span className={styles.tipSw} style={{ background: playerColor(p, i) }} />
                  <span className={styles.tipName}>{p}</span>
                  <strong className={styles.tipVal}>{hoverPt.counts[i]}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
