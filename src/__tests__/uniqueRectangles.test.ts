import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { uniqueRectangle } from '../strategies/uniqueRectangles';
import type { Board } from '../types';

function emptyBoard(): Board {
  return {
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
}

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

describe('uniqueRectangle', () => {
  it('detects a Type 1 unique rectangle and eliminates candidates', () => {
    // Rectangle at (0,0), (0,1), (3,0), (3,1)
    // Boxes: (0,0)=box0, (0,1)=box0, (3,0)=box3, (3,1)=box3 → 2 unique boxes
    // Three bivalue {2,5}: (0,0), (0,1), (3,0). Fourth (3,1) has {2,5,7}.
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {
      '0,0': [2, 5],
      '0,1': [2, 5],
      '3,0': [2, 5],
      '3,1': [2, 5, 7],
    };
    const b = setBoardCandidates(board, overrides);

    const step = uniqueRectangle(b);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Unique Rectangle');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBe(1);

    const elimKey = [...step!.candidatesEliminated.keys()][0];
    expect(elimKey).toBe('3,1');
    const elimDigits = step!.candidatesEliminated.get(elimKey)!.sort((a: number, b: number) => a - b);
    expect(elimDigits).toEqual([2, 5]);

    expect(step!.reasonCells).toHaveLength(4);
    expect(step!.explanation).toMatch(/R\d+C\d+/);
    expect(step!.explanation).toMatch(/deadly pattern/);
  });

  it('returns null when no unique rectangle exists', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(uniqueRectangle(board)).toBeNull();
  });

  it('returns null when rectangle spans only one box', () => {
    // (0,0),(0,1),(1,0),(1,1) — all in box 0 → 1 unique box, not 2
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {
      '0,0': [3, 6],
      '0,1': [3, 6],
      '1,0': [3, 6],
      '1,1': [3, 6, 9],
    };
    const b = setBoardCandidates(board, overrides);
    expect(uniqueRectangle(b)).toBeNull();
  });

  it('returns null when fourth corner has only the pair candidates', () => {
    // All four corners bivalue {2,5} — fourth corner doesn't have extras
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {
      '0,0': [2, 5],
      '0,1': [2, 5],
      '3,0': [2, 5],
      '3,1': [2, 5],
    };
    const b = setBoardCandidates(board, overrides);
    expect(uniqueRectangle(b)).toBeNull();
  });

  it('returns null when rectangle spans four boxes', () => {
    // (0,0)=box0, (0,3)=box1, (3,0)=box3, (3,3)=box4 → 4 unique boxes
    const board = emptyBoard();
    const overrides: Record<string, number[]> = {
      '0,0': [2, 5],
      '0,3': [2, 5],
      '3,0': [2, 5],
      '3,3': [2, 5, 7],
    };
    const b = setBoardCandidates(board, overrides);
    expect(uniqueRectangle(b)).toBeNull();
  });
});
