import { settingsManager } from '../save/SettingsManager.js';
import { AUDIO_CONFIG } from '../../config/audio.config.js';

/**
 * Web Audio API manager — drone, ambience, SFX.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneGain = null;
    this.masterGain = null;
    this.ambienceNodes = null;
    this.initialized = false;

    this._unsubscribe = settingsManager.subscribe((key) => {
      if (!this.initialized) return;
      if (key === 'masterVolume' || key === null) this._applyMasterVolume();
      if (key === 'ambientVolume' || key === null) this._applyAmbientVolume();
    });
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this._applyMasterVolume();
    this.initialized = true;
  }

  _applyMasterVolume() {
    if (!this.masterGain) return;
    this.masterGain.gain.value = settingsManager.getSetting('masterVolume') / 100;
  }

  _applyAmbientVolume() {
    if (!this.droneGain) return;
    const scale = AUDIO_CONFIG.ambientGainScale;
    this.droneGain.gain.value = (settingsManager.getSetting('ambientVolume') / 100) * scale;
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startDrone() {
    this.init();
    this.resume();
    this.stopDrone();

    const { drone } = AUDIO_CONFIG;
    this.droneGain = this.ctx.createGain();
    this._applyAmbientVolume();
    this.droneGain.connect(this.masterGain);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = drone.type;
    this.droneOsc1.frequency.value = drone.frequency1;
    this.droneOsc1.connect(this.droneGain);

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = drone.type;
    this.droneOsc2.frequency.value = drone.frequency2;
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
    this.droneGain = null;
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

  startAmbience(type) {
    this.init();
    this.resume();
    this.stopAmbience();
    if (!type) return;

    const ambCfg = AUDIO_CONFIG.ambience[type] || AUDIO_CONFIG.ambience.wind;
    const source = this.ctx.createBufferSource();
    source.buffer = this._createNoiseBuffer(AUDIO_CONFIG.ambience.bufferSeconds);
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    filter.type = ambCfg.filterType;
    filter.frequency.value = ambCfg.filterFrequency;
    if (ambCfg.filterQ) filter.Q.value = ambCfg.filterQ;
    gain.gain.value = ambCfg.gain;
    lfo.frequency.value = ambCfg.lfoFrequency;
    lfoGain.gain.value = ambCfg.lfoGain;

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
    const { keyPickup } = AUDIO_CONFIG;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(keyPickup.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(keyPickup.endFreq, now + 0.15);
    gain.gain.setValueAtTime(keyPickup.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + keyPickup.duration);
  }

  playStaticBurst() {
    this.init();
    this.resume();
    const { staticBurst } = AUDIO_CONFIG;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * staticBurst.duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = staticBurst.gain;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  dispose() {
    this.stopDrone();
    this._unsubscribe?.();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
