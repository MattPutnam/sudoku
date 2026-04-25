import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { keyToCP } from '../utils/cellPosition';

function combinations(indices: number[], size: number): number[][] {
  const result: number[][] = [];
  function recurse(start: number, current: number[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < indices.length; i++) {
      current.push(indices[i]);
      recurse(i + 1, current);
      current.pop();
    }
  }
  recurse(0, []);
  return result;
}

type Orientation = 'rows' | 'cols';

function findFish(board: Board, size: number): SolveStep | null {
  const strategyNames: Record<number, string> = {
    2: 'X-Wing',
    3: 'Swordfish',
    4: 'Jellyfish',
  };
  const strategyName = strategyNames[size] ?? `Fish (${size})`;

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
        if (positions.length >= 2 && positions.length <= size) {
          linePositions.set(i, positions);
        }
      }

      const candidateLines = [...linePositions.keys()];
      if (candidateLines.length < size) continue;

      for (const combo of combinations(candidateLines, size)) {
        const crossLines = new Set<number>();
        for (const line of combo) {
          for (const pos of linePositions.get(line)!) {
            crossLines.add(pos);
          }
        }
        if (crossLines.size !== size) continue;

        const definingSet = new Set(combo);
        const eliminations = new Map<string, number[]>();

        for (const crossLine of crossLines) {
          for (let i = 0; i < 9; i++) {
            if (definingSet.has(i)) continue;
            const row = orientation === 'rows' ? i : crossLine;
            const col = orientation === 'rows' ? crossLine : i;
            const cell = board.cells[row][col];
            if (cell.value === null && cell.candidates.has(digit)) {
              eliminations.set(`${row},${col}`, [digit]);
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
        const crossLabel = orientation === 'rows' ? 'columns' : 'rows';
        const lineList = combo.map((l) => l + 1).join(', ');
        const crossList = [...crossLines]
          .sort((a, b) => a - b)
          .map((l) => l + 1)
          .join(', ');

        return {
          strategy: strategyName,
          cellsAffected: [...eliminations.keys()].map(keyToCP),
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells,
          explanation: `${strategyName} on digit ${digit} in ${lineLabel} ${lineList} — eliminates ${digit} from ${crossLabel} ${crossList}`,
        };
      }
    }
  }

  return null;
}

export const xWing: Strategy = (board: Board): SolveStep | null => {
  return findFish(board, 2);
};

export const swordfish: Strategy = (board: Board): SolveStep | null => {
  return findFish(board, 3);
};

export const jellyfish: Strategy = (board: Board): SolveStep | null => {
  return findFish(board, 4);
};
