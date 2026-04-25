import { useState } from 'react';
import { Grid } from './components/Grid';
import styles from './App.module.css';

const EXAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const EMPTY_PUZZLE = '0'.repeat(81);

function App() {
  const [puzzle, setPuzzle] = useState(EMPTY_PUZZLE);
  const [boardKey, setBoardKey] = useState(0);

  const loadPuzzle = (p: string) => {
    setPuzzle(p);
    setBoardKey((k) => k + 1);
  };

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>Sudoku</h1>
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
      </div>
      <Grid key={boardKey} initialPuzzle={puzzle} />
    </div>
  );
}

export default App;
