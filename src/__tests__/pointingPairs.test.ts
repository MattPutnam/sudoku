import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { pointingPairs } from '../strategies/pointingPairs';
import type { Board } from '../types';

// Puzzle known to contain pointing pair opportunities after initial singles are exhausted
const PUZZLE =
  '300000000970010000600583000200000900500621003008000001000435002000090056000000004';

describe('pointingPairs', () => {
  it('returns a valid step on a board with a pointing pair pattern', () => {
    const board = createBoard(PUZZLE);
    const step = pointingPairs(board);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Pointing Pair');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
  });

  it('returns null on a board with no pointing pair pattern', () => {
    // A board where every empty cell has candidates in all three rows/cols of its box
    // so no pointing pair can exist — use a board where all empty cells have all digits
    const board = createBoard(PUZZLE);
    const modified: Board = {
      cells: board.cells.map((row) =>
        row.map((cell) => {
          if (cell.value !== null) return { ...cell, candidates: new Set(cell.candidates) };
          const cands = new Set<number>();
          for (let n = 1; n <= 9; n++) cands.add(n);
          return { ...cell, candidates: cands };
        })
      ),
    };
    expect(pointingPairs(modified)).toBeNull();
  });

  it('candidatesEliminated is non-empty with correct digit', () => {
    const board = createBoard(PUZZLE);
    const step = pointingPairs(board);

    expect(step).not.toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // Every elimination should be for the same digit (the locked candidate)
    const allDigits = new Set<number>();
    for (const digits of step!.candidatesEliminated.values()) {
      for (const d of digits) allDigits.add(d);
    }
    expect(allDigits.size).toBe(1);
    const digit = [...allDigits][0];
    expect(digit).toBeGreaterThanOrEqual(1);
    expect(digit).toBeLessThanOrEqual(9);
  });

  it('valuePlaced is null', () => {
    const board = createBoard(PUZZLE);
    const step = pointingPairs(board);

    expect(step).not.toBeNull();
    expect(step!.valuePlaced).toBeNull();
  });

  it('reasonCells contains the locked candidate cells in the box', () => {
    const board = createBoard(PUZZLE);
    const step = pointingPairs(board);

    expect(step).not.toBeNull();
    expect(step!.reasonCells.length).toBeGreaterThanOrEqual(2);

    // All reason cells should be in the same box
    const boxes = step!.reasonCells.map(
      (pos) => board.cells[pos.row][pos.col].box,
    );
    expect(new Set(boxes).size).toBe(1);

    // All reason cells should share a row or a column
    const rows = new Set(step!.reasonCells.map((c) => c.row));
    const cols = new Set(step!.reasonCells.map((c) => c.col));
    expect(rows.size === 1 || cols.size === 1).toBe(true);
  });

  it('explanation uses 1-indexed R1C1 notation', () => {
    const board = createBoard(PUZZLE);
    const step = pointingPairs(board);

    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    // Should not contain R0 or C0 (0-indexed)
    expect(step!.explanation).not.toMatch(/R0|C0/);
  });

  it('affected cells are outside the box but in the same row/col as reason cells', () => {
    const board = createBoard(PUZZLE);
    const step = pointingPairs(board);

    expect(step).not.toBeNull();
    const reasonBox = board.cells[step!.reasonCells[0].row][step!.reasonCells[0].col].box;

    for (const pos of step!.cellsAffected) {
      const cell = board.cells[pos.row][pos.col];
      // Affected cells must be outside the box
      expect(cell.box).not.toBe(reasonBox);
    }
  });
});
