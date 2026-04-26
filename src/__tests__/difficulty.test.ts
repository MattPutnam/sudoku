import { describe, it, expect } from 'vitest';

import type { SolveStep } from '../types';
import { assessDifficulty } from '../utils/difficulty';


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
    const steps = [makeStep('Naked Single'), makeStep('ALS-XZ')];
    const result = assessDifficulty(steps);
    expect(result).toEqual({ level: 4, label: 'Expert' });
  });

  it('returns Extreme for Tier 5 strategies', () => {
    const steps = [makeStep('Naked Single'), makeStep('AIC')];
    const result = assessDifficulty(steps);
    expect(result).toEqual({ level: 5, label: 'Extreme' });
  });
});
