import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { cpToKey, keyToCP } from '../utils/cellPosition';

function sharesUnit(a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row) return true;
  if (a.col === b.col) return true;
  const boxA = Math.floor(a.row / 3) * 3 + Math.floor(a.col / 3);
  const boxB = Math.floor(b.row / 3) * 3 + Math.floor(b.col / 3);
  return boxA === boxB;
}

interface BivalueCell {
  pos: CellPosition;
  cands: [number, number];
}

export const xyChains: Strategy = (board: Board): SolveStep | null => {
  const bivalueCells: BivalueCell[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board.cells[r][c];
      if (cell.value === null && cell.candidates.size === 2) {
        const arr = [...cell.candidates] as [number, number];
        bivalueCells.push({ pos: { row: r, col: c }, cands: arr });
      }
    }
  }

  if (bivalueCells.length < 2) return null;

  const bvMap = new Map<string, BivalueCell>();
  for (const bv of bivalueCells) {
    bvMap.set(cpToKey(bv.pos), bv);
  }

  const adj = new Map<string, string[]>();
  for (const bv of bivalueCells) {
    adj.set(cpToKey(bv.pos), []);
  }

  for (let i = 0; i < bivalueCells.length; i++) {
    for (let j = i + 1; j < bivalueCells.length; j++) {
      const a = bivalueCells[i];
      const b = bivalueCells[j];
      if (!sharesUnit(a.pos, b.pos)) continue;
      const shared = a.cands.filter(d => b.cands.includes(d));
      if (shared.length === 1) {
        const ka = cpToKey(a.pos);
        const kb = cpToKey(b.pos);
        adj.get(ka)!.push(kb);
        adj.get(kb)!.push(ka);
      }
    }
  }

  const MAX_CHAIN = 12;

  for (const start of bivalueCells) {
    const startKey = cpToKey(start.pos);

    for (const startDigit of start.cands) {
      const propagating = start.cands[0] === startDigit ? start.cands[1] : start.cands[0];

      type State = {
        current: string;
        incoming: number;
        chain: string[];
      };

      const stack: State[] = [];

      for (const nbr of adj.get(startKey)!) {
        const nbrCell = bvMap.get(nbr)!;
        if (nbrCell.cands.includes(propagating) && sharesUnit(start.pos, nbrCell.pos)) {
          const sharedWithStart = start.cands.filter(d => nbrCell.cands.includes(d));
          if (sharedWithStart.length === 1 && sharedWithStart[0] === propagating) {
            const outgoing = nbrCell.cands[0] === propagating ? nbrCell.cands[1] : nbrCell.cands[0];
            stack.push({
              current: nbr,
              incoming: outgoing,
              chain: [startKey, nbr],
            });
          }
        }
      }

      while (stack.length > 0) {
        const state = stack.pop()!;
        const curCell = bvMap.get(state.current)!;

        if (state.chain.length >= 3 && state.incoming === startDigit) {
          const endPos = curCell.pos;
          const eliminations = new Map<string, number[]>();

          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              const cell = board.cells[r][c];
              if (cell.value !== null) continue;
              if (!cell.candidates.has(startDigit)) continue;
              const pos: CellPosition = { row: r, col: c };
              const pk = cpToKey(pos);
              if (state.chain.includes(pk)) continue;
              if (sharesUnit(pos, start.pos) && sharesUnit(pos, endPos)) {
                eliminations.set(pk, [startDigit]);
              }
            }
          }

          if (eliminations.size > 0) {
            const chainPositions = state.chain.map(keyToCP);
            const elimCells = [...eliminations.keys()].map(keyToCP);
            return {
              strategy: 'XY-Chain',
              cellsAffected: elimCells,
              candidatesEliminated: eliminations,
              valuePlaced: null,
              reasonCells: chainPositions,
              explanation: `XY-Chain: ${chainPositions.map(p => `R${p.row + 1}C${p.col + 1}`).join('→')} eliminates ${startDigit} from ${elimCells.map(p => `R${p.row + 1}C${p.col + 1}`).join(', ')}`,
            };
          }
        }

        if (state.chain.length >= MAX_CHAIN) continue;

        for (const nbr of adj.get(state.current)!) {
          if (state.chain.includes(nbr)) continue;
          const nbrCell = bvMap.get(nbr)!;
          if (!nbrCell.cands.includes(state.incoming)) continue;

          const sharedWithCur = curCell.cands.filter(d => nbrCell.cands.includes(d));
          if (sharedWithCur.length !== 1 || sharedWithCur[0] !== state.incoming) continue;

          const outgoing = nbrCell.cands[0] === state.incoming ? nbrCell.cands[1] : nbrCell.cands[0];
          stack.push({
            current: nbr,
            incoming: outgoing,
            chain: [...state.chain, nbr],
          });
        }
      }
    }
  }

  return null;
};
