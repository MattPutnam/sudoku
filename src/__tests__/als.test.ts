import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { alsXZ } from '../strategies/alsXZ';
import { alsXYWing } from '../strategies/alsXYWing';
import { findAllALS } from '../strategies/alsXZ';
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

function solvedBoard(): Board {
  return createBoard(
    '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
  );
}

function mostlySolvedBoard(unsolved: [number, number][]): Board {
  const board = emptyBoard();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      board.cells[r][c].value = 1;
    }
  }
  for (const [r, c] of unsolved) {
    board.cells[r][c].value = null;
  }
  return board;
}

describe('ALS Finder', () => {
  it('finds no ALS when all cells are solved', () => {
    const board = solvedBoard();
    const als = findAllALS(board);
    expect(als).toHaveLength(0);
  });

  it('finds single-cell ALS (bivalue cell)', () => {
    const board = mostlySolvedBoard([[0, 0]]);
    const b = setBoardCandidates(board, { '0,0': [3, 7] });
    const als = findAllALS(b);
    expect(als.length).toBeGreaterThanOrEqual(3);
    expect(als.every(a => a.candidates.size === a.cells.length + 1)).toBe(true);
  });
});

describe('ALS-XZ', () => {
  it('finds elimination with two ALS sharing an RCC', () => {
    // ALS A: cells (0,0)={2,5} and (0,1)={2,3} in row 0, union={2,3,5}
    // ALS B: cell (3,0)={5,3} in col 0, union={3,5}
    // RCC: digit 5 — (0,0) sees (3,0) via col 0 ✓, only A-cell with 5
    // Digit 3 NOT RCC — (0,1) does not see (3,0)
    // Z=3: Z-cells in A={(0,1)}, Z-cells in B={(3,0)}
    // Target (3,1): sees (0,1) via col 1, sees (3,0) via row 3 → eliminate 3
    const board = mostlySolvedBoard([[0, 0], [0, 1], [3, 0], [3, 1]]);
    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [2, 5];
    overrides['0,1'] = [2, 3];
    overrides['3,0'] = [5, 3];
    overrides['3,1'] = [3, 7];

    const b = setBoardCandidates(board, overrides);
    const step = alsXZ(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('ALS-XZ');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    const allElimDigits = [...step!.candidatesEliminated.values()].flat();
    expect(allElimDigits).toContain(3);
  });

  it('returns null on a solved board', () => {
    const board = solvedBoard();
    expect(alsXZ(board)).toBeNull();
  });

  it('returns null when ALS pairs exist but share no RCC', () => {
    const board = mostlySolvedBoard([[0, 0], [8, 4]]);
    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [1, 2];
    overrides['8,4'] = [3, 4];
    const b = setBoardCandidates(board, overrides);
    expect(alsXZ(b)).toBeNull();
  });

  it('explanation contains ALS-XZ and 1-indexed coordinates', () => {
    const board = mostlySolvedBoard([[0, 0], [0, 1], [3, 0], [3, 1]]);
    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [2, 5];
    overrides['0,1'] = [2, 3];
    overrides['3,0'] = [5, 3];
    overrides['3,1'] = [3, 7];

    const b = setBoardCandidates(board, overrides);
    const step = alsXZ(b);

    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/ALS-XZ/);
    expect(step!.explanation).not.toMatch(/R0/);
    expect(step!.explanation).not.toMatch(/C0[^,]/);
  });

  it('reasonCells contains all cells from both ALS', () => {
    const board = mostlySolvedBoard([[0, 0], [0, 1], [3, 0], [3, 1]]);
    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [2, 5];
    overrides['0,1'] = [2, 3];
    overrides['3,0'] = [5, 3];
    overrides['3,1'] = [3, 7];

    const b = setBoardCandidates(board, overrides);
    const step = alsXZ(b);

    expect(step).not.toBeNull();
    expect(step!.reasonCells.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ALS-XY-Wing', () => {
  it('finds elimination with three ALS', () => {
    // Pivot ALS A: (0,0) {1,2} — bivalue
    // ALS B: (0,8) {1,3} — shares row 0 with A, RCC X=1
    // ALS C: (8,0) {2,3} — shares col 0 with A, RCC Y=2
    // Z=3: in both B and C, Z≠X(1), Z≠Y(2)
    // Target (8,8): sees (0,8) via col 8, sees (8,0) via row 8
    const board = mostlySolvedBoard([[0, 0], [0, 8], [8, 0], [8, 8]]);
    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [1, 2];
    overrides['0,8'] = [1, 3];
    overrides['8,0'] = [2, 3];
    overrides['8,8'] = [3, 5];

    const b = setBoardCandidates(board, overrides);
    const step = alsXYWing(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('ALS-XY-Wing');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
    expect(step!.candidatesEliminated.has('8,8')).toBe(true);
    expect(step!.candidatesEliminated.get('8,8')).toEqual([3]);
  });

  it('returns null on a solved board', () => {
    const board = solvedBoard();
    expect(alsXYWing(board)).toBeNull();
  });

  it('explanation contains ALS-XY-Wing and 1-indexed coordinates', () => {
    const board = mostlySolvedBoard([[0, 0], [0, 8], [8, 0], [8, 8]]);
    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [1, 2];
    overrides['0,8'] = [1, 3];
    overrides['8,0'] = [2, 3];
    overrides['8,8'] = [3, 5];

    const b = setBoardCandidates(board, overrides);
    const step = alsXYWing(b);

    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/ALS-XY-Wing/);
    expect(step!.explanation).not.toMatch(/R0/);
    expect(step!.explanation).not.toMatch(/C0[^,]/);
  });
});
