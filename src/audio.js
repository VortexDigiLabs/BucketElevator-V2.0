/**
 * Procedural Web Audio Engine
 * Pure synthesized UI sound effects:
 * - Crisp tactile clicks on button taps
 * - Harmonic musical chime on component selection
 * - Smooth frequency-sweep chime on mode toggles
 * NOTE: Strictly ZERO motor drone / continuous humming oscillators per Handover Register Sec 4.C.
 */

class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playClick() {
    if (this.isMuted) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.045);
    } catch (_) {}
  }

  playSelect() {
    if (this.isMuted) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      // Two-tone harmonic chime
      const now = this.ctx.currentTime;
      [
        { freq: 587.33, start: 0.0, dur: 0.18 }, // D5
        { freq: 880.00, start: 0.05, dur: 0.22 } // A5
      ].forEach(tone => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(tone.freq, now + tone.start);

        gain.gain.setValueAtTime(0.09, now + tone.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + tone.start + tone.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + tone.start);
        osc.stop(now + tone.start + tone.dur + 0.02);
      });
    } catch (_) {}
  }

  playSweep() {
    if (this.isMuted) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    } catch (_) {}
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const audio = new ProceduralAudioEngine();
