import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { xChains } from '../strategies/xChains';
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

function solvedBoard(): Board {
  const board = emptyBoard();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      board.cells[r][c].value = 1;
    }
  }
  return board;
}

describe('X-Chains', () => {
  it('3-link chain (strong-weak-strong) produces valid elimination', () => {
    // Chain for digit 7:
    //   R0C0 =strong(row 0)= R0C8 =weak(col 8)= R4C8 =strong(row 4)= R4C2
    //
    //   Strong: row 0 has exactly 2 cells with 7: R0C0, R0C8
    //   Weak: col 8 has 3 cells with 7: R0C8, R4C8, R8C8 → not a conj pair
    //   Strong: row 4 has exactly 2 cells with 7: R4C8, R4C2
    //
    //   Target: R8C0 sees R0C0 (col 0) and... doesn't see R4C2.
    //   R8C0 peers: row 8, col 0, box 6. R4C2 in row 4, col 2, box 3. No overlap.
    //
    //   Better target: something that sees both R0C0 and R4C2.
    //   R0C0: row 0, col 0, box 0 (rows 0-2, cols 0-2)
    //   R4C2: row 4, col 2, box 3 (rows 3-5, cols 0-2)
    //   Common: col 2? No, R0C0 is col 0. Box? No overlap.
    //   A cell in col 0 AND col 2? Impossible.
    //   A cell in row 0 AND row 4? Impossible.
    //   A cell in box 0 that sees R4C2 via col 2: R0C2, R1C2, R2C2 — these are in col 2 (see R4C2) and box 0 (see R0C0).
    //   Target: R2C2 — sees R0C0 via box 0, sees R4C2 via col 2.

    const board = solvedBoard();
    const unsolved = ['0,0', '0,8', '4,8', '4,2', '8,8', '2,2'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [7, 3];  // chain start
    overrides['0,8'] = [7, 4];  // chain
    overrides['4,8'] = [7, 6];  // chain
    overrides['4,2'] = [7, 5];  // chain end
    overrides['8,8'] = [7, 9];  // makes col 8 not a conj pair (weak link)
    overrides['2,2'] = [7, 8];  // target: sees R0C0 (box 0) and R4C2 (col 2)

    const b = setBoardCandidates(board, overrides);
    const step = xChains(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('X-Chain');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    for (const [, digits] of step!.candidatesEliminated) {
      expect(digits).toEqual([7]);
    }

    expect(step!.reasonCells.length).toBeGreaterThanOrEqual(3);
  });

  it('returns null on a fully solved board', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(xChains(board)).toBeNull();
  });

  it('explanation contains "X-Chain" and uses 1-indexed coords', () => {
    const board = solvedBoard();
    const unsolved = ['0,0', '0,8', '4,8', '4,2', '8,8', '2,2'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [7, 3];
    overrides['0,8'] = [7, 4];
    overrides['4,8'] = [7, 6];
    overrides['4,2'] = [7, 5];
    overrides['8,8'] = [7, 9];
    overrides['2,2'] = [7, 8];

    const b = setBoardCandidates(board, overrides);
    const step = xChains(b);

    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/X-Chain/);
    expect(step!.explanation).not.toMatch(/R0C0/);
  });

  it('returns null when chain exists but no target cell available', () => {
    const board = solvedBoard();

    board.cells[0][0].value = null;
    board.cells[0][8].value = null;
    board.cells[4][8].value = null;
    board.cells[4][2].value = null;

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [7, 3];
    overrides['0,8'] = [7, 4];
    overrides['4,8'] = [7, 6];
    overrides['4,2'] = [7, 5];

    const b = setBoardCandidates(board, overrides);
    expect(xChains(b)).toBeNull();
  });
});
