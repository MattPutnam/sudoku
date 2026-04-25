import { eliminateCandidates, setCellValue } from './board';
import { alsXYWing } from './strategies/alsXYWing';
import { alsXZ } from './strategies/alsXZ';
import { claiming } from './strategies/claiming';
import { xWing, swordfish, jellyfish } from './strategies/fish';
import { forcingChains } from './strategies/forcingChains';
import { hiddenPairs } from './strategies/hiddenPairs';
import { hiddenQuads } from './strategies/hiddenQuads';
import { hiddenSingles } from './strategies/hiddenSingles';
import { hiddenTriples } from './strategies/hiddenTriples';
import { nakedPairs } from './strategies/nakedPairs';
import { nakedQuads } from './strategies/nakedQuads';
import { nakedSingles } from './strategies/nakedSingles';
import { nakedTriples } from './strategies/nakedTriples';
import { pointingPairs } from './strategies/pointingPairs';
import { simpleColoring } from './strategies/simpleColoring';
import { skyscraper } from './strategies/skyscraper';
import { twoStringKite } from './strategies/twoStringKite';
import { uniqueRectangle } from './strategies/uniqueRectangles';
import { wWing } from './strategies/wWing';
import { xChains } from './strategies/xChains';
import { xyChains } from './strategies/xyChains';
import { xyWing } from './strategies/xyWing';
import { xyzWing } from './strategies/xyzWing';
import type { Board, SolveResult, SolveStep, Strategy } from './types';

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
  alsXZ,
  alsXYWing,
  forcingChains,
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
