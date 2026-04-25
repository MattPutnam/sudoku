import type { Board, SolveStep, SolveResult, Strategy } from './types';
import { setCellValue, eliminateCandidates } from './board';
import { nakedSingles } from './strategies/nakedSingles';
import { hiddenSingles } from './strategies/hiddenSingles';
import { pointingPairs } from './strategies/pointingPairs';
import { claiming } from './strategies/claiming';
import { nakedPairs } from './strategies/nakedPairs';
import { hiddenPairs } from './strategies/hiddenPairs';
import { nakedTriples } from './strategies/nakedTriples';
import { hiddenTriples } from './strategies/hiddenTriples';
import { nakedQuads } from './strategies/nakedQuads';
import { hiddenQuads } from './strategies/hiddenQuads';
import { xWing, swordfish, jellyfish } from './strategies/fish';
import { skyscraper } from './strategies/skyscraper';
import { twoStringKite } from './strategies/twoStringKite';
import { xyWing } from './strategies/xyWing';
import { xyzWing } from './strategies/xyzWing';
import { wWing } from './strategies/wWing';
import { uniqueRectangle } from './strategies/uniqueRectangles';
import { simpleColoring } from './strategies/simpleColoring';
import { xChains } from './strategies/xChains';
import { xyChains } from './strategies/xyChains';

const MAX_ITERATIONS = 1000;

const strategies: Strategy[] = [
  nakedSingles,
  hiddenSingles,
  pointingPairs,
  claiming,
  nakedPairs,
  hiddenPairs,
  nakedTriples,
  hiddenTriples,
  nakedQuads,
  hiddenQuads,
  xWing,
  swordfish,
  jellyfish,
  skyscraper,
  twoStringKite,
  xyWing,
  xyzWing,
  wWing,
  uniqueRectangle,
  simpleColoring,
  xChains,
  xyChains,
];

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
