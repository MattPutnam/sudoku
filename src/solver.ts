import type { Board, SolveStep, SolveResult, Strategy } from './types';
import { setCellValue, eliminateCandidates } from './board';
import { nakedSingles } from './strategies/nakedSingles';
import { hiddenSingles } from './strategies/hiddenSingles';

const MAX_ITERATIONS = 1000;

const strategies: Strategy[] = [nakedSingles, hiddenSingles];

export function solve(board: Board): SolveResult {
  const steps: SolveStep[] = [];
  let currentBoard = board;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let advanced = false;

    for (const strategy of strategies) {
      const step = strategy(currentBoard);
      if (step !== null) {
        if (step.valuePlaced !== null) {
          currentBoard = setCellValue(
            currentBoard,
            step.valuePlaced.position,
            step.valuePlaced.value,
          );
        } else if (step.candidatesEliminated.size > 0) {
          currentBoard = eliminateCandidates(currentBoard, step.candidatesEliminated);
        }
        steps.push(step);
        advanced = true;
        break;
      }
    }

    if (!advanced) break;
  }

  const complete = currentBoard.cells.every((row) =>
    row.every((cell) => cell.value !== null),
  );

  return { steps, board: currentBoard, complete };
}
