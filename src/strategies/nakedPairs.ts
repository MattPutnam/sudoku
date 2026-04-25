import { getRow, getCol, getBox } from '../board';
import type { Board, Cell, SolveStep, Strategy } from '../types';

type GroupType = 'row' | 'column' | 'box';

function combinations(items: Cell[], size: number): Cell[][] {
  const result: Cell[][] = [];
  function recurse(start: number, current: Cell[]) {
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

export function findNakedSubset(
  groupCells: Cell[],
  size: number,
  groupType: GroupType,
  groupIndex: number,
): SolveStep | null {
  const unsolved = groupCells.filter(
    (c) => c.value === null && c.candidates.size >= 1 && c.candidates.size <= size,
  );
  if (unsolved.length < size) return null;

  for (const combo of combinations(unsolved, size)) {
    const union = new Set<number>();
    for (const cell of combo) {
      for (const d of cell.candidates) union.add(d);
    }
    if (union.size !== size) continue;

    const comboKeys = new Set(combo.map((c) => `${c.row},${c.col}`));
    const eliminations = new Map<string, number[]>();

    for (const cell of groupCells) {
      if (cell.value !== null) continue;
      const key = `${cell.row},${cell.col}`;
      if (comboKeys.has(key)) continue;
      const removed: number[] = [];
      for (const d of union) {
        if (cell.candidates.has(d)) removed.push(d);
      }
      if (removed.length > 0) eliminations.set(key, removed);
    }

    if (eliminations.size === 0) continue;

    const strategyNames: Record<number, string> = { 2: 'Naked Pair', 3: 'Naked Triple', 4: 'Naked Quad' };
    const strategyName = strategyNames[size] ?? `Naked Subset (${size})`;
    const digits = [...union].sort().join(', ');
    const cellList = combo.map((c) => `R${c.row + 1}C${c.col + 1}`).join(', ');

    return {
      strategy: strategyName,
      cellsAffected: [...eliminations.keys()].map((k) => {
        const [r, c] = k.split(',').map(Number);
        return { row: r, col: c };
      }),
      candidatesEliminated: eliminations,
      valuePlaced: null,
      reasonCells: combo.map((c) => ({ row: c.row, col: c.col })),
      explanation: `${cellList} in ${groupType} ${groupIndex + 1} form a naked ${size === 2 ? 'pair' : size === 3 ? 'triple' : 'quad'} on {${digits}} — eliminate ${digits} from other cells in ${groupType} ${groupIndex + 1}`,
    };
  }

  return null;
}

export const nakedPairs: Strategy = (board: Board): SolveStep | null => {
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getRow(board, i), 2, 'row', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getCol(board, i), 2, 'column', i);
    if (result) return result;
  }
  for (let i = 0; i < 9; i++) {
    const result = findNakedSubset(getBox(board, i), 2, 'box', i);
    if (result) return result;
  }
  return null;
};
