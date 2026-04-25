import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { hiddenTriples } from '../strategies/hiddenTriples';
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

describe('hiddenTriples', () => {
  it('returns a valid step when a hidden triple exists in a row', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    // In row 0: digits 7,8,9 only appear in cells (0,3), (0,4), (0,5)
    // but those cells also have other candidates
    const board = setBoardCandidates(base, {
      '0,3': [4, 7, 8],
      '0,4': [5, 8, 9],
      '0,5': [6, 7, 9],
      '0,6': [4, 5, 6],
      '0,7': [4, 5, 6],
      '0,8': [4, 5, 6],
    });

    const step = hiddenTriples(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Hidden Triple');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.reasonCells).toHaveLength(3);
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // Eliminations should remove non-triple digits
    for (const digits of step!.candidatesEliminated.values()) {
      for (const d of digits) {
        expect([7, 8, 9]).not.toContain(d);
      }
    }
  });

  it('returns null when no hidden triple exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(hiddenTriples(board)).toBeNull();
  });

  it('cellsAffected and reasonCells refer to the same cells', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 7, 8],
      '0,4': [5, 8, 9],
      '0,5': [6, 7, 9],
      '0,6': [4, 5, 6],
      '0,7': [4, 5, 6],
      '0,8': [4, 5, 6],
    });

    const step = hiddenTriples(board);
    expect(step).not.toBeNull();

    const reasonKeys = new Set(step!.reasonCells.map((p) => `${p.row},${p.col}`));
    const affectedKeys = new Set(step!.cellsAffected.map((p) => `${p.row},${p.col}`));
    expect(reasonKeys).toEqual(affectedKeys);
  });

  it('does not report a hidden triple that produces no eliminations', () => {
    // Build a board where digits 7,8,9 appear in exactly 3 cells in row 0
    // but those cells have ONLY {7,8,9} candidates — no eliminations possible
    const board: Board = {
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
    // Solve all rows except row 0 to avoid stray hidden triples
    for (let r = 1; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 1;
        board.cells[r][c].isGiven = true;
      }
    }
    // Row 0: first 3 cells solved, remaining 6 unsolved
    board.cells[0][0].value = 1; board.cells[0][0].isGiven = true;
    board.cells[0][1].value = 2; board.cells[0][1].isGiven = true;
    board.cells[0][2].value = 3; board.cells[0][2].isGiven = true;
    board.cells[0][3].candidates = new Set([7, 8]);
    board.cells[0][4].candidates = new Set([8, 9]);
    board.cells[0][5].candidates = new Set([7, 9]);
    board.cells[0][6].candidates = new Set([4, 5, 6]);
    board.cells[0][7].candidates = new Set([4, 5, 6]);
    board.cells[0][8].candidates = new Set([4, 5, 6]);

    expect(hiddenTriples(board)).toBeNull();
  });

  it('explanation uses 1-indexed notation', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 7, 8],
      '0,4': [5, 8, 9],
      '0,5': [6, 7, 9],
      '0,6': [4, 5, 6],
      '0,7': [4, 5, 6],
      '0,8': [4, 5, 6],
    });

    const step = hiddenTriples(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    expect(step!.explanation).not.toMatch(/R0|C0/);
  });
});
