export class AudioManager {
  constructor() {
    this.ctx = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneGain = null;
    this.masterGain = null;
    this.ambienceNodes = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startDrone() {
    this.init();
    this.resume();
    this.stopDrone();

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.08;
    this.droneGain.connect(this.masterGain);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.value = 55;
    this.droneOsc1.connect(this.droneGain);

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.value = 110.5;
    this.droneOsc2.connect(this.droneGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  stopDrone() {
    if (this.droneOsc1) {
      try { this.droneOsc1.stop(); } catch (_) { /* already stopped */ }
      this.droneOsc1 = null;
    }
    if (this.droneOsc2) {
      try { this.droneOsc2.stop(); } catch (_) { /* already stopped */ }
      this.droneOsc2 = null;
    }
    this.stopAmbience();
  }

  _createNoiseBuffer(seconds = 2) {
    const sampleRate = this.ctx.sampleRate;
    const size = Math.floor(sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, size, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /**
   * Capa de ambiente por nivel:
   *  - 'waves': olas del parque acuático (ruido filtrado grave con oleaje lento)
   *  - 'wind' : viento nocturno del suburbio (ruido en banda media)
   */
  startAmbience(type) {
    this.init();
    this.resume();
    this.stopAmbience();
    if (!type) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this._createNoiseBuffer(3);
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    if (type === 'waves') {
      filter.type = 'lowpass';
      filter.frequency.value = 480;
      gain.gain.value = 0.07;
      lfo.frequency.value = 0.16;
      lfoGain.gain.value = 0.05;
    } else {
      filter.type = 'bandpass';
      filter.frequency.value = 380;
      filter.Q.value = 0.6;
      gain.gain.value = 0.05;
      lfo.frequency.value = 0.09;
      lfoGain.gain.value = 0.035;
    }

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start();
    lfo.start();
    this.ambienceNodes = { source, filter, gain, lfo, lfoGain };
  }

  stopAmbience() {
    if (!this.ambienceNodes) return;
    const { source, lfo } = this.ambienceNodes;
    try { source.stop(); } catch (_) { /* already stopped */ }
    try { lfo.stop(); } catch (_) { /* already stopped */ }
    this.ambienceNodes = null;
  }

  playKeyPickup() {
    this.init();
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playStaticBurst() {
    this.init();
    this.resume();
    const duration = 0.4;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  dispose() {
    this.stopDrone();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
