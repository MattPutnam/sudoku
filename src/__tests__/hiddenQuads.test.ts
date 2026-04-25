import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { hiddenQuads } from '../strategies/hiddenQuads';
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

describe('hiddenQuads', () => {
  it('returns a valid step when a hidden quad exists in a row', () => {
    const base = createBoard(
      '100000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    // In row 0: digits 6,7,8,9 only appear in cells (0,3), (0,4), (0,5), (0,6)
    // but those cells also have other candidates
    const board = setBoardCandidates(base, {
      '0,1': [2, 3, 4, 5],
      '0,2': [2, 3, 4, 5],
      '0,3': [2, 6, 7],
      '0,4': [3, 7, 8],
      '0,5': [4, 8, 9],
      '0,6': [5, 6, 9],
      '0,7': [2, 3, 4, 5],
      '0,8': [2, 3, 4, 5],
    });

    const step = hiddenQuads(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Hidden Quad');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.reasonCells).toHaveLength(4);
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // Eliminations should remove non-quad digits
    for (const digits of step!.candidatesEliminated.values()) {
      for (const d of digits) {
        expect([6, 7, 8, 9]).not.toContain(d);
      }
    }
  });

  it('returns null when no hidden quad exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(hiddenQuads(board)).toBeNull();
  });

  it('cellsAffected and reasonCells refer to the same cells', () => {
    const base = createBoard(
      '100000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,1': [2, 3, 4, 5],
      '0,2': [2, 3, 4, 5],
      '0,3': [2, 6, 7],
      '0,4': [3, 7, 8],
      '0,5': [4, 8, 9],
      '0,6': [5, 6, 9],
      '0,7': [2, 3, 4, 5],
      '0,8': [2, 3, 4, 5],
    });

    const step = hiddenQuads(board);
    expect(step).not.toBeNull();

    const reasonKeys = new Set(step!.reasonCells.map((p) => `${p.row},${p.col}`));
    const affectedKeys = new Set(step!.cellsAffected.map((p) => `${p.row},${p.col}`));
    expect(reasonKeys).toEqual(affectedKeys);
  });

  it('does not report a hidden quad that produces no eliminations', () => {
    const base = createBoard(
      '100000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    // Digits 6,7,8,9 in exactly 4 cells but those cells have ONLY those digits
    const board = setBoardCandidates(base, {
      '0,1': [2, 3, 4, 5],
      '0,2': [2, 3, 4, 5],
      '0,3': [6, 7],
      '0,4': [7, 8],
      '0,5': [8, 9],
      '0,6': [6, 9],
      '0,7': [2, 3, 4, 5],
      '0,8': [2, 3, 4, 5],
    });

    expect(hiddenQuads(board)).toBeNull();
  });

  it('explanation uses 1-indexed notation', () => {
    const base = createBoard(
      '100000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,1': [2, 3, 4, 5],
      '0,2': [2, 3, 4, 5],
      '0,3': [2, 6, 7],
      '0,4': [3, 7, 8],
      '0,5': [4, 8, 9],
      '0,6': [5, 6, 9],
      '0,7': [2, 3, 4, 5],
      '0,8': [2, 3, 4, 5],
    });

    const step = hiddenQuads(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    expect(step!.explanation).not.toMatch(/R0|C0/);
  });
});
