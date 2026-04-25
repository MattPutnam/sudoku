import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { solve } from '../solver';

// Uses both Naked Single (38) and Hidden Single (13) to solve completely
const EASY_PUZZLE =
  '200080300060070084030500209000105408000000000402706000301007040720040060004010003';

const SOLVED_PUZZLE =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

// Makes 1 step (Hidden Single) then stalls — requires advanced techniques
const HARD_PUZZLE =
  '100007090030020008009600500005300900010080002600004000300000010040000007007000300';

describe('solve', () => {
  it('fully solves an easy puzzle with steps recorded', () => {
    const board = createBoard(EASY_PUZZLE);
    const result = solve(board);

    expect(result.complete).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
    for (const step of result.steps) {
      expect(step.strategy).toBeTruthy();
      expect(step.cellsAffected.length).toBeGreaterThan(0);
      expect(step.explanation).toBeTruthy();
    }
  });

  it('produces a board with all 81 cells filled after solving easy puzzle', () => {
    const board = createBoard(EASY_PUZZLE);
    const result = solve(board);

    expect(result.complete).toBe(true);
    let filledCount = 0;
    for (const row of result.board.cells) {
      for (const cell of row) {
        expect(cell.value).not.toBeNull();
        filledCount++;
      }
    }
    expect(filledCount).toBe(81);
  });

  it('uses both Naked Single and Hidden Single strategies', () => {
    const board = createBoard(EASY_PUZZLE);
    const result = solve(board);

    const strategyNames = new Set(result.steps.map((s) => s.strategy));
    expect(strategyNames.has('Naked Single')).toBe(true);
    expect(strategyNames.has('Hidden Single')).toBe(true);
  });

  it('returns partial progress on a puzzle requiring advanced techniques (R012)', () => {
    const board = createBoard(HARD_PUZZLE);
    const result = solve(board);

    expect(result.complete).toBe(false);
    expect(result.steps.length).toBeGreaterThan(0);

    const emptyCells = result.board.cells
      .flat()
      .filter((c) => c.value === null);
    expect(emptyCells.length).toBeGreaterThan(0);
  });

  it('returns empty steps and complete: true for an already-solved board', () => {
    const board = createBoard(SOLVED_PUZZLE);
    const result = solve(board);

    expect(result.steps).toHaveLength(0);
    expect(result.complete).toBe(true);
  });

  it('every step has a valid valuePlaced position and value', () => {
    const board = createBoard(EASY_PUZZLE);
    const result = solve(board);

    for (const step of result.steps) {
      expect(step.valuePlaced).not.toBeNull();
      const { position, value } = step.valuePlaced!;
      expect(position.row).toBeGreaterThanOrEqual(0);
      expect(position.row).toBeLessThanOrEqual(8);
      expect(position.col).toBeGreaterThanOrEqual(0);
      expect(position.col).toBeLessThanOrEqual(8);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(9);
    }
  });
});
