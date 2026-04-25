import { getRow, getCol, getBox, type GroupType } from '../board';
import type { Board, Cell, SolveStep, Strategy } from '../types';

function combinations(items: number[], size: number): number[][] {
  const result: number[][] = [];
  function recurse(start: number, current: number[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      recurse(i + 1, current);
      current.pop();
    }
  }
  recurse(0, []);
  return result;
}

export function findHiddenSubset(
  groupCells: Cell[],
  size: number,
  groupType: GroupType,
  groupIndex: number,
): SolveStep | null {
  const digitCells = new Map<number, Cell[]>();
  for (let digit = 1; digit <= 9; digit++) {
    const cells: Cell[] = [];
    for (const cell of groupCells) {
      if (cell.value === null && cell.candidates.has(digit)) {
        cells.push(cell);
      }
    }
    if (cells.length >= 2 && cells.length <= size) {
      digitCells.set(digit, cells);
    }
  }

  const eligibleDigits = [...digitCells.keys()];
  if (eligibleDigits.length < size) return null;

  for (const combo of combinations(eligibleDigits, size)) {
    const cellUnion = new Map<string, Cell>();
    for (const digit of combo) {
      for (const cell of digitCells.get(digit)!) {
        cellUnion.set(`${cell.row},${cell.col}`, cell);
      }
    }

    if (cellUnion.size !== size) continue;

    const subsetDigits = new Set(combo);
    const eliminations = new Map<string, number[]>();

    for (const [key, cell] of cellUnion) {
      const removed: number[] = [];
      for (const d of cell.candidates) {
        if (!subsetDigits.has(d)) removed.push(d);
      }
      if (removed.length > 0) eliminations.set(key, removed);
    }

    if (eliminations.size === 0) continue;

    const strategyNames: Record<number, string> = { 2: 'Hidden Pair', 3: 'Hidden Triple', 4: 'Hidden Quad' };
    const strategyName = strategyNames[size] ?? `Hidden Subset (${size})`;
    const digits = combo.sort((a, b) => a - b).join(', ');
    const subsetCells = [...cellUnion.values()];
    const cellList = subsetCells.map((c) => `R${c.row + 1}C${c.col + 1}`).join(', ');

    return {
      strategy: strategyName,
      cellsAffected: subsetCells.map((c) => ({ row: c.row, col: c.col })),
      candidatesEliminated: eliminations,
      valuePlaced: null,
      reasonCells: subsetCells.map((c) => ({ row: c.row, col: c.col })),
      explanation: `${cellList} in ${groupType} ${groupIndex + 1} form a hidden ${size === 2 ? 'pair' : size === 3 ? 'triple' : 'quad'} on {${digits}} — eliminate other candidates from those cells`,
    };
  }

  return null;
}

export const hiddenPairs: Strategy = (board: Board): SolveStep | null => {
  for (let i = 0; i < 9; i++) {
    const result = findHiddenSubset(getRow(board, i), 2, 'row', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findHiddenSubset(getCol(board, i), 2, 'column', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findHiddenSubset(getBox(board, i), 2, 'box', i);
    if (result) return result;
  }
  return null;
};
