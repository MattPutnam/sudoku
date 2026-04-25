import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { nakedTriples } from '../strategies/nakedTriples';
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

describe('nakedTriples', () => {
  it('returns a valid step when a naked triple exists', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    // Three cells with union {4,5,7} — cell (0,6) also has 4
    const board = setBoardCandidates(base, {
      '0,3': [4, 5],
      '0,4': [5, 7],
      '0,5': [4, 7],
      '0,6': [4, 6, 9],
      '0,7': [6, 8, 9],
      '0,8': [8, 9],
    });

    const step = nakedTriples(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Naked Triple');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.reasonCells).toHaveLength(3);
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
  });

  it('detects a triple where cells have fewer than 3 candidates each', () => {
    // Classic case: {1,2}, {2,3}, {1,3} form a valid triple on {1,2,3}
    const base = createBoard(
      '000000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,0': [1, 2],
      '0,1': [2, 3],
      '0,2': [1, 3],
      '0,3': [1, 4, 5],
      '0,4': [5, 6, 7],
      '0,5': [4, 6, 7, 8],
      '0,6': [7, 8, 9],
      '0,7': [8, 9],
      '0,8': [4, 9],
    });

    const step = nakedTriples(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Naked Triple');
    expect(step!.reasonCells).toHaveLength(3);

    // Union of reason cells' candidates should be exactly {1,2,3}
    const union = new Set<number>();
    for (const rc of step!.reasonCells) {
      for (const d of board.cells[rc.row][rc.col].candidates) union.add(d);
    }
    expect([...union].sort()).toEqual([1, 2, 3]);

    // Eliminations should only remove 1, 2, or 3
    for (const digits of step!.candidatesEliminated.values()) {
      for (const d of digits) {
        expect([1, 2, 3]).toContain(d);
      }
    }
  });

  it('returns null when no naked triple exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(nakedTriples(board)).toBeNull();
  });

  it('explanation uses 1-indexed notation', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 5],
      '0,4': [5, 7],
      '0,5': [4, 7],
      '0,6': [4, 6, 9],
      '0,7': [6, 8, 9],
      '0,8': [8, 9],
    });

    const step = nakedTriples(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    expect(step!.explanation).not.toMatch(/R0|C0/);
  });
});
