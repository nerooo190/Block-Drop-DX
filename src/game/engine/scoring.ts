const LINE_SCORES: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

export function getLineClearScore(lines: number, level: number): number {
  return (LINE_SCORES[lines] ?? 0) * level;
}

export function getComboScore(combo: number, level: number): number {
  if (combo <= 0) {
    return 0;
  }

  return 50 * combo * level;
}
