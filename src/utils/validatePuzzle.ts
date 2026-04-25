import { getRow, getCol, getBox } from '../board';
import type { Board } from '../types';

export type ValidationStatus =
  | 'valid'
  | 'too-few-givens'
  | 'has-conflicts';

export interface ValidationResult {
  status: ValidationStatus;
  message: string;
}

export function validatePuzzle(board: Board): ValidationResult {
  let givenCount = 0;
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.value !== null) givenCount++;
    }
  }
  if (givenCount < 17) {
    return {
      status: 'too-few-givens',
      message: `Need at least 17 givens (have ${givenCount})`,
    };
  }

  for (let r = 0; r < 9; r++) {
    const rowCells = getRow(board, r);
    if (hasDuplicates(rowCells.map((c) => c.value))) {
      return { status: 'has-conflicts', message: 'Puzzle has conflicting digits' };
    }
  }
  for (let c = 0; c < 9; c++) {
    const colCells = getCol(board, c);
    if (hasDuplicates(colCells.map((cell) => cell.value))) {
      return { status: 'has-conflicts', message: 'Puzzle has conflicting digits' };
    }
  }
  for (let b = 0; b < 9; b++) {
    const boxCells = getBox(board, b);
    if (hasDuplicates(boxCells.map((cell) => cell.value))) {
      return { status: 'has-conflicts', message: 'Puzzle has conflicting digits' };
    }
  }

  return { status: 'valid', message: 'Puzzle is valid' };
}

function hasDuplicates(values: (number | null)[]): boolean {
  const seen = new Set<number>();
  for (const v of values) {
    if (v === null) continue;
    if (seen.has(v)) return true;
    seen.add(v);
  }
  return false;
}
