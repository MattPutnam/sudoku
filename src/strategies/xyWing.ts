import { getPeers } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { cpToDisplay, keyToCoords, keyToCP } from '../utils/cellPosition';

export const xyWing: Strategy = (board: Board): SolveStep | null => {
  const bivCells: CellPosition[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board.cells[r][c].value === null && board.cells[r][c].candidates.size === 2) {
        bivCells.push({ row: r, col: c });
      }
    }
  }

  for (const pivot of bivCells) {
    const [a, b] = [...board.cells[pivot.row][pivot.col].candidates];
    const pivotPeers = getPeers(board, pivot);

    const pincerCandidatesA: CellPosition[] = [];
    const pincerCandidatesB: CellPosition[] = [];

    for (const peer of pivotPeers) {
      if (peer.value !== null || peer.candidates.size !== 2) continue;
      const cands = [...peer.candidates];
      if (cands.includes(a) && !cands.includes(b)) {
        pincerCandidatesA.push({ row: peer.row, col: peer.col });
      }
      if (cands.includes(b) && !cands.includes(a)) {
        pincerCandidatesB.push({ row: peer.row, col: peer.col });
      }
    }

    for (const p1 of pincerCandidatesA) {
      const p1Cands = [...board.cells[p1.row][p1.col].candidates];
      const cVal = p1Cands.find((v) => v !== a)!;

      for (const p2 of pincerCandidatesB) {
        const p2Cands = [...board.cells[p2.row][p2.col].candidates];
        if (!p2Cands.includes(cVal)) continue;

        const p1PeerKeys = new Set(
          getPeers(board, p1).map((c) => `${c.row},${c.col}`),
        );
        const p2PeerKeys = new Set(
          getPeers(board, p2).map((c) => `${c.row},${c.col}`),
        );

        const eliminations = new Map<string, number[]>();
        for (const key of p1PeerKeys) {
          if (!p2PeerKeys.has(key)) continue;
          if (key === `${pivot.row},${pivot.col}`) continue;
          if (key === `${p1.row},${p1.col}` || key === `${p2.row},${p2.col}`) continue;
          const [r, c] = keyToCoords(key);
          const cell = board.cells[r][c];
          if (cell.value === null && cell.candidates.has(cVal)) {
            eliminations.set(key, [cVal]);
          }
        }

        if (eliminations.size === 0) continue;

        return {
          strategy: 'XY-Wing',
          cellsAffected: [...eliminations.keys()].map(keyToCP),
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells: [pivot, p1, p2],
          explanation: `XY-Wing: pivot ${cpToDisplay(pivot)} {${a},${b}}, pincers ${cpToDisplay(p1)} {${a},${cVal}} and ${cpToDisplay(p2)} {${b},${cVal}} — eliminates ${cVal}`,
        };
      }
    }
  }

  return null;
};
