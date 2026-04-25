import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { xWing, swordfish, jellyfish } from '../strategies/fish';
import type { Board } from '../types';

function setBoardCandidates(board: Board, overrides: Record<string, number[]>): Board {
  const cells = board.cells.map((row) =>
    row.map((cell) => ({ ...cell, candidates: new Set(cell.candidates) })),
  );
  for (const [key, digits] of Object.entries(overrides)) {
    const [r, c] = key.split(',').map(Number);
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

describe('X-Wing', () => {
  it('detects a row-based X-Wing and eliminates from columns', () => {
    // Digit 5 appears only in columns 2 and 6 within rows 1 and 7.
    // Other cells in columns 2 and 6 also have candidate 5 → those get eliminated.
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // Defining cells: rows 1 and 7, columns 2 and 6
    overrides['1,2'] = [5, 8];
    overrides['1,6'] = [5, 9];
    overrides['7,2'] = [5, 3];
    overrides['7,6'] = [5, 7];

    // Cells in columns 2 and 6 that should have 5 eliminated
    overrides['0,2'] = [5, 4];
    overrides['3,2'] = [5, 6];
    overrides['4,6'] = [5, 2];
    overrides['8,6'] = [5, 1];

    // Give other cells in rows 1 and 7 candidates that don't include 5
    for (let c = 0; c < 9; c++) {
      if (c !== 2 && c !== 6) {
        overrides[`1,${c}`] = [1, 2, 3];
        overrides[`7,${c}`] = [1, 2, 3];
      }
    }

    const b = setBoardCandidates(board, overrides);
    const step = xWing(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('X-Wing');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // All eliminations should remove digit 5
    for (const [, digits] of step!.candidatesEliminated) {
      expect(digits).toEqual([5]);
    }

    // Reason cells: 4 cells (2 rows × 2 columns)
    expect(step!.reasonCells).toHaveLength(4);

    // Keys are 0-indexed
    for (const key of step!.candidatesEliminated.keys()) {
      expect(key).toMatch(/^\d,\d$/);
    }

    // Explanation uses 1-indexed, no R0 or C0
    expect(step!.explanation).toMatch(/X-Wing/);
    expect(step!.explanation).not.toMatch(/\brows? 0\b/);
    expect(step!.explanation).not.toMatch(/\bcolumns? 0\b/);
  });

  it('detects a column-based X-Wing and eliminates from rows', () => {
    // Digit 3 appears only in rows 0 and 5 within columns 1 and 8.
    // Other cells in rows 0 and 5 also have candidate 3 → those get eliminated.
    // All non-defining cells in columns 1 and 8 are solved (value set) to avoid accidental patterns.
    const board = emptyBoard();

    // Solve non-defining cells in columns 1 and 8 so they can't form patterns
    for (let r = 0; r < 9; r++) {
      if (r !== 0 && r !== 5) {
        board.cells[r][1].value = 1;
        board.cells[r][8].value = 2;
      }
    }

    const overrides: Record<string, number[]> = {};

    // Defining cells: columns 1 and 8, rows 0 and 5
    overrides['0,1'] = [3, 7];
    overrides['0,8'] = [3, 9];
    overrides['5,1'] = [3, 4];
    overrides['5,8'] = [3, 6];

    // Cells in rows 0 and 5 that should have 3 eliminated
    overrides['0,4'] = [3, 8];
    overrides['5,3'] = [3, 2];

    const b = setBoardCandidates(board, overrides);
    const step = xWing(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('X-Wing');
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    for (const [, digits] of step!.candidatesEliminated) {
      expect(digits).toEqual([3]);
    }
  });

  it('returns null when no X-Wing exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(xWing(board)).toBeNull();
  });

  it('returns null when pattern exists but produces no eliminations', () => {
    // Digit 5 in rows 1 and 7 at columns 2 and 6 — but no other cell in columns 2/6 has 5.
    // Solve all other cells so no accidental fish patterns can form.
    const board = emptyBoard();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 1;
      }
    }
    // Unsolved: only the 4 defining cells and 2 cells in their rows
    board.cells[1][2].value = null;
    board.cells[1][6].value = null;
    board.cells[7][2].value = null;
    board.cells[7][6].value = null;

    const overrides: Record<string, number[]> = {};
    overrides['1,2'] = [5, 8];
    overrides['1,6'] = [5, 9];
    overrides['7,2'] = [5, 3];
    overrides['7,6'] = [5, 7];

    const b = setBoardCandidates(board, overrides);
    expect(xWing(b)).toBeNull();
  });
});

describe('Swordfish', () => {
  it('detects a row-based Swordfish and eliminates from columns', () => {
    // Digit 4 appears only in columns {1,3,7} within rows 0, 4, 8
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // Defining cells (digit 4 in at most 3 columns per row, union = 3 columns)
    overrides['0,1'] = [4, 6];
    overrides['0,7'] = [4, 9];
    overrides['4,1'] = [4, 2];
    overrides['4,3'] = [4, 8];
    overrides['8,3'] = [4, 5];
    overrides['8,7'] = [4, 1];

    // Clear digit 4 from other positions in rows 0, 4, 8
    for (const r of [0, 4, 8]) {
      for (let c = 0; c < 9; c++) {
        if (!overrides[`${r},${c}`]) {
          overrides[`${r},${c}`] = [2, 6, 9];
        }
      }
    }

    // Elimination targets: cells in columns 1, 3, 7 outside defining rows
    overrides['2,1'] = [4, 7];
    overrides['5,3'] = [4, 3];
    overrides['6,7'] = [4, 8];

    const b = setBoardCandidates(board, overrides);
    const step = swordfish(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Swordfish');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    for (const [, digits] of step!.candidatesEliminated) {
      expect(digits).toEqual([4]);
    }

    // Reason cells should have at most 2*3 = 6 cells (could have fewer if not all intersections occupied)
    expect(step!.reasonCells.length).toBeGreaterThanOrEqual(3);
    expect(step!.reasonCells.length).toBeLessThanOrEqual(9);
  });

  it('returns null when no Swordfish exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(swordfish(board)).toBeNull();
  });
});

describe('Jellyfish', () => {
  it('detects a row-based Jellyfish and eliminates from columns', () => {
    // Digit 2 appears only in columns {0,3,5,8} within rows 1, 2, 6, 7
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // Defining cells
    overrides['1,0'] = [2, 7];
    overrides['1,5'] = [2, 9];
    overrides['2,3'] = [2, 4];
    overrides['2,8'] = [2, 6];
    overrides['6,0'] = [2, 3];
    overrides['6,3'] = [2, 8];
    overrides['7,5'] = [2, 1];
    overrides['7,8'] = [2, 5];

    // Clear digit 2 from other positions in defining rows
    for (const r of [1, 2, 6, 7]) {
      for (let c = 0; c < 9; c++) {
        if (!overrides[`${r},${c}`]) {
          overrides[`${r},${c}`] = [1, 6, 9];
        }
      }
    }

    // Elimination targets: cells in columns 0,3,5,8 outside defining rows that have digit 2
    overrides['0,0'] = [2, 4];
    overrides['3,3'] = [2, 7];
    overrides['5,5'] = [2, 8];
    overrides['8,8'] = [2, 3];

    const b = setBoardCandidates(board, overrides);
    const step = jellyfish(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Jellyfish');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    for (const [, digits] of step!.candidatesEliminated) {
      expect(digits).toEqual([2]);
    }
  });

  it('returns null when no Jellyfish exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(jellyfish(board)).toBeNull();
  });

  it('explanation uses 1-indexed coordinates', () => {
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    overrides['1,0'] = [2, 7];
    overrides['1,5'] = [2, 9];
    overrides['2,3'] = [2, 4];
    overrides['2,8'] = [2, 6];
    overrides['6,0'] = [2, 3];
    overrides['6,3'] = [2, 8];
    overrides['7,5'] = [2, 1];
    overrides['7,8'] = [2, 5];

    for (const r of [1, 2, 6, 7]) {
      for (let c = 0; c < 9; c++) {
        if (!overrides[`${r},${c}`]) {
          overrides[`${r},${c}`] = [1, 6, 9];
        }
      }
    }

    overrides['0,0'] = [2, 4];
    overrides['3,3'] = [2, 7];

    const b = setBoardCandidates(board, overrides);
    const step = jellyfish(b);
    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/Jellyfish/);
    expect(step!.explanation).not.toMatch(/\brows? 0\b/);
    expect(step!.explanation).not.toMatch(/\bcolumns? 0\b/);
  });
});
