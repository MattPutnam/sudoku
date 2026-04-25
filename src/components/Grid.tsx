import { useCallback, useMemo, useRef, useState } from 'react';
import type { Board, CellPosition } from '../types';
import { createBoard, setCellValue } from '../board';
import { Cell } from './Cell';
import styles from './Grid.module.css';

function posKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function detectConflicts(board: Board): Set<string> {
  const conflicts = new Set<string>();

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board.cells[row][col];
      if (cell.value === null) continue;

      for (let c = col + 1; c < 9; c++) {
        if (board.cells[row][c].value === cell.value) {
          conflicts.add(posKey(row, col));
          conflicts.add(posKey(row, c));
        }
      }

      for (let r = row + 1; r < 9; r++) {
        if (board.cells[r][col].value === cell.value) {
          conflicts.add(posKey(row, col));
          conflicts.add(posKey(r, col));
        }
      }

      const boxStartRow = Math.floor(row / 3) * 3;
      const boxStartCol = Math.floor(col / 3) * 3;
      for (let r = boxStartRow; r < boxStartRow + 3; r++) {
        for (let c = boxStartCol; c < boxStartCol + 3; c++) {
          if (r === row && c === col) continue;
          if (r < row || (r === row && c <= col)) continue;
          if (board.cells[r][c].value === cell.value) {
            conflicts.add(posKey(row, col));
            conflicts.add(posKey(r, c));
          }
        }
      }
    }
  }

  return conflicts;
}

interface GridProps {
  initialPuzzle?: string;
}

export function Grid({ initialPuzzle = '0'.repeat(81) }: GridProps) {
  const [board, setBoard] = useState<Board>(() =>
    createBoard(initialPuzzle)
  );
  const [selectedPos, setSelectedPos] = useState<CellPosition | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const conflicts = useMemo(() => detectConflicts(board), [board]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedPos) return;

      const { row, col } = selectedPos;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedPos({ row: Math.max(0, row - 1), col });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedPos({ row: Math.min(8, row + 1), col });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedPos({ row, col: Math.max(0, col - 1) });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSelectedPos({ row, col: Math.min(8, col + 1) });
          break;
        case '1': case '2': case '3':
        case '4': case '5': case '6':
        case '7': case '8': case '9': {
          const cell = board.cells[row][col];
          if (!cell.isGiven) {
            setBoard(setCellValue(board, selectedPos, parseInt(e.key, 10)));
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          e.preventDefault();
          const cell = board.cells[row][col];
          if (!cell.isGiven) {
            setBoard(setCellValue(board, selectedPos, null));
          }
          break;
        }
      }
    },
    [board, selectedPos]
  );

  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedPos({ row, col });
    gridRef.current?.focus();
  }, []);

  return (
    <div
      className={styles.grid}
      tabIndex={0}
      ref={gridRef}
      onKeyDown={handleKeyDown}
    >
      {board.cells.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          const key = posKey(rowIdx, colIdx);
          const extraClasses = [
            colIdx % 3 === 0 && colIdx !== 0 && styles.boxLeft,
            rowIdx % 3 === 0 && rowIdx !== 0 && styles.boxTop,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <Cell
              key={key}
              cell={cell}
              isSelected={
                selectedPos !== null &&
                selectedPos.row === rowIdx &&
                selectedPos.col === colIdx
              }
              isConflict={conflicts.has(key)}
              className={extraClasses || undefined}
              onClick={() => handleCellClick(rowIdx, colIdx)}
            />
          );
        })
      )}
    </div>
  );
}
