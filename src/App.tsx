import { useState } from 'react';
import { Grid } from './components/Grid';
import PlaybackGrid from './components/PlaybackGrid';
import { PlaybackControls } from './components/PlaybackControls';
import { StepInfo } from './components/StepInfo';
import { DifficultyBadge } from './components/DifficultyBadge';
import { usePlayback } from './hooks/usePlayback';
import { createBoard } from './board';
import { solve } from './solver';
import styles from './App.module.css';

const EXAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const EMPTY_PUZZLE = '0'.repeat(81);

type AppMode = 'input' | 'playback';

function App() {
  const [puzzle, setPuzzle] = useState(EMPTY_PUZZLE);
  const [boardKey, setBoardKey] = useState(0);
  const [appMode, setAppMode] = useState<AppMode>('input');
  const [solveComplete, setSolveComplete] = useState(false);

  const playback = usePlayback();

  const loadPuzzle = (p: string) => {
    setPuzzle(p);
    setBoardKey((k) => k + 1);
  };

  const handleSolve = () => {
    const board = createBoard(puzzle);
    const result = solve(board);
    playback.startSolve(result, board);
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
            <button
              className={styles.button}
              onClick={() => loadPuzzle(EXAMPLE_PUZZLE)}
            >
              Load Example Puzzle
            </button>
            <button
              className={styles.button}
              onClick={() => loadPuzzle(EMPTY_PUZZLE)}
            >
              Clear
            </button>
            <button
              className={`${styles.button} ${styles.solveButton}`}
              onClick={handleSolve}
            >
              Solve
            </button>
          </div>
          <Grid key={boardKey} initialPuzzle={puzzle} />
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
          <button className={styles.button} onClick={handleBackToInput}>
            Back to Input
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
