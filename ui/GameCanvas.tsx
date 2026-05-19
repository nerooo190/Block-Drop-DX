import { useEffect, useRef } from "react";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  HIDDEN_ROWS,
  type ActivePiece,
  type Board,
  type Cell,
  type GameSettings,
  type GameSnapshot,
} from "../game/types";
import { getPatternForPiece, getPieceCells } from "../game/pieces/pieces";

interface GameCanvasProps {
  snapshot: GameSnapshot;
  settings: GameSettings;
}

const CELL = 24;
const WIDTH = BOARD_WIDTH * CELL;
const HEIGHT = (BOARD_HEIGHT - HIDDEN_ROWS) * CELL;

export function GameCanvas({ snapshot, settings }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const palette = {
      bg: styles.getPropertyValue("--lcd-bg").trim(),
      ink: styles.getPropertyValue("--ink").trim(),
      ink2: styles.getPropertyValue("--ink-2").trim(),
      mid: styles.getPropertyValue("--mid").trim(),
      light: styles.getPropertyValue("--light").trim(),
      panel: styles.getPropertyValue("--panel").trim(),
    };

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = palette.bg;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    if (settings.showGrid) {
      drawGrid(context, palette.ink2);
    }

    drawBoard(context, snapshot.board, palette);

    if (settings.ghostPiece && snapshot.ghost) {
      drawPiece(context, snapshot.ghost, palette, 0.26, true);
    }

    if (snapshot.active) {
      drawPiece(context, snapshot.active, palette, 1, false);
    }
  }, [snapshot, settings.ghostPiece, settings.showGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={WIDTH}
      height={HEIGHT}
      aria-label="BLOCK DROP DX playfield"
    />
  );
}

function drawGrid(context: CanvasRenderingContext2D, color: string): void {
  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = color;
  context.lineWidth = 1;

  for (let x = 1; x < BOARD_WIDTH; x += 1) {
    context.beginPath();
    context.moveTo(x * CELL + 0.5, 0);
    context.lineTo(x * CELL + 0.5, HEIGHT);
    context.stroke();
  }

  for (let y = 1; y < BOARD_HEIGHT - HIDDEN_ROWS; y += 1) {
    context.beginPath();
    context.moveTo(0, y * CELL + 0.5);
    context.lineTo(WIDTH, y * CELL + 0.5);
    context.stroke();
  }

  context.restore();
}

function drawBoard(
  context: CanvasRenderingContext2D,
  board: Board,
  palette: Record<string, string>,
): void {
  board.forEach((row, rowIndex) => {
    const visibleRow = rowIndex - HIDDEN_ROWS;
    if (visibleRow < 0) {
      return;
    }

    row.forEach((cell, column) => {
      if (cell) {
        drawBlock(context, column * CELL, visibleRow * CELL, cell, palette, 1, false);
      }
    });
  });
}

function drawPiece(
  context: CanvasRenderingContext2D,
  piece: ActivePiece,
  palette: Record<string, string>,
  alpha: number,
  ghost: boolean,
): void {
  const cell: Cell = {
    kind: piece.kind,
    pattern: getPatternForPiece(piece.kind),
  };

  getPieceCells(piece).forEach(({ x, y }) => {
    const visibleY = y - HIDDEN_ROWS;
    if (visibleY >= 0) {
      drawBlock(context, x * CELL, visibleY * CELL, cell, palette, alpha, ghost);
    }
  });
}

function drawBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: Cell,
  palette: Record<string, string>,
  alpha: number,
  ghost: boolean,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = ghost ? palette.bg : palette.mid;
  context.strokeStyle = palette.ink;
  context.lineWidth = 3;
  context.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
  context.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);

  if (!ghost) {
    context.fillStyle = palette.light;
    context.fillRect(x + 6, y + 6, CELL - 12, 3);
    context.fillStyle = palette.ink2;
    context.fillRect(x + 6, y + CELL - 8, CELL - 12, 3);
    drawPattern(context, x, y, cell, palette);
  } else {
    context.strokeStyle = palette.ink2;
    context.strokeRect(x + 7.5, y + 7.5, CELL - 15, CELL - 15);
  }

  context.restore();
}

function drawPattern(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: Cell,
  palette: Record<string, string>,
): void {
  context.fillStyle = palette.ink2;

  if (cell.pattern === "solid") {
    context.fillRect(x + 9, y + 9, CELL - 18, CELL - 18);
  }

  if (cell.pattern === "square") {
    context.strokeStyle = palette.ink2;
    context.lineWidth = 2;
    context.strokeRect(x + 8.5, y + 8.5, CELL - 17, CELL - 17);
    context.fillRect(x + 12, y + 12, CELL - 24, CELL - 24);
  }

  if (cell.pattern === "dots") {
    for (let dx = 8; dx <= CELL - 8; dx += 6) {
      for (let dy = 9; dy <= CELL - 8; dy += 6) {
        context.fillRect(x + dx, y + dy, 2, 2);
      }
    }
  }

  if (cell.pattern === "hatch") {
    context.lineWidth = 2;
    context.strokeStyle = palette.ink2;
    for (let offset = -CELL; offset < CELL; offset += 7) {
      context.beginPath();
      context.moveTo(x + offset + 6, y + CELL - 6);
      context.lineTo(x + offset + CELL - 6, y + 6);
      context.stroke();
    }
  }
}
