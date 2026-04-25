import { getPeers } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { keyToCoords, keyToCP } from '../utils/cellPosition';

export const skyscraper: Strategy = (board: Board): SolveStep | null => {
  for (let digit = 1; digit <= 9; digit++) {
    const result = findSkyscraper(board, digit, 'row') || findSkyscraper(board, digit, 'col');
    if (result) return result;
  }
  return null;
};

function findSkyscraper(
  board: Board,
  digit: number,
  orientation: 'row' | 'col',
): SolveStep | null {
  const pairs: { line: number; pos1: CellPosition; pos2: CellPosition }[] = [];

  for (let i = 0; i < 9; i++) {
    const cells: CellPosition[] = [];
    for (let j = 0; j < 9; j++) {
      const r = orientation === 'row' ? i : j;
      const c = orientation === 'row' ? j : i;
      if (board.cells[r][c].value === null && board.cells[r][c].candidates.has(digit)) {
        cells.push({ row: r, col: c });
      }
    }
    if (cells.length === 2) {
      pairs.push({ line: i, pos1: cells[0], pos2: cells[1] });
    }
  }

  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const pairA = pairs[i];
      const pairB = pairs[j];

      const sharedAxis = orientation === 'row' ? 'col' : 'row';

      const connections = [
        { baseA: pairA.pos1, baseB: pairB.pos1, topA: pairA.pos2, topB: pairB.pos2 },
        { baseA: pairA.pos1, baseB: pairB.pos2, topA: pairA.pos2, topB: pairB.pos1 },
        { baseA: pairA.pos2, baseB: pairB.pos1, topA: pairA.pos1, topB: pairB.pos2 },
        { baseA: pairA.pos2, baseB: pairB.pos2, topA: pairA.pos1, topB: pairB.pos1 },
      ];

      for (const conn of connections) {
        if (conn.baseA[sharedAxis] !== conn.baseB[sharedAxis]) continue;

        const topAPeers = new Set(
          getPeers(board, conn.topA).map((c) => `${c.row},${c.col}`),
        );
        const topBPeers = new Set(
          getPeers(board, conn.topB).map((c) => `${c.row},${c.col}`),
        );

        const eliminations = new Map<string, number[]>();
        for (const key of topAPeers) {
          if (!topBPeers.has(key)) continue;
          const [r, c] = keyToCoords(key);
          if (r === conn.topA.row && c === conn.topA.col) continue;
          if (r === conn.topB.row && c === conn.topB.col) continue;
          if (r === conn.baseA.row && c === conn.baseA.col) continue;
          if (r === conn.baseB.row && c === conn.baseB.col) continue;
          const cell = board.cells[r][c];
          if (cell.value === null && cell.candidates.has(digit)) {
            eliminations.set(key, [digit]);
          }
        }

        if (eliminations.size === 0) continue;

        const reasonCells: CellPosition[] = [conn.baseA, conn.baseB, conn.topA, conn.topB];

        return {
          strategy: 'Skyscraper',
          cellsAffected: [...eliminations.keys()].map(keyToCP),
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells,
          explanation: `Skyscraper: ${orientation === 'row' ? 'rows' : 'columns'} ${pairA.line + 1} and ${pairB.line + 1} share ${orientation === 'row' ? 'column' : 'row'} ${conn.baseA[sharedAxis] + 1} as base, tops R${conn.topA.row + 1}C${conn.topA.col + 1} and R${conn.topB.row + 1}C${conn.topB.col + 1} — eliminates ${digit}`,
        };
      }
    }
  }

  return null;
}
