import { useState, useCallback, useRef, useEffect } from 'react';
import type { Board, SolveResult, SolveStep } from '../types';
import { buildSnapshots } from '../utils/snapshots';
import { assessDifficulty } from '../utils/difficulty';

type PlaybackMode = 'idle' | 'playing' | 'paused';

interface PlaybackState {
  mode: PlaybackMode;
  stepIndex: number;
  steps: SolveStep[];
  snapshots: Board[];
}

const AUTOPLAY_DELAY_MS = 700;

export function usePlayback() {
  const [state, setState] = useState<PlaybackState>({
    mode: 'idle',
    stepIndex: -1,
    steps: [],
    snapshots: [],
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stepForward = useCallback(() => {
    setState((prev) => {
      if (prev.stepIndex >= prev.steps.length - 1) {
        return { ...prev, mode: 'paused' };
      }
      return { ...prev, stepIndex: prev.stepIndex + 1 };
    });
  }, []);

  const stepBackward = useCallback(() => {
    setState((prev) => {
      if (prev.stepIndex <= -1) return prev;
      return { ...prev, stepIndex: prev.stepIndex - 1 };
    });
  }, []);

  const play = useCallback(() => {
    setState((prev) => {
      if (prev.mode === 'idle' || prev.steps.length === 0) return prev;
      if (prev.stepIndex >= prev.steps.length - 1) return prev;
      return { ...prev, mode: 'playing' };
    });
  }, []);

  const pause = useCallback(() => {
    clearTimer();
    setState((prev) => {
      if (prev.mode !== 'playing') return prev;
      return { ...prev, mode: 'paused' };
    });
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState((prev) => {
      if (prev.mode === 'idle') return prev;
      return { ...prev, mode: 'paused', stepIndex: -1 };
    });
  }, [clearTimer]);

  const startSolve = useCallback(
    (result: SolveResult, initialBoard: Board) => {
      clearTimer();
      const snapshots = buildSnapshots(initialBoard, result.steps);
      setState({
        mode: 'paused',
        stepIndex: -1,
        steps: result.steps,
        snapshots,
      });
    },
    [clearTimer]
  );

  useEffect(() => {
    if (state.mode === 'playing') {
      timerRef.current = setTimeout(() => {
        stepForward();
      }, AUTOPLAY_DELAY_MS);
    }
    return () => {
      clearTimer();
    };
  }, [state.mode, state.stepIndex, stepForward, clearTimer]);

  const isAtStart = state.stepIndex === -1;
  const isAtEnd =
    state.steps.length > 0 && state.stepIndex === state.steps.length - 1;
  const currentBoard =
    state.snapshots.length > 0
      ? state.snapshots[state.stepIndex + 1]
      : null;
  const currentStep =
    state.stepIndex >= 0 ? state.steps[state.stepIndex] : null;
  const difficulty =
    state.steps.length > 0 ? assessDifficulty(state.steps) : null;

  return {
    mode: state.mode,
    stepIndex: state.stepIndex,
    totalSteps: state.steps.length,
    currentBoard,
    currentStep,
    isAtStart,
    isAtEnd,
    difficulty,
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    startSolve,
  };
}
