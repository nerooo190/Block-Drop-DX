import { useEffect, useRef, useState, type ReactNode } from "react";
import { RetroMusic } from "./audio/music";
import { RetroSfx, type SfxName } from "./audio/sfx";
import { GameEngine } from "./game/engine/GameEngine";
import { keyToGameAction, keyToMenuAction, type MenuNavAction } from "./game/input";
import { MODE_DEFINITIONS, MODE_ORDER, getModeLabel } from "./game/modes/modes";
import type {
  AppScreen,
  EngineEvent,
  GameAction,
  GameMode,
  GameSettings,
  GameSnapshot,
  ThemeId,
} from "./game/types";
import { GameCanvas } from "./ui/GameCanvas";
import { PiecePreview } from "./ui/PiecePreview";
import { TouchControls } from "./ui/TouchControls";
import { getBestScore, loadScores, qualifiesForHighScore, resetScores, saveScore } from "./storage/highScores";
import { loadSettings, saveSettings, THEME_LABELS, THEME_ORDER } from "./storage/settings";

const MENU_ITEMS = ["START GAME", "VS AI", "HIGH SCORES", "SETTINGS", "THEMES", "MODES"] as const;
const SETTINGS_ITEMS = [
  "SOUND",
  "MUSIC",
  "GHOST PIECE",
  "SCREEN SHAKE",
  "SHOW GRID",
  "MOVE REPEAT DELAY",
  "MOVE REPEAT RATE",
  "RESET HIGHSCORES",
] as const;

type SettingsItem = (typeof SETTINGS_ITEMS)[number];

export function App() {
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [screen, setScreen] = useState<AppScreen>("boot");
  const [currentMode, setCurrentMode] = useState<GameMode>("classic");
  const [menuIndex, setMenuIndex] = useState(0);
  const [modeIndex, setModeIndex] = useState(0);
  const [settingsIndex, setSettingsIndex] = useState(0);
  const [themeIndex, setThemeIndex] = useState(0);
  const [scoreMode, setScoreMode] = useState<GameMode>("classic");
  const [scoreTable, setScoreTable] = useState(() => loadScores());
  const [frame, setFrame] = useState(0);
  const [finalSnapshot, setFinalSnapshot] = useState<GameSnapshot | null>(null);
  const [scorePrompt, setScorePrompt] = useState(false);
  const [initials, setInitials] = useState("YOU");

  const engineRef = useRef<GameEngine | null>(null);
  const musicRef = useRef(new RetroMusic());
  const sfxRef = useRef(new RetroSfx());

  const liveSnapshot = engineRef.current?.snapshot() ?? null;
  const activeSnapshot = liveSnapshot ?? finalSnapshot;
  const bestScore = getBestScore(currentMode);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    sfxRef.current.setEnabled(settings.sound);
    musicRef.current.setEnabled(settings.music);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (settings.music && screen !== "boot") {
      musicRef.current.start();
    } else {
      musicRef.current.stop();
    }
  }, [screen, settings.music]);

  useEffect(() => {
    return () => musicRef.current.stop();
  }, []);

  useEffect(() => {
    const index = THEME_ORDER.indexOf(settings.theme);
    setThemeIndex(index < 0 ? 0 : index);
  }, [settings.theme]);

  useEffect(() => {
    if (screen !== "boot") {
      return;
    }

    const timeout = window.setTimeout(() => setScreen("menu"), 1350);
    return () => window.clearTimeout(timeout);
  }, [screen]);

  useEffect(() => {
    if (screen !== "gameplay") {
      return;
    }

    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const engine = engineRef.current;
      const delta = now - last;
      last = now;

      if (engine) {
        engine.update(delta);
        playEngineEvents(engine.consumeEvents());
        const snapshot = engine.snapshot();

        if (snapshot.gameOver) {
          setFinalSnapshot(snapshot);
          setScorePrompt(qualifiesForHighScore(snapshot.mode, snapshot.score));
          setInitials("");
          setScoreTable(loadScores());
          setScreen("game-over");
          return;
        }
      }

      setFrame((value) => (value + 1) % 1000000);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [screen, settings.sound]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (screen === "gameplay") {
        const gameAction = keyToGameAction(event);
        if (gameAction) {
          event.preventDefault();
          if (gameAction === "pause") {
            pauseGame();
          } else {
            runGameAction(gameAction);
          }
        }
        return;
      }

      if (screen === "pause") {
        const key = event.key.toLowerCase();
        if (key === "escape" || key === "p" || key === "enter") {
          event.preventDefault();
          resumeGame();
        }
        return;
      }

      if (screen === "game-over") {
        if (scorePrompt && /^[a-z0-9]$/i.test(event.key) && initials.length < 3) {
          event.preventDefault();
          setInitials((value) => `${value}${event.key.toUpperCase()}`.slice(0, 3));
          return;
        }

        if (scorePrompt && event.key === "Backspace") {
          event.preventDefault();
          setInitials((value) => value.slice(0, -1));
          return;
        }
      }

      const menuAction = keyToMenuAction(event);
      if (menuAction) {
        event.preventDefault();
        handleMenuAction(menuAction);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function updateSettings(next: Partial<GameSettings>): void {
    setSettings((current) => ({
      ...current,
      ...next,
    }));
  }

  function play(name: SfxName): void {
    sfxRef.current.play(name);
    musicRef.current.pulse();
  }

  function playEngineEvents(events: EngineEvent[]): void {
    events.forEach((event) => {
      if (event === "lineClear") {
        play("lineClear");
      } else if (event === "gameOver") {
        play("gameOver");
      } else if (event === "drop") {
        play("drop");
      } else if (event === "rotate") {
        play("rotate");
      } else if (event === "move" || event === "hold") {
        play("move");
      }
    });
  }

  function startGame(mode: GameMode): void {
    const engine = new GameEngine(mode);
    engineRef.current = engine;
    setCurrentMode(mode);
    setScoreMode(mode);
    setFinalSnapshot(null);
    setScorePrompt(false);
    setInitials("YOU");
    setScreen("gameplay");
    setFrame((value) => value + 1);
    play("menu");
  }

  function runGameAction(action: GameAction): void {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    if (engine.handleAction(action)) {
      playEngineEvents(engine.consumeEvents());
      setFrame((value) => value + 1);
    }
  }

  function pauseGame(): void {
    if (!engineRef.current) {
      return;
    }
    setScreen("pause");
    play("menu");
  }

  function resumeGame(): void {
    if (!engineRef.current) {
      setScreen("menu");
      return;
    }
    setScreen("gameplay");
    play("menu");
  }

  function handleMenuAction(action: MenuNavAction): void {
    if (screen === "boot") {
      setScreen("menu");
      return;
    }

    if (screen === "menu") {
      handleMainMenuAction(action);
      return;
    }

    if (screen === "mode-select") {
      handleModeMenuAction(action);
      return;
    }

    if (screen === "settings") {
      handleSettingsAction(action);
      return;
    }

    if (screen === "themes") {
      handleThemeAction(action);
      return;
    }

    if (screen === "high-scores") {
      handleScoresAction(action);
      return;
    }

    if (screen === "game-over") {
      handleGameOverAction(action);
    }
  }

  function handleMainMenuAction(action: MenuNavAction): void {
    if (action === "up" || action === "down") {
      setMenuIndex((index) => wrap(index + (action === "down" ? 1 : -1), MENU_ITEMS.length));
      play("menu");
      return;
    }

    if (action === "back") {
      setMenuIndex(0);
      play("menu");
      return;
    }

    if (action !== "confirm") {
      return;
    }

    const item = MENU_ITEMS[menuIndex];
    selectMainMenuItem(item);
  }

  function selectMainMenuItem(item: (typeof MENU_ITEMS)[number]): void {
    if (item === "START GAME") {
      startGame(currentMode);
    } else if (item === "VS AI") {
      startGame("vs-ai");
    } else if (item === "HIGH SCORES") {
      setScoreTable(loadScores());
      setScreen("high-scores");
      play("menu");
    } else if (item === "SETTINGS") {
      setScreen("settings");
      play("menu");
    } else if (item === "THEMES") {
      setScreen("themes");
      play("menu");
    } else if (item === "MODES") {
      setModeIndex(MODE_ORDER.indexOf(currentMode));
      setScreen("mode-select");
      play("menu");
    }
  }

  function handleModeMenuAction(action: MenuNavAction): void {
    if (action === "up" || action === "down") {
      setModeIndex((index) => wrap(index + (action === "down" ? 1 : -1), MODE_ORDER.length));
      play("menu");
      return;
    }

    if (action === "confirm") {
      const mode = MODE_ORDER[modeIndex];
      setCurrentMode(mode);
      setScoreMode(mode);
      setScreen("menu");
      play("menu");
      return;
    }

    if (action === "back") {
      setScreen("menu");
      play("menu");
    }
  }

  function handleSettingsAction(action: MenuNavAction): void {
    if (action === "up" || action === "down") {
      setSettingsIndex((index) => wrap(index + (action === "down" ? 1 : -1), SETTINGS_ITEMS.length));
      play("menu");
      return;
    }

    if (action === "back") {
      setScreen("menu");
      play("menu");
      return;
    }

    if (action === "confirm" || action === "left" || action === "right") {
      changeSetting(SETTINGS_ITEMS[settingsIndex], action === "left" ? -1 : 1);
      play("menu");
    }
  }

  function handleThemeAction(action: MenuNavAction): void {
    if (action === "up" || action === "down") {
      setThemeIndex((index) => wrap(index + (action === "down" ? 1 : -1), THEME_ORDER.length));
      play("menu");
      return;
    }

    if (action === "confirm") {
      updateSettings({ theme: THEME_ORDER[themeIndex] });
      play("menu");
      return;
    }

    if (action === "back") {
      setScreen("menu");
      play("menu");
    }
  }

  function handleScoresAction(action: MenuNavAction): void {
    if (action === "left" || action === "right") {
      const index = MODE_ORDER.indexOf(scoreMode);
      setScoreMode(MODE_ORDER[wrap(index + (action === "right" ? 1 : -1), MODE_ORDER.length)]);
      play("menu");
      return;
    }

    if (action === "back" || action === "confirm") {
      setScreen("menu");
      play("menu");
    }
  }

  function handleGameOverAction(action: MenuNavAction): void {
    if (action === "confirm") {
      if (scorePrompt) {
        submitHighScore();
      } else if (finalSnapshot) {
        startGame(finalSnapshot.mode);
      }
      return;
    }

    if (action === "back") {
      setScreen("menu");
      play("menu");
    }
  }

  function changeSetting(item: SettingsItem, direction: number): void {
    if (item === "SOUND") {
      updateSettings({ sound: !settings.sound });
    } else if (item === "MUSIC") {
      updateSettings({ music: !settings.music });
    } else if (item === "GHOST PIECE") {
      updateSettings({ ghostPiece: !settings.ghostPiece });
    } else if (item === "SCREEN SHAKE") {
      updateSettings({ screenShake: !settings.screenShake });
    } else if (item === "SHOW GRID") {
      updateSettings({ showGrid: !settings.showGrid });
    } else if (item === "MOVE REPEAT DELAY") {
      updateSettings({
        moveRepeatDelay: clamp(settings.moveRepeatDelay + direction * 10, 80, 260),
      });
    } else if (item === "MOVE REPEAT RATE") {
      updateSettings({
        moveRepeatRate: clamp(settings.moveRepeatRate + direction * 5, 35, 120),
      });
    } else if (item === "RESET HIGHSCORES") {
      setScoreTable(resetScores());
    }
  }

  function submitHighScore(): void {
    const snapshot = finalSnapshot;
    if (!snapshot) {
      return;
    }

    const cleanInitials = initials.padEnd(3, "X").slice(0, 3).toUpperCase();
    const nextTable = saveScore({
      initials: cleanInitials,
      score: snapshot.score,
      lines: snapshot.lines,
      level: snapshot.level,
      mode: snapshot.mode,
    });
    setScoreTable(nextTable);
    setScorePrompt(false);
    play("menu");
  }

  function renderScreen(): ReactNode {
    if (screen === "boot") {
      return renderBoot();
    }

    if (screen === "gameplay" || screen === "pause" || screen === "game-over") {
      return renderGameplaySurface();
    }

    if (screen === "menu") {
      return renderMainMenu();
    }

    if (screen === "mode-select") {
      return renderModeSelect();
    }

    if (screen === "high-scores") {
      return renderHighScores();
    }

    if (screen === "settings") {
      return renderSettings();
    }

    return renderThemes();
  }

  function renderBoot(): ReactNode {
    return (
      <section className="screen-surface boot-screen">
        <div className="boot-card">
          <div className="boot-mark">BDX</div>
        <div className="boot-title">BLOCK DROP DX</div>
        <div className="boot-bar">
          <span />
        </div>
        <p>RETRO BLOCK SYSTEM</p>
        <p className="creator-credit">ERSTELLT VON ANDRE WELLMANN</p>
      </div>
    </section>
  );
  }

  function renderMainMenu(): ReactNode {
    return (
      <section className="screen-surface menu-screen">
        <HeaderArt />
        <PixelPanel className="main-menu-panel">
          <ul className="menu-list">
            {MENU_ITEMS.map((item, index) => (
              <li key={item} className={index === menuIndex ? "selected" : ""}>
                <span className="pixel-cursor" aria-hidden="true" />
                <button type="button" onClick={() => {
                  setMenuIndex(index);
                  selectMainMenuItem(item);
                }}>
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </PixelPanel>
        <div className="info-grid">
          <InfoPanel title="MODE:" icon="piece">
            <div className="mode-lines">
              {MODE_ORDER.filter((mode) => mode !== "vs-ai").map((mode) => (
                <span key={mode} className={mode === currentMode ? "active-line" : ""}>
                  {getModeLabel(mode)}
                </span>
              ))}
            </div>
          </InfoPanel>
          <InfoPanel title="THEME:" icon="theme">
            <strong>{THEME_LABELS[settings.theme]}</strong>
          </InfoPanel>
          <InfoPanel title="SOUND:" icon="sound">
            <strong>{settings.sound ? "ON" : "OFF"}</strong>
          </InfoPanel>
          <InfoPanel title="BEST SCORE:" icon="trophy">
            <strong>{formatScore(bestScore || 6629)}</strong>
          </InfoPanel>
        </div>
        <p className="menu-credit">ERSTELLT VON ANDRE WELLMANN</p>
        <MenuTouchNav onAction={handleMenuAction} />
      </section>
    );
  }

  function renderModeSelect(): ReactNode {
    return (
      <MenuSurface title="MODES" subtitle="ENTER SETS CURRENT MODE">
        <ul className="option-list mode-list">
          {MODE_ORDER.map((mode, index) => (
            <li key={mode} className={index === modeIndex ? "selected" : ""}>
              <button type="button" onClick={() => {
                setModeIndex(index);
                setCurrentMode(mode);
                setScoreMode(mode);
                setScreen("menu");
              }}>
                <span>{MODE_DEFINITIONS[mode].label}</span>
                <small>{MODE_DEFINITIONS[mode].description}</small>
              </button>
            </li>
          ))}
        </ul>
        <MenuTouchNav onAction={handleMenuAction} />
      </MenuSurface>
    );
  }

  function renderHighScores(): ReactNode {
    const entries = scoreTable[scoreMode];
    return (
      <MenuSurface title="HIGH SCORES" subtitle="LEFT / RIGHT CHANGES MODE">
        <div className="score-mode-tabs">
          {MODE_ORDER.map((mode) => (
            <button
              type="button"
              key={mode}
              className={mode === scoreMode ? "selected" : ""}
              onClick={() => setScoreMode(mode)}
            >
              {MODE_DEFINITIONS[mode].label}
            </button>
          ))}
        </div>
        <div className="score-table" role="table">
          <div className="score-row score-head" role="row">
            <span>#</span>
            <span>NAME</span>
            <span>SCORE</span>
            <span>LINES</span>
            <span>LV</span>
            <span>DATE</span>
          </div>
          {entries.length === 0 ? (
            <div className="empty-score">NO SCORES YET</div>
          ) : (
            entries.map((entry, index) => (
              <div className="score-row" role="row" key={entry.id}>
                <span>{index + 1}</span>
                <span>{entry.initials}</span>
                <span>{formatScore(entry.score)}</span>
                <span>{entry.lines}</span>
                <span>{entry.level}</span>
                <span>{entry.date}</span>
              </div>
            ))
          )}
        </div>
        <MenuTouchNav onAction={handleMenuAction} />
      </MenuSurface>
    );
  }

  function renderSettings(): ReactNode {
    return (
      <MenuSurface title="SETTINGS" subtitle="ENTER TO TOGGLE / LEFT RIGHT TO TUNE">
        <ul className="option-list settings-list">
          {SETTINGS_ITEMS.map((item, index) => (
            <li key={item} className={index === settingsIndex ? "selected" : ""}>
              <button type="button" onClick={() => {
                setSettingsIndex(index);
                changeSetting(item, 1);
              }}>
                <span>{item}</span>
                <strong>{renderSettingValue(item)}</strong>
              </button>
            </li>
          ))}
        </ul>
        <MenuTouchNav onAction={handleMenuAction} />
      </MenuSurface>
    );
  }

  function renderThemes(): ReactNode {
    return (
      <MenuSurface title="THEMES" subtitle="ENTER APPLIES PALETTE">
        <ul className="option-list theme-list">
          {THEME_ORDER.map((theme, index) => (
            <li key={theme} className={index === themeIndex ? "selected" : ""}>
              <button type="button" onClick={() => {
                setThemeIndex(index);
                updateSettings({ theme });
              }}>
                <span>{THEME_LABELS[theme]}</span>
                <ThemeSwatch theme={theme} />
              </button>
            </li>
          ))}
        </ul>
        <MenuTouchNav onAction={handleMenuAction} />
      </MenuSurface>
    );
  }

  function renderGameplaySurface(): ReactNode {
    const snapshot = activeSnapshot;
    if (!snapshot) {
      return renderMainMenu();
    }

    const shouldShake = settings.screenShake && snapshot.lastClear > 0 && frame % 20 < 8;

    return (
      <section className={`screen-surface game-screen ${shouldShake ? "shake" : ""}`}>
        <div className="game-layout">
          <div className="board-frame">
            <GameCanvas snapshot={snapshot} settings={settings} />
          </div>
          <aside className="side-stack">
            <PixelPanel className="brand-panel">
              <h2>BLOCK<br />DROP DX</h2>
              <span className="brand-credit">BY ANDRE WELLMANN</span>
            </PixelPanel>
            <StatPanel label="SCORE" value={formatScore(snapshot.score)} />
            <StatPanel label="LEVEL" value={snapshot.level.toString().padStart(2, "0")} />
            <StatPanel label="LINES" value={snapshot.lines.toString().padStart(3, "0")} />
            <PixelPanel title="NEXT" className="next-panel">
              <div className="next-stack">
                {snapshot.queue.slice(0, 3).map((kind, index) => (
                  <PiecePreview key={`${kind}-${index}`} kind={kind} small={index > 0} />
                ))}
              </div>
            </PixelPanel>
            <PixelPanel title="HOLD" className="hold-panel">
              <PiecePreview kind={snapshot.hold} />
              {!snapshot.canHold && <span className="hold-lock">LOCK</span>}
            </PixelPanel>
            <PixelPanel className="mode-panel">
              <strong>MODE: {getModeLabel(snapshot.mode)}</strong>
              {snapshot.mode === "vs-ai" && snapshot.cpu ? (
                <div className="cpu-status">
                  <CpuFace face={snapshot.cpu.face} />
                  <div>
                    <span>CPU</span>
                    <PixelMeter value={snapshot.cpu.meter} />
                  </div>
                </div>
              ) : (
                <div className="time-readout">TIME {formatTime(snapshot.elapsedMs)}</div>
              )}
              {snapshot.mode === "vs-ai" && <PixelMeter value={snapshot.attackMeter} label="ATK" />}
            </PixelPanel>
          </aside>
        </div>
        <TouchControls
          onAction={runGameAction}
          onPause={pauseGame}
          repeatDelay={settings.moveRepeatDelay}
          repeatRate={settings.moveRepeatRate}
        />
        {screen === "pause" && (
          <Overlay title="PAUSE">
            <button type="button" onClick={resumeGame}>RESUME</button>
            <button type="button" onClick={() => setScreen("menu")}>MAIN MENU</button>
          </Overlay>
        )}
        {screen === "game-over" && finalSnapshot && (
          <Overlay title={finalSnapshot.victory ? "CLEAR" : "GAME OVER"}>
            <div className="final-stats">
              <span>FINAL SCORE {formatScore(finalSnapshot.score)}</span>
              <span>LINES {finalSnapshot.lines}</span>
              <span>LEVEL {finalSnapshot.level}</span>
            </div>
            {scorePrompt ? (
              <div className="initial-entry">
                <label htmlFor="initials">INITIALS</label>
                <input
                  id="initials"
                  value={initials}
                  placeholder="AAA"
                  maxLength={3}
                  autoFocus
                  onChange={(event) => setInitials(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3))}
                />
                <button type="button" onClick={submitHighScore}>SAVE SCORE</button>
              </div>
            ) : (
              <div className="overlay-actions">
                <button type="button" onClick={() => startGame(finalSnapshot.mode)}>RETRY</button>
                <button type="button" onClick={() => setScreen("menu")}>MAIN MENU</button>
              </div>
            )}
          </Overlay>
        )}
      </section>
    );
  }

  function renderSettingValue(item: SettingsItem): string {
    if (item === "SOUND") {
      return settings.sound ? "ON" : "OFF";
    }
    if (item === "MUSIC") {
      return settings.music ? "ON" : "OFF";
    }
    if (item === "GHOST PIECE") {
      return settings.ghostPiece ? "ON" : "OFF";
    }
    if (item === "SCREEN SHAKE") {
      return settings.screenShake ? "ON" : "OFF";
    }
    if (item === "SHOW GRID") {
      return settings.showGrid ? "ON" : "OFF";
    }
    if (item === "MOVE REPEAT DELAY") {
      return `${settings.moveRepeatDelay}MS`;
    }
    if (item === "MOVE REPEAT RATE") {
      return `${settings.moveRepeatRate}MS`;
    }
    return "PRESS";
  }

  return <div className="app-root"><main className="handheld-frame">{renderScreen()}</main></div>;
}

function HeaderArt() {
  const heights = [28, 42, 54, 34, 70, 45, 64, 38, 58, 48, 30, 60, 44, 32];
  return (
    <header className="title-zone">
      <div className="corner-pixels left-corner" aria-hidden="true" />
      <div className="corner-pixels right-corner" aria-hidden="true" />
      <h1>BLOCK<br />DROP DX</h1>
      <div className="skyline" aria-hidden="true">
        {heights.map((height, index) => (
          <span key={`${height}-${index}`} style={{ height: `${height}px` }} />
        ))}
      </div>
    </header>
  );
}

function PixelPanel({
  title,
  className = "",
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`pixel-panel ${className}`}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

function InfoPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: "piece" | "theme" | "sound" | "trophy";
  children: ReactNode;
}) {
  return (
    <PixelPanel className="info-panel">
      <div className={`pixel-icon icon-${icon}`} aria-hidden="true" />
      <div className="info-content">
        <span className="info-title">{title}</span>
        {children}
      </div>
    </PixelPanel>
  );
}

function MenuSurface({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="screen-surface menu-detail-screen">
      <PixelPanel className="detail-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </PixelPanel>
      <PixelPanel className="detail-body">{children}</PixelPanel>
    </section>
  );
}

function StatPanel({ label, value }: { label: string; value: string }) {
  return (
    <PixelPanel className="stat-panel">
      <span>{label}</span>
      <strong>{value}</strong>
    </PixelPanel>
  );
}

function CpuFace({ face }: { face: "idle" | "strain" | "push" }) {
  return (
    <div className={`cpu-face face-${face}`} aria-label={`CPU ${face}`}>
      <span />
      <span />
      <b />
    </div>
  );
}

function PixelMeter({ value, label }: { value: number; label?: string }) {
  const cells = Array.from({ length: 10 }, (_, index) => index < Math.round(value));
  return (
    <div className="meter-wrap">
      {label && <span>{label}</span>}
      <div className="pixel-meter">
        {cells.map((active, index) => (
          <i key={index} className={active ? "filled" : ""} />
        ))}
      </div>
    </div>
  );
}

function Overlay({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="game-overlay">
      <PixelPanel className="overlay-panel">
        <h2>{title}</h2>
        {children}
      </PixelPanel>
    </div>
  );
}

function MenuTouchNav({ onAction }: { onAction: (action: MenuNavAction) => void }) {
  return (
    <div className="menu-touch-nav">
      <button type="button" onClick={() => onAction("up")}>UP</button>
      <button type="button" onClick={() => onAction("down")}>DN</button>
      <button type="button" onClick={() => onAction("confirm")}>OK</button>
      <button type="button" onClick={() => onAction("back")}>BACK</button>
    </div>
  );
}

function ThemeSwatch({ theme }: { theme: ThemeId }) {
  return (
    <span className={`theme-swatch swatch-${theme}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function wrap(value: number, length: number): number {
  return ((value % length) + length) % length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatScore(score: number): string {
  return Math.max(0, Math.floor(score)).toString().padStart(5, "0");
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
