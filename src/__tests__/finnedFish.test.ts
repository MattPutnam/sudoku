import { describe, it, expect } from 'vitest';

import { finnedXWing, finnedSwordfish, finnedJellyfish } from '../strategies/finnedFish';
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

describe('Finned X-Wing', () => {
  it('detects a finned X-Wing and eliminates from cells that see the fin', () => {
    // Digit 5 forms an X-Wing pattern in rows 1 and 7, columns 2 and 6.
    // Row 7 has an extra candidate at column 7 (the fin), which is in box 8 (rows 6-8, cols 6-8).
    // Only eliminations in column 6 that are also in box 8 are valid.
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // X-Wing defining cells
    overrides['1,2'] = [5, 8];
    overrides['1,6'] = [5, 9];
    overrides['7,2'] = [5, 3];
    overrides['7,6'] = [5, 7];

    // Fin cell: row 7, col 7 (in box 8)
    overrides['7,7'] = [5, 4];

    // Clear digit 5 from other positions in rows 1 and 7
    for (let c = 0; c < 9; c++) {
      if (!overrides[`1,${c}`]) overrides[`1,${c}`] = [1, 2, 3];
      if (!overrides[`7,${c}`]) overrides[`7,${c}`] = [1, 2, 3];
    }

    // Target: cell in column 6 that shares box 8 with the fin (rows 6-8, cols 6-8)
    overrides['6,6'] = [5, 2]; // row 6, col 6 — box 8, sees fin
    overrides['8,6'] = [5, 1]; // row 8, col 6 — box 8, sees fin

    // Cell in col 6 but NOT in box 8 — should NOT be eliminated
    overrides['0,6'] = [5, 4]; // row 0, col 6 — box 2, doesn't see fin

    const b = setBoardCandidates(board, overrides);
    const step = finnedXWing(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Finned X-Wing');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // All eliminations should remove digit 5
    for (const [, digits] of step!.candidatesEliminated) {
      expect(digits).toEqual([5]);
    }

    // Eliminated cells must be in box 8 (same box as fin)
    for (const key of step!.candidatesEliminated.keys()) {
      const [r, c] = keyToCoords(key);
      const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      expect(box).toBe(8);
    }
  });

  it('returns null when a regular (non-finned) X-Wing exists', () => {
    // A standard X-Wing is handled by the regular fish strategy, not finned.
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    overrides['1,2'] = [5, 8];
    overrides['1,6'] = [5, 9];
    overrides['7,2'] = [5, 3];
    overrides['7,6'] = [5, 7];

    for (let c = 0; c < 9; c++) {
      if (!overrides[`1,${c}`]) overrides[`1,${c}`] = [1, 2, 3];
      if (!overrides[`7,${c}`]) overrides[`7,${c}`] = [1, 2, 3];
    }

    overrides['0,2'] = [5, 4];
    overrides['3,2'] = [5, 6];

    const b = setBoardCandidates(board, overrides);
    const step = finnedXWing(b);

    // A pure X-Wing has no fin, so findFinnedFish skips it (finPositions.length === 0)
    expect(step).toBeNull();
  });

  it('returns null on a solved board', () => {
    const board = emptyBoard();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 1;
      }
    }
    expect(finnedXWing(board)).toBeNull();
  });
});

describe('Finned Swordfish', () => {
  it('detects a finned swordfish pattern', () => {
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // Digit 4 in rows 0, 4, 8 covering columns {1, 3, 7}
    overrides['0,1'] = [4, 6];
    overrides['0,7'] = [4, 9];
    overrides['4,1'] = [4, 2];
    overrides['4,3'] = [4, 8];
    overrides['8,3'] = [4, 5];
    overrides['8,7'] = [4, 1];

    // Fin cell: row 8, col 8 (in box 8, same box as 8,7)
    overrides['8,8'] = [4, 3];

    // Clear digit 4 from other positions in defining rows
    for (const r of [0, 4, 8]) {
      for (let c = 0; c < 9; c++) {
        if (!overrides[`${r},${c}`]) overrides[`${r},${c}`] = [2, 6, 9];
      }
    }

    // Target: cell in cross columns that sees the fin (box 8)
    overrides['6,7'] = [4, 8]; // row 6, col 7 — box 8

    const b = setBoardCandidates(board, overrides);
    const step = finnedSwordfish(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Finned Swordfish');

    for (const [, digits] of step!.candidatesEliminated) {
      expect(digits).toEqual([4]);
    }
  });

  it('returns null on a solved board', () => {
    const board = emptyBoard();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 1;
      }
    }
    expect(finnedSwordfish(board)).toBeNull();
  });
});

describe('Finned Jellyfish', () => {
  it('returns null on a solved board', () => {
    const board = emptyBoard();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 1;
      }
    }
    expect(finnedJellyfish(board)).toBeNull();
  });
});
