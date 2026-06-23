// Procedural Soundscapes for Chinese Shanshui Painting using Web Audio API

class ShanshuiSynth {
  private ctx: AudioContext | null = null;
  private windVolumeNode: GainNode | null = null;
  private windFilterNode: BiquadFilterNode | null = null;
  private ambientVolumeNode: GainNode | null = null;
  private pentatonicScale: number[] = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // 宫 C, 商 D, 角 E, 徵 G, 羽 A across octaves
  private scaleIndex = 0;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initCtx() {
    if (this.ctx) return;
    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Low-pass filter for general warmth
      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      mainGain.connect(this.ctx.destination);

      // --- WIND SYNTHESIS ---
      // Generate wind using custom noise buffer filtered with dynamic sweeps
      const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds of noise
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const windNoise = this.ctx.createBufferSource();
      windNoise.buffer = noiseBuffer;
      windNoise.loop = true;

      this.windFilterNode = this.ctx.createBiquadFilter();
      this.windFilterNode.type = "bandpass";
      this.windFilterNode.frequency.setValueAtTime(300, this.ctx.currentTime);
      this.windFilterNode.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.windVolumeNode = this.ctx.createGain();
      this.windVolumeNode.gain.setValueAtTime(0.01, this.ctx.currentTime);

      windNoise.connect(this.windFilterNode);
      this.windFilterNode.connect(this.windVolumeNode);
      this.windVolumeNode.connect(mainGain);
      windNoise.start(0);

      // --- RIVER / WATER SYNTHESIS ---
      const waterBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const waterOut = waterBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        waterOut[i] = Math.random() * 2 - 1;
      }
      const waterNoise = this.ctx.createBufferSource();
      waterNoise.buffer = waterBuffer;
      waterNoise.loop = true;

      const waterFilter = this.ctx.createBiquadFilter();
      waterFilter.type = "bandpass";
      waterFilter.frequency.setValueAtTime(150, this.ctx.currentTime);
      waterFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.ambientVolumeNode = this.ctx.createGain();
      this.ambientVolumeNode.gain.setValueAtTime(0.02, this.ctx.currentTime);

      waterNoise.connect(waterFilter);
      waterFilter.connect(this.ambientVolumeNode);
      this.ambientVolumeNode.connect(mainGain);
      waterNoise.start(0);

      // Start automatic dynamic modulation of wind
      this.modulateWindLoop();
    } catch (e) {
      console.error("Web Audio API not supported or dynamic context initiation failed", e);
    }
  }

  private modulateWindLoop() {
    if (!this.ctx || !this.windFilterNode || !this.windVolumeNode) return;
    const now = this.ctx.currentTime;
    
    // Create soft wind fluctuations
    const targetFreq = 200 + Math.random() * 350;
    const targetGain = 0.005 + Math.random() * 0.025;
    
    this.windFilterNode.frequency.exponentialRampToValueAtTime(targetFreq, now + 3);
    this.windVolumeNode.gain.linearRampToValueAtTime(targetGain, now + 3);

    setTimeout(() => this.modulateWindLoop(), 3000);
  }

  /**
   * Set dynamic wind level based on environment windSpeed constant
   */
  public setWindSpeed(speed: number) {
    this.initCtx();
    if (!this.ctx || !this.windVolumeNode || !this.windFilterNode) return;
    const now = this.ctx.currentTime;
    // Map speed (0 to 1) to volume and bandpass frequencies
    const baseVolume = 0.002 + speed * 0.045;
    const baseFreq = 180 + speed * 400;
    
    this.windVolumeNode.gain.linearRampToValueAtTime(baseVolume, now + 0.3);
    this.windFilterNode.frequency.linearRampToValueAtTime(baseFreq, now + 0.5);
  }

  /**
   * Play Guzheng / Guqin dynamic pluck chord using pentatonic scales on user action
   */
  public playPluck(frequencyOverride?: number) {
    this.initCtx();
    if (!this.ctx) return;
    
    // Resume audio context if suspended by browser security policy
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    // Pluck note frequency selection
    let freq = frequencyOverride;
    if (!freq) {
      freq = this.pentatonicScale[this.scaleIndex];
      this.scaleIndex = (this.scaleIndex + Math.ceil(Math.random() * 3)) % this.pentatonicScale.length;
    }

    // 1. Core Plucked string (Warm Triangle oscillator)
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    // Warmth: Add a subtle detuned second oscillator for Guqin string buzz/reverberation
    const subOsc = this.ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(freq * 0.5, now); // Octave below

    // Low-pass Filter for specific string sound damping
    const pluckFilter = this.ctx.createBiquadFilter();
    pluckFilter.type = "lowpass";
    pluckFilter.frequency.setValueAtTime(freq * 3, now);
    pluckFilter.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 1.2);

    // Envelope Generator
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    // Instant attack for pluck sound
    gainNode.gain.linearRampToValueAtTime(0.28, now + 0.008);
    // Classical long decay & release
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    // Dynamic Vibrato (Guqin sliding tone effect)
    const vibrato = this.ctx.createOscillator();
    vibrato.frequency.setValueAtTime(4.5, now); // 4.5Hz vibration
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.setValueAtTime(2.0, now); // +/- 2Hz slide

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(now);

    // Hook up nodes
    osc.connect(pluckFilter);
    subOsc.connect(pluckFilter);
    pluckFilter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // Start & Stop triggers to release resources
    osc.start(now);
    subOsc.start(now);

    osc.stop(now + 2.6);
    subOsc.stop(now + 2.6);
    vibrato.stop(now + 2.6);
  }

  /**
   * Water Ripple splash audio trigger
   */
  public playWaterSplash() {
    this.initCtx();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    // Slide range for organic water droplet sound
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }
}

export const shanshuiSynth = new ShanshuiSynth();
export default shanshuiSynth;
