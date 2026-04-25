import { setCellValue, eliminateCandidates } from '../board';
import type { Board, SolveStep } from '../types';

export function buildSnapshots(initialBoard: Board, steps: SolveStep[]): Board[] {
  const snapshots: Board[] = [initialBoard];
  let current = initialBoard;

  for (const step of steps) {
    if (step.valuePlaced !== null) {
      current = setCellValue(current, step.valuePlaced.position, step.valuePlaced.value);
    } else if (step.candidatesEliminated.size > 0) {
      current = eliminateCandidates(current, step.candidatesEliminated);
    }
    snapshots.push(current);
  }

  return snapshots;
}
