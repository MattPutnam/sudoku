import { getBox, getRow, getCol } from '../board';
import type { Board, SolveStep, Strategy } from '../types';
import { cpToDisplay, keyToCP } from '../utils/cellPosition';

export const pointingPairs: Strategy = (board: Board): SolveStep | null => {
  for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
    const boxCells = getBox(board, boxIdx);

    for (let digit = 1; digit <= 9; digit++) {
      const cells = boxCells.filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (cells.length < 2) continue;

      const rows = new Set(cells.map((c) => c.row));
      const cols = new Set(cells.map((c) => c.col));

      if (rows.size === 1) {
        const row = [...rows][0];
        const eliminations = new Map<string, number[]>();
        for (const c of getRow(board, row)) {
          if (c.box === boxIdx) continue;
          if (c.value === null && c.candidates.has(digit)) {
            eliminations.set(`${c.row},${c.col}`, [digit]);
          }
        }
        if (eliminations.size > 0) {
          const cellList = cells.map(cpToDisplay).join(', ');
          return {
            strategy: 'Pointing Pair',
            cellsAffected: [...eliminations.keys()].map(keyToCP),
            candidatesEliminated: eliminations,
            valuePlaced: null,
            reasonCells: cells.map((c) => ({ row: c.row, col: c.col })),
            explanation: `${digit} in box ${boxIdx + 1} is locked to row ${row + 1} (${cellList}) — eliminate ${digit} from other cells in row ${row + 1}`,
          };
        }
      }

      if (cols.size === 1) {
        const col = [...cols][0];
        const eliminations = new Map<string, number[]>();
        for (const c of getCol(board, col)) {
          if (c.box === boxIdx) continue;
          if (c.value === null && c.candidates.has(digit)) {
            eliminations.set(`${c.row},${c.col}`, [digit]);
          }
        }
        if (eliminations.size > 0) {
          const cellList = cells.map(cpToDisplay).join(', ');
          return {
            strategy: 'Pointing Pair',
            cellsAffected: [...eliminations.keys()].map(keyToCP),
            candidatesEliminated: eliminations,
            valuePlaced: null,
            reasonCells: cells.map((c) => ({ row: c.row, col: c.col })),
            explanation: `${digit} in box ${boxIdx + 1} is locked to column ${col + 1} (${cellList}) — eliminate ${digit} from other cells in column ${col + 1}`,
          };
        }
      }
    }
  }
  return null;
};
