import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Triumph, Group, RecordProgress } from '../data';
import { useLocale } from '../i18n';
import styles from './ProgressionModal.module.css';

// Per-player colors (CSS variables defined in App.css)
const PLAYER_COLORS = [
  'var(--u-p1)',
  'var(--u-p2)',
  'var(--u-p3)',
  'var(--u-p4)',
  'var(--u-p5)',
];

type Metric = 'cumul' | 'weekly';

interface WeekPoint {
  week: string; // YYYY-Www
  date: Date;
  counts: number[]; // per player
}

function isoWeek(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function weekStart(isoWeekStr: string): Date {
  const [year, wStr] = isoWeekStr.split('-W');
  const w = parseInt(wStr);
  const jan4 = new Date(parseInt(year), 0, 4);
  const dow = jan4.getDay() || 7;
  const monday = new Date(jan4.getTime() - (dow - 1) * 86400000 + (w - 1) * 7 * 86400000);
  return monday;
}

function niceMax(v: number): number {
  if (v === 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const nice = [1, 2, 5, 10];
  for (const n of nice) {
    if (n * mag >= v) return n * mag;
  }
  return Math.ceil(v / mag) * mag;
}

function buildSeries(
  players: readonly string[],
  progressDetail: Record<string, Record<string, RecordProgress>>,
  filterCat: string | null,
  triumphs: Triumph[],
  metric: Metric,
): WeekPoint[] {
  const filteredIds = filterCat
    ? new Set(triumphs.filter(t => t.cat === filterCat).map(t => t.id))
    : null;

  const weekMap = new Map<string, number[]>();

  players.forEach((player, pi) => {
    const recs = progressDetail[player] ?? {};
    Object.entries(recs).forEach(([id, rec]) => {
      if (!rec.completed || !rec.completedAt) return;
      if (filteredIds && !filteredIds.has(id)) return;
      const week = isoWeek(new Date(rec.completedAt));
      if (!weekMap.has(week)) weekMap.set(week, players.map(() => 0));
      weekMap.get(week)![pi]++;
    });
  });

  if (weekMap.size === 0) return [];

  const sorted = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  if (metric === 'weekly') {
    return sorted.map(([week, counts]) => ({ week, date: weekStart(week), counts }));
  }

  // Cumulative
  const cumul = players.map(() => 0);
  return sorted.map(([week, counts]) => {
    counts.forEach((c, i) => { cumul[i] += c; });
    return { week, date: weekStart(week), counts: [...cumul] };
  });
}

interface Props {
  open: boolean;
  onClose: () => void;
  players: readonly string[];
  triumphs: Triumph[];
  groups: Group[];
  progressDetail: Record<string, Record<string, RecordProgress>>;
}

const W = 600;
const H = 280;
const PAD = { top: 16, right: 24, bottom: 40, left: 48 };

export default function ProgressionModal({ open, onClose, players, triumphs, groups, progressDetail }: Props) {
  const { t } = useLocale();
  const [metric, setMetric] = useState<Metric>('cumul');
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; week: string; counts: number[] } | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const cats = useMemo(() => {
    const seen = new Set<string>();
    const result: { cat: string; catFr: string }[] = [];
    groups.forEach(g => {
      if (!seen.has(g.cat)) { seen.add(g.cat); result.push({ cat: g.cat, catFr: g.catFr }); }
    });
    return result;
  }, [groups]);

  const series = useMemo(
    () => buildSeries(players, progressDetail, filterCat, triumphs, metric),
    [players, progressDetail, filterCat, triumphs, metric]
  );

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

  // X-axis labels (show ~6 evenly spaced)
  const xLabels = useMemo(() => {
    if (series.length === 0) return [];
    const step = Math.max(1, Math.floor(series.length / 6));
    return series.filter((_, i) => i % step === 0 || i === series.length - 1).map((pt) => ({
      label: pt.date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      x: xScale(series.indexOf(pt)),
    }));
  }, [series, xScale]);

  // Y-axis ticks
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
    const mx = e.clientX - rect.left - PAD.left;
    const idx = Math.max(0, Math.min(series.length - 1, Math.round((mx / chartW) * (series.length - 1))));
    const pt = series[idx];
    setTooltip({ x: xScale(idx), y: PAD.top, week: pt.week, counts: pt.counts });
  }, [series, chartW, xScale]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{t.progressionTitle ?? 'Progression'}</span>
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
          <select
            className={styles.catFilter}
            value={filterCat ?? ''}
            onChange={e => setFilterCat(e.target.value || null)}
          >
            <option value="">Toutes catégories</option>
            {cats.map(c => <option key={c.cat} value={c.cat}>{c.catFr}</option>)}
          </select>
        </div>

        <div className={styles.legend}>
          {players.map((p, i) => (
            <span key={p} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
              {p}
            </span>
          ))}
        </div>

        <div className={styles.chartWrap} onMouseLeave={() => setTooltip(null)}>
          {series.length === 0 ? (
            <div className={styles.noData}>Aucune donnée de progression disponible</div>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className={styles.chart}
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
                  stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {/* Tooltip crosshair */}
              {tooltip && (
                <>
                  <line
                    x1={tooltip.x} x2={tooltip.x}
                    y1={PAD.top} y2={H - PAD.bottom}
                    className={styles.crosshair}
                  />
                  {tooltip.counts.map((c, i) => (
                    <circle
                      key={i}
                      cx={tooltip.x}
                      cy={yScale(c)}
                      r={4}
                      fill={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                      stroke="var(--surface)"
                      strokeWidth={1.5}
                    />
                  ))}
                  <foreignObject
                    x={Math.min(tooltip.x + 8, W - PAD.right - 130)}
                    y={PAD.top}
                    width={120}
                    height={players.length * 20 + 28}
                  >
                    <div className={styles.tip}>
                      <div className={styles.tipWeek}>{tooltip.week}</div>
                      {players.map((p, i) => (
                        <div key={p} className={styles.tipRow}>
                          <span className={styles.tipDot} style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
                          {p}: <strong>{tooltip.counts[i]}</strong>
                        </div>
                      ))}
                    </div>
                  </foreignObject>
                </>
              )}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
