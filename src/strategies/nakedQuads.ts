import type { Board, SolveStep, Strategy } from '../types';
import { getRow, getCol, getBox } from '../board';
import { findNakedSubset } from './nakedPairs';

export const nakedQuads: Strategy = (board: Board): SolveStep | null => {
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getRow(board, i), 4, 'row', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getCol(board, i), 4, 'column', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getBox(board, i), 4, 'box', i);
    if (result) return result;
  }
  return null;
};
