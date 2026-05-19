import type { GameAction } from "./types";

export type MenuNavAction = "up" | "down" | "left" | "right" | "confirm" | "back";

export function keyToGameAction(event: KeyboardEvent): GameAction | "pause" | null {
  const key = event.key.toLowerCase();

  if (key === "arrowleft" || key === "a") {
    return "left";
  }

  if (key === "arrowright" || key === "d") {
    return "right";
  }

  if (key === "arrowdown" || key === "s") {
    return "softDrop";
  }

  if (key === " ") {
    return "hardDrop";
  }

  if (key === "arrowup" || key === "x") {
    return "rotateCw";
  }

  if (key === "z") {
    return "rotateCcw";
  }

  if (key === "c" || key === "shift") {
    return "hold";
  }

  if (key === "p" || key === "escape") {
    return "pause";
  }

  return null;
}

export function keyToMenuAction(event: KeyboardEvent): MenuNavAction | null {
  const key = event.key.toLowerCase();

  if (key === "arrowup" || key === "w") {
    return "up";
  }

  if (key === "arrowdown" || key === "s") {
    return "down";
  }

  if (key === "arrowleft" || key === "a") {
    return "left";
  }

  if (key === "arrowright" || key === "d") {
    return "right";
  }

  if (key === "enter" || key === " ") {
    return "confirm";
  }

  if (key === "escape") {
    return "back";
  }

  return null;
}
