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
   * Sound: Spanische Stierkampf-Fanfare (Pasodoble / Torero)
   * The iconic España Cañí / Torero brass fanfare motif with Spanish vibrato!
   */
  public playPasodobleFanfare() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Spanish pasodoble trumpet notes:
    // G4 -> C5 -> D5 -> Eb5 -> D5 -> C5 -> B4 -> C5 -> Final triumphant chord!
    const notes: [number, number, number][] = [
      [392.00, 0.00, 0.14],  // G4
      [523.25, 0.15, 0.14],  // C5
      [587.33, 0.30, 0.14],  // D5
      [622.25, 0.45, 0.22],  // Eb5
      [587.33, 0.68, 0.12],  // D5
      [523.25, 0.81, 0.14],  // C5
      [493.88, 0.96, 0.14],  // B4
      [523.25, 1.11, 0.45],  // C5 (held)
    ];

    notes.forEach(([freq, startTime, duration]) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Brass-like harmonic timbre (sawtooth + triangle combination with bandpass)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + startTime);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now + startTime); // octave overtone

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now + startTime);
      filter.frequency.linearRampToValueAtTime(1200, now + startTime + duration);

      gain.gain.setValueAtTime(0.001, now + startTime);
      gain.gain.linearRampToValueAtTime(0.28, now + startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startTime);
      osc2.start(now + startTime);
      osc.stop(now + startTime + duration + 0.05);
      osc2.stop(now + startTime + duration + 0.05);
    });

    // Dramatic Spanish final brass chord at t = 1.6s
    const finalChord = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major brass explosion
    finalChord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + 1.6);

      gain.gain.setValueAtTime(0.001, now + 1.6);
      gain.gain.linearRampToValueAtTime(0.18, now + 1.63);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 1.6);
      osc.stop(now + 2.7);
    });
  }

  /**
   * Sound: Lautes Gläserklirren (Prost / Anstoßen / Cheers)
   * High resonant chime of crystal beer/wine glasses knocking together
   */
  public playGlassesCheers() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Two distinct glass impacts: primary clink, and subtle second rebound clink
    const clinks = [
      { delay: 0.00, primaryFreq: 2480, secondaryFreq: 3340, volume: 0.4 },
      { delay: 0.08, primaryFreq: 2750, secondaryFreq: 3620, volume: 0.28 },
      { delay: 0.22, primaryFreq: 2480, secondaryFreq: 3340, volume: 0.15 }
    ];

    clinks.forEach(({ delay, primaryFreq, secondaryFreq, volume }) => {
      const t = now + delay;

      // Primary glass resonance
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(primaryFreq, t);

      gain1.gain.setValueAtTime(volume, t);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 1.5);

      // Higher glass overtone shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(secondaryFreq, t);

      gain2.gain.setValueAtTime(volume * 0.5, t);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t);
      osc2.stop(t + 1.0);
    });
  }

  /**
   * Sound: Traurige Posaune (Sad Trombone: Wah-wah-wah-waaaah)
   * Classic fail sound for 0 points or wrong guesses
   */
  public playSadTrombone() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Classic 4 notes descending with wah-wah pitch bend:
    // 1. Eb4 (~311 Hz)
    // 2. D4 (~293 Hz)
    // 3. Db4 (~277 Hz)
    // 4. C4 sliding down to B3 (~261 Hz -> ~233 Hz) with vibrato
    const tromboneNotes: [number, number, number][] = [
      [311.13, 0.00, 0.32],
      [293.66, 0.35, 0.32],
      [277.18, 0.70, 0.35],
      [261.63, 1.10, 0.95] // long slide down
    ];

    tromboneNotes.forEach(([freq, startTime, duration], idx) => {
      const t = now + startTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';

      if (idx === 3) {
        // Last note slides down with sad vibrato
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.linearRampToValueAtTime(233.08, t + duration * 0.8);
      } else {
        osc.frequency.setValueAtTime(freq * 0.98, t);
        osc.frequency.linearRampToValueAtTime(freq, t + 0.06);
      }

      // Wah-wah mute effect: filter opens and closes
      filter.type = 'bandpass';
      filter.Q.value = 4.5;
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.linearRampToValueAtTime(1100, t + duration * 0.35);
      filter.frequency.linearRampToValueAtTime(400, t + duration);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    });
  }

  /**
   * Sound & Speech: Euphorisches „¡SALUD, COJONES!“
   * Speaks the Spanish party shout with passion, combined with celebratory brass chords & glasses clink!
   */
  public playSaludCojones() {
    if (this.isMuted) return;

    // 1. Play brass celebration chord and glasses cheers
    this.playGlassesCheers();
    const ctx = this.getContext();
    if (ctx) {
      const now = ctx.currentTime;
      [392.00, 493.88, 587.33, 783.99].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.25);
      });
    }

    // 2. Web Speech API for voice shout
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop any pending speech
        const utterance = new SpeechSynthesisUtterance('¡Salud, cojones!');
        utterance.rate = 1.05;
        utterance.pitch = 1.15;
        utterance.volume = 1.0;

        // Try finding Spanish voice
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
        if (spanishVoice) {
          utterance.voice = spanishVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Fallback already played audio chords
      }
    }
  }

  /**
   * Sound: Reggaeton / Party Air Horn (Bap-bap-baaaaap!)
   */
  public playAirHorn() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const blasts = [
      { start: 0.00, dur: 0.14 },
      { start: 0.16, dur: 0.14 },
      { start: 0.32, dur: 0.45 }
    ];

    blasts.forEach(({ start, dur }) => {
      const t = now + start;
      [466.16, 554.37, 932.33].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      });
    });
  }

  /**
   * Sound: Quick pop for emoji reaction buzzers
   */
  public playReactionPop() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
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

  /**
   * Sound: Water Splash & Refreshing Glug Glug (El Hidratador)
   */
  public playWaterSplash() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Water splash noise
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // 2. Glug glug water drops (3 descending/ascending bubbly tones)
    const dropFreqs = [520, 420, 620];
    dropFreqs.forEach((freq, idx) => {
      const dropTime = now + 0.12 + idx * 0.09;
      const osc = ctx.createOscillator();
      const dropGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, dropTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, dropTime + 0.08);

      dropGain.gain.setValueAtTime(0.18, dropTime);
      dropGain.gain.exponentialRampToValueAtTime(0.001, dropTime + 0.08);

      osc.connect(dropGain);
      dropGain.connect(ctx.destination);
      osc.start(dropTime);
      osc.stop(dropTime + 0.09);
    });
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
