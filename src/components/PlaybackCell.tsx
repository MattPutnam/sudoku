import cx from 'classnames';
import { useAnimateOnChange, Easings } from 're-animate-js';

import styles from './PlaybackCell.module.css';
import type { Cell } from '../types';

interface PlaybackCellProps {
  cell: Cell;
  isReason: boolean;
  isAffected: boolean;
  isElimination: boolean;
  eliminatedCandidates: number[];
  className?: string;
}

const CANDIDATES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function AnimatedCandidate({
  digit,
  present,
  isEliminating,
}: {
  digit: number;
  present: boolean;
  isEliminating: boolean;
}) {
  const { animatedValue: opacity } = useAnimateOnChange(present ? 1 : 0, {
    durationMs: 300,
    easingFunction: Easings.sine.out,
  });

  return (
    <span
      className={cx(styles.candidate, isEliminating && styles.eliminating)}
      style={{ opacity }}
    >
      {digit}
    </span>
  );
}

export default function PlaybackCell({
  cell,
  isReason,
  isAffected,
  isElimination,
  eliminatedCandidates,
  className,
}: PlaybackCellProps) {
  const { animatedValue: scale } = useAnimateOnChange(
    cell.value !== null ? 1 : 0,
    { durationMs: 400, easingFunction: Easings.back.out },
  );
  const { animatedValue: valueOpacity } = useAnimateOnChange(
    cell.value !== null ? 1 : 0,
    { durationMs: 400, easingFunction: Easings.back.out },
  );

  const cellClasses = cx(
    styles.cell,
    isReason && styles.reason,
    isAffected && !isElimination && styles.affected,
    isAffected && isElimination && styles.affectedElimination,
    cell.isGiven && styles.given,
    className,
  );

  const eliminatedSet = new Set(eliminatedCandidates);

  return (
    <div className={cellClasses}>
      {cell.value !== null ? (
        <span
          className={styles.value}
          style={{ transform: `scale(${scale})`, opacity: valueOpacity }}
        >
          {cell.value}
        </span>
      ) : (
        <div className={styles.candidateGrid}>
          {CANDIDATES.map((d) => (
            <AnimatedCandidate
              key={d}
              digit={d}
              present={cell.candidates.has(d)}
              isEliminating={eliminatedSet.has(d)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
