import type { SolveStep } from '../types';

const STRATEGY_TIERS: Record<string, number> = {
  'Naked Single': 1,
  'Hidden Single': 1,

  'Pointing Pair': 2,
  'Claiming': 2,
  'Naked Pair': 2,
  'Hidden Pair': 2,
  'Naked Triple': 2,
  'Hidden Triple': 2,
  'Naked Quad': 2,
  'Hidden Quad': 2,

  'X-Wing': 3,
  'Swordfish': 3,
  'Jellyfish': 3,
  'Finned X-Wing': 3,
  'Finned Swordfish': 3,
  'Finned Jellyfish': 3,
  'Skyscraper': 3,
  '2-String Kite': 3,
  'XY-Wing': 3,
  'XYZ-Wing': 3,
  'W-Wing': 3,
  'Unique Rectangle': 3,

  'Simple Coloring': 4,
  'X-Chain': 4,
  'XY-Chain': 4,
  'ALS-XZ': 4,
  'ALS-XY-Wing': 4,
  'Sue de Coq': 4,

  'AIC': 5,
  'Grouped AIC': 5,
  'Forcing Chains': 5,
};

const TIER_LABELS: Record<number, string> = {
  0: 'Trivial',
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
  4: 'Expert',
  5: 'Extreme',
};

export function assessDifficulty(steps: SolveStep[]): { level: number; label: string } {
  if (steps.length === 0) {
    return { level: 0, label: 'Trivial' };
  }

  let maxTier = 0;
  for (const step of steps) {
    const tier = STRATEGY_TIERS[step.strategy] ?? 0;
    if (tier > maxTier) maxTier = tier;
  }

  return { level: maxTier, label: TIER_LABELS[maxTier] ?? 'Unknown' };
}

export { STRATEGY_TIERS };
