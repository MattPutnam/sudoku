import type { Board, SolveStep, Strategy, CellPosition } from '../types';

export const uniqueRectangle: Strategy = (board: Board): SolveStep | null => {
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
      for (let k = j + 1; k < bivCells.length; k++) {
        const triple = [bivCells[i], bivCells[j], bivCells[k]];
        const cands0 = [...board.cells[triple[0].row][triple[0].col].candidates].sort((a, b) => a - b);
        const cands1 = [...board.cells[triple[1].row][triple[1].col].candidates].sort((a, b) => a - b);
        const cands2 = [...board.cells[triple[2].row][triple[2].col].candidates].sort((a, b) => a - b);

        if (cands0[0] !== cands1[0] || cands0[1] !== cands1[1]) continue;
        if (cands0[0] !== cands2[0] || cands0[1] !== cands2[1]) continue;

        const [valA, valB] = cands0;
        const rows = [...new Set(triple.map((p) => p.row))];
        const cols = [...new Set(triple.map((p) => p.col))];

        if (rows.length !== 2 || cols.length !== 2) continue;

        const [r1, r2] = rows;
        const [c1, c2] = cols;

        const corners: CellPosition[] = [
          { row: r1, col: c1 },
          { row: r1, col: c2 },
          { row: r2, col: c1 },
          { row: r2, col: c2 },
        ];

        const fourthCorner = corners.find(
          (corner) => !triple.some((t) => t.row === corner.row && t.col === corner.col),
        );
        if (!fourthCorner) continue;

        const fourthCell = board.cells[fourthCorner.row][fourthCorner.col];
        if (fourthCell.value !== null) continue;
        if (!fourthCell.candidates.has(valA) || !fourthCell.candidates.has(valB)) continue;
        if (fourthCell.candidates.size <= 2) continue;

        const box1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
        const box2 = Math.floor(r1 / 3) * 3 + Math.floor(c2 / 3);
        const box3 = Math.floor(r2 / 3) * 3 + Math.floor(c1 / 3);
        const box4 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
        const uniqueBoxes = new Set([box1, box2, box3, box4]);
        if (uniqueBoxes.size !== 2) continue;

        const eliminations = new Map<string, number[]>();
        eliminations.set(`${fourthCorner.row},${fourthCorner.col}`, [valA, valB]);

        return {
          strategy: 'Unique Rectangle',
          cellsAffected: [fourthCorner],
          candidatesEliminated: eliminations,
          valuePlaced: null,
          reasonCells: corners,
          explanation: `Unique Rectangle: corners R${r1 + 1}C${c1 + 1}, R${r1 + 1}C${c2 + 1}, R${r2 + 1}C${c1 + 1}, R${r2 + 1}C${c2 + 1} with pair {${valA},${valB}} — eliminates ${valA},${valB} from R${fourthCorner.row + 1}C${fourthCorner.col + 1} to avoid deadly pattern`,
        };
      }
    }
  }

  return null;
};
