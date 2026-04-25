export interface CellPosition {
  row: number;
  col: number;
}

export type CandidateSet = Set<number>;

export interface Cell extends CellPosition {
  value: number | null;
  candidates: CandidateSet;
  box: number;
  isGiven: boolean;
}

export interface Board {
  cells: Cell[][];
}

export interface SolveStep {
  strategy: string;
  cellsAffected: CellPosition[];
  candidatesEliminated: Map<string, number[]>;
  valuePlaced: { position: CellPosition; value: number } | null;
  reasonCells: CellPosition[];
  explanation: string;
}

export interface SolveResult {
  steps: SolveStep[];
  board: Board;
  complete: boolean;
}

export type Strategy = (board: Board) => SolveStep | null;
