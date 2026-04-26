import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { solve } from '../solver';
import { forcingChains } from '../strategies/forcingChains';
import type { Board } from '../types';
import { keyToCoords } from '../utils/cellPosition';

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
    const [r, c] = keyToCoords(key);
    cells[r][c].candidates = new Set(digits);
  }
  return { cells };
}

describe('forcingChains', () => {
  it('returns null on a solved board', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(forcingChains(board)).toBeNull();
  });

  it('returns null when no candidate leads to contradiction within depth limit', () => {
    // Board with bivalue cells where neither candidate causes contradiction
    const board = createBoard(
      '534678912672195348198342567859761423426853791713924856961537284287419635345286170',
    );
    expect(forcingChains(board)).toBeNull();
  });

  it('detects contradiction and eliminates impossible candidate', () => {
    // Board setup: row 0 has values [_, _, 3, 4, 5, 6, 7, 8, 9]
    // (0,0) has {1,2}, col 1 has 2 placed at (3,1)
    // Placing 1 at (0,0) → computeCandidates makes (0,1) have no candidates → contradiction
    const board = emptyBoard();
    board.cells[0][2].value = 3;
    board.cells[0][3].value = 4;
    board.cells[0][4].value = 5;
    board.cells[0][5].value = 6;
    board.cells[0][6].value = 7;
    board.cells[0][7].value = 8;
    board.cells[0][8].value = 9;
    board.cells[1][0].value = 3;
    board.cells[2][0].value = 4;
    board.cells[3][1].value = 2;

    const modified = setBoardCandidates(board, {
      '0,0': [1, 2],
      '0,1': [1, 2],
    });

    const result = forcingChains(modified);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe('Forcing Chains');
    expect(result!.candidatesEliminated.get('0,0')).toEqual([1]);
    expect(result!.valuePlaced).toBeNull();
  });

  it('uses 1-indexed coordinates in explanation (R008)', () => {
    const board = emptyBoard();
    board.cells[0][2].value = 3;
    board.cells[0][3].value = 4;
    board.cells[0][4].value = 5;
    board.cells[0][5].value = 6;
    board.cells[0][6].value = 7;
    board.cells[0][7].value = 8;
    board.cells[0][8].value = 9;
    board.cells[1][0].value = 3;
    board.cells[2][0].value = 4;
    board.cells[3][1].value = 2;

    const modified = setBoardCandidates(board, {
      '0,0': [1, 2],
      '0,1': [1, 2],
    });

    const result = forcingChains(modified);
    expect(result).not.toBeNull();
    expect(result!.explanation).toContain('R1C1');
    expect(result!.explanation).not.toContain('R0C0');
  });

  it('populates reasonCells (R007)', () => {
    const board = emptyBoard();
    board.cells[0][2].value = 3;
    board.cells[0][3].value = 4;
    board.cells[0][4].value = 5;
    board.cells[0][5].value = 6;
    board.cells[0][6].value = 7;
    board.cells[0][7].value = 8;
    board.cells[0][8].value = 9;
    board.cells[1][0].value = 3;
    board.cells[2][0].value = 4;
    board.cells[3][1].value = 2;

    const modified = setBoardCandidates(board, {
      '0,0': [1, 2],
      '0,1': [1, 2],
    });

    const result = forcingChains(modified);
    expect(result).not.toBeNull();
    expect(result!.reasonCells.length).toBeGreaterThan(0);
  });

  it('only tries cells with up to 5 candidates', () => {
    const board = emptyBoard();
    // Only cell has 6 candidates — should not be tried
    const modified = setBoardCandidates(board, {
      '0,0': [1, 2, 3, 4, 5, 6],
    });
    expect(forcingChains(modified)).toBeNull();
  });

  it('works on a real puzzle that requires forcing chains', () => {
    // This puzzle uses Forcing Chains as part of its solution path
    const board = createBoard(
      '000000001000003000020500400000000520004070100087000000500200030300010000100800000',
    );
    const result = solve(board);
    const usedStrategies = result.steps.map(s => s.strategy);
    expect(usedStrategies).toContain('Forcing Chains');
  });
});
