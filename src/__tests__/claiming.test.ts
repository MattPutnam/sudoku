import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { claiming } from '../strategies/claiming';
import type { Board } from '../types';

// Puzzle known to have claiming opportunities
const PUZZLE =
  '300000000970010000600583000200000900500621003008000001000435002000090056000000004';

describe('claiming', () => {
  it('returns a valid step on a board with a claiming pattern', () => {
    const board = createBoard(PUZZLE);
    const step = claiming(board);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Claiming');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
  });

  it('returns null on a board with no claiming pattern', () => {
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
    expect(claiming(modified)).toBeNull();
  });

  it('candidatesEliminated is non-empty with correct digit', () => {
    const board = createBoard(PUZZLE);
    const step = claiming(board);

    expect(step).not.toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

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
    const step = claiming(board);

    expect(step).not.toBeNull();
    expect(step!.valuePlaced).toBeNull();
  });

  it('reasonCells are all in the same row or column', () => {
    const board = createBoard(PUZZLE);
    const step = claiming(board);

    expect(step).not.toBeNull();
    expect(step!.reasonCells.length).toBeGreaterThanOrEqual(2);

    const rows = new Set(step!.reasonCells.map((c) => c.row));
    const cols = new Set(step!.reasonCells.map((c) => c.col));
    // Claiming finds pattern in a row or column, so reason cells share row or column
    expect(rows.size === 1 || cols.size === 1).toBe(true);

    // All reason cells should be in the same box
    const boxes = step!.reasonCells.map(
      (pos) => board.cells[pos.row][pos.col].box,
    );
    expect(new Set(boxes).size).toBe(1);
  });

  it('explanation uses 1-indexed R1C1 notation', () => {
    const board = createBoard(PUZZLE);
    const step = claiming(board);

    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    expect(step!.explanation).not.toMatch(/R0|C0/);
  });

  it('affected cells are inside the box but outside the row/col of reason cells', () => {
    const board = createBoard(PUZZLE);
    const step = claiming(board);

    expect(step).not.toBeNull();
    const reasonBox = board.cells[step!.reasonCells[0].row][step!.reasonCells[0].col].box;
    const reasonRows = new Set(step!.reasonCells.map((c) => c.row));
    const reasonCols = new Set(step!.reasonCells.map((c) => c.col));

    for (const pos of step!.cellsAffected) {
      const cell = board.cells[pos.row][pos.col];
      // Affected cells must be inside the same box
      expect(cell.box).toBe(reasonBox);
      // But outside the row/col where the pattern was found
      if (reasonRows.size === 1) {
        expect(pos.row).not.toBe([...reasonRows][0]);
      } else {
        expect(pos.col).not.toBe([...reasonCols][0]);
      }
    }
  });
});
