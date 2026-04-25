import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { hiddenPairs } from '../strategies/hiddenPairs';
import type { Board } from '../types';
import { cpToKey, keyToCoords } from '../utils/cellPosition';

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

describe('hiddenPairs', () => {
  it('returns a valid step when a hidden pair exists in a row', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    // In row 0: digits 8,9 only appear in cells (0,3) and (0,5)
    // but those cells also have other candidates that should be eliminated
    const board = setBoardCandidates(base, {
      '0,3': [4, 5, 8, 9],
      '0,4': [4, 5, 6, 7],
      '0,5': [5, 6, 8, 9],
      '0,6': [4, 6, 7],
      '0,7': [5, 6, 7],
      '0,8': [4, 5, 6],
    });

    const step = hiddenPairs(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Hidden Pair');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.reasonCells).toHaveLength(2);
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // Eliminations should remove non-pair digits (not 8 or 9) from pair cells
    for (const digits of step!.candidatesEliminated.values()) {
      for (const d of digits) {
        expect([8, 9]).not.toContain(d);
      }
    }
  });

  it('returns null when no hidden pair exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(hiddenPairs(board)).toBeNull();
  });

  it('candidatesEliminated removes non-pair digits from the pair cells', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 5, 8, 9],
      '0,4': [4, 5, 6, 7],
      '0,5': [5, 6, 8, 9],
      '0,6': [4, 6, 7],
      '0,7': [5, 6, 7],
      '0,8': [4, 5, 6],
    });

    const step = hiddenPairs(board);
    expect(step).not.toBeNull();

    // Affected cells are the pair cells themselves
    for (const pos of step!.cellsAffected) {
      const key = cpToKey(pos);
      expect(step!.candidatesEliminated.has(key)).toBe(true);
    }

    // reasonCells and cellsAffected refer to the same cells
    const reasonKeys = new Set(step!.reasonCells.map((p) => `${p.row},${p.col}`));
    const affectedKeys = new Set(step!.cellsAffected.map((p) => `${p.row},${p.col}`));
    expect(reasonKeys).toEqual(affectedKeys);
  });

  it('does not report a hidden pair that produces no eliminations', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    // Digits 8,9 only in cells (0,3) and (0,5) but those cells have ONLY {8,9}
    const board = setBoardCandidates(base, {
      '0,3': [8, 9],
      '0,4': [4, 5, 6, 7],
      '0,5': [8, 9],
      '0,6': [4, 6, 7],
      '0,7': [5, 6, 7],
      '0,8': [4, 5, 6],
    });

    expect(hiddenPairs(board)).toBeNull();
  });

  it('candidatesEliminated keys use 0-indexed row,col format', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 5, 8, 9],
      '0,4': [4, 5, 6, 7],
      '0,5': [5, 6, 8, 9],
      '0,6': [4, 6, 7],
      '0,7': [5, 6, 7],
      '0,8': [4, 5, 6],
    });

    const step = hiddenPairs(board);
    expect(step).not.toBeNull();
    for (const key of step!.candidatesEliminated.keys()) {
      expect(key).toMatch(/^\d,\d$/);
    }
  });

  it('explanation uses 1-indexed R1C1 notation', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 5, 8, 9],
      '0,4': [4, 5, 6, 7],
      '0,5': [5, 6, 8, 9],
      '0,6': [4, 6, 7],
      '0,7': [5, 6, 7],
      '0,8': [4, 5, 6],
    });

    const step = hiddenPairs(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    expect(step!.explanation).not.toMatch(/R0|C0/);
  });
});
