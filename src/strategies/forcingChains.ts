import { clone, eliminateCandidates, setCellValue, getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy } from '../types';
import { aic } from './aic';
import { alsXYWing } from './alsXYWing';
import { alsXZ } from './alsXZ';
import { claiming } from './claiming';
import { finnedXWing, finnedSwordfish } from './finnedFish';
import { xWing, swordfish } from './fish';
import { hiddenPairs } from './hiddenPairs';
import { hiddenSingles } from './hiddenSingles';
import { hiddenTriples } from './hiddenTriples';
import { nakedPairs } from './nakedPairs';
import { nakedSingles } from './nakedSingles';
import { nakedTriples } from './nakedTriples';
import { pointingPairs } from './pointingPairs';
import { simpleColoring } from './simpleColoring';
import { skyscraper } from './skyscraper';
import { sueDeCoq } from './sueDeCoq';
import { twoStringKite } from './twoStringKite';
import { wWing } from './wWing';
import { xChains } from './xChains';
import { xyChains } from './xyChains';
import { xyWing } from './xyWing';
import { xyzWing } from './xyzWing';
import { coordsToDisplay } from '../utils/cellPosition';

const MAX_PROPAGATION = 200;
const MAX_CANDIDATE_SIZE = 5;
const MAX_DEPTH = 2;
const TIMEOUT_MS = 15000;

const fullStrategies: Strategy[] = [
  nakedSingles,
  hiddenSingles,
  pointingPairs,
  claiming,
  nakedPairs,
  hiddenPairs,
  nakedTriples,
  hiddenTriples,
  xWing,
  swordfish,
  finnedXWing,
  finnedSwordfish,
  skyscraper,
  twoStringKite,
  xyWing,
  xyzWing,
  wWing,
  simpleColoring,
  xChains,
  xyChains,
  alsXZ,
  alsXYWing,
  sueDeCoq,
  aic,
];

const lightStrategies: Strategy[] = [
  nakedSingles,
  hiddenSingles,
  pointingPairs,
  claiming,
  nakedPairs,
  hiddenPairs,
  nakedTriples,
  hiddenTriples,
];

function hasContradiction(board: Board): { found: boolean; detail: string } {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board.cells[r][c];
      if (cell.value === null && cell.candidates.size === 0) {
        return { found: true, detail: `${coordsToDisplay(r, c)} has no candidates` };
      }
    }
  }

  for (let i = 0; i < 9; i++) {
    const rowCells = getRow(board, i);
    const colCells = getCol(board, i);
    const boxCells = getBox(board, i);

    const rowVals = rowCells.filter(c => c.value !== null).map(c => c.value!);
    if (rowVals.length !== new Set(rowVals).size) {
      return { found: true, detail: `row ${i + 1} has duplicate values` };
    }

    const colVals = colCells.filter(c => c.value !== null).map(c => c.value!);
    if (colVals.length !== new Set(colVals).size) {
      return { found: true, detail: `column ${i + 1} has duplicate values` };
    }

    const boxVals = boxCells.filter(c => c.value !== null).map(c => c.value!);
    if (boxVals.length !== new Set(boxVals).size) {
      return { found: true, detail: `box ${i + 1} has duplicate values` };
    }

    for (const unitCells of [rowCells, colCells, boxCells]) {
      for (let digit = 1; digit <= 9; digit++) {
        if (unitCells.some(c => c.value === digit)) continue;
        const canHold = unitCells.some(c => c.value === null && c.candidates.has(digit));
        if (!canHold) {
          const label = unitCells === rowCells ? `row ${i + 1}` :
                        unitCells === colCells ? `column ${i + 1}` : `box ${i + 1}`;
          return { found: true, detail: `${label} has no place for ${digit}` };
        }
      }
    }
  }

  return { found: false, detail: '' };
}

function propagate(board: Board, depth: number, deadline: number): { board: Board; contradiction: string | null } {
  let current = board;
  const strategies = depth === 0 ? fullStrategies : lightStrategies;

  for (let iter = 0; iter < MAX_PROPAGATION; iter++) {
    if (Date.now() > deadline) return { board: current, contradiction: null };

    const check = hasContradiction(current);
    if (check.found) return { board: current, contradiction: check.detail };

    let advanced = false;

    for (const strategy of strategies) {
      const step = strategy(current);
      if (step !== null) {
        if (step.valuePlaced !== null) {
          current = setCellValue(current, step.valuePlaced.position, step.valuePlaced.value);
        } else if (step.candidatesEliminated.size > 0) {
          current = eliminateCandidates(current, step.candidatesEliminated);
        }
        advanced = true;
        break;
      }
    }

    if (!advanced && depth < MAX_DEPTH) {
      const fcResult = tryForcingChain(current, depth + 1, deadline);
      if (fcResult) {
        if (fcResult.candidatesEliminated.size > 0) {
          current = eliminateCandidates(current, fcResult.candidatesEliminated);
          advanced = true;
        }
      }
    }

    if (!advanced) break;
  }

  const finalCheck = hasContradiction(current);
  if (finalCheck.found) return { board: current, contradiction: finalCheck.detail };

  return { board: current, contradiction: null };
}

function tryForcingChain(board: Board, depth: number, deadline: number): SolveStep | null {
  const maxCandSize = depth === 0 ? MAX_CANDIDATE_SIZE : 3;
  const candidates: { row: number; col: number; count: number }[] = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board.cells[r][c];
      if (cell.value === null && cell.candidates.size >= 2 && cell.candidates.size <= maxCandSize) {
        candidates.push({ row: r, col: c, count: cell.candidates.size });
      }
    }
  }

  candidates.sort((a, b) => a.count - b.count);

  for (const { row, col } of candidates) {
    if (Date.now() > deadline) return null;

    const cell = board.cells[row][col];

    for (const digit of cell.candidates) {
      const testBoard = clone(board);
      const placed = setCellValue(testBoard, { row, col }, digit);
      const result = propagate(placed, depth, deadline);

      if (Date.now() > deadline) return null;

      if (result.contradiction !== null) {
        const eliminations = new Map<string, number[]>();
        eliminations.set(`${row},${col}`, [digit]);

        return {
          strategy: 'Forcing Chains',
          cellsAffected: [{ row, col }],
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells: [{ row, col }],
          explanation: `Forcing Chains: assuming ${digit} at ${coordsToDisplay(row, col)} leads to contradiction (${result.contradiction}) — ${digit} eliminated`,
        };
      }
    }
  }

  return null;
}

export const forcingChains: Strategy = (board: Board): SolveStep | null => {
  const deadline = Date.now() + TIMEOUT_MS;
  return tryForcingChain(board, 0, deadline);
};
