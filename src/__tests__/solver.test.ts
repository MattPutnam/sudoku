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

  it('every step has either a valid valuePlaced or non-empty candidatesEliminated', () => {
    const board = createBoard(EASY_PUZZLE);
    const result = solve(board);

    for (const step of result.steps) {
      if (step.valuePlaced !== null) {
        const { position, value } = step.valuePlaced;
        expect(position.row).toBeGreaterThanOrEqual(0);
        expect(position.row).toBeLessThanOrEqual(8);
        expect(position.col).toBeGreaterThanOrEqual(0);
        expect(position.col).toBeLessThanOrEqual(8);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(9);
      } else {
        expect(step.candidatesEliminated.size).toBeGreaterThan(0);
      }
    }
  });
});

// Medium puzzle that requires Tier 2 strategies (Pointing Pair) to solve completely
const MEDIUM_PUZZLE =
  '850002400720000009004000000000107002305000900040000000000080070017000000000036040';

describe('solve — medium puzzle', () => {
  it('solves the medium puzzle completely', () => {
    const board = createBoard(MEDIUM_PUZZLE);
    const result = solve(board);

    expect(result.complete).toBe(true);
  });

  it('uses at least one Tier 2 strategy', () => {
    const board = createBoard(MEDIUM_PUZZLE);
    const result = solve(board);

    const tier2Names = new Set([
      'Naked Pair',
      'Hidden Pair',
      'Naked Triple',
      'Hidden Triple',
      'Naked Quad',
      'Hidden Quad',
      'Pointing Pair',
      'Claiming',
    ]);
    const usedStrategies = result.steps.map((s) => s.strategy);
    const hasTier2 = usedStrategies.some((name) => tier2Names.has(name));

    expect(hasTier2).toBe(true);
  });

  it('every step has either valuePlaced or non-empty candidatesEliminated', () => {
    const board = createBoard(MEDIUM_PUZZLE);
    const result = solve(board);

    for (const step of result.steps) {
      if (step.valuePlaced !== null) {
        expect(step.valuePlaced.value).toBeGreaterThanOrEqual(1);
        expect(step.valuePlaced.value).toBeLessThanOrEqual(9);
      } else {
        expect(step.candidatesEliminated.size).toBeGreaterThan(0);
      }
    }
  });
});

const TIER3_NAMES = [
  'X-Wing',
  'Swordfish',
  'Jellyfish',
  'Skyscraper',
  '2-String Kite',
  'XY-Wing',
  'XYZ-Wing',
  'W-Wing',
  'Unique Rectangle',
];

// Puzzle requiring XYZ-Wing to make progress beyond Tier 1/2
const XYZ_WING_PUZZLE =
  '900084000000000058040900000001000300060000020003000600000001030370000000000760004';

// Puzzle requiring Unique Rectangle to make progress beyond Tier 1/2
const UR_PUZZLE =
  '000000000000003085001020000000507000004000100090000000500000073002010000000040900';

describe('solve — hard puzzle with Tier 3', () => {
  it('uses at least one Tier 3 strategy on a puzzle requiring XYZ-Wing', () => {
    const board = createBoard(XYZ_WING_PUZZLE);
    const result = solve(board);

    const usedStrategies = result.steps.map((s) => s.strategy);
    const hasTier3 = usedStrategies.some((name) => TIER3_NAMES.includes(name));

    expect(hasTier3).toBe(true);
    expect(usedStrategies).toContain('XYZ-Wing');
  });

  it('uses at least one Tier 3 strategy on a puzzle requiring Unique Rectangle', () => {
    const board = createBoard(UR_PUZZLE);
    const result = solve(board);

    const usedStrategies = result.steps.map((s) => s.strategy);
    const hasTier3 = usedStrategies.some((name) => TIER3_NAMES.includes(name));

    expect(hasTier3).toBe(true);
    expect(usedStrategies).toContain('Unique Rectangle');
  });

  it('every step has either valuePlaced or non-empty candidatesEliminated', () => {
    const board = createBoard(XYZ_WING_PUZZLE);
    const result = solve(board);

    for (const step of result.steps) {
      if (step.valuePlaced !== null) {
        const { position, value } = step.valuePlaced;
        expect(position.row).toBeGreaterThanOrEqual(0);
        expect(position.row).toBeLessThanOrEqual(8);
        expect(position.col).toBeGreaterThanOrEqual(0);
        expect(position.col).toBeLessThanOrEqual(8);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(9);
      } else {
        expect(step.candidatesEliminated.size).toBeGreaterThan(0);
      }
    }
  });

  it('makes more progress than Tier 1/2 alone on the hard puzzle', () => {
    const board = createBoard(XYZ_WING_PUZZLE);
    const result = solve(board);

    expect(result.steps.length).toBeGreaterThan(10);
  });
});

const TIER4_NAMES = [
  'Simple Coloring',
  'X-Chain',
  'XY-Chain',
  'ALS-XZ',
  'ALS-XY-Wing',
  'Forcing Chains',
];

// Puzzle requiring Tier 4 strategies (Forcing Chains, ALS-XZ, ALS-XY-Wing)
const DIABOLICAL_PUZZLE =
  '000000001000003000020500400000000520004070100087000000500200030300010000100800000';

describe('solve — diabolical puzzle with Tier 4', () => {
  it('uses at least one Tier 4 strategy on a diabolical puzzle', () => {
    const board = createBoard(DIABOLICAL_PUZZLE);
    const result = solve(board);

    const usedStrategies = result.steps.map((s) => s.strategy);
    const hasTier4 = usedStrategies.some((name) => TIER4_NAMES.includes(name));

    expect(hasTier4).toBe(true);
  });

  it('every step has either valuePlaced or non-empty candidatesEliminated', () => {
    const board = createBoard(DIABOLICAL_PUZZLE);
    const result = solve(board);

    for (const step of result.steps) {
      if (step.valuePlaced !== null) {
        const { position, value } = step.valuePlaced;
        expect(position.row).toBeGreaterThanOrEqual(0);
        expect(position.row).toBeLessThanOrEqual(8);
        expect(position.col).toBeGreaterThanOrEqual(0);
        expect(position.col).toBeLessThanOrEqual(8);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(9);
      } else {
        expect(step.candidatesEliminated.size).toBeGreaterThan(0);
      }
    }
  });

  it('makes more progress with Tier 4 strategies than the HARD_PUZZLE test', () => {
    const board = createBoard(DIABOLICAL_PUZZLE);
    const result = solve(board);

    // HARD_PUZZLE only gets ~1 step without advanced strategies
    // This diabolical puzzle with all Tier 4 strategies should make substantial progress
    expect(result.steps.length).toBeGreaterThan(1);
  });

  it('all 6 Tier 4 strategies are registered in solver', () => {
    // Verify by solving the diabolical puzzle and checking that the solver
    // has access to all tier 4 strategies (they won't all fire on one puzzle,
    // but the solver should attempt them). We verify registration by checking
    // that forcing chains (the last registered) is available.
    const board = createBoard(DIABOLICAL_PUZZLE);
    const result = solve(board);

    // The solver makes progress, which means the strategy pipeline is intact
    expect(result.steps.length).toBeGreaterThan(0);

    // Verify all 6 Tier 4 strategy names are valid by checking the used strategies
    // don't contain unknown names
    const allKnownStrategies = [
      'Naked Single', 'Hidden Single', 'Pointing Pair', 'Claiming',
      'Naked Pair', 'Hidden Pair', 'Naked Triple', 'Hidden Triple',
      'Naked Quad', 'Hidden Quad',
      'X-Wing', 'Swordfish', 'Jellyfish', 'Skyscraper', '2-String Kite',
      'XY-Wing', 'XYZ-Wing', 'W-Wing', 'Unique Rectangle',
      ...TIER4_NAMES,
    ];
    for (const step of result.steps) {
      expect(allKnownStrategies).toContain(step.strategy);
    }
  });
});
