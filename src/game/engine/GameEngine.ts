import type {
  ActivePiece,
  Board,
  EngineEvent,
  GameAction,
  GameMode,
  GameSnapshot,
  PieceKind,
} from "../types";
import { BOARD_WIDTH } from "../types";
import { CpuOpponent } from "../ai/cpu";
import {
  addGarbageLines,
  clearFullLines,
  cloneBoard,
  collides,
  createEmptyBoard,
  getDropDistance,
  mergePiece,
} from "./board";
import { RandomBag } from "./randomBag";
import { getComboScore, getLineClearScore } from "./scoring";
import { createPuzzleBoard, MODE_DEFINITIONS } from "../modes/modes";

interface InternalState {
  board: Board;
  active: ActivePiece | null;
  queue: PieceKind[];
  hold: PieceKind | null;
  canHold: boolean;
  score: number;
  level: number;
  lines: number;
  combo: number;
  mode: GameMode;
  elapsedMs: number;
  gameOver: boolean;
  victory: boolean;
  lastClear: number;
  attackMeter: number;
}

export class GameEngine {
  private bag = new RandomBag();
  private state: InternalState;
  private fallTimer = 0;
  private lockTimer = 0;
  private readonly lockDelayMs = 480;
  private readonly events: EngineEvent[] = [];
  private cpu: CpuOpponent | null = null;

  constructor(mode: GameMode) {
    this.state = this.createInitialState(mode);
    this.reset(mode);
  }

  reset(mode: GameMode = this.state.mode): void {
    this.bag = new RandomBag();
    this.cpu = mode === "vs-ai" ? new CpuOpponent() : null;
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.events.length = 0;
    this.state = this.createInitialState(mode);
    this.fillQueue();
    this.spawnFromQueue();
  }

  update(deltaMs: number): void {
    if (this.state.gameOver || !this.state.active) {
      return;
    }

    const delta = Math.min(deltaMs, 64);
    this.state.elapsedMs += delta;
    this.state.attackMeter = Math.max(0, this.state.attackMeter - delta * 0.0024);

    if (this.cpu) {
      const incoming = this.cpu.update(delta, this.state.level);
      if (incoming > 0) {
        this.receiveGarbage(incoming);
      }
    }

    if (this.state.gameOver || !this.state.active) {
      return;
    }

    const probe = { ...this.state.active, y: this.state.active.y + 1 };

    if (collides(this.state.board, probe)) {
      this.lockTimer += delta;
      if (this.lockTimer >= this.lockDelayMs) {
        this.lockPiece();
      }
      return;
    }

    this.lockTimer = 0;
    this.fallTimer += delta;

    while (this.fallTimer >= this.getGravityInterval()) {
      this.fallTimer -= this.getGravityInterval();
      this.tryMove(0, 1, false);
    }
  }

  handleAction(action: GameAction): boolean {
    if (this.state.gameOver || !this.state.active) {
      return false;
    }

    if (action === "left") {
      return this.tryMove(-1, 0, true);
    }

    if (action === "right") {
      return this.tryMove(1, 0, true);
    }

    if (action === "softDrop") {
      const moved = this.tryMove(0, 1, false);
      if (moved) {
        this.state.score += 1;
        this.events.push("move");
      }
      return moved;
    }

    if (action === "hardDrop") {
      return this.hardDrop();
    }

    if (action === "rotateCw") {
      return this.rotate(1);
    }

    if (action === "rotateCcw") {
      return this.rotate(-1);
    }

    return this.hold();
  }

  snapshot(): GameSnapshot {
    const active = this.state.active ? { ...this.state.active } : null;
    const ghost = active
      ? {
          ...active,
          y: active.y + getDropDistance(this.state.board, active),
        }
      : null;

    return {
      board: cloneBoard(this.state.board),
      active,
      ghost,
      queue: [...this.state.queue],
      hold: this.state.hold,
      canHold: this.state.canHold,
      score: this.state.score,
      level: this.state.level,
      lines: this.state.lines,
      combo: Math.max(0, this.state.combo),
      mode: this.state.mode,
      elapsedMs: this.state.elapsedMs,
      gameOver: this.state.gameOver,
      victory: this.state.victory,
      lastClear: this.state.lastClear,
      attackMeter: this.state.attackMeter,
      cpu: this.cpu?.snapshot() ?? null,
    };
  }

  consumeEvents(): EngineEvent[] {
    const next = [...this.events];
    this.events.length = 0;
    return next;
  }

  private createInitialState(mode: GameMode): InternalState {
    return {
      board: mode === "puzzle" ? createPuzzleBoard() : createEmptyBoard(),
      active: null,
      queue: [],
      hold: null,
      canHold: true,
      score: 0,
      level: 1,
      lines: 0,
      combo: -1,
      mode,
      elapsedMs: 0,
      gameOver: false,
      victory: false,
      lastClear: 0,
      attackMeter: 0,
    };
  }

  private fillQueue(): void {
    while (this.state.queue.length < 5) {
      this.state.queue.push(this.bag.next());
    }
  }

  private spawnFromQueue(): void {
    this.fillQueue();
    const kind = this.state.queue.shift();
    this.fillQueue();

    if (!kind) {
      this.endGame(false);
      return;
    }

    this.spawnPiece(kind);
  }

  private spawnPiece(kind: PieceKind): void {
    const piece: ActivePiece = {
      kind,
      x: Math.floor((BOARD_WIDTH - 4) / 2),
      y: 0,
      rotation: 0,
    };

    this.state.active = piece;
    this.state.canHold = true;
    this.lockTimer = 0;
    this.fallTimer = 0;

    if (collides(this.state.board, piece)) {
      this.endGame(false);
    }
  }

  private tryMove(dx: number, dy: number, manual: boolean): boolean {
    if (!this.state.active) {
      return false;
    }

    const next = {
      ...this.state.active,
      x: this.state.active.x + dx,
      y: this.state.active.y + dy,
    };

    if (collides(this.state.board, next)) {
      return false;
    }

    this.state.active = next;
    this.lockTimer = 0;

    if (manual) {
      this.events.push("move");
    }

    return true;
  }

  private hardDrop(): boolean {
    if (!this.state.active) {
      return false;
    }

    const distance = getDropDistance(this.state.board, this.state.active);
    this.state.active = {
      ...this.state.active,
      y: this.state.active.y + distance,
    };
    this.state.score += distance * 2;
    this.events.push("drop");
    this.lockPiece();
    return true;
  }

  private rotate(direction: 1 | -1): boolean {
    if (!this.state.active) {
      return false;
    }

    const nextRotation = this.state.active.rotation + direction;
    const kicks = [0, -1, 1, -2, 2];

    for (const kick of kicks) {
      const next = {
        ...this.state.active,
        rotation: nextRotation,
        x: this.state.active.x + kick,
      };

      if (!collides(this.state.board, next)) {
        this.state.active = next;
        this.lockTimer = 0;
        this.events.push("rotate");
        return true;
      }
    }

    return false;
  }

  private hold(): boolean {
    if (!this.state.active || !this.state.canHold) {
      return false;
    }

    const current = this.state.active.kind;
    this.state.canHold = false;
    this.events.push("hold");

    if (!this.state.hold) {
      this.state.hold = current;
      this.state.active = null;
      this.spawnFromQueue();
      this.state.canHold = false;
      return true;
    }

    const held = this.state.hold;
    this.state.hold = current;
    this.spawnPiece(held);
    this.state.canHold = false;
    return true;
  }

  private lockPiece(): void {
    if (!this.state.active) {
      return;
    }

    this.state.board = mergePiece(this.state.board, this.state.active);
    this.state.active = null;

    const cleared = clearFullLines(this.state.board);
    this.state.board = cleared.board;
    this.state.lastClear = cleared.lines;

    if (cleared.lines > 0) {
      this.state.combo += 1;
      const lineScore = getLineClearScore(cleared.lines, this.state.level);
      const comboScore = getComboScore(this.state.combo, this.state.level);
      this.state.score += lineScore + comboScore;
      this.state.lines += cleared.lines;
      this.updateLevel();
      this.events.push("lineClear");
      this.handlePlayerAttack(cleared.lines);
    } else {
      this.state.combo = -1;
    }

    this.checkModeCompletion();

    if (!this.state.gameOver) {
      this.spawnFromQueue();
    }
  }

  private handlePlayerAttack(clearedLines: number): void {
    if (!this.cpu || clearedLines < 2) {
      return;
    }

    const garbage = clearedLines - 1 + (clearedLines === 4 ? 1 : 0);
    this.cpu.receiveGarbage(garbage);
    this.state.attackMeter = Math.min(10, this.state.attackMeter + garbage * 2.3);
  }

  private receiveGarbage(lines: number): void {
    if (lines <= 0) {
      return;
    }

    const result = addGarbageLines(this.state.board, lines);
    this.state.board = result.board;
    this.state.attackMeter = Math.max(0, this.state.attackMeter - lines * 1.6);

    if (result.overflow || (this.state.active && collides(this.state.board, this.state.active))) {
      this.endGame(false);
    }
  }

  private updateLevel(): void {
    const lineLevel = 1 + Math.floor(this.state.lines / 10);
    const timeLevel =
      this.state.mode === "marathon" ? 1 + Math.floor(this.state.elapsedMs / 45000) : 1;
    this.state.level = Math.max(lineLevel, timeLevel);
  }

  private checkModeCompletion(): void {
    const definition = MODE_DEFINITIONS[this.state.mode];
    if (definition.targetLines && this.state.lines >= definition.targetLines) {
      this.endGame(true);
    }
  }

  private endGame(victory: boolean): void {
    this.state.gameOver = true;
    this.state.victory = victory;
    this.state.active = null;
    this.events.push("gameOver");
  }

  private getGravityInterval(): number {
    const modeFactor =
      this.state.mode === "sprint"
        ? 0.86
        : this.state.mode === "puzzle"
          ? 1.12
          : this.state.mode === "marathon"
            ? 0.9
            : 1;
    const base = 820 * modeFactor;
    return Math.max(62, base * Math.pow(0.84, this.state.level - 1));
  }
}
