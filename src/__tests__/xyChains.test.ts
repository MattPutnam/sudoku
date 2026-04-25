import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { xyChains } from '../strategies/xyChains';
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

describe('XY-Chains', () => {
  it('finds elimination via bivalue cell chain', () => {
    // XY-Chain for digit 5:
    //   R0C0{5,3} → R0C3{3,7} → R3C3{7,5}
    //   Start has 5, propagates 3 to R0C3, which propagates 7 to R3C3, which has 5 as "incoming"
    //   Both endpoints (R0C0, R3C3) have digit 5.
    //   Target: R3C0 sees R0C0 (col 0) and R3C3 (row 3), has candidate 5.

    const board = solvedBoard();
    const unsolved = ['0,0', '0,3', '3,3', '3,0'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [5, 3]; // chain start: {5, 3}
    overrides['0,3'] = [3, 7]; // chain middle: {3, 7} — shares 3 with R0C0 (same row)
    overrides['3,3'] = [7, 5]; // chain end: {7, 5} — shares 7 with R0C3 (same col)
    overrides['3,0'] = [5, 8]; // target: sees R0C0 (col 0) and R3C3 (row 3), has 5

    const b = setBoardCandidates(board, overrides);
    const step = xyChains(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('XY-Chain');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    const elimKeys = [...step!.candidatesEliminated.keys()];
    expect(elimKeys).toContain('3,0');
    expect(step!.candidatesEliminated.get('3,0')).toEqual([5]);
  });

  it('returns null on a fully solved board', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(xyChains(board)).toBeNull();
  });

  it('explanation contains "XY-Chain" and uses 1-indexed coords', () => {
    const board = solvedBoard();
    const unsolved = ['0,0', '0,3', '3,3', '3,0'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [5, 3];
    overrides['0,3'] = [3, 7];
    overrides['3,3'] = [7, 5];
    overrides['3,0'] = [5, 8];

    const b = setBoardCandidates(board, overrides);
    const step = xyChains(b);

    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/XY-Chain/);
    expect(step!.explanation).not.toMatch(/R0C0/);
    expect(step!.explanation).toMatch(/R1C1/);
  });

  it('reasonCells contains all chain cells', () => {
    const board = solvedBoard();
    const unsolved = ['0,0', '0,3', '3,3', '3,0'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [5, 3];
    overrides['0,3'] = [3, 7];
    overrides['3,3'] = [7, 5];
    overrides['3,0'] = [5, 8];

    const b = setBoardCandidates(board, overrides);
    const step = xyChains(b);

    expect(step).not.toBeNull();
    expect(step!.reasonCells.length).toBeGreaterThanOrEqual(3);

    const reasonKeys = step!.reasonCells.map(p => `${p.row},${p.col}`);
    expect(reasonKeys).toContain('0,0');
    expect(reasonKeys).toContain('0,3');
    expect(reasonKeys).toContain('3,3');
  });

  it('cellsAffected matches candidatesEliminated keys', () => {
    const board = solvedBoard();
    const unsolved = ['0,0', '0,3', '3,3', '3,0'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [5, 3];
    overrides['0,3'] = [3, 7];
    overrides['3,3'] = [7, 5];
    overrides['3,0'] = [5, 8];

    const b = setBoardCandidates(board, overrides);
    const step = xyChains(b);

    expect(step).not.toBeNull();
    const affectedKeys = step!.cellsAffected.map(p => `${p.row},${p.col}`);
    const elimKeys = [...step!.candidatesEliminated.keys()];
    expect(affectedKeys.sort()).toEqual(elimKeys.sort());
  });
});
