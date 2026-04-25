import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { nakedQuads } from '../strategies/nakedQuads';
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

describe('nakedQuads', () => {
  it('returns a valid step when a naked quad exists', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    // Four cells in row 0 with union {4,5,7,8}, cell (0,8) also has 5
    const board = setBoardCandidates(base, {
      '0,3': [4, 5],
      '0,4': [5, 7],
      '0,5': [7, 8],
      '0,6': [4, 8],
      '0,7': [6, 9],
      '0,8': [5, 6, 9],
    });

    const step = nakedQuads(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Naked Quad');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.reasonCells).toHaveLength(4);
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // Union of reason cells' candidates should be exactly 4 digits
    const union = new Set<number>();
    for (const rc of step!.reasonCells) {
      for (const d of board.cells[rc.row][rc.col].candidates) union.add(d);
    }
    expect(union.size).toBe(4);
  });

  it('returns null when no naked quad exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(nakedQuads(board)).toBeNull();
  });

  it('reasonCells contains exactly 4 cells', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 5],
      '0,4': [5, 7],
      '0,5': [7, 8],
      '0,6': [4, 8],
      '0,7': [6, 9],
      '0,8': [5, 6, 9],
    });

    const step = nakedQuads(board);
    expect(step).not.toBeNull();
    expect(step!.reasonCells).toHaveLength(4);
  });

  it('explanation uses 1-indexed notation', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 5],
      '0,4': [5, 7],
      '0,5': [7, 8],
      '0,6': [4, 8],
      '0,7': [6, 9],
      '0,8': [5, 6, 9],
    });

    const step = nakedQuads(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    expect(step!.explanation).not.toMatch(/R0|C0/);
  });

  it('eliminations only remove digits from the quad union', () => {
    const base = createBoard(
      '123000000456000000789000000000000000000000000000000000000000000000000000000000000',
    );
    const board = setBoardCandidates(base, {
      '0,3': [4, 5],
      '0,4': [5, 7],
      '0,5': [7, 8],
      '0,6': [4, 8],
      '0,7': [6, 9],
      '0,8': [5, 6, 9],
    });

    const step = nakedQuads(board);
    expect(step).not.toBeNull();

    const union = new Set<number>();
    for (const rc of step!.reasonCells) {
      for (const d of board.cells[rc.row][rc.col].candidates) union.add(d);
    }

    for (const digits of step!.candidatesEliminated.values()) {
      for (const d of digits) {
        expect(union.has(d)).toBe(true);
      }
    }
  });
});
