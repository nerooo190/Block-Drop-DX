import { BOARD_HEIGHT, BOARD_WIDTH, type Board, type GameMode } from "../types";
import { createEmptyBoard } from "../engine/board";

export interface ModeDefinition {
  id: GameMode;
  label: string;
  description: string;
  targetLines?: number;
}

export const MODE_ORDER: GameMode[] = ["classic", "sprint", "marathon", "puzzle", "vs-ai"];

export const MODE_DEFINITIONS: Record<GameMode, ModeDefinition> = {
  classic: {
    id: "classic",
    label: "CLASSIC",
    description: "Endless score chase.",
  },
  sprint: {
    id: "sprint",
    label: "SPRINT",
    description: "Clear 40 lines fast.",
    targetLines: 40,
  },
  marathon: {
    id: "marathon",
    label: "MARATHON",
    description: "Speed rises over time.",
  },
  puzzle: {
    id: "puzzle",
    label: "PUZZLE",
    description: "Clear the target setup.",
    targetLines: 2,
  },
  "vs-ai": {
    id: "vs-ai",
    label: "VS AI",
    description: "Send garbage to the CPU.",
  },
};

export function createPuzzleBoard(): Board {
  const board = createEmptyBoard();
  const bottom = BOARD_HEIGHT - 1;
  const setupRows = [bottom, bottom - 1, bottom - 2, bottom - 3];

  setupRows.forEach((row, rowIndex) => {
    for (let column = 0; column < BOARD_WIDTH; column += 1) {
      const isGap = rowIndex < 2 ? column === 4 || column === 5 : column === rowIndex + 1;
      if (!isGap) {
        board[row][column] = {
          kind: "garbage",
          pattern: column % 2 === 0 ? "dots" : "square",
        };
      }
    }
  });

  return board;
}

export function getModeLabel(mode: GameMode): string {
  return MODE_DEFINITIONS[mode].label;
}
