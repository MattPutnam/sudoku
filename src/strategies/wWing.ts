import { getPeers, getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';

export const wWing: Strategy = (board: Board): SolveStep | null => {
  const bivCells: CellPosition[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board.cells[r][c].value === null && board.cells[r][c].candidates.size === 2) {
        bivCells.push({ row: r, col: c });
      }
    }
  }

  for (let i = 0; i < bivCells.length; i++) {
    for (let j = i + 1; j < bivCells.length; j++) {
      const c1 = bivCells[i];
      const c2 = bivCells[j];
      const cands1 = board.cells[c1.row][c1.col].candidates;
      const cands2 = board.cells[c2.row][c2.col].candidates;

      if (cands1.size !== 2 || cands2.size !== 2) continue;
      const vals1 = [...cands1].sort((a, b) => a - b);
      const vals2 = [...cands2].sort((a, b) => a - b);
      if (vals1[0] !== vals2[0] || vals1[1] !== vals2[1]) continue;

      const c1Peers = getPeers(board, c1);
      const isPeer = c1Peers.some(
        (p) => p.row === c2.row && p.col === c2.col,
      );
      if (isPeer) continue;

      const [valA, valB] = vals1;

      for (const linkDigit of [valA, valB]) {
        const elimDigit = linkDigit === valA ? valB : valA;

        const strongLinks = findStrongLinks(board, linkDigit, c1, c2);
        if (strongLinks.length === 0) continue;

        const link = strongLinks[0];

        const c1PeerKeys = new Set(
          getPeers(board, c1).map((p) => `${p.row},${p.col}`),
        );
        const c2PeerKeys = new Set(
          getPeers(board, c2).map((p) => `${p.row},${p.col}`),
        );

        const eliminations = new Map<string, number[]>();
        for (const key of c1PeerKeys) {
          if (!c2PeerKeys.has(key)) continue;
          if (key === `${c1.row},${c1.col}` || key === `${c2.row},${c2.col}`) continue;
          if (key === `${link.end1.row},${link.end1.col}` || key === `${link.end2.row},${link.end2.col}`) continue;
          const [r, c] = key.split(',').map(Number);
          const cell = board.cells[r][c];
          if (cell.value === null && cell.candidates.has(elimDigit)) {
            eliminations.set(key, [elimDigit]);
          }
        }

        if (eliminations.size === 0) continue;

        const reasonCells: CellPosition[] = [c1, c2, link.end1, link.end2];

        return {
          strategy: 'W-Wing',
          cellsAffected: [...eliminations.keys()].map((k) => {
            const [r, c] = k.split(',').map(Number);
            return { row: r, col: c };
          }),
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells,
          explanation: `W-Wing: bivalue cells R${c1.row + 1}C${c1.col + 1} and R${c2.row + 1}C${c2.col + 1} {${valA},${valB}}, strong link on ${linkDigit} via R${link.end1.row + 1}C${link.end1.col + 1}-R${link.end2.row + 1}C${link.end2.col + 1} — eliminates ${elimDigit}`,
        };
      }
    }
  }

  return null;
};

interface StrongLink {
  end1: CellPosition;
  end2: CellPosition;
}

function findStrongLinks(
  board: Board,
  digit: number,
  c1: CellPosition,
  c2: CellPosition,
): StrongLink[] {
  const links: StrongLink[] = [];
  const c1PeerKeys = new Set(
    getPeers(board, c1).map((p) => `${p.row},${p.col}`),
  );
  const c2PeerKeys = new Set(
    getPeers(board, c2).map((p) => `${p.row},${p.col}`),
  );

  for (let i = 0; i < 9; i++) {
    const rowCells = getRow(board, i)
      .filter((cell) => cell.value === null && cell.candidates.has(digit));
    if (rowCells.length === 2) {
      const k1 = `${rowCells[0].row},${rowCells[0].col}`;
      const k2 = `${rowCells[1].row},${rowCells[1].col}`;
      if (
        (c1PeerKeys.has(k1) && c2PeerKeys.has(k2)) ||
        (c1PeerKeys.has(k2) && c2PeerKeys.has(k1))
      ) {
        const end1 = c1PeerKeys.has(k1)
          ? { row: rowCells[0].row, col: rowCells[0].col }
          : { row: rowCells[1].row, col: rowCells[1].col };
        const end2 = c1PeerKeys.has(k1)
          ? { row: rowCells[1].row, col: rowCells[1].col }
          : { row: rowCells[0].row, col: rowCells[0].col };
        links.push({ end1, end2 });
      }
    }

    const colCells = getCol(board, i)
      .filter((cell) => cell.value === null && cell.candidates.has(digit));
    if (colCells.length === 2) {
      const k1 = `${colCells[0].row},${colCells[0].col}`;
      const k2 = `${colCells[1].row},${colCells[1].col}`;
      if (
        (c1PeerKeys.has(k1) && c2PeerKeys.has(k2)) ||
        (c1PeerKeys.has(k2) && c2PeerKeys.has(k1))
      ) {
        const end1 = c1PeerKeys.has(k1)
          ? { row: colCells[0].row, col: colCells[0].col }
          : { row: colCells[1].row, col: colCells[1].col };
        const end2 = c1PeerKeys.has(k1)
          ? { row: colCells[1].row, col: colCells[1].col }
          : { row: colCells[0].row, col: colCells[0].col };
        links.push({ end1, end2 });
      }
    }
  }

  for (let b = 0; b < 9; b++) {
    const boxCells = getBox(board, b)
      .filter((cell) => cell.value === null && cell.candidates.has(digit));
    if (boxCells.length === 2) {
      const k1 = `${boxCells[0].row},${boxCells[0].col}`;
      const k2 = `${boxCells[1].row},${boxCells[1].col}`;
      if (
        (c1PeerKeys.has(k1) && c2PeerKeys.has(k2)) ||
        (c1PeerKeys.has(k2) && c2PeerKeys.has(k1))
      ) {
        const end1 = c1PeerKeys.has(k1)
          ? { row: boxCells[0].row, col: boxCells[0].col }
          : { row: boxCells[1].row, col: boxCells[1].col };
        const end2 = c1PeerKeys.has(k1)
          ? { row: boxCells[1].row, col: boxCells[1].col }
          : { row: boxCells[0].row, col: boxCells[0].col };
        links.push({ end1, end2 });
      }
    }
  }

  return links;
}
