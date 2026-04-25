import { getRow, getCol, getBox } from '../board';
import { findNakedSubset } from './nakedPairs';
import type { Board, SolveStep, Strategy } from '../types';

export const nakedTriples: Strategy = (board: Board): SolveStep | null => {
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getRow(board, i), 3, 'row', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getCol(board, i), 3, 'column', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getBox(board, i), 3, 'box', i);
    if (result) return result;
  }
  return null;
};
