import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { solve } from '../solver';
import { buildSnapshots } from '../utils/snapshots';
import type { SolveStep } from '../types';

const EXAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

describe('buildSnapshots', () => {
  it('returns [initialBoard] for empty steps', () => {
    const board = createBoard(EXAMPLE_PUZZLE);
    const snapshots = buildSnapshots(board, []);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toBe(board);
  });

  it('applies a single value-placement step correctly', () => {
    const board = createBoard(EXAMPLE_PUZZLE);
    const result = solve(board);
    const firstValueStep = result.steps.find((s) => s.valuePlaced !== null);
    if (!firstValueStep) throw new Error('No value-placement step found');

    const snapshots = buildSnapshots(board, [firstValueStep]);

    expect(snapshots).toHaveLength(2);
    const { row, col } = firstValueStep.valuePlaced!.position;
    expect(snapshots[0].cells[row][col].value).toBeNull();
    expect(snapshots[1].cells[row][col].value).toBe(firstValueStep.valuePlaced!.value);
  });

  it('builds correct number of snapshots for a full solve', () => {
    const board = createBoard(EXAMPLE_PUZZLE);
    const result = solve(board);

    const snapshots = buildSnapshots(board, result.steps);

    expect(snapshots).toHaveLength(result.steps.length + 1);

    // First snapshot matches initial board values
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(snapshots[0].cells[r][c].value).toBe(board.cells[r][c].value);
      }
    }

    // Last snapshot matches solved board values
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(snapshots[snapshots.length - 1].cells[r][c].value).toBe(
          result.board.cells[r][c].value,
        );
      }
    }
  });

  it('handles candidate-elimination-only steps', () => {
    const board = createBoard(EXAMPLE_PUZZLE);
    const cellKey = '0,2';
    const eliminatedDigit = 1;

    const syntheticStep: SolveStep = {
      strategy: 'Test',
      cellsAffected: [{ row: 0, col: 2 }],
      candidatesEliminated: new Map([[cellKey, [eliminatedDigit]]]),
      valuePlaced: null,
      reasonCells: [],
      explanation: 'Test elimination',
    };

    // Only run if the candidate exists in the initial board
    const hasCand = board.cells[0][2].candidates.has(eliminatedDigit);
    if (!hasCand) {
      // Pick a candidate that does exist
      const existing = [...board.cells[0][2].candidates];
      if (existing.length === 0) return; // cell already solved, skip
      syntheticStep.candidatesEliminated = new Map([[cellKey, [existing[0]]]]);
    }

    const digit = hasCand
      ? eliminatedDigit
      : [...board.cells[0][2].candidates][0];

    const snapshots = buildSnapshots(board, [syntheticStep]);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].cells[0][2].candidates.has(digit)).toBe(true);
    expect(snapshots[1].cells[0][2].candidates.has(digit)).toBe(false);
  });
});
