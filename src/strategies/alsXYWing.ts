import { findAllALS, type ALS } from './alsXZ';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';

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

function overlaps(a: ALS, b: ALS): boolean {
  const setB = new Set(b.cells.map(key));
  return a.cells.some(c => setB.has(key(c)));
}

function findRCC(board: Board, a: ALS, b: ALS): number[] {
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

export const alsXYWing: Strategy = (board: Board): SolveStep | null => {
  const allALS = findAllALS(board);

  for (let ai = 0; ai < allALS.length; ai++) {
    const a = allALS[ai];

    for (let bi = 0; bi < allALS.length; bi++) {
      if (bi === ai) continue;
      const b = allALS[bi];
      if (overlaps(a, b)) continue;

      const rccAB = findRCC(board, a, b);
      if (rccAB.length === 0) continue;

      for (let ci = bi + 1; ci < allALS.length; ci++) {
        if (ci === ai) continue;
        const c = allALS[ci];
        if (overlaps(a, c) || overlaps(b, c)) continue;

        const rccAC = findRCC(board, a, c);
        if (rccAC.length === 0) continue;

        for (const x of rccAB) {
          for (const y of rccAC) {
            if (x === y) continue;

            const allCellKeys = new Set([
              ...a.cells.map(key),
              ...b.cells.map(key),
              ...c.cells.map(key),
            ]);

            for (const z of b.candidates) {
              if (z === x || z === y) continue;
              if (!c.candidates.has(z)) continue;

              const zCellsB = b.cells.filter(
                cl => board.cells[cl.row][cl.col].candidates.has(z),
              );
              const zCellsC = c.cells.filter(
                cl => board.cells[cl.row][cl.col].candidates.has(z),
              );
              if (zCellsB.length === 0 || zCellsC.length === 0) continue;

              const allZCells = [...zCellsB, ...zCellsC];
              const eliminations = new Map<string, number[]>();

              for (let r = 0; r < 9; r++) {
                for (let col = 0; col < 9; col++) {
                  const cell = board.cells[r][col];
                  if (cell.value !== null) continue;
                  if (!cell.candidates.has(z)) continue;
                  const pos: CellPosition = { row: r, col };
                  const pk = key(pos);
                  if (allCellKeys.has(pk)) continue;

                  const seesAll = allZCells.every(zc => sharesUnit(pos, zc));
                  if (seesAll) {
                    eliminations.set(pk, [z]);
                  }
                }
              }

              if (eliminations.size > 0) {
                const reasonCells = [...a.cells, ...b.cells, ...c.cells];
                const elimCells = [...eliminations.keys()].map(k => {
                  const [r, col] = k.split(',').map(Number);
                  return { row: r, col };
                });

                const fmtCells = (cells: CellPosition[]) =>
                  cells.map(cl => `R${cl.row + 1}C${cl.col + 1}`).join(',');
                const fmtDigits = (s: Set<number>) => [...s].sort().join(',');

                return {
                  strategy: 'ALS-XY-Wing',
                  cellsAffected: elimCells,
                  candidatesEliminated: eliminations,
                  valuePlaced: null,
                  reasonCells,
                  explanation: `ALS-XY-Wing: Pivot ALS A {${fmtCells(a.cells)}} cands {${fmtDigits(a.candidates)}}, ALS B {${fmtCells(b.cells)}} cands {${fmtDigits(b.candidates)}}, ALS C {${fmtCells(c.cells)}} cands {${fmtDigits(c.candidates)}}, RCC X=${x}, Y=${y}, eliminates ${z} from ${fmtCells(elimCells)}`,
                };
              }
            }
          }
        }
      }
    }
  }

  return null;
};
