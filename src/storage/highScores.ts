import { MODE_ORDER } from "../game/modes/modes";
import type { GameMode, ScoreEntry } from "../game/types";

const SCORES_KEY = "block-drop-dx-highscores-v1";
const MAX_SCORES = 10;

type ScoreTable = Record<GameMode, ScoreEntry[]>;

function emptyScoreTable(): ScoreTable {
  return MODE_ORDER.reduce((table, mode) => {
    table[mode] = [];
    return table;
  }, {} as ScoreTable);
}

export function loadScores(): ScoreTable {
  if (typeof window === "undefined") {
    return emptyScoreTable();
  }

  try {
    const raw = window.localStorage.getItem(SCORES_KEY);
    if (!raw) {
      return emptyScoreTable();
    }

    const parsed = JSON.parse(raw) as Partial<ScoreTable>;
    const table = emptyScoreTable();
    MODE_ORDER.forEach((mode) => {
      table[mode] = [...(parsed[mode] ?? [])]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SCORES);
    });
    return table;
  } catch {
    return emptyScoreTable();
  }
}

export function saveScore(entry: Omit<ScoreEntry, "id" | "date">): ScoreTable {
  const table = loadScores();
  const fullEntry: ScoreEntry = {
    ...entry,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    date: new Date().toISOString().slice(0, 10),
  };

  table[entry.mode] = [...table[entry.mode], fullEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SCORES);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(table));
  }

  return table;
}

export function qualifiesForHighScore(mode: GameMode, score: number): boolean {
  const scores = loadScores()[mode];
  return score > 0 && (scores.length < MAX_SCORES || score > scores[scores.length - 1].score);
}

export function resetScores(): ScoreTable {
  const empty = emptyScoreTable();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(empty));
  }

  return empty;
}

export function getBestScore(mode: GameMode): number {
  return loadScores()[mode][0]?.score ?? 0;
}
