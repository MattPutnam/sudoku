import type { Board, Cell, SolveStep, Strategy } from '../types';
import { getRow, getCol, getBox } from '../board';

type GroupType = 'row' | 'column' | 'box';

function findInGroup(
  groupCells: Cell[],
  groupType: GroupType,
  groupIndex: number
): SolveStep | null {
  for (let digit = 1; digit <= 9; digit++) {
    const positions: { row: number; col: number }[] = [];
    for (const cell of groupCells) {
      if (cell.value === null && cell.candidates.has(digit)) {
        positions.push({ row: cell.row, col: cell.col });
      }
    }
    if (positions.length === 1) {
      const { row, col } = positions[0];
      return {
        strategy: 'Hidden Single',
        cellsAffected: [{ row, col }],
        candidatesEliminated: new Map(),
        valuePlaced: { position: { row, col }, value: digit },
        reasonCells: groupCells.map((c) => ({ row: c.row, col: c.col })),
        explanation: `${digit} can only go in one cell in ${groupType} ${groupIndex + 1}`,
      };
    }
  }
  return null;
}

export const hiddenSingles: Strategy = (board: Board): SolveStep | null => {
  for (let i = 0; i < 9; i++) {
    const result = findInGroup(getRow(board, i), 'row', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findInGroup(getCol(board, i), 'column', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findInGroup(getBox(board, i), 'box', i);
    if (result) return result;
  }
  return null;
};
