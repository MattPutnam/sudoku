import { describe, it, expect } from 'vitest';

import { sueDeCoq } from '../strategies/sueDeCoq';
import type { Board } from '../types';
import { keyToCoords } from '../utils/cellPosition';

function setBoardCandidates(board: Board, overrides: Record<string, number[]>): Board {
  const cells = board.cells.map((row) =>
    row.map((cell) => ({ ...cell, candidates: new Set(cell.candidates) })),
  );
  for (const [key, digits] of Object.entries(overrides)) {
    const [r, c] = keyToCoords(key);
    cells[r][c].candidates = new Set(digits);
  }
  return { cells };
}

function emptyBoard(): Board {
  return {
    cells: Array.from({ length: 9 }, (_, row) =>
      Array.from({ length: 9 }, (_, col) => ({
        value: null as number | null,
        candidates: new Set<number>(),
        row,
        col,
        box: Math.floor(row / 3) * 3 + Math.floor(col / 3),
        isGiven: false,
      })),
    ),
  };
}

describe('Sue de Coq', () => {
  it('detects a Sue de Coq pattern and produces eliminations', () => {
    // Sue de Coq in row 0 / box 0 intersection (cells R1C1, R1C2, R1C3):
    // Intersection has candidates {1,2,3,4} across 2 cells (4 candidates, 2 cells → extra = 2)
    // We need lineDigits locked in line remainder AND boxDigits locked in box remainder.

    // Simplified scenario:
    // Intersection cells: R0C0, R0C1 (in box 0, row 0)
    // Intersection candidates: {1, 2, 3} (3 cands, 2 cells → n+1)
    // Split: lineDigits = {1}, boxDigits = {2, 3} (or vice versa)
    // Line remainder (row 0, not in box 0): needs a cell with exactly {1}
    // Box remainder (box 0, not in row 0): needs 2 cells forming locked set {2,3}

    const board = emptyBoard();

    // Solve most cells so we control candidates precisely
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 9; // solved
      }
    }

    // Unsolved intersection cells
    board.cells[0][0].value = null;
    board.cells[0][1].value = null;

    // Unsolved line remainder (row 0, cols 3-8)
    board.cells[0][3].value = null;
    board.cells[0][5].value = null;

    // Unsolved box remainder (box 0: rows 0-2, cols 0-2, not row 0)
    board.cells[1][0].value = null;
    board.cells[2][0].value = null;

    // Another cell in box remainder for elimination target
    board.cells[1][1].value = null;

    const overrides: Record<string, number[]> = {};

    // Intersection: candidates {1, 2, 3}
    overrides['0,0'] = [1, 2];
    overrides['0,1'] = [2, 3];

    // Line remainder: locked set for lineDigits {1}
    overrides['0,3'] = [1]; // single cell with just {1}
    overrides['0,5'] = [1, 5]; // another cell in row with 1 → elimination target

    // Box remainder: locked set for boxDigits {2, 3}
    overrides['1,0'] = [2];
    overrides['2,0'] = [3];

    // Elimination target in box remainder
    overrides['1,1'] = [2, 5]; // has digit 2, should be eliminated

    const b = setBoardCandidates(board, overrides);
    const step = sueDeCoq(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Sue de Coq');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
  });

  it('returns null on a solved board', () => {
    const board = emptyBoard();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 1;
      }
    }
    expect(sueDeCoq(board)).toBeNull();
  });

  it('returns null when intersection has too few candidates', () => {
    const board = emptyBoard();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 9;
      }
    }

    board.cells[0][0].value = null;
    board.cells[0][1].value = null;

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [1, 2];
    overrides['0,1'] = [1, 2]; // Only 2 candidates for 2 cells — not enough for Sue de Coq

    const b = setBoardCandidates(board, overrides);
    expect(sueDeCoq(b)).toBeNull();
  });
});
