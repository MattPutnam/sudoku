import { Button } from './Button';
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
      <Button
        compact
        onClick={onStepBackward}
        disabled={isAtStart}
        aria-label="Step backward"
      >
        |◀
      </Button>

      <Button
        compact
        onClick={isPlaying ? onPause : onPlay}
        disabled={isAtEnd && !isPlaying}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </Button>

      <Button
        compact
        onClick={onStepForward}
        disabled={isAtEnd}
        aria-label="Step forward"
      >
        ▶|
      </Button>

      <Button
        compact
        onClick={onReset}
        disabled={isAtStart}
        aria-label="Reset"
      >
        ↺
      </Button>

      <span className={styles.counter}>{stepLabel}</span>
    </div>
  );
}
