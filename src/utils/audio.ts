/**
 * Web Audio API synthesizer for sound effects and fiesta background vibes.
 * 100% offline, zero network requests, ultra-reliable in any browser.
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private musicInterval: number | null = null;
  private isMusicPlaying = false;
  private isMuted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isMusicPlaying) {
      this.stopFiestaMusic();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Sound: Kronkorken Zischen & Plopp (Bottle open)
   */
  public playBeerOpen() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Noise burst for carbonation hiss
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // 2. Resonant glass bottle pop & metallic "clink"
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);

    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // High metal harmonic clink
    const clink = ctx.createOscillator();
    const clinkGain = ctx.createGain();
    clink.type = 'triangle';
    clink.frequency.setValueAtTime(2200, now);
    clinkGain.gain.setValueAtTime(0.15, now);
    clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    clink.connect(clinkGain);
    clinkGain.connect(ctx.destination);
    clink.start(now);
    clink.stop(now + 0.2);
  }

  /**
   * Sound: Countdown tick
   */
  public playCountdownTick(isFinal = false) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isFinal ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, now);

    gain.gain.setValueAtTime(isFinal ? 0.35 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Sound: Drumroll / Suspense before reveal
   */
  public playSuspense() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc.stop(ctx.currentTime + 1.5);
  }

  /**
   * Sound: Tada fanfare chord
   */
  public playTada() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      osc.stop(ctx.currentTime + 1.5);
    });
  }

  /**
   * Sound: Alarm / Siren for brandmeister / minigame pause
   */
  public playSiren() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      osc.frequency.setValueAtTime(600, t + i * 0.4);
      osc.frequency.setValueAtTime(800, t + i * 0.4 + 0.2);
    }
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 2.4);
    osc.start(t);
    osc.stop(t + 2.5);
  }

  /**
   * Sound: Correct guess victory fanfare
   */
  public playVictoryFanfare() {
    this.playTada();
  }

  /**
   * Sound: Buzzer / Wrong guess
   */
  public playBuzzer() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Sound: Ambient Mediterranean Spanish Guitar / Chill Fiesta Loop
   */
  public toggleFiestaMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopFiestaMusic();
      return false;
    } else {
      this.startFiestaMusic();
      return true;
    }
  }

  public getIsMusicPlaying(): boolean {
    return this.isMusicPlaying;
  }

  public startFiestaMusic() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.stopFiestaMusic();
    this.isMusicPlaying = true;

    // Spanish Phrygian / Flamenco style warm acoustic arpeggio chords
    // Chords: E major -> F major -> G major -> F major
    const chordProgressions = [
      [164.81, 246.94, 329.63, 415.30], // E maj (E3, B3, E4, G#4)
      [174.61, 261.63, 349.23, 440.00], // F maj (F3, C4, F4, A4)
      [196.00, 293.66, 392.00, 493.88], // G maj (G3, D4, G4, B4)
      [174.61, 261.63, 349.23, 440.00]  // F maj
    ];

    let step = 0;
    const bpm = 110;
    const stepDuration = 60 / bpm / 2; // 16th-ish notes

    const playStep = () => {
      if (!this.isMusicPlaying || this.isMuted) return;
      const currentCtx = this.getContext();
      if (!currentCtx) return;

      const chordIdx = Math.floor(step / 8) % chordProgressions.length;
      const chord = chordProgressions[chordIdx];
      const noteIdx = step % 4;
      const freq = chord[noteIdx];

      const now = currentCtx.currentTime;
      const osc = currentCtx.createOscillator();
      const gain = currentCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(currentCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      // Light shaker sound on alternating beats
      if (step % 2 === 1) {
        const bufferSize = currentCtx.sampleRate * 0.04;
        const buffer = currentCtx.createBuffer(1, bufferSize, currentCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (currentCtx.sampleRate * 0.015));
        }
        const shaker = currentCtx.createBufferSource();
        shaker.buffer = buffer;
        const shakerFilter = currentCtx.createBiquadFilter();
        shakerFilter.type = 'highpass';
        shakerFilter.frequency.setValueAtTime(6000, now);
        const shakerGain = currentCtx.createGain();
        shakerGain.gain.setValueAtTime(0.02, now);
        shaker.connect(shakerFilter);
        shakerFilter.connect(shakerGain);
        shakerGain.connect(currentCtx.destination);
        shaker.start(now);
      }

      step++;
    };

    playStep();
    this.musicInterval = window.setInterval(playStep, stepDuration * 1000);
  }

  public stopFiestaMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }
}

export const soundController = new SoundController();
