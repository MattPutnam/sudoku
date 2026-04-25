import { getPeers } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { cpToDisplay, cpToKey, keyToCoords, keyToCP } from '../utils/cellPosition';

export const xyzWing: Strategy = (board: Board): SolveStep | null => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const pivotCell = board.cells[r][c];
      if (pivotCell.value !== null || pivotCell.candidates.size !== 3) continue;

      const pivot: CellPosition = { row: r, col: c };
      const [a, b, cVal] = [...pivotCell.candidates];
      const pivotPeers = getPeers(board, pivot);

      const triples = [
        [a, b, cVal],
        [a, cVal, b],
        [b, cVal, a],
      ];

      for (const [x, y, z] of triples) {
        const pincer1Candidates: CellPosition[] = [];
        const pincer2Candidates: CellPosition[] = [];

        for (const peer of pivotPeers) {
          if (peer.value !== null || peer.candidates.size !== 2) continue;
          const cands = peer.candidates;
          if (cands.has(x) && cands.has(z) && !cands.has(y)) {
            pincer1Candidates.push({ row: peer.row, col: peer.col });
          }
          if (cands.has(y) && cands.has(z) && !cands.has(x)) {
            pincer2Candidates.push({ row: peer.row, col: peer.col });
          }
        }

        for (const p1 of pincer1Candidates) {
          for (const p2 of pincer2Candidates) {
            if (p1.row === p2.row && p1.col === p2.col) continue;

            const pivotKey = `${pivot.row},${pivot.col}`;
            const p1Key = `${p1.row},${p1.col}`;
            const p2Key = `${p2.row},${p2.col}`;

            const pivotPeerKeys = new Set(
              getPeers(board, pivot).map(cpToKey),
            );
            const p1PeerKeys = new Set(
              getPeers(board, p1).map(cpToKey),
            );
            const p2PeerKeys = new Set(
              getPeers(board, p2).map(cpToKey),
            );

            const eliminations = new Map<string, number[]>();
            for (const key of pivotPeerKeys) {
              if (!p1PeerKeys.has(key) || !p2PeerKeys.has(key)) continue;
              if (key === pivotKey || key === p1Key || key === p2Key) continue;
              const [er, ec] = keyToCoords(key);
              const cell = board.cells[er][ec];
              if (cell.value === null && cell.candidates.has(z)) {
                eliminations.set(key, [z]);
              }
            }

            if (eliminations.size === 0) continue;

            return {
              strategy: 'XYZ-Wing',
              cellsAffected: [...eliminations.keys()].map(keyToCP),
              candidatesEliminated: eliminations,
              valuePlaced: null,
              reasonCells: [pivot, p1, p2],
              explanation: `XYZ-Wing: pivot ${cpToDisplay(pivot)} {${x},${y},${z}}, pincers ${cpToDisplay(p1)} {${x},${z}} and ${cpToDisplay(p2)} {${y},${z}} — eliminates ${z}`,
            };
          }
        }
      }
    }
  }

  return null;
};
