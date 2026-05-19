import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type ActivePiece,
  type Board,
  type Cell,
} from "../types";
import { getPatternForPiece, getPieceCells } from "../pieces/pieces";

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function collides(board: Board, piece: ActivePiece): boolean {
  return getPieceCells(piece).some(({ x, y }) => {
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
      return true;
    }

    if (y < 0) {
      return false;
    }

    return board[y][x] !== null;
  });
}

export function mergePiece(board: Board, piece: ActivePiece): Board {
  const next = cloneBoard(board);
  const pattern = getPatternForPiece(piece.kind);

  getPieceCells(piece).forEach(({ x, y }) => {
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
      next[y][x] = {
        kind: piece.kind,
        pattern,
      };
    }
  });

  return next;
}

export function clearFullLines(board: Board): { board: Board; lines: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const lines = BOARD_HEIGHT - remaining.length;

  if (lines === 0) {
    return { board, lines };
  }

  const added = Array.from({ length: lines }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null),
  );

  return {
    board: [...added, ...remaining],
    lines,
  };
}

export function getDropDistance(board: Board, piece: ActivePiece): number {
  let distance = 0;
  let probe: ActivePiece = { ...piece, y: piece.y + 1 };

  while (!collides(board, probe)) {
    distance += 1;
    probe = { ...piece, y: piece.y + distance + 1 };
  }

  return distance;
}

export function addGarbageLines(board: Board, count: number): { board: Board; overflow: boolean } {
  const next = cloneBoard(board);
  let overflow = false;

  for (let index = 0; index < count; index += 1) {
    const removed = next.shift();
    if (removed?.some((cell) => cell !== null)) {
      overflow = true;
    }

    const hole = Math.floor(Math.random() * BOARD_WIDTH);
    const row: Array<Cell | null> = Array.from({ length: BOARD_WIDTH }, (_, column) =>
      column === hole
        ? null
        : {
            kind: "garbage",
            pattern: column % 2 === 0 ? "dots" : "square",
          },
    );
    next.push(row);
  }

  return { board: next, overflow };
}

export function getColumnHeights(board: Board): number[] {
  return Array.from({ length: BOARD_WIDTH }, (_, column) => {
    for (let row = 0; row < BOARD_HEIGHT; row += 1) {
      if (board[row][column] !== null) {
        return BOARD_HEIGHT - row;
      }
    }

    return 0;
  });
}

export function countHoles(board: Board): number {
  let holes = 0;

  for (let column = 0; column < BOARD_WIDTH; column += 1) {
    let hasBlockAbove = false;
    for (let row = 0; row < BOARD_HEIGHT; row += 1) {
      if (board[row][column]) {
        hasBlockAbove = true;
      } else if (hasBlockAbove) {
        holes += 1;
      }
    }
  }

  return holes;
}

export function getBumpiness(board: Board): number {
  const heights = getColumnHeights(board);
  return heights.slice(1).reduce((total, height, index) => {
    return total + Math.abs(height - heights[index]);
  }, 0);
}

export function getAggregateHeight(board: Board): number {
  return getColumnHeights(board).reduce((total, height) => total + height, 0);
}
