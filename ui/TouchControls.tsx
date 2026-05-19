import { useRef } from "react";
import type { GameAction } from "../game/types";

interface TouchControlsProps {
  onAction: (action: GameAction) => void;
  onPause: () => void;
  repeatDelay: number;
  repeatRate: number;
}

const REPEATING_ACTIONS = new Set<GameAction>(["left", "right", "softDrop"]);

export function TouchControls({ onAction, onPause, repeatDelay, repeatRate }: TouchControlsProps) {
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  function stopRepeat(): void {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startAction(action: GameAction): void {
    stopRepeat();
    onAction(action);

    if (REPEATING_ACTIONS.has(action)) {
      timeoutRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(() => onAction(action), repeatRate);
      }, repeatDelay);
    }
  }

  return (
    <div className="touch-controls" onContextMenu={(event) => event.preventDefault()}>
      <div className="touch-cluster move-cluster">
        <button type="button" onPointerDown={() => startAction("left")} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>
          L
        </button>
        <button type="button" onPointerDown={() => startAction("softDrop")} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>
          DN
        </button>
        <button type="button" onPointerDown={() => startAction("right")} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>
          R
        </button>
      </div>
      <div className="touch-cluster action-cluster">
        <button type="button" onPointerDown={() => startAction("rotateCcw")} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>
          CCW
        </button>
        <button type="button" onPointerDown={() => startAction("rotateCw")} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>
          CW
        </button>
        <button type="button" onPointerDown={() => startAction("hold")} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>
          HOLD
        </button>
        <button type="button" onPointerDown={() => startAction("hardDrop")} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>
          DROP
        </button>
        <button type="button" onClick={onPause}>
          P
        </button>
      </div>
    </div>
  );
}
