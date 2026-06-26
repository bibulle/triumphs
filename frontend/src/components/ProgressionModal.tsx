import { useState, useMemo, useCallback, useEffect, useRef, useId } from 'react';
import type { Section, ProgressSnapshot } from '../data';
import { useLocale } from '../i18n';
import { fetchSnapshots } from '../api';
import styles from './ProgressionModal.module.css';

const CHART_WEEKS = 26;

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

interface WeekPoint {
  label: string; // "Sww YYYY"
  counts: number[];
}

function isoWeek(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function weekLabel(isoWeekStr: string): string {
  const [year, wStr] = isoWeekStr.split('-W');
  return `S${wStr} ${year}`;
}

function dateToWeek(date: string): string {
  return isoWeek(new Date(date));
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
): WeekPoint[] {
  // Filter: level 0 snapshots for a specific section, or aggregate level 0 across all sections
  const level0 = snapshots.filter(s => s.level === 0 && (filterSection === null || s.nodeKey === filterSection));

  // Build week range: from first snapshot date to today, capped at CHART_WEEKS
  const now = new Date();
  const firstDate = level0.length > 0
    ? level0.reduce((min, s) => s.date < min ? s.date : min, level0[0].date)
    : null;
  const firstWeek = firstDate ? isoWeek(new Date(firstDate)) : isoWeek(new Date(now.getTime() - (CHART_WEEKS - 1) * 7 * 86400000));
  const nowWeek = isoWeek(now);
  const weekKeys: string[] = [];
  {
    const d = new Date(now.getTime() - (CHART_WEEKS - 1) * 7 * 86400000);
    while (true) {
      const w = isoWeek(d);
      if (w >= firstWeek) weekKeys.push(w);
      if (w >= nowWeek) break;
      d.setDate(d.getDate() + 7);
    }
  }
  if (weekKeys.length === 0) weekKeys.push(nowWeek);
  const weekSet = new Set(weekKeys);

  // Build per-player weekly counts map: week -> player idx -> count delta
  // Snapshots store cumulative counts per date. We need to find the latest snapshot per
  // (player, nodeKey) per week and sum across nodeKeys.
  const weekMap = new Map<string, number[]>();
  weekKeys.forEach(w => weekMap.set(w, players.map(() => 0)));

  for (const player of players) {
    const pi = players.indexOf(player);
    const playerSnaps = level0.filter(s => s.player === player);

    // Group by nodeKey, get value per week (carry forward last known)
    const nodeKeys = [...new Set(playerSnaps.map(s => s.nodeKey))];
    for (const nodeKey of nodeKeys) {
      const byDate = playerSnaps
        .filter(s => s.nodeKey === nodeKey)
        .sort((a, b) => a.date.localeCompare(b.date));

      // For each week, find the last snapshot on or before that week's last day
      let snapIdx = 0;
      let lastCount = 0;
      for (const week of weekKeys) {
        const weekStr = week;
        while (snapIdx < byDate.length && dateToWeek(byDate[snapIdx].date) <= weekStr) {
          lastCount = byDate[snapIdx].count;
          snapIdx++;
        }
        weekMap.get(week)![pi] += lastCount;
      }
    }
  }

  const sorted = weekKeys.map(w => ({ week: w, counts: weekMap.get(w)! }))
    .filter(({ week }) => weekSet.has(week));

  if (metric === 'cumul') {
    return sorted.map(({ week, counts }) => ({ label: weekLabel(week), counts }));
  }

  // Weekly delta: compute diff from previous week
  return sorted.map(({ week, counts }, i) => {
    const prev = i > 0 ? sorted[i - 1].counts : players.map(() => 0);
    return {
      label: weekLabel(week),
      counts: counts.map((c, pi) => Math.max(0, c - prev[pi])),
    };
  });
}

// Custom dropdown for section filtering
interface SectionDropdownProps {
  sections: Section[];
  value: string | null;
  onChange: (v: string | null) => void;
  t: { sections: Record<string, string> };
}

function SectionDropdown({ sections, value, onChange, t }: SectionDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const label = value ? (t.sections[value] ?? value) : 'Toutes sections';

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
          {[{ id: '', label: 'Toutes sections' }, ...sections.map(s => ({ id: s.id, label: t.sections[s.id] ?? s.label }))].map(s => {
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

  // Totals per player (cumulative max for legend)
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

  // X-axis labels: show ~6 evenly spaced
  const xLabels = useMemo(() => {
    if (series.length === 0) return [];
    const step = Math.max(1, Math.floor(series.length / 6));
    return series
      .map((pt, i) => ({ pt, i }))
      .filter(({ i }) => i % step === 0 || i === series.length - 1)
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

  // Compute tooltip position in px relative to chartWrap
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
        {/* Gold top border */}
        <div className={styles.goldBar} />

        <div className={styles.head}>
          <div>
            <div className={styles.eyebrow}>Progression</div>
            <h2 className={styles.title}>{t.progressionTitle ?? 'Triomphes dans le temps'}</h2>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className={styles.controls}>
          <div className={styles.segment}>
            <button
              className={`${styles.segBtn} ${metric === 'cumul' ? styles.segActive : ''}`}
              onClick={() => setMetric('cumul')}
            >Cumulé</button>
            <button
              className={`${styles.segBtn} ${metric === 'weekly' ? styles.segActive : ''}`}
              onClick={() => setMetric('weekly')}
            >Hebdo</button>
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
            <div className={styles.noData}>Aucune donnée de progression disponible</div>
          ) : (
            <svg
              ref={chartRef}
              viewBox={`0 0 ${W} ${H}`}
              className={`${styles.chart} ${hoverIdx !== null ? styles.showHover : ''}`}
              onMouseMove={handleMouseMove}
            >
              {/* Grid lines */}
              {yTicks.map(tick => (
                <g key={tick.v}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={tick.y} y2={tick.y} className={styles.gridLine} />
                  <text x={PAD.left - 6} y={tick.y + 4} className={styles.axisLabel} textAnchor="end">{tick.v}</text>
                </g>
              ))}

              {/* X-axis labels */}
              {xLabels.map(({ label, x }, i) => (
                <text key={i} x={x} y={H - PAD.bottom + 14} className={styles.axisLabel} textAnchor="middle">{label}</text>
              ))}

              {/* Lines */}
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

              {/* Hover guide line */}
              {hoverIdx !== null && (
                <line
                  className={styles.guide}
                  x1={xScale(hoverIdx)} x2={xScale(hoverIdx)}
                  y1={PAD.top} y2={H - PAD.bottom}
                />
              )}

              {/* Hover dots */}
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

          {/* Tooltip */}
          {tipPos && hoverPt && (
            <div
              className={styles.tip}
              style={{ left: tipPos.x, top: tipPos.y }}
            >
              <div className={styles.tipWeek}>{hoverPt.label}</div>
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
