import type { ActivePiece, BlockPattern, PieceKind } from "../types";

export interface PieceDefinition {
  kind: PieceKind;
  label: string;
  pattern: BlockPattern;
  matrix: number[][];
}

export const PIECE_KINDS: PieceKind[] = [
  "beam",
  "box",
  "zig",
  "zag",
  "hook",
  "claw",
  "crest",
];

export const PIECES: Record<PieceKind, PieceDefinition> = {
  beam: {
    kind: "beam",
    label: "BEAM",
    pattern: "solid",
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  box: {
    kind: "box",
    label: "CORE",
    pattern: "square",
    matrix: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  zig: {
    kind: "zig",
    label: "ZIG",
    pattern: "dots",
    matrix: [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  zag: {
    kind: "zag",
    label: "ZAG",
    pattern: "hatch",
    matrix: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  hook: {
    kind: "hook",
    label: "HOOK",
    pattern: "square",
    matrix: [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  claw: {
    kind: "claw",
    label: "CLAW",
    pattern: "dots",
    matrix: [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  crest: {
    kind: "crest",
    label: "CREST",
    pattern: "solid",
    matrix: [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
};

export function rotateMatrixClockwise(matrix: number[][]): number[][] {
  const size = matrix.length;
  return matrix.map((row, y) => row.map((_, x) => matrix[size - 1 - x][y]));
}

export function rotateMatrixCounterClockwise(matrix: number[][]): number[][] {
  const size = matrix.length;
  return matrix.map((row, y) => row.map((_, x) => matrix[x][size - 1 - y]));
}

export function getPieceMatrix(kind: PieceKind, rotation: number): number[][] {
  let matrix = PIECES[kind].matrix;
  const turns = ((rotation % 4) + 4) % 4;

  for (let index = 0; index < turns; index += 1) {
    matrix = rotateMatrixClockwise(matrix);
  }

  return matrix;
}

export function getPieceCells(piece: ActivePiece): Array<{ x: number; y: number }> {
  const matrix = getPieceMatrix(piece.kind, piece.rotation);
  const cells: Array<{ x: number; y: number }> = [];

  matrix.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value) {
        cells.push({
          x: piece.x + columnIndex,
          y: piece.y + rowIndex,
        });
      }
    });
  });

  return cells;
}

export function getPatternForPiece(kind: PieceKind): BlockPattern {
  return PIECES[kind].pattern;
}
