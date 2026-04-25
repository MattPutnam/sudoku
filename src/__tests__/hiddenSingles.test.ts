import { describe, it, expect } from 'vitest';
import { createBoard, getRow, getCol, getBox } from '../board';
import { hiddenSingles } from '../strategies/hiddenSingles';
import type { Board } from '../types';

const PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

describe('hiddenSingles', () => {
  it('returns a valid step on the example puzzle', () => {
    const board = createBoard(PUZZLE);
    const step = hiddenSingles(board);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Hidden Single');
    expect(step!.valuePlaced).not.toBeNull();
    expect(step!.cellsAffected).toHaveLength(1);
    expect(step!.cellsAffected[0]).toEqual(step!.valuePlaced!.position);
  });

  it('has correct strategy name, valuePlaced, and non-empty explanation', () => {
    const board = createBoard(PUZZLE);
    const step = hiddenSingles(board);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Hidden Single');
    expect(step!.valuePlaced!.value).toBeGreaterThanOrEqual(1);
    expect(step!.valuePlaced!.value).toBeLessThanOrEqual(9);
    expect(step!.explanation.length).toBeGreaterThan(0);
  });

  it('placed digit is a candidate in only one cell in the identified group', () => {
    const board = createBoard(PUZZLE);
    const step = hiddenSingles(board);

    expect(step).not.toBeNull();
    const digit = step!.valuePlaced!.value;
    const explanation = step!.explanation;

    let groupCells: import('../types').Cell[];
    if (explanation.includes('row')) {
      const rowIdx = step!.valuePlaced!.position.row;
      groupCells = getRow(board, rowIdx);
    } else if (explanation.includes('column')) {
      const colIdx = step!.valuePlaced!.position.col;
      groupCells = getCol(board, colIdx);
    } else {
      const boxIdx = board.cells[step!.valuePlaced!.position.row][step!.valuePlaced!.position.col].box;
      groupCells = getBox(board, boxIdx);
    }

    const cellsWithDigit = groupCells.filter(
      (c) => c.value === null && c.candidates.has(digit)
    );
    expect(cellsWithDigit).toHaveLength(1);
  });

  it('returns null when no hidden single exists', () => {
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
    expect(hiddenSingles(modified)).toBeNull();
  });

  it('explanation mentions the group type (row/column/box) and is human-readable (R008)', () => {
    const board = createBoard(PUZZLE);
    const step = hiddenSingles(board);

    expect(step).not.toBeNull();
    const hasGroupType =
      step!.explanation.includes('row') ||
      step!.explanation.includes('column') ||
      step!.explanation.includes('box');
    expect(hasGroupType).toBe(true);
    expect(step!.explanation).toMatch(/\d/);
  });

  it('reasonCells contains cells from the group (R007)', () => {
    const board = createBoard(PUZZLE);
    const step = hiddenSingles(board);

    expect(step).not.toBeNull();
    expect(step!.reasonCells.length).toBeGreaterThan(0);
    expect(step!.reasonCells.length).toBeLessThanOrEqual(9);

    const placed = step!.valuePlaced!.position;
    const containsPlacedCell = step!.reasonCells.some(
      (c) => c.row === placed.row && c.col === placed.col
    );
    expect(containsPlacedCell).toBe(true);
  });
});
