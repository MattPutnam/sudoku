import { useState } from 'react';

import styles from './App.module.css';
import { Button } from './components/Button';
import { DifficultyBadge } from './components/DifficultyBadge';
import { Grid } from './components/Grid';
import { PlaybackControls } from './components/PlaybackControls';
import PlaybackGrid from './components/PlaybackGrid';
import { StepInfo } from './components/StepInfo';
import { usePlayback } from './hooks/usePlayback';
import { solve } from './solver';
import type { Board } from './types';
import { validatePuzzle } from './utils/validatePuzzle';


const EXAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const EMPTY_PUZZLE = '0'.repeat(81);

type AppMode = 'input' | 'playback';

function App() {
  const [puzzle, setPuzzle] = useState(EMPTY_PUZZLE);
  const [boardKey, setBoardKey] = useState(0);
  const [appMode, setAppMode] = useState<AppMode>('input');
  const [solveComplete, setSolveComplete] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);

  const playback = usePlayback();

  const validation = currentBoard ? validatePuzzle(currentBoard) : null;
  const canSolve = validation?.status === 'valid';

  const loadPuzzle = (p: string) => {
    setPuzzle(p);
    setBoardKey((k) => k + 1);
  };

  const handleSolve = () => {
    const result = solve(currentBoard!);
    playback.startSolve(result, currentBoard!);
    setSolveComplete(result.complete);
    setAppMode('playback');
  };

  const handleBackToInput = () => {
    playback.reset();
    setAppMode('input');
  };

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>Sudoku</h1>

      {appMode === 'input' && (
        <>
          <div className={styles.controls}>
            <Button onClick={() => loadPuzzle(EXAMPLE_PUZZLE)}>
              Load Example Puzzle
            </Button>
            <Button onClick={() => loadPuzzle(EMPTY_PUZZLE)}>
              Clear
            </Button>
            <Button
              variant="primary"
              onClick={handleSolve}
              disabled={!canSolve}
              tooltip={!canSolve && validation ? validation.message : undefined}
            >
              Solve
            </Button>
          </div>
          <Grid key={boardKey} initialPuzzle={puzzle} onBoardChange={setCurrentBoard} />
        </>
      )}

      {appMode === 'playback' && (
        <div className={styles.playbackArea}>
          {playback.currentBoard && (
            <PlaybackGrid
              board={playback.currentBoard}
              currentStep={playback.currentStep}
            />
          )}
          <PlaybackControls
            mode={playback.mode}
            isAtStart={playback.isAtStart}
            isAtEnd={playback.isAtEnd}
            onPlay={playback.play}
            onPause={playback.pause}
            onStepForward={playback.stepForward}
            onStepBackward={playback.stepBackward}
            onReset={playback.reset}
            stepIndex={playback.stepIndex}
            totalSteps={playback.totalSteps}
          />
          <StepInfo step={playback.currentStep} />
          <DifficultyBadge
            difficulty={playback.difficulty}
            isComplete={solveComplete}
          />
          <Button onClick={handleBackToInput}>
            Back to Input
          </Button>
        </div>
      )}
    </div>
  );
}

export default App;
