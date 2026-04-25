import styles from './StepInfo.module.css';
import type { SolveStep } from '../types';

interface StepInfoProps {
  step: SolveStep | null;
}

export function StepInfo({ step }: StepInfoProps) {
  if (step === null) {
    return (
      <div className={styles.container}>
        <p className={styles.prompt}>Press Play or Step Forward to begin</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <span className={styles.strategy}>{step.strategy}</span>
      <p className={styles.explanation}>{step.explanation}</p>
    </div>
  );
}
