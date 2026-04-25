import type { Board, SolveStep, Strategy } from '../types';

export const nakedSingles: Strategy = (board: Board): SolveStep | null => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board.cells[row][col];
      if (cell.value !== null) continue;
      if (cell.candidates.size !== 1) continue;

      const value = [...cell.candidates][0];
      return {
        strategy: 'Naked Single',
        cellsAffected: [{ row, col }],
        candidatesEliminated: new Map(),
        valuePlaced: { position: { row, col }, value },
        reasonCells: [{ row, col }],
        explanation: `Cell R${row + 1}C${col + 1} has only one candidate: ${value}`,
      };
    }
  }
  return null;
};
