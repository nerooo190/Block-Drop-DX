import type { GameSettings, ThemeId } from "../game/types";

const SETTINGS_KEY = "block-drop-dx-settings-v1";

export const THEME_LABELS: Record<ThemeId, string> = {
  "dot-matrix": "DOT MATRIX",
  "pocket-green": "POCKET GREEN",
  "night-lcd": "NIGHT LCD",
  "paper-grey": "PAPER GREY",
};

export const THEME_ORDER: ThemeId[] = ["dot-matrix", "pocket-green", "night-lcd", "paper-grey"];

export const DEFAULT_SETTINGS: GameSettings = {
  sound: true,
  music: false,
  ghostPiece: true,
  screenShake: true,
  showGrid: true,
  moveRepeatDelay: 120,
  moveRepeatRate: 55,
  theme: "dot-matrix",
};

export function loadSettings(): GameSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      theme: THEME_ORDER.includes(parsed.theme ?? DEFAULT_SETTINGS.theme)
        ? parsed.theme ?? DEFAULT_SETTINGS.theme
        : DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
