import { describe, it, expect } from 'vitest';

import { createBoard } from '../board';
import { wWing } from '../strategies/wWing';
import { xyWing } from '../strategies/xyWing';
import { xyzWing } from '../strategies/xyzWing';
import type { Board } from '../types';
import { keyToCoords } from '../utils/cellPosition';

function setBoardCandidates(board: Board, overrides: Record<string, number[]>): Board {
  const cells = board.cells.map((row) =>
    row.map((cell) => ({ ...cell, candidates: new Set(cell.candidates) })),
  );
  for (const [key, digits] of Object.entries(overrides)) {
    const [r, c] = keyToCoords(key);
    cells[r][c].candidates = new Set(digits);
    cells[r][c].value = null;
  }
  return { cells };
}

const SOLVED =
  '123456789456789123789123456214365897365897214897214365531642978642978531978531642';

describe('XY-Wing', () => {
  it('detects XY-Wing and eliminates the common candidate from cells seeing both pincers', () => {
    // Pivot at (0,0) with {1,2}, pincer1 at (0,3) with {1,3} (same row as pivot),
    // pincer2 at (3,0) with {2,3} (same col as pivot).
    // Elimination: candidate 3 from cells seeing both pincers.
    // (3,3) sees pincer1 via col 3 and pincer2 via row 3 — if it has candidate 3, it's eliminated.
    const base = createBoard(SOLVED);
    const board = setBoardCandidates(base, {
      '0,0': [1, 2],
      '0,3': [1, 3],
      '3,0': [2, 3],
      '3,3': [3, 5, 7],
    });

    const step = xyWing(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('XY-Wing');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
    expect(step!.reasonCells).toHaveLength(3);

    expect(step!.candidatesEliminated.has('3,3')).toBe(true);
    expect(step!.candidatesEliminated.get('3,3')).toEqual([3]);
  });

  it('returns null when no XY-Wing pattern exists', () => {
    const board = createBoard(SOLVED);
    expect(xyWing(board)).toBeNull();
  });

  it('uses 1-indexed coordinates in explanation', () => {
    const base = createBoard(SOLVED);
    const board = setBoardCandidates(base, {
      '0,0': [1, 2],
      '0,3': [1, 3],
      '3,0': [2, 3],
      '3,3': [3, 5, 7],
    });

    const step = xyWing(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toContain('R1C1');
    expect(step!.explanation).not.toContain('R0');
  });

  it('does not eliminate from the pivot or pincer cells themselves', () => {
    const base = createBoard(SOLVED);
    const board = setBoardCandidates(base, {
      '0,0': [1, 2],
      '0,3': [1, 3],
      '3,0': [2, 3],
      '3,3': [3, 5, 7],
    });

    const step = xyWing(board);
    expect(step).not.toBeNull();
    expect(step!.candidatesEliminated.has('0,0')).toBe(false);
    expect(step!.candidatesEliminated.has('0,3')).toBe(false);
    expect(step!.candidatesEliminated.has('3,0')).toBe(false);
  });
});

describe('XYZ-Wing', () => {
  it('detects XYZ-Wing and eliminates from cells seeing pivot and both pincers', () => {
    // Pivot at (0,0) with {1,2,3}, pincer1 at (0,1) with {1,3} (same row+box),
    // pincer2 at (1,0) with {2,3} (same col+box).
    // Elimination target must see all three — (1,1) is in same box as all three.
    const base = createBoard(SOLVED);
    const board = setBoardCandidates(base, {
      '0,0': [1, 2, 3],
      '0,1': [1, 3],
      '1,0': [2, 3],
      '1,1': [3, 5, 7],
    });

    const step = xyzWing(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('XYZ-Wing');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
    expect(step!.reasonCells).toHaveLength(3);

    expect(step!.candidatesEliminated.has('1,1')).toBe(true);
    expect(step!.candidatesEliminated.get('1,1')).toEqual([3]);
  });

  it('returns null when no XYZ-Wing pattern exists', () => {
    const board = createBoard(SOLVED);
    expect(xyzWing(board)).toBeNull();
  });

  it('uses 1-indexed coordinates in explanation', () => {
    const base = createBoard(SOLVED);
    const board = setBoardCandidates(base, {
      '0,0': [1, 2, 3],
      '0,1': [1, 3],
      '1,0': [2, 3],
      '1,1': [3, 5, 7],
    });

    const step = xyzWing(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toContain('R1C1');
    expect(step!.explanation).not.toContain('R0');
  });

  it('does not eliminate from cells that only see the pivot but not both pincers', () => {
    // (0,5) sees pivot (0,0) via row 0, sees pincer1 (0,1) via row 0,
    // but does NOT see pincer2 (1,0) unless same col/box.
    // (0,5) is in box 1, pincer2 is in box 0, col 5 vs col 0 — no peer relation.
    const base = createBoard(SOLVED);
    const board = setBoardCandidates(base, {
      '0,0': [1, 2, 3],
      '0,1': [1, 3],
      '1,0': [2, 3],
      '1,1': [3, 5, 7],
      '0,5': [3, 8],
    });

    const step = xyzWing(board);
    expect(step).not.toBeNull();
    expect(step!.candidatesEliminated.has('0,5')).toBe(false);
  });
});

describe('W-Wing', () => {
  it('detects W-Wing and eliminates the non-link candidate from shared peers', () => {
    // Two bivalue cells {4,7} at (0,0) and (2,3) — not peers (different row, col, box).
    // (0,0) peers: row 0, col 0, box 0.  (2,3) peers: row 2, col 3, box 1.
    // Shared peers that see both: none directly — but wait, no cell sees both via standard peers.
    // Better: bivalue cells at (0,3) and (2,0).
    // (0,3) peers: row 0, col 3, box 1.  (2,0) peers: row 2, col 0, box 0.
    // Not peers of each other (different row, different col, different box ✓).
    // Shared peers: cells in neither's row/col/box that see both... hmm.
    // Actually: (0,0) sees (0,3) via row and (2,0) via col+box → it sees both.
    // Strong link on 4: col 1 has candidate 4 in exactly (0,1) and (2,1).
    //   (0,1) sees (0,3) via row 0. (2,1) sees (2,0) via row 2.
    // Eliminate 7 from (0,0) which sees both bivalue cells.
    const base = createBoard(SOLVED);
    const overrides: Record<string, number[]> = {
      '0,3': [4, 7],
      '2,0': [4, 7],
      '0,1': [4, 9],
      '2,1': [4, 9],
      '0,0': [7, 8],
    };
    // Ensure col 1 only has candidate 4 in (0,1) and (2,1)
    for (let r = 0; r < 9; r++) {
      if (r === 0 || r === 2) continue;
      overrides[`${r},1`] = [5, 6];
    }

    const board = setBoardCandidates(base, overrides);

    const step = wWing(board);
    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('W-Wing');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);
    expect(step!.reasonCells.length).toBeGreaterThanOrEqual(4);

    for (const [, digits] of step!.candidatesEliminated) {
      expect(digits).toEqual([7]);
    }
  });

  it('returns null when no W-Wing pattern exists', () => {
    const board = createBoard(SOLVED);
    expect(wWing(board)).toBeNull();
  });

  it('uses 1-indexed coordinates in explanation', () => {
    const base = createBoard(SOLVED);
    const overrides: Record<string, number[]> = {
      '0,3': [4, 7],
      '2,0': [4, 7],
      '0,1': [4, 9],
      '2,1': [4, 9],
      '0,0': [7, 8],
    };
    for (let r = 0; r < 9; r++) {
      if (r === 0 || r === 2) continue;
      overrides[`${r},1`] = [5, 6];
    }

    const board = setBoardCandidates(base, overrides);
    const step = wWing(board);
    expect(step).not.toBeNull();
    expect(step!.explanation).toMatch(/R\dC\d/);
    expect(step!.explanation).not.toContain('R0');
  });

  it('does not consider bivalue cells that see each other', () => {
    // Two bivalue cells {4,7} at (0,0) and (0,5) — they see each other via row 0.
    // W-Wing requires they NOT see each other.
    const base = createBoard(SOLVED);
    const board = setBoardCandidates(base, {
      '0,0': [4, 7],
      '0,5': [4, 7],
    });

    const step = wWing(board);
    expect(step).toBeNull();
  });
});
