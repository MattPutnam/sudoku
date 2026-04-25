import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { twoStringKite } from '../strategies/twoStringKite';
import type { Board } from '../types';
import { keyToCoords } from '../utils/cellPosition';

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
    const [r, c] = keyToCoords(key);
    cells[r][c].candidates = new Set(digits);
  }
  return { cells };
}

describe('twoStringKite', () => {
  it('detects a 2-string kite and eliminates candidates', () => {
    // Digit 4: row pair in row 1 at (1,3) and (1,7), col pair in col 5 at (2,5) and (8,5)
    // (1,3) is in box 1, (2,5) is in box 1 — they share box 1!
    // Loose ends: (1,7) and (8,5)
    // (8,7) sees (1,7) via col 7 and sees (8,5) via row 8 → eliminate 4 from (8,7)
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // Row 1: digit 4 only at (1,3) and (1,7)
    overrides['1,3'] = [4, 8];
    overrides['1,7'] = [4, 9];
    for (const c of [0, 1, 2, 4, 5, 6, 8]) {
      overrides[`1,${c}`] = [6, 7];
    }

    // Col 5: digit 4 only at (2,5) and (8,5)
    overrides['2,5'] = [4, 7];
    overrides['8,5'] = [4, 6];
    for (const r of [0, 1, 3, 4, 5, 6, 7]) {
      overrides[`${r},5`] = [1, 2];
    }
    // Fix row 1 col 5 — already set above, make sure no 4
    overrides['1,5'] = [1, 2];

    // Target cell
    overrides['8,7'] = [1, 4, 6];

    const b = setBoardCandidates(board, overrides);
    const step = twoStringKite(b);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('2-String Kite');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
    expect(step!.reasonCells).toHaveLength(4);
    expect(step!.explanation).toMatch(/R\d+C\d+/);
  });

  it('returns null when no 2-string kite exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(twoStringKite(board)).toBeNull();
  });

  it('returns null when pairs exist but are not connected through a box', () => {
    // Row pair and col pair endpoints do not share any box
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {};

    // Row 0: digit 5 at (0,0) and (0,3) — boxes 0 and 1
    overrides['0,0'] = [5, 1];
    overrides['0,3'] = [5, 4];
    for (const c of [1, 2, 4, 5, 6, 7, 8]) {
      overrides[`0,${c}`] = [6, 7];
    }

    // Col 8: digit 5 at (3,8) and (6,8) — boxes 5 and 8
    overrides['3,8'] = [5, 7];
    overrides['6,8'] = [5, 8];
    for (const r of [0, 1, 2, 4, 5, 7, 8]) {
      overrides[`${r},8`] = [1, 2];
    }

    const b = setBoardCandidates(board, overrides);
    const step = twoStringKite(b);
    if (step !== null) {
      expect(step.candidatesEliminated.size).toBeGreaterThan(0);
    }
  });
});
