import { describe, it, expect } from 'vitest';

import type { SolveStep } from '../types';
import { assessDifficulty, STRATEGY_TIERS } from '../utils/difficulty';


function makeStep(strategy: string): SolveStep {
  return {
    strategy,
    cellsAffected: [{ row: 0, col: 0 }],
    candidatesEliminated: new Map(),
    valuePlaced: null,
    reasonCells: [],
    explanation: `${strategy} test`,
  };
}

const ALL_STRATEGIES = [
  'Naked Single',
  'Hidden Single',
  'Pointing Pair',
  'Claiming',
  'Naked Pair',
  'Hidden Pair',
  'Naked Triple',
  'Hidden Triple',
  'Naked Quad',
  'Hidden Quad',
  'X-Wing',
  'Swordfish',
  'Jellyfish',
  'Skyscraper',
  '2-String Kite',
  'XY-Wing',
  'XYZ-Wing',
  'W-Wing',
  'Unique Rectangle',
  'Simple Coloring',
  'X-Chain',
  'XY-Chain',
  'ALS-XZ',
  'ALS-XY-Wing',
  'Forcing Chains',
];

describe('assessDifficulty', () => {
  it('returns Trivial for empty steps', () => {
    const result = assessDifficulty([]);
    expect(result).toEqual({ level: 0, label: 'Trivial' });
  });

  it('returns Easy for Naked Single only', () => {
    const result = assessDifficulty([makeStep('Naked Single')]);
    expect(result).toEqual({ level: 1, label: 'Easy' });
  });

  it('returns Hard when Tier 1 and Tier 3 strategies are mixed', () => {
    const steps = [
      makeStep('Naked Single'),
      makeStep('Hidden Single'),
      makeStep('X-Wing'),
    ];
    const result = assessDifficulty(steps);
    expect(result).toEqual({ level: 3, label: 'Hard' });
  });

  it('returns Expert for Tier 4 strategies', () => {
    const steps = [makeStep('Naked Single'), makeStep('Forcing Chains')];
    const result = assessDifficulty(steps);
    expect(result).toEqual({ level: 4, label: 'Expert' });
  });

  it('recognizes all 25 strategy names', () => {
    expect(ALL_STRATEGIES).toHaveLength(25);
    for (const name of ALL_STRATEGIES) {
      expect(STRATEGY_TIERS[name]).toBeDefined();
      expect(STRATEGY_TIERS[name]).toBeGreaterThanOrEqual(1);
      expect(STRATEGY_TIERS[name]).toBeLessThanOrEqual(4);
    }
  });

  it('maps exactly 25 strategies', () => {
    expect(Object.keys(STRATEGY_TIERS)).toHaveLength(25);
  });
});
