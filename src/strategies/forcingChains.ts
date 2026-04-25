import { clone, setCellValue, getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';

const MAX_PROPAGATION = 50;

function hasContradiction(board: Board): { found: boolean; detail: string } {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board.cells[r][c];
      if (cell.value === null && cell.candidates.size === 0) {
        return { found: true, detail: `R${r + 1}C${c + 1} has no candidates` };
      }
    }
  }

  for (let i = 0; i < 9; i++) {
    const rowCells = getRow(board, i);
    const colCells = getCol(board, i);
    const boxCells = getBox(board, i);

    const rowVals = rowCells.filter(c => c.value !== null).map(c => c.value!);
    if (rowVals.length !== new Set(rowVals).size) {
      return { found: true, detail: `row ${i + 1} has duplicate values` };
    }

    const colVals = colCells.filter(c => c.value !== null).map(c => c.value!);
    if (colVals.length !== new Set(colVals).size) {
      return { found: true, detail: `column ${i + 1} has duplicate values` };
    }

    const boxVals = boxCells.filter(c => c.value !== null).map(c => c.value!);
    if (boxVals.length !== new Set(boxVals).size) {
      return { found: true, detail: `box ${i + 1} has duplicate values` };
    }

    for (const unitCells of [rowCells, colCells, boxCells]) {
      for (let digit = 1; digit <= 9; digit++) {
        if (unitCells.some(c => c.value === digit)) continue;
        const canHold = unitCells.some(c => c.value === null && c.candidates.has(digit));
        if (!canHold) {
          const label = unitCells === rowCells ? `row ${i + 1}` :
                        unitCells === colCells ? `column ${i + 1}` : `box ${i + 1}`;
          return { found: true, detail: `${label} has no place for ${digit}` };
        }
      }
    }
  }

  return { found: false, detail: '' };
}

function findHiddenSingle(board: Board): CellPosition & { value: number } | null {
  const units: { cells: ReturnType<typeof getRow> }[] = [];
  for (let i = 0; i < 9; i++) {
    units.push({ cells: getRow(board, i) });
    units.push({ cells: getCol(board, i) });
    units.push({ cells: getBox(board, i) });
  }

  for (const unit of units) {
    for (let digit = 1; digit <= 9; digit++) {
      const placed = unit.cells.some(c => c.value === digit);
      if (placed) continue;

      const possible = unit.cells.filter(c => c.value === null && c.candidates.has(digit));
      if (possible.length === 1) {
        return { row: possible[0].row, col: possible[0].col, value: digit };
      }
    }
  }

  return null;
}

function propagate(board: Board): { board: Board; contradiction: string | null } {
  let current = board;

  for (let iter = 0; iter < MAX_PROPAGATION; iter++) {
    const check = hasContradiction(current);
    if (check.found) return { board: current, contradiction: check.detail };

    let placed = false;

    // Naked singles
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = current.cells[r][c];
        if (cell.value === null && cell.candidates.size === 1) {
          const val = [...cell.candidates][0];
          current = setCellValue(current, { row: r, col: c }, val);
          placed = true;

          const postCheck = hasContradiction(current);
          if (postCheck.found) return { board: current, contradiction: postCheck.detail };
        }
      }
    }

    // Hidden singles
    if (!placed) {
      const hs = findHiddenSingle(current);
      if (hs) {
        current = setCellValue(current, { row: hs.row, col: hs.col }, hs.value);
        placed = true;

        const postCheck = hasContradiction(current);
        if (postCheck.found) return { board: current, contradiction: postCheck.detail };
      }
    }

    if (!placed) break;
  }

  return { board: current, contradiction: null };
}

export const forcingChains: Strategy = (board: Board): SolveStep | null => {
  const candidates: { row: number; col: number; count: number }[] = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board.cells[r][c];
      if (cell.value === null && cell.candidates.size >= 2 && cell.candidates.size <= 3) {
        candidates.push({ row: r, col: c, count: cell.candidates.size });
      }
    }
  }

  candidates.sort((a, b) => a.count - b.count);

  for (const { row, col } of candidates) {
    const cell = board.cells[row][col];

    for (const digit of cell.candidates) {
      const testBoard = clone(board);
      const placed = setCellValue(testBoard, { row, col }, digit);
      const result = propagate(placed);

      if (result.contradiction !== null) {
        const eliminations = new Map<string, number[]>();
        eliminations.set(`${row},${col}`, [digit]);

        return {
          strategy: 'Forcing Chains',
          cellsAffected: [{ row, col }],
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells: [{ row, col }],
          explanation: `Forcing Chains: assuming ${digit} at R${row + 1}C${col + 1} leads to contradiction (${result.contradiction}) — ${digit} eliminated`,
        };
      }
    }
  }

  return null;
};
