import { getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';

interface ConjugatePair {
  cell1: CellPosition;
  cell2: CellPosition;
}

function findConjugatePairs(board: Board, digit: number): ConjugatePair[] {
  const pairs: ConjugatePair[] = [];
  const seen = new Set<string>();

  const addPair = (a: CellPosition, b: CellPosition) => {
    const key = `${Math.min(a.row * 9 + a.col, b.row * 9 + b.col)},${Math.max(a.row * 9 + a.col, b.row * 9 + b.col)}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ cell1: a, cell2: b });
    }
  };

  for (let i = 0; i < 9; i++) {
    const rowCells = getRow(board, i)
      .filter(c => c.value === null && c.candidates.has(digit))
      .map(c => ({ row: c.row, col: c.col }));
    if (rowCells.length === 2) addPair(rowCells[0], rowCells[1]);

    const colCells = getCol(board, i)
      .filter(c => c.value === null && c.candidates.has(digit))
      .map(c => ({ row: c.row, col: c.col }));
    if (colCells.length === 2) addPair(colCells[0], colCells[1]);

    const boxCells = getBox(board, i)
      .filter(c => c.value === null && c.candidates.has(digit))
      .map(c => ({ row: c.row, col: c.col }));
    if (boxCells.length === 2) addPair(boxCells[0], boxCells[1]);
  }

  return pairs;
}

function sharesUnit(a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row) return true;
  if (a.col === b.col) return true;
  const boxA = Math.floor(a.row / 3) * 3 + Math.floor(a.col / 3);
  const boxB = Math.floor(b.row / 3) * 3 + Math.floor(b.col / 3);
  return boxA === boxB;
}

export const simpleColoring: Strategy = (board: Board): SolveStep | null => {
  for (let digit = 1; digit <= 9; digit++) {
    const result = findColoringElimination(board, digit);
    if (result) return result;
  }
  return null;
};

function findColoringElimination(board: Board, digit: number): SolveStep | null {
  const pairs = findConjugatePairs(board, digit);
  if (pairs.length === 0) return null;

  const adj = new Map<string, Set<string>>();
  const posMap = new Map<string, CellPosition>();

  for (const pair of pairs) {
    const k1 = `${pair.cell1.row},${pair.cell1.col}`;
    const k2 = `${pair.cell2.row},${pair.cell2.col}`;
    posMap.set(k1, pair.cell1);
    posMap.set(k2, pair.cell2);
    if (!adj.has(k1)) adj.set(k1, new Set());
    if (!adj.has(k2)) adj.set(k2, new Set());
    adj.get(k1)!.add(k2);
    adj.get(k2)!.add(k1);
  }

  const colored = new Map<string, number>();
  const components: { colorA: string[]; colorB: string[] }[] = [];

  for (const node of adj.keys()) {
    if (colored.has(node)) continue;

    const colorA: string[] = [];
    const colorB: string[] = [];
    const queue: { key: string; color: number }[] = [{ key: node, color: 0 }];
    colored.set(node, 0);

    while (queue.length > 0) {
      const { key, color } = queue.shift()!;
      if (color === 0) colorA.push(key);
      else colorB.push(key);

      for (const neighbor of adj.get(key) || []) {
        if (!colored.has(neighbor)) {
          colored.set(neighbor, 1 - color);
          queue.push({ key: neighbor, color: 1 - color });
        }
      }
    }

    components.push({ colorA, colorB });
  }

  // Type 1 (Color Trap): Two same-color cells share a unit → that color is false
  for (const comp of components) {
    for (const group of [comp.colorA, comp.colorB]) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (sharesUnit(posMap.get(group[i])!, posMap.get(group[j])!)) {
            const eliminations = new Map<string, number[]>();
            for (const key of group) {
              const pos = posMap.get(key)!;
              const cell = board.cells[pos.row][pos.col];
              if (cell.value === null && cell.candidates.has(digit)) {
                eliminations.set(key, [digit]);
              }
            }
            if (eliminations.size === 0) continue;

            const allChainKeys = [...comp.colorA, ...comp.colorB];
            const reasonCells = allChainKeys.map(k => posMap.get(k)!);
            const elimCells = [...eliminations.keys()].map(k => {
              const [r, c] = k.split(',').map(Number);
              return { row: r, col: c };
            });
            const colorLabel = group === comp.colorA ? 'A' : 'B';

            return {
              strategy: 'Simple Coloring',
              cellsAffected: elimCells,
              candidatesEliminated: eliminations,
              valuePlaced: null,
              reasonCells,
              explanation: `Simple Coloring on digit ${digit}: two color-${colorLabel} cells (R${posMap.get(group[i])!.row + 1}C${posMap.get(group[i])!.col + 1} and R${posMap.get(group[j])!.row + 1}C${posMap.get(group[j])!.col + 1}) share a unit — color ${colorLabel} is false, eliminating ${digit} from all color-${colorLabel} cells`,
            };
          }
        }
      }
    }
  }

  // Type 2 (Color Wrap): An uncolored cell sees both colors → eliminate digit from that cell
  for (const comp of components) {
    if (comp.colorA.length === 0 || comp.colorB.length === 0) continue;

    const colorAPositions = comp.colorA.map(k => posMap.get(k)!);
    const colorBPositions = comp.colorB.map(k => posMap.get(k)!);
    const chainKeys = new Set([...comp.colorA, ...comp.colorB]);

    const eliminations = new Map<string, number[]>();

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const key = `${r},${c}`;
        if (chainKeys.has(key)) continue;
        const cell = board.cells[r][c];
        if (cell.value !== null || !cell.candidates.has(digit)) continue;

        const pos: CellPosition = { row: r, col: c };
        const seesA = colorAPositions.some(a => sharesUnit(pos, a));
        const seesB = colorBPositions.some(b => sharesUnit(pos, b));

        if (seesA && seesB) {
          eliminations.set(key, [digit]);
        }
      }
    }

    if (eliminations.size === 0) continue;

    const reasonCells = [...comp.colorA, ...comp.colorB].map(k => posMap.get(k)!);
    const elimCells = [...eliminations.keys()].map(k => {
      const [r, c] = k.split(',').map(Number);
      return { row: r, col: c };
    });

    return {
      strategy: 'Simple Coloring',
      cellsAffected: elimCells,
      candidatesEliminated: eliminations,
      valuePlaced: null,
      reasonCells,
      explanation: `Simple Coloring on digit ${digit}: uncolored cell(s) ${elimCells.map(c => `R${c.row + 1}C${c.col + 1}`).join(', ')} can see both colors in the chain — eliminating ${digit}`,
    };
  }

  return null;
}
