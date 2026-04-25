import styles from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  mode: 'idle' | 'playing' | 'paused';
  isAtStart: boolean;
  isAtEnd: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  stepIndex: number;
  totalSteps: number;
}

export function PlaybackControls({
  mode,
  isAtStart,
  isAtEnd,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  stepIndex,
  totalSteps,
}: PlaybackControlsProps) {
  const isPlaying = mode === 'playing';
  const stepLabel =
    stepIndex === -1 ? 'Ready' : `Step ${stepIndex + 1} of ${totalSteps}`;

  return (
    <div className={styles.bar}>
      <button
        className={styles.button}
        onClick={onStepBackward}
        disabled={isAtStart}
        aria-label="Step backward"
        title="Step backward"
      >
        |◀
      </button>

      <button
        className={styles.button}
        onClick={isPlaying ? onPause : onPlay}
        disabled={isAtEnd && !isPlaying}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <button
        className={styles.button}
        onClick={onStepForward}
        disabled={isAtEnd}
        aria-label="Step forward"
        title="Step forward"
      >
        ▶|
      </button>

      <button
        className={styles.button}
        onClick={onReset}
        disabled={isAtStart}
        aria-label="Reset"
        title="Reset"
      >
        ↺
      </button>

      <span className={styles.counter}>{stepLabel}</span>
    </div>
  );
}
