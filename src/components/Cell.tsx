import cx from 'classnames';

import styles from './Cell.module.css';
import type { Cell as CellType } from '../types';

interface CellProps {
  cell: CellType;
  isSelected: boolean;
  isConflict: boolean;
  className?: string;
  onClick: () => void;
}

export function Cell({ cell, isSelected, isConflict, className, onClick }: CellProps) {
  const classNames = cx(
    styles.cell,
    isSelected && styles.selected,
    isConflict && styles.conflict,
    cell.isGiven && styles.given,
    className,
  );

  return (
    <div className={classNames} tabIndex={-1} onClick={onClick}>
      {cell.value !== null ? (
        <span className={styles.value}>{cell.value}</span>
      ) : (
        <div className={styles.candidateGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className={
                cell.candidates.has(n)
                  ? styles.candidate
                  : styles.candidateHidden
              }
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
