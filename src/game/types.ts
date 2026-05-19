export const BOARD_WIDTH = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const BOARD_HEIGHT = VISIBLE_ROWS + HIDDEN_ROWS;

export type PieceKind =
  | "beam"
  | "box"
  | "zig"
  | "zag"
  | "hook"
  | "claw"
  | "crest";

export type CellKind = PieceKind | "garbage";

export type BlockPattern = "solid" | "dots" | "square" | "hatch";

export interface Cell {
  kind: CellKind;
  pattern: BlockPattern;
}

export type Board = Array<Array<Cell | null>>;

export interface ActivePiece {
  kind: PieceKind;
  x: number;
  y: number;
  rotation: number;
}

export type GameMode = "classic" | "sprint" | "marathon" | "puzzle" | "vs-ai";

export type AppScreen =
  | "boot"
  | "menu"
  | "mode-select"
  | "gameplay"
  | "pause"
  | "game-over"
  | "high-scores"
  | "settings"
  | "themes";

export type ThemeId = "dot-matrix" | "pocket-green" | "night-lcd" | "paper-grey";

export interface GameSettings {
  sound: boolean;
  music: boolean;
  ghostPiece: boolean;
  screenShake: boolean;
  showGrid: boolean;
  moveRepeatDelay: number;
  moveRepeatRate: number;
  theme: ThemeId;
}

export interface ScoreEntry {
  id: string;
  initials: string;
  score: number;
  lines: number;
  level: number;
  mode: GameMode;
  date: string;
}

export interface CpuSnapshot {
  meter: number;
  lines: number;
  face: "idle" | "strain" | "push";
}

export interface GameSnapshot {
  board: Board;
  active: ActivePiece | null;
  ghost: ActivePiece | null;
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
  cpu: CpuSnapshot | null;
}

export type GameAction =
  | "left"
  | "right"
  | "softDrop"
  | "hardDrop"
  | "rotateCw"
  | "rotateCcw"
  | "hold";

export type EngineEvent =
  | "move"
  | "rotate"
  | "drop"
  | "hold"
  | "lineClear"
  | "gameOver";
