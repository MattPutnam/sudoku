import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { nakedPairs } from '../strategies/nakedPairs';
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

describe('nakedPairs', () => {
  it('returns a valid step when a naked pair exists in a row', () => {
    // Row 0: cells (0,3) and (0,5) both have only {4,7}, cell (0,6) also has 4 as candidate
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 7],
      '0,4': [5, 6, 8, 9],
      '0,5': [4, 7],
      '0,6': [4, 6, 9],
      '0,7': [5, 8, 9],
      '0,8': [5, 6, 8],
    });

    const step = nakedPairs(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Naked Pair');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.reasonCells).toHaveLength(2);
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // The pair cells should have candidates {4,7}
    for (const rc of step!.reasonCells) {
      const cell = board.cells[rc.row][rc.col];
      expect([...cell.candidates].sort()).toEqual([4, 7]);
    }

    // Eliminations should only remove 4 and/or 7
    for (const digits of step!.candidatesEliminated.values()) {
      for (const d of digits) {
        expect([4, 7]).toContain(d);
      }
    }
  });

  it('returns null when no naked pair exists', () => {
    // A solved-ish board with no pairs
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(nakedPairs(board)).toBeNull();
  });

  it('does not report a pair that produces no eliminations', () => {
    // Two cells form a pair but no other cell in any shared group has those digits.
    // Use a fully solved board and inject a pair in two cells, ensuring no other
    // cell in any shared group (row, column, box) has those candidates.
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
    // Set all cells as solved except two in row 0 that form a pair
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (r === 0 && (c === 0 || c === 1)) {
          board.cells[r][c].value = null;
        } else {
          board.cells[r][c].value = 1; // placeholder solved
          board.cells[r][c].isGiven = true;
        }
      }
    }
    // Two cells with pair {4,7} — but no other unsolved cell anywhere
    board.cells[0][0].candidates = new Set([4, 7]);
    board.cells[0][1].candidates = new Set([4, 7]);
    // No other unsolved cells means nothing to eliminate from
    expect(nakedPairs(board)).toBeNull();
  });

  it('candidatesEliminated keys use 0-indexed row,col format', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 7],
      '0,4': [5, 6, 8, 9],
      '0,5': [4, 7],
      '0,6': [4, 6, 9],
      '0,7': [5, 8, 9],
      '0,8': [5, 6, 8],
    });

    const step = nakedPairs(board);
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
      '0,3': [4, 7],
      '0,4': [5, 6, 8, 9],
      '0,5': [4, 7],
      '0,6': [4, 6, 9],
      '0,7': [5, 8, 9],
      '0,8': [5, 6, 8],
    });

    const step = nakedPairs(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    expect(step!.explanation).not.toMatch(/R0|C0/);
  });
});
