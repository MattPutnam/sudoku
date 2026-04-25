import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { validatePuzzle } from '../utils/validatePuzzle';

const VALID_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

// Full valid solved grid
const FULL_GRID =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

// 10 givens (too few)
const TOO_FEW_GIVENS =
  '500070000600000000000000060000060000000000001000020000060000000000000005000000009';

// Exactly 16 givens (still too few — boundary)
const SIXTEEN_GIVENS =
  '534678912672195300000000000000000000000000000000000000000000000000000000000000000';

// All cells empty
const ALL_EMPTY = '0'.repeat(81);

// Duplicate 5 in row 0 (col 0 and col 1 both have 5)
const HAS_CONFLICTS =
  '550070000600195000098000060800060003400803001700020006060000280000419005000080079';

// 17+ givens but unsolvable — valid puzzle with one given changed to create contradiction
// Based on VALID_PUZZLE but cell (0,0) changed from 5 to 1 — now 1 conflicts with
// constraints that aren't row/col/box duplicates but make the puzzle impossible
const NO_SOLUTION =
  '130070000600195000098000060800060003400803001700020006060000280000419005000080079';

// A puzzle with multiple solutions — remove two cells from a valid puzzle
// to create an ambiguity
const MULTIPLE_SOLUTIONS =
  '000070000600195000098000060800060003400803001700020006060000280000419005000080079';

describe('validatePuzzle', () => {
  it('returns "valid" for a well-formed puzzle with exactly one solution', () => {
    const board = createBoard(VALID_PUZZLE);
    const result = validatePuzzle(board);
    expect(result.status).toBe('valid');
    expect(result.message).toBe('Puzzle is valid');
  });

  it('returns "valid" for a complete (81 givens) valid grid', () => {
    const board = createBoard(FULL_GRID);
    const result = validatePuzzle(board);
    expect(result.status).toBe('valid');
    expect(result.message).toBe('Puzzle is valid');
  });

  it('returns "too-few-givens" when fewer than 17 cells have values', () => {
    const board = createBoard(TOO_FEW_GIVENS);
    const result = validatePuzzle(board);
    expect(result.status).toBe('too-few-givens');
    expect(result.message).toMatch(/Need at least 17 givens/);
  });

  it('returns "too-few-givens" for exactly 16 givens (boundary)', () => {
    const board = createBoard(SIXTEEN_GIVENS);
    const result = validatePuzzle(board);
    expect(result.status).toBe('too-few-givens');
    expect(result.message).toMatch(/have 16/);
  });

  it('returns "too-few-givens" for an all-empty board', () => {
    const board = createBoard(ALL_EMPTY);
    const result = validatePuzzle(board);
    expect(result.status).toBe('too-few-givens');
    expect(result.message).toMatch(/have 0/);
  });

  it('returns "has-conflicts" when duplicate values exist in a row', () => {
    const board = createBoard(HAS_CONFLICTS);
    const result = validatePuzzle(board);
    expect(result.status).toBe('has-conflicts');
    expect(result.message).toBe('Puzzle has conflicting digits');
  });

  it('returns "no-solution" when backtracking finds zero solutions', () => {
    const board = createBoard(NO_SOLUTION);
    const result = validatePuzzle(board);
    expect(result.status).toBe('no-solution');
    expect(result.message).toBe('Puzzle has no solution');
  });

  it('returns "multiple-solutions" when backtracking finds more than one solution', () => {
    const board = createBoard(MULTIPLE_SOLUTIONS);
    const result = validatePuzzle(board);
    expect(result.status).toBe('multiple-solutions');
    expect(result.message).toBe('Puzzle has multiple solutions');
  });

  it('runs cheap checks before expensive backtracking', () => {
    const board = createBoard(TOO_FEW_GIVENS);
    const start = performance.now();
    validatePuzzle(board);
    const duration = performance.now() - start;
    // Should be near-instant since it short-circuits on given count
    expect(duration).toBeLessThan(50);
  });
});
