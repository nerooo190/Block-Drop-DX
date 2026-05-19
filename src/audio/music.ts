type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

interface Step {
  note: number | null;
  bass: number | null;
  beats: number;
}

const BPM = 148;
const BEAT = 60 / BPM;

// Original BLOCK DROP DX loop. It is a fresh chiptune pattern and does not copy
// the well-known falling-block puzzle melody or any protected arrangement.
const LOOP: Step[] = [
  { note: 523.25, bass: 130.81, beats: 0.5 },
  { note: 622.25, bass: null, beats: 0.5 },
  { note: 783.99, bass: 130.81, beats: 0.5 },
  { note: 698.46, bass: null, beats: 0.5 },
  { note: 587.33, bass: 146.83, beats: 0.5 },
  { note: 698.46, bass: null, beats: 0.5 },
  { note: 880.0, bass: 146.83, beats: 0.5 },
  { note: 783.99, bass: null, beats: 0.5 },
  { note: 523.25, bass: 174.61, beats: 0.5 },
  { note: 466.16, bass: null, beats: 0.5 },
  { note: 392.0, bass: 174.61, beats: 0.5 },
  { note: 466.16, bass: null, beats: 0.5 },
  { note: 554.37, bass: 196.0, beats: 0.5 },
  { note: 659.25, bass: null, beats: 0.5 },
  { note: 783.99, bass: 196.0, beats: 0.5 },
  { note: null, bass: null, beats: 0.5 },
  { note: 698.46, bass: 146.83, beats: 0.5 },
  { note: 880.0, bass: null, beats: 0.5 },
  { note: 932.33, bass: 146.83, beats: 0.5 },
  { note: 783.99, bass: null, beats: 0.5 },
  { note: 622.25, bass: 130.81, beats: 0.5 },
  { note: 523.25, bass: null, beats: 0.5 },
  { note: 466.16, bass: 130.81, beats: 0.5 },
  { note: 523.25, bass: null, beats: 0.5 },
  { note: 587.33, bass: 116.54, beats: 0.5 },
  { note: 698.46, bass: null, beats: 0.5 },
  { note: 783.99, bass: 116.54, beats: 0.5 },
  { note: 1046.5, bass: null, beats: 0.5 },
  { note: 932.33, bass: 130.81, beats: 0.5 },
  { note: 783.99, bass: null, beats: 0.5 },
  { note: 698.46, bass: 130.81, beats: 0.5 },
  { note: null, bass: null, beats: 0.5 },
];

export class RetroMusic {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private stepIndex = 0;
  private nextTime = 0;
  private enabled = false;
  private playing = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled) {
      this.stop();
    }
  }

  start(): void {
    if (!this.enabled || this.playing || typeof window === "undefined") {
      return;
    }

    const context = this.getContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    this.playing = true;
    this.nextTime = context.currentTime + 0.05;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 90);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }

    this.playing = false;
    if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.04);
    }
  }

  pulse(): void {
    if (this.enabled && !this.playing) {
      this.start();
    }
  }

  private schedule(): void {
    const context = this.context;
    if (!context || !this.master || !this.playing) {
      return;
    }

    const now = context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.042, now, 0.08);

    while (this.nextTime < now + 0.32) {
      const step = LOOP[this.stepIndex];
      const duration = step.beats * BEAT;

      if (step.note) {
        this.playTone(step.note, this.nextTime, duration * 0.82, "square", 0.045);
        this.playTone(step.note * 2, this.nextTime + duration * 0.5, duration * 0.28, "square", 0.012);
      }

      if (step.bass) {
        this.playTone(step.bass, this.nextTime, duration * 0.92, "triangle", 0.06);
      }

      this.nextTime += duration;
      this.stepIndex = (this.stepIndex + 1) % LOOP.length;
    }
  }

  private playTone(
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    if (!this.context || !this.master) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const end = start + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.setValueAtTime(frequency * 0.997, end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.setValueAtTime(volume * 0.68, Math.max(start + 0.011, end - 0.035));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
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
    this.master = this.context.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(this.context.destination);
    return this.context;
  }
}
