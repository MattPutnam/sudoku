import { getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { cpToDisplay, cpToKey, keyToCP } from '../utils/cellPosition';

function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  function recurse(start: number, current: T[]) {
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

export const sueDeCoq: Strategy = (board: Board): SolveStep | null => {
  for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
    const boxCells = getBox(board, boxIdx).filter((c) => c.value === null);
    if (boxCells.length === 0) continue;

    const boxStartRow = Math.floor(boxIdx / 3) * 3;
    const boxStartCol = (boxIdx % 3) * 3;

    for (let lineType = 0; lineType < 2; lineType++) {
      for (let lineOffset = 0; lineOffset < 3; lineOffset++) {
        const lineIdx =
          lineType === 0 ? boxStartRow + lineOffset : boxStartCol + lineOffset;

        const lineCells =
          lineType === 0
            ? getRow(board, lineIdx).filter((c) => c.value === null)
            : getCol(board, lineIdx).filter((c) => c.value === null);

        const intersectionCells = lineCells.filter(
          (c) =>
            Math.floor(c.row / 3) * 3 + Math.floor(c.col / 3) === boxIdx,
        );

        if (intersectionCells.length < 2 || intersectionCells.length > 3)
          continue;

        const intersectionKeys = new Set(intersectionCells.map(cpToKey));

        const intersectionCands = new Set<number>();
        for (const c of intersectionCells) {
          for (const d of c.candidates) intersectionCands.add(d);
        }

        const lineRemainderCells = lineCells.filter(
          (c) => !intersectionKeys.has(cpToKey(c)),
        );
        const boxRemainderCells = boxCells.filter(
          (c) => !intersectionKeys.has(cpToKey(c)),
        );

        const n = intersectionCells.length;
        const numCands = intersectionCands.size;
        if (numCands < n + 1 || numCands > n + 2) continue;

        const candsArr = [...intersectionCands];

        // Iterate over subsets of candidates
        for (let mask = 1; mask < (1 << numCands) - 1; mask++) {
          const lineDigits = new Set<number>();
          const boxDigits = new Set<number>();
          for (let bit = 0; bit < numCands; bit++) {
            if (mask & (1 << bit)) {
              lineDigits.add(candsArr[bit]);
            } else {
              boxDigits.add(candsArr[bit]);
            }
          }

          if (lineDigits.size < 1 || boxDigits.size < 1) continue;

          // Each intersection cell's candidates must be covered by lineDigits ∪ boxDigits
          // (which is all intersection candidates, so this is always true)

          // Check: can we find a locked set in the line remainder matching lineDigits?
          // A locked set: N cells with exactly N candidates (subset of lineDigits)
          // For Sue de Coq: we need |lineDigits| cells in line remainder whose
          // candidates are subsets of lineDigits
          const lineMatchCells = lineRemainderCells.filter((c) => {
            for (const d of c.candidates) {
              if (!lineDigits.has(d)) return false;
            }
            return c.candidates.size > 0;
          });

          if (lineMatchCells.length < lineDigits.size) continue;

          // Try all combinations of lineDigits.size cells from lineMatchCells
          let lineLockedSet: CellPosition[] | null = null;
          for (const combo of combinations(lineMatchCells, lineDigits.size)) {
            const union = new Set<number>();
            for (const c of combo) {
              for (const d of c.candidates) union.add(d);
            }
            if (union.size === lineDigits.size && setsEqual(union, lineDigits)) {
              lineLockedSet = combo.map((c) => ({ row: c.row, col: c.col }));
              break;
            }
          }

          if (!lineLockedSet) continue;

          // Check: can we find a locked set in the box remainder matching boxDigits?
          const boxMatchCells = boxRemainderCells.filter((c) => {
            for (const d of c.candidates) {
              if (!boxDigits.has(d)) return false;
            }
            return c.candidates.size > 0;
          });

          if (boxMatchCells.length < boxDigits.size) continue;

          let boxLockedSet: CellPosition[] | null = null;
          for (const combo of combinations(boxMatchCells, boxDigits.size)) {
            const union = new Set<number>();
            for (const c of combo) {
              for (const d of c.candidates) union.add(d);
            }
            if (union.size === boxDigits.size && setsEqual(union, boxDigits)) {
              boxLockedSet = combo.map((c) => ({ row: c.row, col: c.col }));
              break;
            }
          }

          if (!boxLockedSet) continue;

          // We found a Sue de Coq! Now find eliminations:
          // - lineDigits can be eliminated from line remainder cells NOT in the locked set
          // - boxDigits can be eliminated from box remainder cells NOT in the locked set
          const lineLockedKeys = new Set(lineLockedSet.map(cpToKey));
          const boxLockedKeys = new Set(boxLockedSet.map(cpToKey));

          const eliminations = new Map<string, number[]>();

          for (const c of lineRemainderCells) {
            if (lineLockedKeys.has(cpToKey(c))) continue;
            const elims: number[] = [];
            for (const d of lineDigits) {
              if (c.candidates.has(d)) elims.push(d);
            }
            if (elims.length > 0) {
              eliminations.set(cpToKey(c), elims);
            }
          }

          for (const c of boxRemainderCells) {
            if (boxLockedKeys.has(cpToKey(c))) continue;
            const k = cpToKey(c);
            const elims: number[] = [];
            for (const d of boxDigits) {
              if (c.candidates.has(d)) elims.push(d);
            }
            if (elims.length > 0) {
              const existing = eliminations.get(k);
              if (existing) {
                const merged = new Set([...existing, ...elims]);
                eliminations.set(k, [...merged]);
              } else {
                eliminations.set(k, elims);
              }
            }
          }

          if (eliminations.size === 0) continue;

          const reasonCells = [
            ...intersectionCells.map((c) => ({ row: c.row, col: c.col })),
            ...lineLockedSet,
            ...boxLockedSet,
          ];

          const lineLabel = lineType === 0 ? 'row' : 'column';
          const intStr = intersectionCells.map((c) => cpToDisplay(c)).join(', ');
          const lineDigStr = [...lineDigits].sort().join(',');
          const boxDigStr = [...boxDigits].sort().join(',');

          return {
            strategy: 'Sue de Coq',
            cellsAffected: [...eliminations.keys()].map(keyToCP),
            candidatesEliminated: eliminations,
            valuePlaced: null,
            reasonCells,
            explanation: `Sue de Coq in ${lineLabel} ${lineIdx + 1}/box ${boxIdx + 1}: intersection {${intStr}} splits into line digits {${lineDigStr}} and box digits {${boxDigStr}}`,
          };
        }
      }
    }
  }

  return null;
};

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}
