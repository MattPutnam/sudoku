import { getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { cpToDisplay, keyToCP } from '../utils/cellPosition';

export interface ALS {
  cells: CellPosition[];
  candidates: Set<number>;
  unitType: 'row' | 'col' | 'box';
  unitIndex: number;
}

const key = (p: CellPosition) => `${p.row},${p.col}`;

function sharesUnit(a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row) return true;
  if (a.col === b.col) return true;
  const boxA = Math.floor(a.row / 3) * 3 + Math.floor(a.col / 3);
  const boxB = Math.floor(b.row / 3) * 3 + Math.floor(b.col / 3);
  return boxA === boxB;
}

function cellsSeeEachOther(groupA: CellPosition[], groupB: CellPosition[]): boolean {
  for (const a of groupA) {
    for (const b of groupB) {
      if (!sharesUnit(a, b)) return false;
    }
  }
  return true;
}

export function findAllALS(board: Board): ALS[] {
  const result: ALS[] = [];
  const MAX_SIZE = 4;

  const units: { cells: CellPosition[]; type: 'row' | 'col' | 'box'; index: number }[] = [];

  for (let i = 0; i < 9; i++) {
    units.push({
      cells: getRow(board, i).filter(c => c.value === null).map(c => ({ row: c.row, col: c.col })),
      type: 'row',
      index: i,
    });
    units.push({
      cells: getCol(board, i).filter(c => c.value === null).map(c => ({ row: c.row, col: c.col })),
      type: 'col',
      index: i,
    });
    units.push({
      cells: getBox(board, i).filter(c => c.value === null).map(c => ({ row: c.row, col: c.col })),
      type: 'box',
      index: i,
    });
  }

  for (const unit of units) {
    const n = unit.cells.length;
    if (n === 0) continue;

    const maxSubset = Math.min(n, MAX_SIZE);
    const total = 1 << n;

    for (let mask = 1; mask < total; mask++) {
      const bits = popcount(mask);
      if (bits < 1 || bits > maxSubset) continue;

      const subsetCells: CellPosition[] = [];
      const candidateUnion = new Set<number>();

      for (let bit = 0; bit < n; bit++) {
        if (mask & (1 << bit)) {
          const pos = unit.cells[bit];
          subsetCells.push(pos);
          for (const cand of board.cells[pos.row][pos.col].candidates) {
            candidateUnion.add(cand);
          }
        }
      }

      if (candidateUnion.size === subsetCells.length + 1) {
        result.push({
          cells: subsetCells,
          candidates: candidateUnion,
          unitType: unit.type,
          unitIndex: unit.index,
        });
      }
    }
  }

  return result;
}

function popcount(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

function overlaps(a: ALS, b: ALS): boolean {
  const setB = new Set(b.cells.map(key));
  return a.cells.some(c => setB.has(key(c)));
}

function findRCCDigits(board: Board, a: ALS, b: ALS): number[] {
  const rccs: number[] = [];

  for (const digit of a.candidates) {
    if (!b.candidates.has(digit)) continue;

    const aCells = a.cells.filter(c => board.cells[c.row][c.col].candidates.has(digit));
    const bCells = b.cells.filter(c => board.cells[c.row][c.col].candidates.has(digit));

    if (aCells.length === 0 || bCells.length === 0) continue;

    if (cellsSeeEachOther(aCells, bCells)) {
      rccs.push(digit);
    }
  }

  return rccs;
}

export const alsXZ: Strategy = (board: Board): SolveStep | null => {
  const allALS = findAllALS(board);

  for (let i = 0; i < allALS.length; i++) {
    for (let j = i + 1; j < allALS.length; j++) {
      const a = allALS[i];
      const b = allALS[j];

      if (overlaps(a, b)) continue;

      const rccDigits = findRCCDigits(board, a, b);
      if (rccDigits.length === 0) continue;

      const rccSet = new Set(rccDigits);
      const allCellKeys = new Set([...a.cells.map(key), ...b.cells.map(key)]);

      for (const z of a.candidates) {
        if (rccSet.has(z)) continue;
        if (!b.candidates.has(z)) continue;

        const zCellsA = a.cells.filter(c => board.cells[c.row][c.col].candidates.has(z));
        const zCellsB = b.cells.filter(c => board.cells[c.row][c.col].candidates.has(z));
        if (zCellsA.length === 0 || zCellsB.length === 0) continue;

        const allZCells = [...zCellsA, ...zCellsB];

        const eliminations = new Map<string, number[]>();

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const cell = board.cells[r][c];
            if (cell.value !== null) continue;
            if (!cell.candidates.has(z)) continue;
            const pos: CellPosition = { row: r, col: c };
            const pk = key(pos);
            if (allCellKeys.has(pk)) continue;

            const seesAll = allZCells.every(zc => sharesUnit(pos, zc));
            if (seesAll) {
              eliminations.set(pk, [z]);
            }
          }
        }

        if (eliminations.size > 0) {
          const reasonCells = [...a.cells, ...b.cells];
          const elimCells = [...eliminations.keys()].map(keyToCP);

          const aDigits = [...a.candidates].sort().join(',');
          const bDigits = [...b.candidates].sort().join(',');
          const aCellStr = a.cells.map(cpToDisplay).join(',');
          const bCellStr = b.cells.map(cpToDisplay).join(',');
          const elimStr = elimCells.map(cpToDisplay).join(', ');

          return {
            strategy: 'ALS-XZ',
            cellsAffected: elimCells,
            candidatesEliminated: eliminations,
            valuePlaced: null,
            reasonCells,
            explanation: `ALS-XZ: ALS A {${aCellStr}} with candidates {${aDigits}}, ALS B {${bCellStr}} with candidates {${bDigits}}, RCC=${rccDigits.join(',')}, eliminates ${z} from ${elimStr}`,
          };
        }
      }
    }
  }

  return null;
};
