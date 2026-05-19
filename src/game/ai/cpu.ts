import {
  BOARD_WIDTH,
  type ActivePiece,
  type Board,
  type CpuSnapshot,
  type PieceKind,
} from "../types";
import {
  addGarbageLines,
  clearFullLines,
  cloneBoard,
  collides,
  countHoles,
  createEmptyBoard,
  getAggregateHeight,
  getBumpiness,
  getDropDistance,
  mergePiece,
} from "../engine/board";
import { RandomBag } from "../engine/randomBag";

interface CpuMove {
  piece: ActivePiece;
  board: Board;
  lines: number;
  value: number;
}

export class CpuOpponent {
  private board: Board = createEmptyBoard();
  private bag = new RandomBag();
  private queue: PieceKind[] = [];
  private timer = 0;
  private meter = 4;
  private lineCount = 0;
  private pressureCooldown = 0;

  constructor() {
    this.fillQueue();
  }

  update(deltaMs: number, level: number): number {
    this.timer += deltaMs;
    this.pressureCooldown = Math.max(0, this.pressureCooldown - deltaMs);
    const interval = Math.max(360, 1420 - level * 70 - this.meter * 12);
    let garbageToSend = 0;

    while (this.timer >= interval) {
      this.timer -= interval;
      const cleared = this.playBestMove();
      this.lineCount += cleared;

      if (cleared > 1) {
        garbageToSend += cleared - 1;
        this.meter = Math.min(10, this.meter + cleared * 0.8);
      } else {
        this.meter = Math.max(0, this.meter - 0.25);
      }
    }

    return garbageToSend;
  }

  receiveGarbage(lines: number): void {
    if (lines <= 0) {
      return;
    }

    const result = addGarbageLines(this.board, lines);
    this.board = result.board;
    this.meter = Math.max(0, this.meter - lines * 0.7);
    this.pressureCooldown = 900;
  }

  snapshot(): CpuSnapshot {
    const face = this.pressureCooldown > 0 ? "strain" : this.meter > 7 ? "push" : "idle";
    return {
      meter: Math.max(0, Math.min(10, this.meter)),
      lines: this.lineCount,
      face,
    };
  }

  private playBestMove(): number {
    this.fillQueue();
    const kind = this.queue.shift();
    this.fillQueue();

    if (!kind) {
      return 0;
    }

    let best: CpuMove | null = null;

    for (let rotation = 0; rotation < 4; rotation += 1) {
      for (let x = -2; x < BOARD_WIDTH + 2; x += 1) {
        const spawn: ActivePiece = {
          kind,
          x,
          y: 0,
          rotation,
        };

        if (collides(this.board, spawn)) {
          continue;
        }

        const piece = {
          ...spawn,
          y: spawn.y + getDropDistance(this.board, spawn),
        };
        const merged = mergePiece(this.board, piece);
        const cleared = clearFullLines(merged);
        const value = this.evaluate(cleared.board, cleared.lines);

        if (!best || value > best.value) {
          best = {
            piece,
            board: cleared.board,
            lines: cleared.lines,
            value,
          };
        }
      }
    }

    if (!best) {
      this.board = createEmptyBoard();
      return 0;
    }

    this.board = cloneBoard(best.board);
    return best.lines;
  }

  private evaluate(board: Board, clearedLines: number): number {
    const height = getAggregateHeight(board);
    const holes = countHoles(board);
    const bumpiness = getBumpiness(board);
    return clearedLines * 9 - height * 0.35 - holes * 5.2 - bumpiness * 0.42;
  }

  private fillQueue(): void {
    while (this.queue.length < 5) {
      this.queue.push(this.bag.next());
    }
  }
}
