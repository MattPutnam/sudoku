import type { Board } from '../types';
import { getRow, getCol, getBox } from '../board';

export type ValidationStatus =
  | 'valid'
  | 'too-few-givens'
  | 'has-conflicts'
  | 'no-solution'
  | 'multiple-solutions';

export interface ValidationResult {
  status: ValidationStatus;
  message: string;
}

export function validatePuzzle(board: Board): ValidationResult {
  // 1. Cheap check: count givens
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

  // 2. Medium check: row/col/box conflicts
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

  // 3. Expensive check: backtracking solution count
  const grid = boardToGrid(board);
  const solutions = countSolutions(grid, 2);

  if (solutions === 0) {
    return { status: 'no-solution', message: 'Puzzle has no solution' };
  }
  if (solutions > 1) {
    return { status: 'multiple-solutions', message: 'Puzzle has multiple solutions' };
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

function boardToGrid(board: Board): number[][] {
  return board.cells.map((row) =>
    row.map((cell) => cell.value ?? 0)
  );
}

function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function countSolutions(grid: number[][], limit: number): number {
  let count = 0;

  function solve(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        for (let num = 1; num <= 9; num++) {
          if (!isValid(grid, r, c, num)) continue;
          grid[r][c] = num;
          if (solve()) return true;
          grid[r][c] = 0;
        }
        return false;
      }
    }
    // All cells filled — found a solution
    count++;
    return count >= limit;
  }

  solve();
  return count;
}
