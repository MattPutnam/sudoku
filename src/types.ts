export interface CellPosition {
  row: number;
  col: number;
}

export type CandidateSet = Set<number>;

export interface Cell {
  value: number | null;
  candidates: CandidateSet;
  row: number;
  col: number;
  box: number;
  isGiven: boolean;
}

export interface Board {
  cells: Cell[][];
}
