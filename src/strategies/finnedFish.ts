import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { keyToCP } from '../utils/cellPosition';

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

type Orientation = 'rows' | 'cols';

function sharesBox(a: CellPosition, b: CellPosition): boolean {
  return (
    Math.floor(a.row / 3) === Math.floor(b.row / 3) &&
    Math.floor(a.col / 3) === Math.floor(b.col / 3)
  );
}

function findFinnedFish(board: Board, size: number): SolveStep | null {
  const strategyNames: Record<number, string> = {
    2: 'Finned X-Wing',
    3: 'Finned Swordfish',
    4: 'Finned Jellyfish',
  };
  const strategyName = strategyNames[size] ?? `Finned Fish (${size})`;

  for (const orientation of ['rows', 'cols'] as Orientation[]) {
    for (let digit = 1; digit <= 9; digit++) {
      const linePositions: Map<number, number[]> = new Map();

      for (let i = 0; i < 9; i++) {
        const positions: number[] = [];
        for (let j = 0; j < 9; j++) {
          const row = orientation === 'rows' ? i : j;
          const col = orientation === 'rows' ? j : i;
          const cell = board.cells[row][col];
          if (cell.value === null && cell.candidates.has(digit)) {
            positions.push(j);
          }
        }
        if (positions.length >= 2 && positions.length <= size + 1) {
          linePositions.set(i, positions);
        }
      }

      const candidateLines = [...linePositions.keys()];
      if (candidateLines.length < size) continue;

      for (const combo of combinations(candidateLines, size)) {
        const crossPositions = new Map<number, number[]>();
        for (const line of combo) {
          for (const pos of linePositions.get(line)!) {
            if (!crossPositions.has(pos)) crossPositions.set(pos, []);
            crossPositions.get(pos)!.push(line);
          }
        }

        const allCrossLines = [...crossPositions.keys()];
        if (allCrossLines.length <= size) continue;
        if (allCrossLines.length > size + 2) continue;

        for (const baseCombo of combinations(allCrossLines, size)) {
          const baseSet = new Set(baseCombo);
          const finPositions: CellPosition[] = [];

          for (const line of combo) {
            for (const pos of linePositions.get(line)!) {
              if (!baseSet.has(pos)) {
                const row = orientation === 'rows' ? line : pos;
                const col = orientation === 'rows' ? pos : line;
                finPositions.push({ row, col });
              }
            }
          }

          if (finPositions.length === 0 || finPositions.length > 2) continue;

          const allFinsInSameBox = finPositions.every((fp) =>
            sharesBox(fp, finPositions[0]),
          );
          if (!allFinsInSameBox) continue;

          let allBasePositionsCovered = true;
          for (const crossLine of baseCombo) {
            let hasCellInBase = false;
            for (const line of combo) {
              if (linePositions.get(line)!.includes(crossLine)) {
                hasCellInBase = true;
                break;
              }
            }
            if (!hasCellInBase) {
              allBasePositionsCovered = false;
              break;
            }
          }
          if (!allBasePositionsCovered) continue;

          const definingSet = new Set(combo);
          const eliminations = new Map<string, number[]>();

          for (const crossLine of baseCombo) {
            for (let i = 0; i < 9; i++) {
              if (definingSet.has(i)) continue;
              const row = orientation === 'rows' ? i : crossLine;
              const col = orientation === 'rows' ? crossLine : i;
              const cell = board.cells[row][col];
              if (cell.value === null && cell.candidates.has(digit)) {
                const pos: CellPosition = { row, col };
                if (finPositions.every((fp) => sharesBox(pos, fp))) {
                  eliminations.set(`${row},${col}`, [digit]);
                }
              }
            }
          }

          if (eliminations.size === 0) continue;

          const reasonCells: CellPosition[] = [];
          for (const line of combo) {
            for (const pos of linePositions.get(line)!) {
              const row = orientation === 'rows' ? line : pos;
              const col = orientation === 'rows' ? pos : line;
              reasonCells.push({ row, col });
            }
          }

          const lineLabel = orientation === 'rows' ? 'rows' : 'columns';
          const lineList = combo.map((l) => l + 1).join(', ');
          const finStr = finPositions
            .map((p) => `R${p.row + 1}C${p.col + 1}`)
            .join(', ');

          return {
            strategy: strategyName,
            cellsAffected: [...eliminations.keys()].map(keyToCP),
            candidatesEliminated: eliminations,
            valuePlaced: null,
            reasonCells,
            explanation: `${strategyName} on digit ${digit} in ${lineLabel} ${lineList} with fin at ${finStr}`,
          };
        }
      }
    }
  }

  return null;
}

export const finnedXWing: Strategy = (board: Board): SolveStep | null => {
  return findFinnedFish(board, 2);
};

export const finnedSwordfish: Strategy = (board: Board): SolveStep | null => {
  return findFinnedFish(board, 3);
};

export const finnedJellyfish: Strategy = (board: Board): SolveStep | null => {
  return findFinnedFish(board, 4);
};
