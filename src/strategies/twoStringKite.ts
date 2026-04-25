import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { getPeers } from '../board';

export const twoStringKite: Strategy = (board: Board): SolveStep | null => {
  for (let digit = 1; digit <= 9; digit++) {
    const rowPairs: { row: number; pos1: CellPosition; pos2: CellPosition }[] = [];
    const colPairs: { col: number; pos1: CellPosition; pos2: CellPosition }[] = [];

    for (let i = 0; i < 9; i++) {
      const rowCells: CellPosition[] = [];
      const colCells: CellPosition[] = [];
      for (let j = 0; j < 9; j++) {
        if (board.cells[i][j].value === null && board.cells[i][j].candidates.has(digit)) {
          rowCells.push({ row: i, col: j });
        }
        if (board.cells[j][i].value === null && board.cells[j][i].candidates.has(digit)) {
          colCells.push({ row: j, col: i });
        }
      }
      if (rowCells.length === 2) {
        rowPairs.push({ row: i, pos1: rowCells[0], pos2: rowCells[1] });
      }
      if (colCells.length === 2) {
        colPairs.push({ col: i, pos1: colCells[0], pos2: colCells[1] });
      }
    }

    for (const rp of rowPairs) {
      for (const cp of colPairs) {
        const connections = [
          { boxLink1: rp.pos1, boxLink2: cp.pos1, loose1: rp.pos2, loose2: cp.pos2 },
          { boxLink1: rp.pos1, boxLink2: cp.pos2, loose1: rp.pos2, loose2: cp.pos1 },
          { boxLink1: rp.pos2, boxLink2: cp.pos1, loose1: rp.pos1, loose2: cp.pos2 },
          { boxLink1: rp.pos2, boxLink2: cp.pos2, loose1: rp.pos1, loose2: cp.pos1 },
        ];

        for (const conn of connections) {
          const box1 = board.cells[conn.boxLink1.row][conn.boxLink1.col].box;
          const box2 = board.cells[conn.boxLink2.row][conn.boxLink2.col].box;
          if (box1 !== box2) continue;

          if (conn.boxLink1.row === conn.boxLink2.row && conn.boxLink1.col === conn.boxLink2.col) continue;

          const loose1Peers = new Set(
            getPeers(board, conn.loose1).map((c) => `${c.row},${c.col}`),
          );
          const loose2Peers = new Set(
            getPeers(board, conn.loose2).map((c) => `${c.row},${c.col}`),
          );

          const eliminations = new Map<string, number[]>();
          for (const key of loose1Peers) {
            if (!loose2Peers.has(key)) continue;
            const [r, c] = key.split(',').map(Number);
            if (r === conn.boxLink1.row && c === conn.boxLink1.col) continue;
            if (r === conn.boxLink2.row && c === conn.boxLink2.col) continue;
            if (r === conn.loose1.row && c === conn.loose1.col) continue;
            if (r === conn.loose2.row && c === conn.loose2.col) continue;
            const cell = board.cells[r][c];
            if (cell.value === null && cell.candidates.has(digit)) {
              eliminations.set(key, [digit]);
            }
          }

          if (eliminations.size === 0) continue;

          const reasonCells: CellPosition[] = [rp.pos1, rp.pos2, cp.pos1, cp.pos2];

          return {
            strategy: '2-String Kite',
            cellsAffected: [...eliminations.keys()].map((k) => {
              const [r, c] = k.split(',').map(Number);
              return { row: r, col: c };
            }),
            candidatesEliminated: eliminations,
            valuePlaced: null,
            reasonCells,
            explanation: `2-String Kite: row ${rp.row + 1} pair and column ${cp.col + 1} pair connected through box ${box1 + 1}, loose ends R${conn.loose1.row + 1}C${conn.loose1.col + 1} and R${conn.loose2.row + 1}C${conn.loose2.col + 1} — eliminates ${digit}`,
          };
        }
      }
    }
  }

  return null;
};
