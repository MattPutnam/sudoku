import type { CellPosition } from "../types";

const SEPARATOR = ",";

export const cpToKey = (cellPosition: CellPosition): string => {
  return `${cellPosition.row}${SEPARATOR}${cellPosition.col}`;
};

export const coordsToKey = (row: number, col: number): string => {
  return `${row}${SEPARATOR}${col}`;
};

export const keyToCoords = (cellPositionString: string): [number, number] => {
  return cellPositionString.split(SEPARATOR).map(Number) as [number, number];
}

export const keyToCP = (cellPositionString: string): CellPosition => {
  const [row, col] = keyToCoords(cellPositionString);
  return { row, col };
};
