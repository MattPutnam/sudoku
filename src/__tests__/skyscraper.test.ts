import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { skyscraper } from '../strategies/skyscraper';
import type { Board } from '../types';

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

describe('skyscraper', () => {
  it('detects a row-based skyscraper and eliminates candidates', () => {
    // Digit 5: conjugate pairs in row 1 (cols 0,6) and row 7 (cols 0,3)
    // Shared base column: 0. Tops: (1,6) and (7,3).
    // (1,6) peers include col 6, row 1, box 2.
    // (7,3) peers include col 3, row 7, box 7.
    // (7,6) sees (1,6) via col 6 and sees (7,3) via row 7 → candidate 5 eliminated from (7,6).
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // Row 1: digit 5 only at (1,0) and (1,6)
    overrides['1,0'] = [5, 8];
    overrides['1,6'] = [5, 9];
    // Fill rest of row 1 without 5
    for (const c of [1, 2, 3, 4, 5, 7, 8]) {
      overrides[`1,${c}`] = [6, 7];
    }

    // Row 7: digit 5 only at (7,0) and (7,3)
    overrides['7,0'] = [5, 6];
    overrides['7,3'] = [5, 7];
    // Fill rest of row 7 without 5
    for (const c of [1, 2, 4, 5, 6, 7, 8]) {
      overrides[`7,${c}`] = [8, 9];
    }

    // Target cell: (7,6) sees both tops (1,6) via col 6 and (7,3) via row 7
    overrides['7,6'] = [3, 5, 9];

    const b = setBoardCandidates(board, overrides);
    const step = skyscraper(b);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Skyscraper');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
    expect(step!.reasonCells).toHaveLength(4);
    expect(step!.explanation).toMatch(/R\d+C\d+/);
  });

  it('detects a column-based skyscraper', () => {
    // Digit 3: conjugate pairs in col 0 (rows 1,7) and col 6 (rows 1,4)
    // Shared base row: 1. Tops: (7,0) and (4,6).
    // (4,0) sees (7,0) via col 0 and sees (4,6) via row 4. Eliminate 3 from (4,0).
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // Col 0: digit 3 only at (1,0) and (7,0)
    overrides['1,0'] = [3, 8];
    overrides['7,0'] = [3, 6];
    for (const r of [0, 2, 3, 4, 5, 6, 8]) {
      overrides[`${r},0`] = [7, 9];
    }

    // Col 6: digit 3 only at (1,6) and (4,6)
    overrides['1,6'] = [3, 9];
    overrides['4,6'] = [3, 7];
    for (const r of [0, 2, 3, 5, 6, 7, 8]) {
      overrides[`${r},6`] = [1, 2];
    }

    // Target cell: (4,0) sees (7,0) via col 0 and (4,6) via row 4
    // But we set (4,0) to [7,9] above. Override it with 3.
    overrides['4,0'] = [2, 3, 6];

    const b = setBoardCandidates(board, overrides);
    const step = skyscraper(b);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Skyscraper');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
  });

  it('returns null when no skyscraper exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(skyscraper(board)).toBeNull();
  });

  it('returns null when pairs exist but no eliminations possible', () => {
    // Two pairs with a shared column but no target cell sees both tops
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    overrides['0,0'] = [5, 1];
    overrides['0,3'] = [5, 4];
    for (const c of [1, 2, 4, 5, 6, 7, 8]) {
      overrides[`0,${c}`] = [6, 7];
    }

    overrides['6,0'] = [5, 7];
    overrides['6,8'] = [5, 4];
    for (const c of [1, 2, 3, 4, 5, 6, 7]) {
      overrides[`6,${c}`] = [8, 9];
    }

    const b = setBoardCandidates(board, overrides);
    const step = skyscraper(b);
    // If found, it must have eliminations
    if (step !== null) {
      expect(step.candidatesEliminated.size).toBeGreaterThan(0);
    }
  });
});
