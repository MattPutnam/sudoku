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

export const cpToDisplay = (cellPosition: CellPosition): string => {
  return `R${cellPosition.row + 1}C${cellPosition.col + 1}`;
};

export const coordsToDisplay = (row: number, col: number): string => {
  return `R${row + 1}C${col + 1}`;
}
