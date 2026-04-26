import { describe, it, expect } from 'vitest';

import { aic } from '../strategies/aic';
import type { Board } from '../types';
import { keyToCoords } from '../utils/cellPosition';

function setBoardCandidates(board: Board, overrides: Record<string, number[]>): Board {
  const cells = board.cells.map((row) =>
    row.map((cell) => ({ ...cell, candidates: new Set(cell.candidates) })),
  );
  for (const [key, digits] of Object.entries(overrides)) {
    const [r, c] = keyToCoords(key);
    cells[r][c].candidates = new Set(digits);
  }
  return { cells };
}

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

describe('AIC (Alternating Inference Chains)', () => {
  it('finds an AIC that mixes bivalue and conjugate links', () => {
    // This constructs a scenario where neither a pure X-Chain nor a pure XY-Chain works,
    // but a mixed AIC does.
    //
    // Chain: R1C1(3) -strong(conjugate)-> R1C5(3) -weak(same cell)-> R1C5(7)
    //        -strong(bivalue)-> R1C5... wait, need a mixed chain.
    //
    // Let's build: A=R1C1:3 =strong(conjugate in row 1)=> B=R1C5:3
    //              B=R1C5:3 -weak(same cell)-> C=R1C5:7
    //              C=R1C5:7 =strong(bivalue)=> D=R1C5 can't, need different cell.
    //
    // Better: R1C1:3 =strong(conjugate row)=> R1C5:3
    //         R1C5:3 =strong(bivalue at R1C5)=> R1C5:7  (bivalue: {3,7})
    //         R1C5:7 -weak(same row)-> R4C5:7
    //         R4C5:7 =strong(conjugate col)=> R8C5:7
    //
    // Wait, that's 4 links. The chain endpoints are R1C1:3 and R8C5:7.
    // To get elimination: need a candidate weakly linked to both.
    //
    // Actually let me think about what makes this NOT a pure X-Chain or XY-Chain:
    // - Not pure X-Chain: uses multiple digits (3 and 7)
    // - Not pure XY-Chain: R1C1 doesn't need to be bivalue; it uses conjugate pair for digit 3
    //
    // 5-link chain: strong-weak-strong-weak-strong (links)
    // = 6 nodes
    //
    // R1C1:3 =strong(conj row)=> R1C8:3
    //        -weak(same cell)=> R1C8:7 (R1C8 has cands {3,7} bivalue)
    //        =strong(bivalue)=> actually bivalue gives strong link between 3 and 7 in same cell,
    //        but we already used that. Let me rethink.
    //
    // In AICs, same-cell different-digit is a strong link IF bivalue (exactly 2 cands).
    // Between cells, same digit is strong if conjugate pair.
    //
    // Chain (5 links):
    //   R0C0:3 =strong(conj pair in row 0)=> R0C4:3
    //   R0C4:3 =strong(bivalue at R0C4={3,7})=> R0C4:7
    //   R0C4:7 -weak(R0C4 and R5C4 share col 4, both have 7)-> R5C4:7
    //   R5C4:7 =strong(bivalue at R5C4={7,9})=> R5C4:9
    //   R5C4:9 -weak(R5C4 and R5C0 share row 5, both have 9)-> R5C0:9
    //
    //   Wait, that's 5 links but ends on a weak link. Need odd number ending on strong.
    //   Let me fix:
    //
    //   R0C0:3 =strong=> R0C4:3 =strong(bivalue)=> R0C4:7 -weak=> R5C4:7
    //   =strong(conj pair in col 4)=> R8C4:7
    //
    //   That's: strong, strong, weak, strong = 4 links. Hmm, that's not alternating.
    //   Alternating means: strong, weak, strong, weak, strong.
    //
    //   R0C0:3 =strong=> R0C4:3 -weak(same cell, but bivalue → strong)
    //   Actually if R0C4 is bivalue {3,7}, then R0C4:3→R0C4:7 is a strong link.
    //   strong→strong isn't alternating. The pattern must be strong-weak-strong-weak-strong.
    //
    //   Let me reconsider. In AIC notation:
    //   node1 ==strong== node2 --weak-- node3 ==strong== node4 --weak-- node5 ==strong== node6
    //   5 links (strong-weak-strong-weak-strong), 6 nodes.
    //
    //   R0C0:3 ==conj row== R0C4:3 --same cell, not bivalue(3 cands)-- R0C4:7
    //   Wait, if R0C4 has 3 candidates, then same-cell links are weak. Good.
    //
    //   R0C0:3 ==strong(conj pair row 0 for 3)== R0C4:3
    //   R0C4:3 --weak(same cell, cands={3,5,7})-- R0C4:7
    //   R0C4:7 ==strong(conj pair col 4 for 7)== R6C4:7
    //   R6C4:7 --weak(same cell, cands={2,7})-- R6C4:2
    //   R6C4:2 ==strong(conj pair row 6 for 2)== R6C8:2
    //
    //   5 links: strong-weak-strong-weak-strong ✓
    //   Endpoints: R0C0:3 and R6C8:2
    //   Not pure X-Chain (multiple digits). Not pure XY-Chain (R0C4 has 3 cands).
    //
    //   Elimination: any candidate X weakly linked to both R0C0:3 AND R6C8:2.
    //   R0C0:3 weakly links to any cell in row0/col0/box0 that has candidate 3, OR same-cell diff digit.
    //   R6C8:2 weakly links to any cell in row6/col8/box8 that has candidate 2, OR same-cell diff digit.
    //   Intersection: a cell with cand 3 visible to R0C0 AND cand 2 visible to R6C8.
    //   Hmm, that needs the same cell to have both 3 and 2, visible to both endpoints.
    //   Actually no — different candidate nodes. We need a single node X weakly linked to both.
    //   So X must be the same digit-cell combo linked to both endpoints.
    //   E.g., R6C0:2 if R6C0 has candidate 2: weakly linked to R6C8:2 (same row, same digit),
    //   but also needs to be weakly linked to R0C0:3. R6C0:2 is same-cell different-digit from R6C0:3?
    //   No, R0C0 and R6C0 share column 0, so R6C0:3 is weakly linked to R0C0:3. But we need R6C0:2
    //   to be weakly linked to R0C0:3. That would require same cell (no) or same digit+unit (digit 2≠3, no).
    //   So that doesn't work.
    //
    //   Simpler approach: use endpoints with the SAME digit.
    //   R0C0:3 =strong= R0C4:3 --weak(same cell)-- R0C4:7 =strong(conj)= R6C4:7
    //   --weak(same cell)-- R6C4:3 =strong(conj)= R6C8:3
    //   Endpoints: R0C0:3 and R6C8:3 (same digit 3)
    //   Elimination: digit 3 from any cell that sees both R0C0 and R6C8
    //   That's cells in column 0 row 6 area... R0C0 is (0,0), R6C8 is (6,8).
    //   Shares unit? Only if same row, col, or box. They don't share any unit.
    //   So we need a cell that shares a unit with BOTH: e.g., no cell shares row/col/box with both.
    //   Actually there's no cell that shares a unit with (0,0) and (6,8) simultaneously for digit 3.
    //
    //   Let me build with closer endpoints.
    //   R0C0:3 =strong(conj row)= R0C4:3 --weak(same cell {3,5,7})-- R0C4:5
    //   =strong(conj col for 5)= R6C4:5 --weak(same cell {5,3})-- R6C4:3
    //   =strong(conj row for 3)= R6C0:3
    //
    //   Endpoints: R0C0:3 and R6C0:3 (same digit, same column!)
    //   Elimination: digit 3 from cells in column 0 that see both, i.e., any cell in col 0
    //   (all cells in col 0 see both R0C0 and R6C0 through col 0).
    //   So: R3C0 with candidate 3 → eliminate 3.
    //   Not pure X-Chain: chain goes through digits 5.
    //   Not pure XY-Chain: R0C4 has 3 candidates.
    //   This should trigger AIC!

    const board = emptyBoard();

    // Solve most cells
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 9;
      }
    }

    // Unsolved cells we need
    const unsolved = ['0,0', '0,4', '6,4', '6,0', '3,0'];
    for (const key of unsolved) {
      const [r, c] = keyToCoords(key);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};

    // R0C0: bivalue {3,8}. Row 0 has only R0C0 and R0C4 with digit 3 → conjugate pair.
    overrides['0,0'] = [3, 8];

    // R0C4: trivalue {3, 5, 7} — NOT bivalue, so same-cell links are weak.
    overrides['0,4'] = [3, 5, 7];

    // R6C4: trivalue {5, 3, 9} — NOT bivalue, so R6C4:5→R6C4:3 is weak.
    // Col 4 has only R0C4 and R6C4 with digit 5 → conjugate pair → strong link for 5.
    overrides['6,4'] = [5, 3, 9];

    // R6C0: Row 6 has only R6C4 and R6C0 with digit 3 → conjugate pair → strong link for 3.
    overrides['6,0'] = [3, 7];

    // Target: R3C0 has candidate 3, sees both R0C0 and R6C0 through column 0.
    overrides['3,0'] = [3, 4];

    const b = setBoardCandidates(board, overrides);
    const step = aic(b);

    expect(step).not.toBeNull();
    expect(step!.strategy).toBe('AIC');
    expect(step!.valuePlaced).toBeNull();
    expect(step!.candidatesEliminated.size).toBeGreaterThan(0);

    // Should eliminate 3 from R3C0
    expect(step!.candidatesEliminated.has('3,0')).toBe(true);
    expect(step!.candidatesEliminated.get('3,0')).toContain(3);
  });

  it('returns null on a solved board', () => {
    const board = emptyBoard();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 1;
      }
    }
    expect(aic(board)).toBeNull();
  });

  it('skips pure X-Chains (single digit throughout)', () => {
    // Build a pure X-Chain scenario — AIC should not fire on it
    const board = emptyBoard();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board.cells[r][c].value = 9;
      }
    }

    // Pure X-Chain for digit 5: R0C0 =strong= R0C4 -weak- R3C4 =strong= R3C8 -weak- R6C8 =strong= R6C0
    // All same digit → pure X-Chain, should be skipped by AIC
    const cells = ['0,0', '0,4', '3,4', '3,8', '6,8', '6,0', '4,0'];
    for (const key of cells) {
      const [r, c] = keyToCoords(key);
      board.cells[r][c].value = null;
    }

    const overrides: Record<string, number[]> = {};
    // Conjugate pairs: row 0 for 5 (R0C0, R0C4), row 3 for 5 (R3C4, R3C8), row 6 for 5 (R6C8, R6C0)
    overrides['0,0'] = [5, 1];
    overrides['0,4'] = [5, 2];
    overrides['3,4'] = [5, 3];
    overrides['3,8'] = [5, 4];
    overrides['6,8'] = [5, 6];
    overrides['6,0'] = [5, 7];
    overrides['4,0'] = [5, 8]; // target in col 0

    const b = setBoardCandidates(board, overrides);
    const step = aic(b);

    // AIC skips pure X-Chains
    expect(step).toBeNull();
  });
});
