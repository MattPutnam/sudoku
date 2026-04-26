import { getRow, getCol, getBox } from '../board';
import type { Board, SolveStep, Strategy, CellPosition } from '../types';
import { cpToDisplay, cpToKey, keyToCP } from '../utils/cellPosition';

// A grouped AIC extends regular AICs by allowing nodes that represent groups of cells.
// A "group node" is a set of cells in a single unit that all contain the same candidate digit.
// Strong link from a group node: if the group is the ONLY location for digit d in its unit,
// then there's a strong link between that group and any cell/group that sees ALL cells in the group.
//
// For simplicity and performance, we limit group nodes to cells sharing a box-line intersection
// (2-3 cells in the same box and same row/col that form a conjugate group for a digit).

type NodeId = string;

interface GroupNode {
  id: NodeId;
  cells: CellPosition[];
  digit: number;
  isGroup: boolean;
}

function makeNodeId(pos: CellPosition, digit: number): NodeId {
  return `${pos.row},${pos.col}:${digit}`;
}

function makeGroupNodeId(cells: CellPosition[], digit: number): NodeId {
  const sorted = [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
  return `G[${sorted.map((c) => `${c.row},${c.col}`).join('|')}]:${digit}`;
}

function parseNodeDigit(id: NodeId): number {
  return parseInt(id.split(':')[1], 10);
}

function isGroupNode(id: NodeId): boolean {
  return id.startsWith('G[');
}

function getNodeCells(id: NodeId): CellPosition[] {
  if (id.startsWith('G[')) {
    const inner = id.substring(2, id.indexOf(']'));
    return inner.split('|').map((s) => {
      const [r, c] = s.split(',').map(Number);
      return { row: r, col: c };
    });
  }
  const posStr = id.split(':')[0];
  return [keyToCP(posStr)];
}

function sharesUnit(a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row) return true;
  if (a.col === b.col) return true;
  const boxA = Math.floor(a.row / 3) * 3 + Math.floor(a.col / 3);
  const boxB = Math.floor(b.row / 3) * 3 + Math.floor(b.col / 3);
  return boxA === boxB;
}

function allSeeAll(groupA: CellPosition[], groupB: CellPosition[]): boolean {
  for (const a of groupA) {
    for (const b of groupB) {
      if (a.row === b.row && a.col === b.col) continue;
      if (!sharesUnit(a, b)) return false;
    }
  }
  return true;
}

function cellsOverlap(a: CellPosition[], b: CellPosition[]): boolean {
  const setB = new Set(b.map((c) => cpToKey(c)));
  return a.some((c) => setB.has(cpToKey(c)));
}

function union(a: Set<NodeId> | undefined, b: Set<NodeId> | undefined): Set<NodeId> {
  if (!a) return b ?? new Set();
  if (!b) return a;
  const result = new Set(a);
  for (const v of b) result.add(v);
  return result;
}

interface GraphData {
  strongLinks: Map<NodeId, Set<NodeId>>;
  weakLinks: Map<NodeId, Set<NodeId>>;
  allNodes: Map<NodeId, GroupNode>;
}

function buildGroupedGraph(board: Board): GraphData {
  const strongLinks = new Map<NodeId, Set<NodeId>>();
  const weakLinks = new Map<NodeId, Set<NodeId>>();
  const allNodes = new Map<NodeId, GroupNode>();

  function ensureNode(node: GroupNode) {
    allNodes.set(node.id, node);
    if (!strongLinks.has(node.id)) strongLinks.set(node.id, new Set());
    if (!weakLinks.has(node.id)) weakLinks.set(node.id, new Set());
  }

  function addStrong(a: NodeId, b: NodeId) {
    strongLinks.get(a)!.add(b);
    strongLinks.get(b)!.add(a);
  }

  function addWeak(a: NodeId, b: NodeId) {
    weakLinks.get(a)!.add(b);
    weakLinks.get(b)!.add(a);
  }

  // Collect single-cell nodes
  const cellCandidates: { pos: CellPosition; cands: Set<number> }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board.cells[r][c];
      if (cell.value === null && cell.candidates.size > 0) {
        cellCandidates.push({ pos: { row: r, col: c }, cands: cell.candidates });
        for (const d of cell.candidates) {
          ensureNode({
            id: makeNodeId({ row: r, col: c }, d),
            cells: [{ row: r, col: c }],
            digit: d,
            isGroup: false,
          });
        }
      }
    }
  }

  // Build group nodes: cells in a box-line intersection that share a candidate
  const groupNodes: GroupNode[] = [];

  for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
    const boxStartRow = Math.floor(boxIdx / 3) * 3;
    const boxStartCol = (boxIdx % 3) * 3;

    for (let digit = 1; digit <= 9; digit++) {
      const boxCells = getBox(board, boxIdx).filter(
        (c) => c.value === null && c.candidates.has(digit),
      );

      // Group by row within box
      for (let dr = 0; dr < 3; dr++) {
        const rowIdx = boxStartRow + dr;
        const inRow = boxCells.filter((c) => c.row === rowIdx);
        if (inRow.length >= 2 && inRow.length <= 3) {
          const gn: GroupNode = {
            id: makeGroupNodeId(
              inRow.map((c) => ({ row: c.row, col: c.col })),
              digit,
            ),
            cells: inRow.map((c) => ({ row: c.row, col: c.col })),
            digit,
            isGroup: true,
          };
          ensureNode(gn);
          groupNodes.push(gn);
        }
      }

      // Group by column within box
      for (let dc = 0; dc < 3; dc++) {
        const colIdx = boxStartCol + dc;
        const inCol = boxCells.filter((c) => c.col === colIdx);
        if (inCol.length >= 2 && inCol.length <= 3) {
          const gn: GroupNode = {
            id: makeGroupNodeId(
              inCol.map((c) => ({ row: c.row, col: c.col })),
              digit,
            ),
            cells: inCol.map((c) => ({ row: c.row, col: c.col })),
            digit,
            isGroup: true,
          };
          ensureNode(gn);
          groupNodes.push(gn);
        }
      }
    }
  }

  // --- STRONG LINKS ---

  // Single-cell: conjugate pairs (2 in unit)
  for (let digit = 1; digit <= 9; digit++) {
    for (let i = 0; i < 9; i++) {
      const rowCells = getRow(board, i).filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (rowCells.length === 2) {
        addStrong(makeNodeId(rowCells[0], digit), makeNodeId(rowCells[1], digit));
      }

      const colCells = getCol(board, i).filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (colCells.length === 2) {
        addStrong(makeNodeId(colCells[0], digit), makeNodeId(colCells[1], digit));
      }

      const boxCells = getBox(board, i).filter(
        (c) => c.value === null && c.candidates.has(digit),
      );
      if (boxCells.length === 2) {
        addStrong(makeNodeId(boxCells[0], digit), makeNodeId(boxCells[1], digit));
      }
    }
  }

  // Single-cell: bivalue cells
  for (const cc of cellCandidates) {
    if (cc.cands.size === 2) {
      const [d1, d2] = [...cc.cands];
      addStrong(makeNodeId(cc.pos, d1), makeNodeId(cc.pos, d2));
    }
  }

  // Group strong links: group covers all instances of digit in a unit,
  // and the rest of that unit's instances form another node/group.
  // E.g., if digit 5 in row 3 is only in box 1 (cells R3C1, R3C2), and
  // the rest of box 1 has digit 5 only in R1C2, then group(R3C1,R3C2):5
  // is strongly linked to R1C2:5.
  for (const gn of groupNodes) {
    const gnCellKeys = new Set(gn.cells.map((c) => cpToKey(c)));

    // Check if this group covers all instances in its row (or col)
    const sameRow = gn.cells.every((c) => c.row === gn.cells[0].row);
    const sameCol = gn.cells.every((c) => c.col === gn.cells[0].col);

    if (sameRow) {
      const rowIdx = gn.cells[0].row;
      const rowCells = getRow(board, rowIdx).filter(
        (c) => c.value === null && c.candidates.has(gn.digit),
      );
      const others = rowCells.filter((c) => !gnCellKeys.has(cpToKey(c)));
      if (others.length === 0) {
        // Group covers entire row for this digit → strong link to complementary group in box
        const boxIdx = Math.floor(gn.cells[0].row / 3) * 3 + Math.floor(gn.cells[0].col / 3);
        const boxCells = getBox(board, boxIdx).filter(
          (c) =>
            c.value === null &&
            c.candidates.has(gn.digit) &&
            !gnCellKeys.has(cpToKey(c)),
        );
        if (boxCells.length === 1) {
          addStrong(gn.id, makeNodeId(boxCells[0], gn.digit));
        } else if (boxCells.length >= 2 && boxCells.length <= 3) {
          const otherId = makeGroupNodeId(
            boxCells.map((c) => ({ row: c.row, col: c.col })),
            gn.digit,
          );
          if (allNodes.has(otherId)) {
            addStrong(gn.id, otherId);
          }
        }
      } else if (others.length === 1) {
        // Row has group + 1 other cell → strong link
        addStrong(gn.id, makeNodeId(others[0], gn.digit));
      }
    }

    if (sameCol) {
      const colIdx = gn.cells[0].col;
      const colCells = getCol(board, colIdx).filter(
        (c) => c.value === null && c.candidates.has(gn.digit),
      );
      const others = colCells.filter((c) => !gnCellKeys.has(cpToKey(c)));
      if (others.length === 0) {
        const boxIdx = Math.floor(gn.cells[0].row / 3) * 3 + Math.floor(gn.cells[0].col / 3);
        const boxCells = getBox(board, boxIdx).filter(
          (c) =>
            c.value === null &&
            c.candidates.has(gn.digit) &&
            !gnCellKeys.has(cpToKey(c)),
        );
        if (boxCells.length === 1) {
          addStrong(gn.id, makeNodeId(boxCells[0], gn.digit));
        } else if (boxCells.length >= 2 && boxCells.length <= 3) {
          const otherId = makeGroupNodeId(
            boxCells.map((c) => ({ row: c.row, col: c.col })),
            gn.digit,
          );
          if (allNodes.has(otherId)) {
            addStrong(gn.id, otherId);
          }
        }
      } else if (others.length === 1) {
        addStrong(gn.id, makeNodeId(others[0], gn.digit));
      }
    }

    // Check if group covers all instances in its box
    const boxIdx = Math.floor(gn.cells[0].row / 3) * 3 + Math.floor(gn.cells[0].col / 3);
    const boxCells = getBox(board, boxIdx).filter(
      (c) => c.value === null && c.candidates.has(gn.digit),
    );
    const boxOthers = boxCells.filter((c) => !gnCellKeys.has(cpToKey(c)));
    if (boxOthers.length === 1) {
      addStrong(gn.id, makeNodeId(boxOthers[0], gn.digit));
    } else if (boxOthers.length === 0) {
      // Group IS the entire box for this digit
      // Strong link to complementary cells in the row/col
      if (sameRow) {
        const rowIdx = gn.cells[0].row;
        const rowOthers = getRow(board, rowIdx).filter(
          (c) =>
            c.value === null &&
            c.candidates.has(gn.digit) &&
            !gnCellKeys.has(cpToKey(c)),
        );
        if (rowOthers.length === 1) {
          addStrong(gn.id, makeNodeId(rowOthers[0], gn.digit));
        } else if (rowOthers.length >= 2 && rowOthers.length <= 3) {
          const otherId = makeGroupNodeId(
            rowOthers.map((c) => ({ row: c.row, col: c.col })),
            gn.digit,
          );
          if (allNodes.has(otherId)) {
            addStrong(gn.id, otherId);
          }
        }
      }
      if (sameCol) {
        const colIdx = gn.cells[0].col;
        const colOthers = getCol(board, colIdx).filter(
          (c) =>
            c.value === null &&
            c.candidates.has(gn.digit) &&
            !gnCellKeys.has(cpToKey(c)),
        );
        if (colOthers.length === 1) {
          addStrong(gn.id, makeNodeId(colOthers[0], gn.digit));
        } else if (colOthers.length >= 2 && colOthers.length <= 3) {
          const otherId = makeGroupNodeId(
            colOthers.map((c) => ({ row: c.row, col: c.col })),
            gn.digit,
          );
          if (allNodes.has(otherId)) {
            addStrong(gn.id, otherId);
          }
        }
      }
    }
  }

  // --- WEAK LINKS ---

  // Single-cell weak links
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

  // Same cell, different digit
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

  // Group-to-single weak links: same digit, group sees the single cell
  for (const gn of groupNodes) {
    for (const cc of cellCandidates) {
      if (!cc.cands.has(gn.digit)) continue;
      if (gn.cells.some((gc) => gc.row === cc.pos.row && gc.col === cc.pos.col))
        continue;
      if (allSeeAll(gn.cells, [cc.pos])) {
        const singleId = makeNodeId(cc.pos, gn.digit);
        if (!strongLinks.get(gn.id)?.has(singleId)) {
          addWeak(gn.id, singleId);
        }
      }
    }
  }

  // Group-to-group weak links: same digit, all cells in both groups see each other
  for (let i = 0; i < groupNodes.length; i++) {
    for (let j = i + 1; j < groupNodes.length; j++) {
      const a = groupNodes[i];
      const b = groupNodes[j];
      if (a.digit !== b.digit) continue;
      if (cellsOverlap(a.cells, b.cells)) continue;
      if (allSeeAll(a.cells, b.cells)) {
        if (!strongLinks.get(a.id)?.has(b.id)) {
          addWeak(a.id, b.id);
        }
      }
    }
  }

  return { strongLinks, weakLinks, allNodes };
}

const MAX_CHAIN_LENGTH = 10;

export const groupedAic: Strategy = (board: Board): SolveStep | null => {
  const graph = buildGroupedGraph(board);

  // Only search starting from group nodes — single-cell AICs are handled by the regular AIC strategy
  const groupStarts = [...graph.allNodes.keys()].filter(isGroupNode);
  if (groupStarts.length === 0) return null;

  for (const startNode of groupStarts) {
    type State = {
      current: NodeId;
      nextLink: 'strong' | 'weak';
      chain: NodeId[];
      linkCount: number;
    };

    const queue: State[] = [];

    for (const next of graph.strongLinks.get(startNode) ?? []) {
      queue.push({
        current: next,
        nextLink: 'weak',
        chain: [startNode, next],
        linkCount: 1,
      });
    }

    while (queue.length > 0) {
      const state = queue.shift()!;

      if (
        state.linkCount >= 3 &&
        state.linkCount % 2 === 1 &&
        state.nextLink === 'weak'
      ) {
        if (state.current !== startNode) {
          const elims = findGroupedEliminations(
            board,
            startNode,
            state.current,
            state.chain,
            graph,
          );
          if (elims && elims.size > 0) {
            const reasonCells: CellPosition[] = [];
            for (const nodeId of state.chain) {
              for (const c of getNodeCells(nodeId)) {
                if (!reasonCells.some((rc) => rc.row === c.row && rc.col === c.col)) {
                  reasonCells.push(c);
                }
              }
            }

            const elimCells = [...elims.keys()].map(keyToCP);

            const chainDesc = state.chain
              .map((n) => {
                const cells = getNodeCells(n);
                const digit = parseNodeDigit(n);
                if (cells.length === 1) {
                  return `${cpToDisplay(cells[0])}(${digit})`;
                }
                return `[${cells.map(cpToDisplay).join(',')}](${digit})`;
              })
              .join('→');

            const elimDesc = [...elims.entries()]
              .map(([k, ds]) => `${cpToDisplay(keyToCP(k))}(${ds.join(',')})`)
              .join(', ');

            return {
              strategy: 'Grouped AIC',
              cellsAffected: elimCells,
              candidatesEliminated: elims,
              valuePlaced: null,
              reasonCells,
              explanation: `Grouped AIC: ${chainDesc} — eliminates ${elimDesc}`,
            };
          }
        }
      }

      if (state.linkCount >= MAX_CHAIN_LENGTH) continue;

      const links =
        state.nextLink === 'strong'
          ? graph.strongLinks.get(state.current)
          : union(
              graph.weakLinks.get(state.current),
              graph.strongLinks.get(state.current),
            );

      for (const next of links ?? []) {
        if (state.chain.includes(next)) continue;

        // Don't let the chain revisit cells already in the chain
        const nextCells = getNodeCells(next);
        const chainCellKeys = new Set<string>();
        for (const n of state.chain) {
          for (const c of getNodeCells(n)) {
            chainCellKeys.add(cpToKey(c));
          }
        }

        const currentCells = getNodeCells(state.current);
        const currentKeys = new Set(currentCells.map(cpToKey));
        const overlap = nextCells.some(
          (nc) => chainCellKeys.has(cpToKey(nc)) && !currentKeys.has(cpToKey(nc)),
        );
        if (overlap) continue;

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
};

function findGroupedEliminations(
  board: Board,
  startNode: NodeId,
  endNode: NodeId,
  chain: NodeId[],
  graph: GraphData,
): Map<string, number[]> | null {
  const eliminations = new Map<string, number[]>();

  const chainCellKeys = new Set<string>();
  for (const n of chain) {
    for (const c of getNodeCells(n)) {
      chainCellKeys.add(cpToKey(c));
    }
  }

  // Any node weakly linked to both start and end can be eliminated
  for (const [candidateId, candidateNode] of graph.allNodes) {
    if (chain.includes(candidateId)) continue;
    if (isGroupNode(candidateId)) continue;

    const candCells = candidateNode.cells;
    if (candCells.length !== 1) continue;
    const pos = candCells[0];
    const cell = board.cells[pos.row][pos.col];
    if (cell.value !== null) continue;
    if (!cell.candidates.has(candidateNode.digit)) continue;
    if (chainCellKeys.has(cpToKey(pos))) continue;

    const weakToStart = isWeaklyLinkedGrouped(candidateId, startNode, graph);
    const weakToEnd = isWeaklyLinkedGrouped(candidateId, endNode, graph);

    if (weakToStart && weakToEnd) {
      const k = cpToKey(pos);
      const existing = eliminations.get(k) ?? [];
      if (!existing.includes(candidateNode.digit)) {
        eliminations.set(k, [...existing, candidateNode.digit]);
      }
    }
  }

  return eliminations.size > 0 ? eliminations : null;
}

function isWeaklyLinkedGrouped(
  a: NodeId,
  b: NodeId,
  graph: GraphData,
): boolean {
  if (graph.weakLinks.get(a)?.has(b)) return true;
  if (graph.strongLinks.get(a)?.has(b)) return true;

  const aCells = getNodeCells(a);
  const bCells = getNodeCells(b);
  const aDigit = parseNodeDigit(a);
  const bDigit = parseNodeDigit(b);

  // Same digit, all cells see each other
  if (aDigit === bDigit && !cellsOverlap(aCells, bCells) && allSeeAll(aCells, bCells))
    return true;

  // Same cell, different digit (single cells only)
  if (
    aCells.length === 1 &&
    bCells.length === 1 &&
    aCells[0].row === bCells[0].row &&
    aCells[0].col === bCells[0].col &&
    aDigit !== bDigit
  )
    return true;

  return false;
}
