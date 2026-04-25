import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { getRow, getCol, getBox } from '../board';

function sharesUnit(a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row) return true;
  if (a.col === b.col) return true;
  const boxA = Math.floor(a.row / 3) * 3 + Math.floor(a.col / 3);
  const boxB = Math.floor(b.row / 3) * 3 + Math.floor(b.col / 3);
  return boxA === boxB;
}

export const xChains: Strategy = (board: Board): SolveStep | null => {
  for (let digit = 1; digit <= 9; digit++) {
    const result = findXChainElimination(board, digit);
    if (result) return result;
  }
  return null;
};

function findXChainElimination(board: Board, digit: number): SolveStep | null {
  const candidateCells: CellPosition[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board.cells[r][c].value === null && board.cells[r][c].candidates.has(digit)) {
        candidateCells.push({ row: r, col: c });
      }
    }
  }

  if (candidateCells.length < 2) return null;

  const strongLinks = new Map<string, Set<string>>();
  const weakLinks = new Map<string, Set<string>>();

  const key = (p: CellPosition) => `${p.row},${p.col}`;

  for (const cell of candidateCells) {
    strongLinks.set(key(cell), new Set());
    weakLinks.set(key(cell), new Set());
  }

  // Strong links: conjugate pairs (digit in exactly 2 cells in a unit)
  for (let i = 0; i < 9; i++) {
    const rowCells = getRow(board, i)
      .filter(c => c.value === null && c.candidates.has(digit));
    if (rowCells.length === 2) {
      const k0 = key(rowCells[0]);
      const k1 = key(rowCells[1]);
      strongLinks.get(k0)?.add(k1);
      strongLinks.get(k1)?.add(k0);
    }

    const colCells = getCol(board, i)
      .filter(c => c.value === null && c.candidates.has(digit));
    if (colCells.length === 2) {
      const k0 = key(colCells[0]);
      const k1 = key(colCells[1]);
      strongLinks.get(k0)?.add(k1);
      strongLinks.get(k1)?.add(k0);
    }

    const boxCells = getBox(board, i)
      .filter(c => c.value === null && c.candidates.has(digit));
    if (boxCells.length === 2) {
      const k0 = key(boxCells[0]);
      const k1 = key(boxCells[1]);
      strongLinks.get(k0)?.add(k1);
      strongLinks.get(k1)?.add(k0);
    }
  }

  // Weak links: two cells sharing a unit, both having the candidate (that aren't strong links)
  for (let i = 0; i < candidateCells.length; i++) {
    for (let j = i + 1; j < candidateCells.length; j++) {
      const a = candidateCells[i];
      const b = candidateCells[j];
      if (sharesUnit(a, b)) {
        const ka = key(a);
        const kb = key(b);
        if (!strongLinks.get(ka)?.has(kb)) {
          weakLinks.get(ka)?.add(kb);
          weakLinks.get(kb)?.add(ka);
        }
      }
    }
  }

  const MAX_CHAIN_LENGTH = 10;

  // BFS for alternating chains: strong-weak-strong-weak-...-strong
  // Valid chain has odd number of links (>=3), starting and ending with strong.
  // After a strong link nextLink='weak', so valid terminal: linkCount >= 3, odd, nextLink='weak'.

  for (const startKey of strongLinks.keys()) {
    type State = {
      current: string;
      nextLink: 'strong' | 'weak';
      chain: string[];
      linkCount: number;
    };

    const queue: State[] = [];

    for (const next of strongLinks.get(startKey) || []) {
      queue.push({
        current: next,
        nextLink: 'weak',
        chain: [startKey, next],
        linkCount: 1,
      });
    }

    while (queue.length > 0) {
      const state = queue.shift()!;

      if (state.linkCount >= 3 && state.linkCount % 2 === 1 && state.nextLink === 'weak') {
        const startPos = parseKey(startKey);
        const endPos = parseKey(state.current);

        if (startKey !== state.current) {
          const eliminations = new Map<string, number[]>();

          for (const cell of candidateCells) {
            const ck = key(cell);
            if (state.chain.includes(ck)) continue;
            if (sharesUnit(cell, startPos) && sharesUnit(cell, endPos)) {
              eliminations.set(ck, [digit]);
            }
          }

          if (eliminations.size > 0) {
            const chainPositions = state.chain.map(parseKey);
            const elimCells = [...eliminations.keys()].map(parseKey);

            return {
              strategy: 'X-Chain',
              cellsAffected: elimCells,
              candidatesEliminated: eliminations,
              valuePlaced: null,
              reasonCells: chainPositions,
              explanation: `X-Chain on digit ${digit}: ${state.linkCount}-link chain ${chainPositions.map(p => `R${p.row + 1}C${p.col + 1}`).join('→')} — eliminates ${digit} from ${elimCells.map(c => `R${c.row + 1}C${c.col + 1}`).join(', ')}`,
            };
          }
        }
      }

      if (state.linkCount >= MAX_CHAIN_LENGTH) continue;

      const links = state.nextLink === 'strong'
        ? strongLinks.get(state.current)
        : weakLinks.get(state.current);

      for (const next of links || []) {
        if (state.chain.includes(next)) continue;
        queue.push({
          current: next,
          nextLink: state.nextLink === 'strong' ? 'weak' : 'strong',
          chain: [...state.chain, next],
          linkCount: state.linkCount + 1,
        });
      }
    }
  }

  return null;
}

function parseKey(key: string): CellPosition {
  const [r, c] = key.split(',').map(Number);
  return { row: r, col: c };
}
