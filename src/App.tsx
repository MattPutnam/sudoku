import { useCallback, useMemo, useState } from 'react';

import styles from './App.module.css';
import { Button } from './components/Button';
import { DifficultyBadge } from './components/DifficultyBadge';
import type { DropdownSection } from './components/DropdownButton';
import { DropdownButton } from './components/DropdownButton';
import { Grid } from './components/Grid';
import { PlaybackControls } from './components/PlaybackControls';
import PlaybackGrid from './components/PlaybackGrid';
import { StepInfo } from './components/StepInfo';
import { usePlayback } from './hooks/usePlayback';
import { solve } from './solver';
import type { Board } from './types';
import { PUZZLE_GROUPS } from './utils/examplePuzzles';
import { validatePuzzle } from './utils/validatePuzzle';

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

  const loadPuzzle = useCallback((p: string) => {
    setPuzzle(p);
    setBoardKey((k) => k + 1);
  }, []);

  const exampleSections: DropdownSection[] = useMemo(
    () =>
      PUZZLE_GROUPS.map((group) => ({
        heading: group.heading,
        items: group.puzzles.map((ep) => ({
          label: ep.label,
          onClick: () => loadPuzzle(ep.puzzle),
        })),
      })),
    [loadPuzzle],
  );

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
      <h1 className={styles.title}>Sudoku Solver</h1>

      {appMode === 'input' && (
        <>
          <div className={styles.controls}>
            <DropdownButton label="Load Puzzle" sections={exampleSections} />
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
