import type { Board, SolveStep, Strategy } from '../types';
import { getRow, getCol, getBox } from '../board';
import { findHiddenSubset } from './hiddenPairs';

export const hiddenQuads: Strategy = (board: Board): SolveStep | null => {
  for (let i = 0; i < 9; i++) {
    const result = findHiddenSubset(getRow(board, i), 4, 'row', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findHiddenSubset(getCol(board, i), 4, 'column', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findHiddenSubset(getBox(board, i), 4, 'box', i);
    if (result) return result;
  }
  return null;
};
