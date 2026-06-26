import { useEffect, useRef } from 'react';
import type { PrioLevel, GlobalPrio, FlagKey } from '../data';
import styles from './CellEditor.module.css';

const PRIO_LABELS: Record<PrioLevel, string> = { 0: 'Aucune', 1: 'Basse', 2: 'Moyenne', 4: 'Haute' };
const FLAG_LABELS: Record<FlagKey | '', string> = { need: 'Besoin des autres', solo: 'Faisable seul', abandon: 'Abandonné', '': 'Aucun' };

function IconNeed() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="6" r="2"/><circle cx="10.8" cy="6.8" r="1.7"/><path d="M2 13c0-1.9 1.5-3 3.5-3s3.5 1.1 3.5 3"/><path d="M9.5 12.6c.1-1.5 1.1-2.3 2.6-2.3 1.4 0 2.4.8 2.4 2.3"/></svg>;
}
function IconSolo() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5.5" r="2.5"/><path d="M3.5 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"/></svg>;
}
function IconAbandon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="5.2"/><path d="M4.6 4.6 11.4 11.4"/></svg>;
}
function IconNone() {
  return <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>;
}

export function FlagIcon({ flagKey }: { flagKey: FlagKey | null }) {
  const cls = `${styles.flagIco} ${flagKey ? styles[`flag_${flagKey}`] : styles.flagNone}`;
  return (
    <span className={cls}>
      {flagKey === 'need' ? <IconNeed /> : flagKey === 'solo' ? <IconSolo /> : flagKey === 'abandon' ? <IconAbandon /> : <IconNone />}
    </span>
  );
}

export function PrioMeter({ level, extraClass, title }: { level: PrioLevel | GlobalPrio; extraClass?: string; title?: string }) {
  return (
    <span className={`${styles.prioMeter} ${extraClass ?? ''}`} data-level={level} title={title}>
      <i className={styles.pip} />
      <i className={styles.pip} />
      <i className={styles.pip} />
    </span>
  );
}

interface Props {
  player: string;
  triumphName: string;
  prio: PrioLevel;
  flag: FlagKey | null;
  anchor: DOMRect;
  onPrioChange: (v: PrioLevel) => void;
  onFlagChange: (v: FlagKey | null) => void;
  onClose: () => void;
}

export default function CellEditor({ player, triumphName, prio, flag, anchor, onPrioChange, onFlagChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouse);
    };
  }, [onClose]);

  // Position: centered below anchor, flip up if needed
  const editorW = 236;
  const editorH = 280; // approximate
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - editorW / 2, vw - editorW - 8));
  let top = anchor.bottom + 8 + editorH > vh - 8 ? anchor.top - editorH - 8 : anchor.bottom + 8;
  top = Math.max(8, top);

  const prioLevels: PrioLevel[] = [4, 2, 1, 0];
  const flagKeys: (FlagKey | '')[] = ['need', 'solo', 'abandon', ''];

  return (
    <div
      ref={ref}
      className={styles.editor}
      style={{ left, top }}
      onClick={e => e.stopPropagation()}
    >
      <div className={styles.head}>
        <span className={styles.who}>{player}</span>
        <span className={styles.item}>{triumphName}</span>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Priorité</div>
        <div className={styles.seg}>
          {prioLevels.map(lvl => (
            <button
              key={lvl}
              type="button"
              className={`${styles.segBtn} ${prio === lvl ? styles.active : ''}`}
              onClick={() => onPrioChange(lvl)}
            >
              <span className={`${styles.dot}`} data-level={lvl} />
              {PRIO_LABELS[lvl]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Statut personnel</div>
        <div className={styles.seg}>
          {flagKeys.map(k => (
            <button
              key={k}
              type="button"
              className={`${styles.segBtn} ${(flag ?? '') === k ? styles.active : ''}`}
              onClick={() => onFlagChange(k === '' ? null : k as FlagKey)}
            >
              <FlagIcon flagKey={k === '' ? null : k as FlagKey} />
              {FLAG_LABELS[k]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
