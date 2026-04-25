import type { Board, Cell, CellPosition } from './types';
import { cpToKey, keyToCoords } from './utils/cellPosition';

export function createBoard(givens: string): Board {
  if (givens.length !== 81) {
    throw new Error(`Expected 81 characters, got ${givens.length}`);
  }

  const cells: Cell[][] = [];
  for (let row = 0; row < 9; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < 9; col++) {
      const char = givens[row * 9 + col];
      const value = char >= '1' && char <= '9' ? parseInt(char, 10) : null;
      rowCells.push({
        value,
        candidates: new Set<number>(),
        row,
        col,
        box: Math.floor(row / 3) * 3 + Math.floor(col / 3),
        isGiven: value !== null,
      });
    }
    cells.push(rowCells);
  }

  return computeCandidates({ cells });
}

export type GroupType = 'row' | 'column' | 'box';

export function getRow(board: Board, row: number): Cell[] {
  return board.cells[row];
}

export function getCol(board: Board, col: number): Cell[] {
  return board.cells.map((row) => row[col]);
}

export function getBox(board: Board, box: number): Cell[] {
  const startRow = Math.floor(box / 3) * 3;
  const startCol = (box % 3) * 3;
  const cells: Cell[] = [];
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      cells.push(board.cells[r][c]);
    }
  }
  return cells;
}

export function getPeers(board: Board, pos: CellPosition): Cell[] {
  const seen = new Set<string>();
  const peers: Cell[] = [];
  const self = `${pos.row},${pos.col}`;
  seen.add(self);

  const addPeer = (cell: Cell) => {
    const key = cpToKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      peers.push(cell);
    }
  };

  for (const cell of getRow(board, pos.row)) addPeer(cell);
  for (const cell of getCol(board, pos.col)) addPeer(cell);
  const box = board.cells[pos.row][pos.col].box;
  for (const cell of getBox(board, box)) addPeer(cell);

  return peers;
}

export function computeCandidates(board: Board): Board {
  const newCells = board.cells.map((row) =>
    row.map((cell) => ({ ...cell, candidates: new Set<number>() }))
  );

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = newCells[row][col];
      if (cell.value !== null) continue;

      const used = new Set<number>();
      for (const c of getRow(board, row)) if (c.value !== null) used.add(c.value);
      for (const c of getCol(board, col)) if (c.value !== null) used.add(c.value);
      for (const c of getBox(board, cell.box)) if (c.value !== null) used.add(c.value);

      for (let n = 1; n <= 9; n++) {
        if (!used.has(n)) cell.candidates.add(n);
      }
    }
  }

  return { cells: newCells };
}

export function setCellValue(
  board: Board,
  pos: CellPosition,
  value: number | null
): Board {
  const cell = board.cells[pos.row][pos.col];
  if (cell.isGiven) return board;

  if (value !== null && (value < 1 || value > 9 || !Number.isInteger(value))) {
    throw new Error(`Invalid cell value: ${value}. Must be 1-9 or null.`);
  }

  const newCells = board.cells.map((row) =>
    row.map((c) => ({ ...c, candidates: new Set(c.candidates) }))
  );
  newCells[pos.row][pos.col] = {
    ...newCells[pos.row][pos.col],
    value,
    candidates: new Set<number>(),
  };

  return computeCandidates({ cells: newCells });
}

export function clone(board: Board): Board {
  return {
    cells: board.cells.map((row) =>
      row.map((cell) => ({
        ...cell,
        candidates: new Set(cell.candidates),
      }))
    ),
  };
}

export function eliminateCandidates(
  board: Board,
  eliminations: Map<string, number[]>,
): Board {
  const newBoard = clone(board);
  for (const [key, digits] of eliminations) {
    const [row, col] = keyToCoords(key);
    const cell = newBoard.cells[row][col];
    if (cell.value !== null) continue;
    for (const digit of digits) {
      cell.candidates.delete(digit);
    }
  }
  return newBoard;
}
