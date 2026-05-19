export type SfxName = "move" | "rotate" | "drop" | "lineClear" | "gameOver" | "menu";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const PRESETS: Record<SfxName, { frequency: number; duration: number; type: OscillatorType }> = {
  move: { frequency: 220, duration: 0.035, type: "square" },
  rotate: { frequency: 330, duration: 0.045, type: "square" },
  drop: { frequency: 110, duration: 0.08, type: "sawtooth" },
  lineClear: { frequency: 520, duration: 0.16, type: "square" },
  gameOver: { frequency: 80, duration: 0.32, type: "triangle" },
  menu: { frequency: 440, duration: 0.055, type: "square" },
};

export class RetroSfx {
  private context: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(name: SfxName): void {
    if (!this.enabled || typeof window === "undefined") {
      return;
    }

    const context = this.getContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    const preset = PRESETS[name];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(preset.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, preset.frequency * 0.65), now + preset.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.duration + 0.02);
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const audioWindow = window as AudioWindow;
    const AudioCtor = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    this.context = new AudioCtor();
    return this.context;
  }
}
