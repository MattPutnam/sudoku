import { describe, it, expect } from 'vitest';

import {
  createBoard,
  getRow,
  getCol,
  getBox,
  getPeers,
  setCellValue,
  clone,
  eliminateCandidates,
} from '../board';

// A well-known puzzle: "easy" difficulty
// 53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79
const PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

describe('createBoard', () => {
  it('parses a known puzzle string into a 9x9 board', () => {
    const board = createBoard(PUZZLE);
    expect(board.cells.length).toBe(9);
    for (const row of board.cells) {
      expect(row.length).toBe(9);
    }
  });

  it('sets cell values and isGiven flags correctly', () => {
    const board = createBoard(PUZZLE);
    // First cell: '5' -> given
    expect(board.cells[0][0].value).toBe(5);
    expect(board.cells[0][0].isGiven).toBe(true);
    // Third cell: '0' -> empty
    expect(board.cells[0][2].value).toBeNull();
    expect(board.cells[0][2].isGiven).toBe(false);
  });

  it('computes correct box indices', () => {
    const board = createBoard(PUZZLE);
    // [0,0] = box 0
    expect(board.cells[0][0].box).toBe(0);
    // [0,8] = box 2
    expect(board.cells[0][8].box).toBe(2);
    // [4,4] = box 4
    expect(board.cells[4][4].box).toBe(4);
    // [8,8] = box 8
    expect(board.cells[8][8].box).toBe(8);
    // [3,0] = box 3
    expect(board.cells[3][0].box).toBe(3);
    // [6,6] = box 8
    expect(board.cells[6][6].box).toBe(8);
  });

  it('throws for string shorter than 81 chars', () => {
    expect(() => createBoard('12345')).toThrow('Expected 81 characters');
  });

  it('throws for string longer than 81 chars', () => {
    expect(() => createBoard(PUZZLE + '1')).toThrow('Expected 81 characters');
  });

  it('treats dots as empty cells', () => {
    const dotPuzzle = PUZZLE.replace(/0/g, '.');
    const board = createBoard(dotPuzzle);
    expect(board.cells[0][2].value).toBeNull();
    expect(board.cells[0][2].isGiven).toBe(false);
  });
});

describe('getRow', () => {
  it('returns 9 cells for any row', () => {
    const board = createBoard(PUZZLE);
    for (let r = 0; r < 9; r++) {
      const row = getRow(board, r);
      expect(row.length).toBe(9);
      for (const cell of row) {
        expect(cell.row).toBe(r);
      }
    }
  });
});

describe('getCol', () => {
  it('returns 9 cells for any column', () => {
    const board = createBoard(PUZZLE);
    for (let c = 0; c < 9; c++) {
      const col = getCol(board, c);
      expect(col.length).toBe(9);
      for (const cell of col) {
        expect(cell.col).toBe(c);
      }
    }
  });
});

describe('getBox', () => {
  it('returns 9 cells for any box', () => {
    const board = createBoard(PUZZLE);
    for (let b = 0; b < 9; b++) {
      const box = getBox(board, b);
      expect(box.length).toBe(9);
      for (const cell of box) {
        expect(cell.box).toBe(b);
      }
    }
  });

  it('returns correct cells for box 0 (top-left)', () => {
    const board = createBoard(PUZZLE);
    const box0 = getBox(board, 0);
    const positions = box0.map((c) => [c.row, c.col]);
    expect(positions).toEqual([
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2],
    ]);
  });

  it('returns correct cells for box 8 (bottom-right)', () => {
    const board = createBoard(PUZZLE);
    const box8 = getBox(board, 8);
    const positions = box8.map((c) => [c.row, c.col]);
    expect(positions).toEqual([
      [6, 6], [6, 7], [6, 8],
      [7, 6], [7, 7], [7, 8],
      [8, 6], [8, 7], [8, 8],
    ]);
  });
});

describe('getPeers', () => {
  it('returns exactly 20 peers for any cell', () => {
    const board = createBoard(PUZZLE);
    // Test several positions
    for (const [row, col] of [[0, 0], [4, 4], [8, 8], [0, 8], [8, 0]]) {
      const peers = getPeers(board, { row, col });
      expect(peers.length).toBe(20);
    }
  });

  it('never includes the cell itself', () => {
    const board = createBoard(PUZZLE);
    const pos = { row: 4, col: 4 };
    const peers = getPeers(board, pos);
    for (const peer of peers) {
      expect(peer.row !== pos.row || peer.col !== pos.col).toBe(true);
    }
  });

  it('deduplicates cells at row/col/box overlaps', () => {
    const board = createBoard(PUZZLE);
    const peers = getPeers(board, { row: 0, col: 0 });
    const keys = peers.map((c) => `${c.row},${c.col}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('computeCandidates', () => {
  it('empty cells have candidates excluding row/col/box values', () => {
    const board = createBoard(PUZZLE);
    // Row 0: 5,3,_,_,7,_,_,_,_ → values in row = {5,3,7}
    // Col 2: check what values are in it
    const cell = board.cells[0][2]; // empty cell at [0,2]
    expect(cell.value).toBeNull();

    // Candidates should not contain any value present in row, col, or box
    const rowVals = getRow(board, 0)
      .filter((c) => c.value !== null)
      .map((c) => c.value!);
    const colVals = getCol(board, 2)
      .filter((c) => c.value !== null)
      .map((c) => c.value!);
    const boxVals = getBox(board, cell.box)
      .filter((c) => c.value !== null)
      .map((c) => c.value!);

    const excluded = new Set([...rowVals, ...colVals, ...boxVals]);
    for (const v of excluded) {
      expect(cell.candidates.has(v)).toBe(false);
    }
    for (const v of cell.candidates) {
      expect(excluded.has(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('given/filled cells have empty candidate sets', () => {
    const board = createBoard(PUZZLE);
    expect(board.cells[0][0].value).toBe(5);
    expect(board.cells[0][0].candidates.size).toBe(0);
  });

  it('candidate sets are complete (union with excluded = {1..9})', () => {
    const board = createBoard(PUZZLE);
    const cell = board.cells[0][2];
    const rowVals = new Set(
      getRow(board, 0).filter((c) => c.value !== null).map((c) => c.value!)
    );
    const colVals = new Set(
      getCol(board, 2).filter((c) => c.value !== null).map((c) => c.value!)
    );
    const boxVals = new Set(
      getBox(board, cell.box).filter((c) => c.value !== null).map((c) => c.value!)
    );
    const excluded = new Set([...rowVals, ...colVals, ...boxVals]);
    const all = new Set([...cell.candidates, ...excluded]);
    expect(all).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  });
});

describe('setCellValue', () => {
  it('sets a value and recomputes candidates', () => {
    const board = createBoard(PUZZLE);
    const pos = { row: 0, col: 2 };
    expect(board.cells[0][2].value).toBeNull();

    const updated = setCellValue(board, pos, 1);
    expect(updated.cells[0][2].value).toBe(1);

    // Peers in same row/col/box should no longer have 1 as candidate
    const peers = getPeers(updated, pos);
    for (const peer of peers) {
      if (peer.value === null) {
        expect(peer.candidates.has(1)).toBe(false);
      }
    }
  });

  it('cannot modify given cells — returns board unchanged', () => {
    const board = createBoard(PUZZLE);
    const pos = { row: 0, col: 0 }; // cell with value 5, isGiven=true
    const result = setCellValue(board, pos, 9);
    expect(result).toBe(board); // same reference
    expect(result.cells[0][0].value).toBe(5);
  });

  it('clears a cell when value is null', () => {
    const board = createBoard(PUZZLE);
    const pos = { row: 0, col: 2 };
    const withValue = setCellValue(board, pos, 4);
    expect(withValue.cells[0][2].value).toBe(4);

    const cleared = setCellValue(withValue, pos, null);
    expect(cleared.cells[0][2].value).toBeNull();
    expect(cleared.cells[0][2].candidates.size).toBeGreaterThan(0);
  });

  it('throws for value outside 1-9', () => {
    const board = createBoard(PUZZLE);
    const pos = { row: 0, col: 2 };
    expect(() => setCellValue(board, pos, 0)).toThrow('Invalid cell value');
    expect(() => setCellValue(board, pos, 10)).toThrow('Invalid cell value');
    expect(() => setCellValue(board, pos, -1)).toThrow('Invalid cell value');
  });
});

describe('clone', () => {
  it('creates a deep copy — modifying clone does not affect original', () => {
    const board = createBoard(PUZZLE);
    const cloned = clone(board);

    // Verify same values
    expect(cloned.cells[0][0].value).toBe(board.cells[0][0].value);

    // Modify clone
    cloned.cells[0][0] = { ...cloned.cells[0][0], value: 9 };
    // Original unchanged
    expect(board.cells[0][0].value).toBe(5);
  });

  it('creates new Set instances for candidates', () => {
    const board = createBoard(PUZZLE);
    const cloned = clone(board);

    // Find an empty cell with candidates
    const emptyCell = board.cells[0][2];
    const clonedCell = cloned.cells[0][2];

    expect(clonedCell.candidates).toEqual(emptyCell.candidates);
    expect(clonedCell.candidates).not.toBe(emptyCell.candidates);

    // Modify clone's candidates
    clonedCell.candidates.add(99);
    expect(emptyCell.candidates.has(99)).toBe(false);
  });

  it('creates new Cell objects', () => {
    const board = createBoard(PUZZLE);
    const cloned = clone(board);
    expect(cloned.cells[0][0]).not.toBe(board.cells[0][0]);
  });
});

describe('eliminateCandidates', () => {
  it('removes specified candidates from empty cells', () => {
    const board = createBoard(PUZZLE);
    const cell = board.cells[0][2]; // empty cell
    const candidateBefore = [...cell.candidates];
    expect(candidateBefore.length).toBeGreaterThan(0);

    const toRemove = [candidateBefore[0]];
    const eliminations = new Map<string, number[]>([['0,2', toRemove]]);
    const result = eliminateCandidates(board, eliminations);

    expect(result.cells[0][2].candidates.has(toRemove[0])).toBe(false);
    for (const c of candidateBefore.slice(1)) {
      expect(result.cells[0][2].candidates.has(c)).toBe(true);
    }
  });

  it('does not mutate the original board', () => {
    const board = createBoard(PUZZLE);
    const cell = board.cells[0][2];
    const candidatesBefore = new Set(cell.candidates);

    const toRemove = [...cell.candidates];
    const eliminations = new Map<string, number[]>([['0,2', toRemove]]);
    eliminateCandidates(board, eliminations);

    expect(board.cells[0][2].candidates).toEqual(candidatesBefore);
  });

  it('returns equivalent board for empty map', () => {
    const board = createBoard(PUZZLE);
    const result = eliminateCandidates(board, new Map());

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(result.cells[r][c].value).toBe(board.cells[r][c].value);
        expect(result.cells[r][c].candidates).toEqual(board.cells[r][c].candidates);
      }
    }
    // But it should be a different object (cloned)
    expect(result).not.toBe(board);
  });

  it('skips cells that have a value set', () => {
    const board = createBoard(PUZZLE);
    // cell [0][0] has value 5 (given)
    const eliminations = new Map<string, number[]>([['0,0', [5]]]);
    const result = eliminateCandidates(board, eliminations);

    expect(result.cells[0][0].value).toBe(5);
    expect(result.cells[0][0].candidates.size).toBe(0);
  });

  it('removes multiple candidates from multiple cells', () => {
    const board = createBoard(PUZZLE);
    const cell1 = board.cells[0][2]; // empty
    const cell2 = board.cells[0][3]; // empty
    const c1Candidates = [...cell1.candidates];
    const c2Candidates = [...cell2.candidates];

    const eliminations = new Map<string, number[]>([
      ['0,2', [c1Candidates[0]]],
      ['0,3', [c2Candidates[0]]],
    ]);
    const result = eliminateCandidates(board, eliminations);

    expect(result.cells[0][2].candidates.has(c1Candidates[0])).toBe(false);
    expect(result.cells[0][3].candidates.has(c2Candidates[0])).toBe(false);
  });
});
