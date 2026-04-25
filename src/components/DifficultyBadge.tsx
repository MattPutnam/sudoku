import styles from './DifficultyBadge.module.css';

interface DifficultyBadgeProps {
  difficulty: { level: number; label: string } | null;
  isComplete: boolean;
}

const LEVEL_CLASS_KEYS: Record<number, string> = {
  0: 'trivial',
  1: 'easy',
  2: 'medium',
  3: 'hard',
  4: 'expert',
};

export function DifficultyBadge({ difficulty, isComplete }: DifficultyBadgeProps) {
  if (difficulty === null || !isComplete) {
    return null;
  }

  const colorKey = LEVEL_CLASS_KEYS[difficulty.level] ?? '';
  const colorClass = colorKey ? styles[colorKey] : '';

  return (
    <span className={`${styles.badge} ${colorClass}`}>
      Difficulty: {difficulty.label}
    </span>
  );
}
