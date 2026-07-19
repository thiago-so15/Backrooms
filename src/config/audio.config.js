export const AUDIO_CONFIG = {
  masterVolumeDefault: 70,
  ambientVolumeDefault: 60,
  ambientGainScale: 0.15,
  drone: {
    frequency1: 55,
    frequency2: 110.5,
    type: 'sine',
  },
  ambience: {
    waves: {
      filterType: 'lowpass',
      filterFrequency: 480,
      gain: 0.07,
      lfoFrequency: 0.16,
      lfoGain: 0.05,
    },
    wind: {
      filterType: 'bandpass',
      filterFrequency: 380,
      filterQ: 0.6,
      gain: 0.05,
      lfoFrequency: 0.09,
      lfoGain: 0.035,
    },
    // Zumbido de fluorescentes / HVAC de pasillos de apartamento
    hum: {
      filterType: 'bandpass',
      filterFrequency: 220,
      filterQ: 1.2,
      gain: 0.045,
      lfoFrequency: 0.22,
      lfoGain: 0.02,
    },
    // Vapor / metal / agua tóxica de Pipe Dreams
    pipes: {
      filterType: 'bandpass',
      filterFrequency: 140,
      filterQ: 0.9,
      gain: 0.06,
      lfoFrequency: 0.05,
      lfoGain: 0.045,
    },
    bufferSeconds: 3,
  },
  keyPickup: {
    startFreq: 440,
    endFreq: 880,
    gain: 0.15,
    duration: 0.35,
  },
  staticBurst: {
    duration: 0.4,
    gain: 0.5,
  },
};
