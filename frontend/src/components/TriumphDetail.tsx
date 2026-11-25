import { useEffect, useState } from 'react';
import type { Triumph, Player, RecordProgress, RecordDetail, ObjectiveDetail, ObjectiveProgress } from '../data';
import type { Locale } from '../i18n';
import { useLocale } from '../i18n';
import { fetchRecordDetail } from '../api';
import styles from './TriumphDetail.module.css';

const BUNGIE_CDN = 'https://www.bungie.net';
const STYLE_CHECKBOX = 2;
const STYLE_PERCENTAGE = 3;

type DetailState = { data: RecordDetail | null; loading: boolean; error: boolean };

function useRecordDetail(id: string | null): DetailState {
  const [state, setState] = useState<DetailState>({ data: null, loading: !!id, error: false });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setState({ data: null, loading: true, error: false });
    fetchRecordDetail(id)
      .then(data => { if (alive) setState({ data, loading: false, error: false }); })
      .catch(() => { if (alive) setState({ data: null, loading: false, error: true }); });
    return () => { alive = false; };
  }, [id]);
  return state;
}

function localized(locale: Locale, en: string, fr: string, pt?: string): string {
  if (locale === 'fr') return fr || en;
  if (locale === 'pt') return pt || en;
  return en || fr;
}

/** Finds the player's progress for an objective: by hash when known, else by position. */
function progressAt(list: ObjectiveProgress[] | undefined, def: { hash?: number }, index: number): ObjectiveProgress | undefined {
  if (!list?.length) return undefined;
  if (def.hash !== undefined) {
    const byHash = list.find(o => o.hash === def.hash);
    if (byHash) return byHash;
    if (list.some(o => o.hash !== undefined)) return undefined;
  }
  return list[index];
}

function formatValue(current: number, total: number, style?: number): string | null {
  if (style === STYLE_CHECKBOX || (total <= 1 && style !== STYLE_PERCENTAGE)) return null;
  if (style === STYLE_PERCENTAGE) return `${Math.min(100, Math.round(current / (total || 1) * 100))}%`;
  return `${current.toLocaleString()}/${total.toLocaleString()}`;
}

interface Row { key: string; label: string; completionValue: number; style?: number; hash?: number }

interface ObjectivesProps {
  item: Triumph;
  players: readonly Player[];
  progressDetailFor?: (p: Player) => Record<string, RecordProgress>;
  progressFor: (p: Player) => Set<string>;
}

export function TriumphObjectives({ item, players, progressDetailFor, progressFor }: ObjectivesProps) {
  const { t, locale } = useLocale();
  const { data, loading } = useRecordDetail(item.id);

  const recordOf = (p: Player) => progressDetailFor?.(p)?.[item.id];

  const toRows = (defs: ObjectiveDetail[]): Row[] =>
    defs.map((o, i) => ({
      key: `${o.hash}-${i}`,
      hash: o.hash,
      label: localized(locale, o.descEn, o.descFr, o.descPt) || `${t.objective} ${i + 1}`,
      completionValue: o.completionValue,
      style: o.valueStyle,
    }));

  // Fallback when the definitions are unavailable (mock mode, API error):
  // derive unnamed rows from the players' progress data.
  const fallbackRows = (kind: 'objectives' | 'intervalObjectives'): Row[] => {
    const longest = players
      .map(p => recordOf(p)?.[kind] ?? [])
      .reduce<ObjectiveProgress[]>((a, b) => (b.length > a.length ? b : a), []);
    return longest.map((o, i) => ({
      key: `fb-${i}`,
      hash: o.hash,
      label: `${t.objective} ${i + 1}`,
      completionValue: o.completionValue,
    }));
  };

  const objectiveRows = data?.objectives.length ? toRows(data.objectives) : fallbackRows('objectives');
  const intervalRows = data?.intervals.length ? toRows(data.intervals) : fallbackRows('intervalObjectives');
  const rewards = data?.rewards ?? [];

  const renderRows = (rows: Row[], kind: 'objectives' | 'intervalObjectives') => (
    <ul className={styles.objList}>
      {rows.map((row, i) => (
        <li key={row.key} className={styles.obj}>
          <div className={styles.objLabel}>
            {row.label}
            {row.completionValue > 1 && row.style !== STYLE_CHECKBOX && (
              <span className={styles.objTarget}>{row.completionValue.toLocaleString()}</span>
            )}
          </div>
          <div className={styles.objPlayers}>
            {players.map(p => {
              const rec = recordOf(p);
              const prog = progressAt(rec?.[kind], row, i);
              const total = prog?.completionValue ?? row.completionValue;
              const recordDone = progressFor(p).has(item.id) || !!rec?.completed;
              const current = prog ? prog.current : (recordDone && kind === 'objectives' ? total : 0);
              const done = total > 0 ? current >= total : recordDone;
              const pct = total > 0 ? Math.min(100, Math.round(current / total * 100)) : (done ? 100 : 0);
              const value = formatValue(current, total, row.style);
              return (
                <div key={p} className={`${styles.objBar} ${done ? styles.objBarDone : ''}`}>
                  <span className={`${styles.check} ${done ? styles.checkDone : ''}`} aria-hidden="true" />
                  <span className={styles.objFill} style={{ width: `${pct}%` }} />
                  <span className={styles.objPlayer}>{p}</span>
                  <span className={styles.objValue} aria-label={`${p} — ${row.label} : ${done ? t.done : (value ?? t.todo)}`}>
                    {value ?? (done ? '✓' : '')}
                  </span>
                </div>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.objectives}>
      {loading && <div className={styles.muted}>{t.detailLoading}</div>}

      {objectiveRows.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>{t.objectives}</h3>
          {renderRows(objectiveRows, 'objectives')}
        </section>
      )}

      {intervalRows.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>{t.intervals}</h3>
          {renderRows(intervalRows, 'intervalObjectives')}
        </section>
      )}

      {!loading && objectiveRows.length === 0 && intervalRows.length === 0 && (
        <div className={styles.muted}>{t.detailUnavailable}</div>
      )}

      {rewards.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>{t.rewards}</h3>
          <ul className={styles.rewards}>
            {rewards.map(r => (
              <li key={r.hash} className={styles.reward}>
                {r.icon
                  ? <img src={`${BUNGIE_CDN}${r.icon}`} alt="" className={styles.rewardIcon} />
                  : <span className={styles.rewardIcon} />}
                <span>{localized(locale, r.nameEn, r.nameFr, r.namePt)}</span>
                {r.quantity > 1 && <span className={styles.rewardQty}>×{r.quantity}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

interface ModalProps extends ObjectivesProps {
  onClose: () => void;
}

export default function TriumphDetailModal({ item, onClose, ...rest }: ModalProps) {
  const { t, locale } = useLocale();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const name = localized(locale, item.en, item.fr, item.pt);
  const secondary = locale === 'fr' ? item.en : item.fr;
  const desc = localized(locale, item.descEn, item.descFr, item.descPt);
  const sg = locale === 'pt' ? (item.subGroupPt || item.subGroup) : locale === 'fr' ? item.subGroupFr : item.subGroup;
  const title = item.titleEn ? localized(locale, item.titleEn, item.titleFr ?? item.titleEn, item.titlePt) : null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={name}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.goldBar} />
        <div className={styles.head}>
          {item.icon && <img src={`${BUNGIE_CDN}${item.icon}`} alt="" className={styles.icon} />}
          <div className={styles.headText}>
            {sg && <div className={styles.eyebrow}>{sg}</div>}
            <h2 className={styles.title}>{name}</h2>
            {secondary && secondary !== name && <div className={styles.secondary}>{secondary}</div>}
            {title && <div className={styles.sealTitle}>« {title} »</div>}
          </div>
          <button className={styles.close} onClick={onClose} aria-label={t.close}>✕</button>
        </div>
        <div className={styles.body}>
          <p className={styles.desc}>{desc || t.descComingSoon}</p>
          <TriumphObjectives item={item} {...rest} />
        </div>
      </div>
    </div>
  );
}
