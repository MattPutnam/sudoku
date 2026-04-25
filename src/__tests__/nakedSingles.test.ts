import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { nakedSingles } from '../strategies/nakedSingles';
import type { Board } from '../types';

const PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

describe('nakedSingles', () => {
  it('returns a valid SolveStep on the example puzzle', () => {
    const board = createBoard(PUZZLE);
    const step = nakedSingles(board);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Naked Single');
    expect(step!.valuePlaced).not.toBeNull();
    expect(step!.cellsAffected).toHaveLength(1);
    expect(step!.cellsAffected[0]).toEqual(step!.valuePlaced!.position);
    expect(step!.explanation).toBeTruthy();
  });

  it('places the only candidate value in the cell', () => {
    const board = createBoard(PUZZLE);
    const step = nakedSingles(board);

    expect(step).not.toBeNull();
    const { row, col } = step!.valuePlaced!.position;
    const cell = board.cells[row][col];
    expect(cell.candidates.size).toBe(1);
    expect(cell.candidates.has(step!.valuePlaced!.value)).toBe(true);
  });

  it('returns null when no naked single exists', () => {
    const board = createBoard(PUZZLE);
    const modified: Board = {
      cells: board.cells.map((row) =>
        row.map((cell) => {
          if (cell.value === null && cell.candidates.size === 1) {
            return { ...cell, candidates: new Set([...cell.candidates, 9]) };
          }
          return { ...cell, candidates: new Set(cell.candidates) };
        })
      ),
    };
    expect(nakedSingles(modified)).toBeNull();
  });

  it('explanation contains 1-indexed cell position and value (R008)', () => {
    const board = createBoard(PUZZLE);
    const step = nakedSingles(board);

    expect(step).not.toBeNull();
    const { row, col } = step!.valuePlaced!.position;
    expect(step!.explanation).toContain(`R${row + 1}C${col + 1}`);
    expect(step!.explanation).toContain(String(step!.valuePlaced!.value));
  });

  it('reasonCells is populated (R007)', () => {
    const board = createBoard(PUZZLE);
    const step = nakedSingles(board);

    expect(step).not.toBeNull();
    expect(step!.reasonCells.length).toBeGreaterThan(0);
    expect(step!.reasonCells[0]).toEqual(step!.valuePlaced!.position);
  });

  it('returns null on a fully solved board', () => {
    const solved =
      '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
    const board = createBoard(solved);
    expect(nakedSingles(board)).toBeNull();
  });

  it('returns null when all empty cells have 2+ candidates', () => {
    const board = createBoard(PUZZLE);
    const modified: Board = {
      cells: board.cells.map((row) =>
        row.map((cell) => {
          if (cell.value === null && cell.candidates.size < 2) {
            const cands = new Set(cell.candidates);
            for (let n = 1; n <= 9; n++) {
              if (cands.size >= 2) break;
              cands.add(n);
            }
            return { ...cell, candidates: cands };
          }
          return { ...cell, candidates: new Set(cell.candidates) };
        })
      ),
    };
    expect(nakedSingles(modified)).toBeNull();
  });
});
