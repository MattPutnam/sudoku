import { getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy } from '../types';
import { keyToCP } from '../utils/cellPosition';

export const claiming: Strategy = (board: Board): SolveStep | null => {
  // Check rows: if all candidates for a digit in a row fall in one box, eliminate from rest of box
  for (let rowIdx = 0; rowIdx < 9; rowIdx++) {
    const rowCells = getRow(board, rowIdx);
    for (let digit = 1; digit <= 9; digit++) {
      const cells = rowCells.filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (cells.length < 2) continue;

      const boxes = new Set(cells.map((c) => c.box));
      if (boxes.size !== 1) continue;

      const boxIdx = [...boxes][0];
      const eliminations = new Map<string, number[]>();
      for (const c of getBox(board, boxIdx)) {
        if (c.row === rowIdx) continue;
        if (c.value === null && c.candidates.has(digit)) {
          eliminations.set(`${c.row},${c.col}`, [digit]);
        }
      }
      if (eliminations.size > 0) {
        const cellList = cells
          .map((c) => `R${c.row + 1}C${c.col + 1}`)
          .join(', ');
        return {
          strategy: 'Claiming',
          cellsAffected: [...eliminations.keys()].map(keyToCP),
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells: cells.map((c) => ({ row: c.row, col: c.col })),
          explanation: `${digit} in row ${rowIdx + 1} is confined to box ${boxIdx + 1} (${cellList}) — eliminate ${digit} from other cells in box ${boxIdx + 1}`,
        };
      }
    }
  }

  // Check columns: if all candidates for a digit in a column fall in one box, eliminate from rest of box
  for (let colIdx = 0; colIdx < 9; colIdx++) {
    const colCells = getCol(board, colIdx);
    for (let digit = 1; digit <= 9; digit++) {
      const cells = colCells.filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (cells.length < 2) continue;

      const boxes = new Set(cells.map((c) => c.box));
      if (boxes.size !== 1) continue;

      const boxIdx = [...boxes][0];
      const eliminations = new Map<string, number[]>();
      for (const c of getBox(board, boxIdx)) {
        if (c.col === colIdx) continue;
        if (c.value === null && c.candidates.has(digit)) {
          eliminations.set(`${c.row},${c.col}`, [digit]);
        }
      }
      if (eliminations.size > 0) {
        const cellList = cells
          .map((c) => `R${c.row + 1}C${c.col + 1}`)
          .join(', ');
        return {
          strategy: 'Claiming',
          cellsAffected: [...eliminations.keys()].map(keyToCP),
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells: cells.map((c) => ({ row: c.row, col: c.col })),
          explanation: `${digit} in column ${colIdx + 1} is confined to box ${boxIdx + 1} (${cellList}) — eliminate ${digit} from other cells in box ${boxIdx + 1}`,
        };
      }
    }
  }

  return null;
};
