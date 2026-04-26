import { getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { cpToDisplay, cpToKey, keyToCP } from '../utils/cellPosition';

// An AIC node represents a specific candidate in a specific cell.
// The node ID encodes both: "row,col:digit"
type NodeId = string;

function makeNodeId(pos: CellPosition, digit: number): NodeId {
  return `${pos.row},${pos.col}:${digit}`;
}

function parseNodeId(id: NodeId): { pos: CellPosition; digit: number } {
  const [posStr, digitStr] = id.split(':');
  return { pos: keyToCP(posStr), digit: parseInt(digitStr, 10) };
}

function nodeCell(id: NodeId): string {
  return id.split(':')[0];
}

function sharesUnit(a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row) return true;
  if (a.col === b.col) return true;
  const boxA = Math.floor(a.row / 3) * 3 + Math.floor(a.col / 3);
  const boxB = Math.floor(b.row / 3) * 3 + Math.floor(b.col / 3);
  return boxA === boxB;
}

function union(a: Set<NodeId> | undefined, b: Set<NodeId> | undefined): Set<NodeId> {
  if (!a) return b ?? new Set();
  if (!b) return a;
  const result = new Set(a);
  for (const v of b) result.add(v);
  return result;
}

interface AICGraph {
  strongLinks: Map<NodeId, Set<NodeId>>;
  weakLinks: Map<NodeId, Set<NodeId>>;
  allNodes: Set<NodeId>;
}

function buildGraph(board: Board): AICGraph {
  const strongLinks = new Map<NodeId, Set<NodeId>>();
  const weakLinks = new Map<NodeId, Set<NodeId>>();
  const allNodes = new Set<NodeId>();

  function ensureNode(id: NodeId) {
    allNodes.add(id);
    if (!strongLinks.has(id)) strongLinks.set(id, new Set());
    if (!weakLinks.has(id)) weakLinks.set(id, new Set());
  }

  function addStrong(a: NodeId, b: NodeId) {
    ensureNode(a);
    ensureNode(b);
    strongLinks.get(a)!.add(b);
    strongLinks.get(b)!.add(a);
  }

  function addWeak(a: NodeId, b: NodeId) {
    ensureNode(a);
    ensureNode(b);
    weakLinks.get(a)!.add(b);
    weakLinks.get(b)!.add(a);
  }

  // Collect all candidate cells
  const cellCandidates: { pos: CellPosition; cands: Set<number> }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board.cells[r][c];
      if (cell.value === null && cell.candidates.size > 0) {
        cellCandidates.push({
          pos: { row: r, col: c },
          cands: cell.candidates,
        });
        for (const d of cell.candidates) {
          ensureNode(makeNodeId({ row: r, col: c }, d));
        }
      }
    }
  }

  // --- STRONG LINKS ---

  // Type 1: Conjugate pairs (exactly 2 cells in a unit with digit d)
  for (let digit = 1; digit <= 9; digit++) {
    for (let i = 0; i < 9; i++) {
      const rowCells = getRow(board, i).filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (rowCells.length === 2) {
        addStrong(
          makeNodeId(rowCells[0], digit),
          makeNodeId(rowCells[1], digit),
        );
      }

      const colCells = getCol(board, i).filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (colCells.length === 2) {
        addStrong(
          makeNodeId(colCells[0], digit),
          makeNodeId(colCells[1], digit),
        );
      }

      const boxCells = getBox(board, i).filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (boxCells.length === 2) {
        addStrong(
          makeNodeId(boxCells[0], digit),
          makeNodeId(boxCells[1], digit),
        );
      }
    }
  }

  // Type 2: Bivalue cells (cell has exactly 2 candidates → strong link between them)
  for (const cc of cellCandidates) {
    if (cc.cands.size === 2) {
      const [d1, d2] = [...cc.cands];
      addStrong(makeNodeId(cc.pos, d1), makeNodeId(cc.pos, d2));
    }
  }

  // --- WEAK LINKS ---

  // Type 1: Same digit, same unit, not a strong link (can't both be true)
  for (let digit = 1; digit <= 9; digit++) {
    const cells = cellCandidates.filter((cc) => cc.cands.has(digit));
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (sharesUnit(cells[i].pos, cells[j].pos)) {
          const a = makeNodeId(cells[i].pos, digit);
          const b = makeNodeId(cells[j].pos, digit);
          if (!strongLinks.get(a)?.has(b)) {
            addWeak(a, b);
          }
        }
      }
    }
  }

  // Type 2: Same cell, different digit (can't both be true)
  for (const cc of cellCandidates) {
    const digits = [...cc.cands];
    for (let i = 0; i < digits.length; i++) {
      for (let j = i + 1; j < digits.length; j++) {
        const a = makeNodeId(cc.pos, digits[i]);
        const b = makeNodeId(cc.pos, digits[j]);
        if (!strongLinks.get(a)?.has(b)) {
          addWeak(a, b);
        }
      }
    }
  }

  return { strongLinks, weakLinks, allNodes };
}

// An AIC is valid when it has an odd number of links (≥3), starting and ending
// with strong links. The two endpoints then produce eliminations:
//
// If both endpoints are the same digit d in different cells:
//   → eliminate d from any cell that sees both endpoints (like X-Chains)
//
// If the endpoints are different digits in the same cell:
//   → eliminate all other candidates from that cell (like a locked pair conclusion)
//
// If the endpoints are different digits d1 and d2 in different cells that see each other:
//   → for any cell that sees endpoint1 and has d1, plus sees endpoint2 and has d2...
//   Actually, the standard AIC rule: if the chain is A=...=B (strong at both ends),
//   any candidate that is weakly linked to BOTH A and B can be eliminated.

function findEliminations(
  board: Board,
  startNode: NodeId,
  endNode: NodeId,
  chain: NodeId[],
  graph: AICGraph,
): Map<string, number[]> | null {
  const eliminations = new Map<string, number[]>();

  // Any node weakly linked to both startNode and endNode can be eliminated.
  // A node X is weakly linked to A if: same digit + same unit, or same cell + different digit.
  for (const candidateNode of graph.allNodes) {
    if (chain.includes(candidateNode)) continue;

    const cand = parseNodeId(candidateNode);
    const cell = board.cells[cand.pos.row][cand.pos.col];
    if (cell.value !== null) continue;
    if (!cell.candidates.has(cand.digit)) continue;

    const weakToStart = isWeaklyLinked(candidateNode, startNode, graph);
    const weakToEnd = isWeaklyLinked(candidateNode, endNode, graph);

    if (weakToStart && weakToEnd) {
      const k = cpToKey(cand.pos);
      const existing = eliminations.get(k) ?? [];
      if (!existing.includes(cand.digit)) {
        eliminations.set(k, [...existing, cand.digit]);
      }
    }
  }

  return eliminations.size > 0 ? eliminations : null;
}

function isWeaklyLinked(a: NodeId, b: NodeId, graph: AICGraph): boolean {
  if (graph.weakLinks.get(a)?.has(b)) return true;
  if (graph.strongLinks.get(a)?.has(b)) return true;

  const pa = parseNodeId(a);
  const pb = parseNodeId(b);

  if (pa.digit === pb.digit && sharesUnit(pa.pos, pb.pos)) return true;
  if (cpToKey(pa.pos) === cpToKey(pb.pos) && pa.digit !== pb.digit) return true;

  return false;
}

const MAX_CHAIN_LENGTH = 12;

export const aic: Strategy = (board: Board): SolveStep | null => {
  const graph = buildGraph(board);

  // BFS for alternating chains: strong-weak-strong-weak-...-strong
  // Start from each node, follow strong link first, then alternate.
  // Valid chain: odd link count (≥3), starts and ends with strong link.

  for (const startNode of graph.allNodes) {
    type State = {
      current: NodeId;
      nextLink: 'strong' | 'weak';
      chain: NodeId[];
      linkCount: number;
      visitedCells: Set<string>;
    };

    const queue: State[] = [];

    for (const next of graph.strongLinks.get(startNode) ?? []) {
      const visitedCells = new Set<string>();
      visitedCells.add(nodeCell(startNode));
      visitedCells.add(nodeCell(next));
      queue.push({
        current: next,
        nextLink: 'weak',
        chain: [startNode, next],
        linkCount: 1,
        visitedCells,
      });
    }

    while (queue.length > 0) {
      const state = queue.shift()!;

      // Check for valid AIC: odd links ≥ 3, just finished a strong link (nextLink === 'weak')
      if (
        state.linkCount >= 3 &&
        state.linkCount % 2 === 1 &&
        state.nextLink === 'weak'
      ) {
        if (state.current !== startNode) {
          const elims = findEliminations(
            board,
            startNode,
            state.current,
            state.chain,
            graph,
          );
          if (elims) {
            // Skip if this is a pure X-Chain or XY-Chain (those strategies already handle these)
            if (!isPureXChain(state.chain) && !isPureXYChain(state.chain, board)) {
              const chainPositions = state.chain.map((n) => parseNodeId(n).pos);
              const elimCells = [...elims.keys()].map(keyToCP);
              const chainDesc = state.chain
                .map((n) => {
                  const p = parseNodeId(n);
                  return `${cpToDisplay(p.pos)}(${p.digit})`;
                })
                .join('→');

              const elimDesc = [...elims.entries()]
                .map(
                  ([k, ds]) => `${cpToDisplay(keyToCP(k))}(${ds.join(',')})`,
                )
                .join(', ');

              return {
                strategy: 'AIC',
                cellsAffected: elimCells,
                candidatesEliminated: elims,
                valuePlaced: null,
                reasonCells: uniquePositions(chainPositions),
                explanation: `Alternating Inference Chain: ${chainDesc} — eliminates ${elimDesc}`,
              };
            }
          }
        }
      }

      if (state.linkCount >= MAX_CHAIN_LENGTH) continue;

      const linksSet =
        state.nextLink === 'strong'
          ? graph.strongLinks.get(state.current)
          : union(
              graph.weakLinks.get(state.current),
              graph.strongLinks.get(state.current),
            );
      const links = linksSet;

      for (const next of links ?? []) {
        if (state.chain.includes(next)) continue;

        // For weak links, allow revisiting a cell we've been to (different digit).
        // For strong links within same cell (bivalue), the cell is already visited.
        const nextCellKey = nodeCell(next);
        const isSameCell = nextCellKey === nodeCell(state.current);

        // Don't revisit a cell with the same link type unless it's a bivalue transition
        if (!isSameCell && state.visitedCells.has(nextCellKey)) continue;

        const newVisited = new Set(state.visitedCells);
        newVisited.add(nextCellKey);

        queue.push({
          current: next,
          nextLink: state.nextLink === 'strong' ? 'weak' : 'strong',
          chain: [...state.chain, next],
          linkCount: state.linkCount + 1,
          visitedCells: newVisited,
        });
      }
    }
  }

  return null;
};

function isPureXChain(chain: NodeId[]): boolean {
  if (chain.length < 2) return false;
  const firstDigit = parseNodeId(chain[0]).digit;
  return chain.every((n) => parseNodeId(n).digit === firstDigit);
}

function isPureXYChain(chain: NodeId[], board: Board): boolean {
  if (chain.length < 2) return false;
  const cells = chain.map((n) => parseNodeId(n));

  // XY-Chain: every node is in a bivalue cell, and consecutive nodes alternate
  // between two digits in the same cell or share a digit between cells
  for (const node of cells) {
    const cell = board.cells[node.pos.row][node.pos.col];
    if (cell.candidates.size !== 2) return false;
  }

  // Also check that no cell is visited with two different digits (that would make it AIC, not XY-Chain)
  const cellKeys = cells.map((c) => cpToKey(c.pos));
  const uniqueCells = new Set(cellKeys);
  // In an XY-chain, the chain visits each cell once; in an AIC it may pass through
  // a bivalue cell using both candidates. If #nodes > #unique_cells, it's AIC-style.
  if (cells.length > uniqueCells.size) return false;

  return true;
}

function uniquePositions(positions: CellPosition[]): CellPosition[] {
  const seen = new Set<string>();
  const result: CellPosition[] = [];
  for (const pos of positions) {
    const k = cpToKey(pos);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(pos);
    }
  }
  return result;
}
