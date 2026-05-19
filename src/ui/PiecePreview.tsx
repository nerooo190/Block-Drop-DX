import { useEffect, useRef } from "react";
import type { PieceKind } from "../game/types";
import { getPatternForPiece, getPieceMatrix } from "../game/pieces/pieces";

interface PiecePreviewProps {
  kind: PieceKind | null;
  label?: string;
  small?: boolean;
}

const SIZE = 92;

export function PiecePreview({ kind, label, small = false }: PiecePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = small ? 58 : SIZE;

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
      mid: styles.getPropertyValue("--mid").trim(),
      light: styles.getPropertyValue("--light").trim(),
      ink2: styles.getPropertyValue("--ink-2").trim(),
    };

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, size, size);
    context.fillStyle = palette.bg;
    context.fillRect(0, 0, size, size);

    if (!kind) {
      return;
    }

    const matrix = getPieceMatrix(kind, 0);
    const filled: Array<{ x: number; y: number }> = [];
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          filled.push({ x, y });
        }
      });
    });

    const minX = Math.min(...filled.map((cell) => cell.x));
    const maxX = Math.max(...filled.map((cell) => cell.x));
    const minY = Math.min(...filled.map((cell) => cell.y));
    const maxY = Math.max(...filled.map((cell) => cell.y));
    const block = small ? 12 : 17;
    const totalWidth = (maxX - minX + 1) * block;
    const totalHeight = (maxY - minY + 1) * block;
    const offsetX = Math.floor((size - totalWidth) / 2);
    const offsetY = Math.floor((size - totalHeight) / 2);
    const pattern = getPatternForPiece(kind);

    filled.forEach((cell) => {
      drawPreviewBlock(
        context,
        offsetX + (cell.x - minX) * block,
        offsetY + (cell.y - minY) * block,
        block,
        pattern,
        palette,
      );
    });
  }, [kind, size]);

  return (
    <div className="piece-preview-wrap" aria-label={label ?? "piece preview"}>
      <canvas ref={canvasRef} width={size} height={size} className="piece-preview" />
    </div>
  );
}

function drawPreviewBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pattern: string,
  palette: Record<string, string>,
): void {
  context.fillStyle = palette.mid;
  context.strokeStyle = palette.ink;
  context.lineWidth = Math.max(2, Math.floor(size / 7));
  context.fillRect(x + 1, y + 1, size - 2, size - 2);
  context.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
  context.fillStyle = palette.light;
  context.fillRect(x + 4, y + 4, size - 8, 2);
  context.fillStyle = palette.ink2;

  if (pattern === "dots") {
    for (let dx = 5; dx < size - 3; dx += 5) {
      for (let dy = 6; dy < size - 3; dy += 5) {
        context.fillRect(x + dx, y + dy, 1.8, 1.8);
      }
    }
    return;
  }

  if (pattern === "square") {
    context.strokeRect(x + 5.5, y + 5.5, size - 11, size - 11);
    return;
  }

  if (pattern === "hatch") {
    context.lineWidth = 1.8;
    for (let offset = -size; offset < size; offset += 6) {
      context.beginPath();
      context.moveTo(x + offset + 4, y + size - 4);
      context.lineTo(x + offset + size - 4, y + 4);
      context.stroke();
    }
    return;
  }

  context.fillRect(x + 6, y + 6, size - 12, size - 12);
}
