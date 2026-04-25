import { useMemo } from 'react';
import type { Board, SolveStep } from '../types';
import PlaybackCell from './PlaybackCell';
import styles from './PlaybackGrid.module.css';

interface PlaybackGridProps {
  board: Board;
  currentStep: SolveStep | null;
}

export default function PlaybackGrid({ board, currentStep }: PlaybackGridProps) {
  const { reasonSet, affectedSet, eliminatedMap, placementKey } = useMemo(() => {
    if (!currentStep) {
      return {
        reasonSet: new Set<string>(),
        affectedSet: new Set<string>(),
        eliminatedMap: new Map<string, number[]>(),
        placementKey: null as string | null,
      };
    }
    const rSet = new Set(currentStep.reasonCells.map((p) => `${p.row},${p.col}`));
    const aSet = new Set(currentStep.cellsAffected.map((p) => `${p.row},${p.col}`));
    const pKey = currentStep.valuePlaced
      ? `${currentStep.valuePlaced.position.row},${currentStep.valuePlaced.position.col}`
      : null;
    return {
      reasonSet: rSet,
      affectedSet: aSet,
      eliminatedMap: currentStep.candidatesEliminated,
      placementKey: pKey,
    };
  }, [currentStep]);

  return (
    <div className={styles.grid}>
      {board.cells.flatMap((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          const isReason = reasonSet.has(key);
          const isAffected = affectedSet.has(key);
          const isElimination = isAffected && key !== placementKey;
          const eliminatedCandidates = eliminatedMap.get(key) ?? [];

          const boxClasses = [
            c % 3 === 0 && c !== 0 ? styles.boxLeft : '',
            r % 3 === 0 && r !== 0 ? styles.boxTop : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <PlaybackCell
              key={key}
              cell={cell}
              isReason={isReason}
              isAffected={isAffected}
              isElimination={isElimination}
              eliminatedCandidates={eliminatedCandidates}
              className={boxClasses || undefined}
            />
          );
        }),
      )}
    </div>
  );
}
