import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { simpleColoring } from '../strategies/simpleColoring';
import type { Board } from '../types';

function emptyBoard(): Board {
  return {
    cells: Array.from({ length: 9 }, (_, row) =>
      Array.from({ length: 9 }, (_, col) => ({
        value: null as number | null,
        candidates: new Set<number>(),
        row,
        col,
        box: Math.floor(row / 3) * 3 + Math.floor(col / 3),
        isGiven: false,
      })),
    ),
  };
}

function setBoardCandidates(board: Board, overrides: Record<string, number[]>): Board {
  const cells = board.cells.map((row) =>
    row.map((cell) => ({ ...cell, candidates: new Set(cell.candidates) })),
  );
  for (const [key, digits] of Object.entries(overrides)) {
    const [r, c] = key.split(',').map(Number);
    cells[r][c].candidates = new Set(digits);
  }
  return { cells };
}

function solvedBoard(): Board {
  const board = emptyBoard();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      board.cells[r][c].value = 1;
    }
  }
  return board;
}

describe('Simple Coloring', () => {
  it('Type 2: eliminates from uncolored cell seeing both colors', () => {
    // Chain for digit 5:
    //   Conjugate pair in row 0: R0C0-R0C5 (only two cells with 5 in row 0)
    //   Conjugate pair in col 5: R0C5-R7C5 (only two cells with 5 in col 5)
    //
    // Colors: R0C0=A, R0C5=B, R7C5=A
    //
    // Target: R7C0 has digit 5 as candidate.
    //   Sees R0C0 (color A, same col 0) — BUT wait, col 0 then has R0C0 AND R7C0
    //   having 5, which doesn't break anything since conjugate pair is in row 0, not col 0.
    //   Sees R7C5 (color A, same row 7).
    //   Hmm, R7C0 only sees color A — need it to also see color B.
    //
    // Let me restructure:
    //   Conjugate pair in row 1: R1C2-R1C7 (only two cells with 5 in row 1)
    //   Conjugate pair in row 6: R6C2-R6C7 (only two cells with 5 in row 6)
    //   Conjugate pair in col 2: R1C2-R6C2 (only two cells with 5 in col 2)
    //   These link into one chain: R1C2=A, R1C7=B, R6C2=B, R6C7=A
    //
    // Target: R3C5 has digit 5, sees R1C7 (... no, row 3 ≠ row 1).
    //   Let's pick R3C7: sees R1C7 (color B, same col 7) and R6C7 (color A, same col 7)
    //   — but that's same col as both. Actually both in col 7.
    //   R3C7 in col 7: R1C7 and R6C7 both in col 7. But col 7 already has exactly 2 cells
    //   with 5 → R3C7 having 5 makes it 3 cells → breaks conjugate pair in col 7.
    //
    // The insight: target must NOT be in any unit that forms a conjugate pair for this digit.
    // Use row-based sight lines instead:
    //   R1C2=A, R1C7=B, R6C2=B, R6C7=A
    //   Target R1C4: same row as R1C2(A) and R1C7(B). BUT row 1 has only 2 cells with 5
    //   (the conjugate pair) → adding R1C4 breaks it.
    //
    // Solution: need the target to see two different chain cells through DIFFERENT units.
    // Target R4C3: sees R1C3?... no.
    //
    // Let me try a different geometry:
    //   Conjugate pair in row 0: R0C1-R0C6 (only two cells with 5)
    //   Conjugate pair in col 1: R0C1-R8C1 (only two cells with 5)
    //   Colors: R0C1=A, R0C6=B, R8C1=B
    //   Target R8C6: sees R0C6 (B, col 6) and R8C1 (B, row 8)
    //   → only sees one color. Not useful.
    //
    //   Need: Target sees A via one unit, B via another.
    //   R8C6: sees R8C1 (B, row 8). Who is color A? R0C1.
    //   R8C6 sees R0C6 (col 6) — R0C6 is color B. Hmm.
    //   What about adding more to the chain?
    //   Add conj pair in col 6: R0C6-R5C6. Colors: R5C6=A.
    //   Now target R8C6 sees R5C6 (A, col 6) and R8C1 (B, row 8).
    //   Col 6 has R0C6, R5C6, R8C6 → 3 cells, breaks conj pair.
    //
    // OK, the fundamental constraint is that the target can't be in a unit used for
    // a conjugate pair. Let me use box-based connections:
    //   R0C0=A (box 0), R0C8=B (row 0 conj pair).
    //   R2C8=A (box 2, col 8 conj pair with R0C8).
    //   Target R2C0: same box 0 as R0C0(A) — sees A via box.
    //   R2C0 same row as R2C8(A)... sees A. Need B.
    //   Not enough chain length.
    //
    // Simplest correct setup: 4-cell chain with target connected by row and box.
    //   Row 0 conj pair: R0C0-R0C4 → R0C0=A, R0C4=B
    //   Col 0 conj pair: R0C0-R4C0 → R4C0=B
    //   Box 4 (rows 3-5, cols 3-5) conj pair with R0C4: need col 4 conj pair.
    //   Col 4 conj pair: R0C4-R4C4 → R4C4=A
    //
    //   Target: R4C3 sees R4C0 (B, row 4) and R4C4 (A, row 4).
    //   Row 4 has R4C0, R4C4, and R4C3 → 3 cells with 5 in row 4. No conj pair broken
    //   because the conj pairs are in col 0 and col 4, not row 4. ✓
    //   BUT wait — are R4C0-R4C4 a conjugate pair in row 4? Only if exactly 2 cells in row 4
    //   have digit 5. With R4C3 also having 5, that's 3 → not a conj pair. But R4C0 is
    //   connected via col 0, and R4C4 via col 4. Row 4 having 3 cells doesn't affect those. ✓

    const board = solvedBoard();
    const unsolved = ['0,0', '0,4', '4,0', '4,4', '4,3'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [5, 7];  // chain, color A
    overrides['0,4'] = [5, 3];  // chain, color B (row 0 pair with R0C0)
    overrides['4,0'] = [5, 8];  // chain, color B (col 0 pair with R0C0)
    overrides['4,4'] = [5, 9];  // chain, color A (col 4 pair with R0C4)
    overrides['4,3'] = [5, 6];  // target: sees R4C0(B) row 4 & R4C4(A) row 4

    const b = setBoardCandidates(board, overrides);
    const step = simpleColoring(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('Simple Coloring');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
    expect(step!.candidatesEliminated.has('4,3')).toBe(true);
    expect(step!.candidatesEliminated.get('4,3')).toEqual([5]);
  });

  it('returns null on a fully solved board', () => {
    const board = createBoard(
      '123456789456789123789123456214365897365897214897214365531642978642978531978531642',
    );
    expect(simpleColoring(board)).toBeNull();
  });

  it('explanation contains "Simple Coloring" and uses 1-indexed coords', () => {
    const board = solvedBoard();
    const unsolved = ['0,0', '0,4', '4,0', '4,4', '4,3'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [5, 7];
    overrides['0,4'] = [5, 3];
    overrides['4,0'] = [5, 8];
    overrides['4,4'] = [5, 9];
    overrides['4,3'] = [5, 6];

    const b = setBoardCandidates(board, overrides);
    const step = simpleColoring(b);

    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/Simple Coloring/);
    expect(step!.explanation).not.toMatch(/R0/);
    expect(step!.explanation).not.toMatch(/C0/);
  });

  it('reasonCells contains the colored chain cells', () => {
    const board = solvedBoard();
    const unsolved = ['0,0', '0,4', '4,0', '4,4', '4,3'];
    for (const key of unsolved) {
      const [r, c] = key.split(',').map(Number);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [5, 7];
    overrides['0,4'] = [5, 3];
    overrides['4,0'] = [5, 8];
    overrides['4,4'] = [5, 9];
    overrides['4,3'] = [5, 6];

    const b = setBoardCandidates(board, overrides);
    const step = simpleColoring(b);

    expect(step).not.toBeNull();
    expect(step!.reasonCells.length).toBeGreaterThanOrEqual(2);

    const chainPositions = [
      { row: 0, col: 0 },
      { row: 0, col: 4 },
      { row: 4, col: 0 },
      { row: 4, col: 4 },
    ];
    for (const pos of chainPositions) {
      expect(step!.reasonCells).toContainEqual(pos);
    }
  });

  it('returns null when conjugate pairs exist but no eliminations possible', () => {
    const board = solvedBoard();

    board.cells[0][0].value = null;
    board.cells[0][4].value = null;

    const overrides: Record<string, number[]> = {};
    overrides['0,0'] = [5, 7];
    overrides['0,4'] = [5, 3];

    const b = setBoardCandidates(board, overrides);
    expect(simpleColoring(b)).toBeNull();
  });
});
