import { CONTROLS_CONFIG } from './controls.config.js';

export const GRAPHICS_CONFIG = {
  pixelRatio: {
    high: 2,
    medium: 1.5,
    low: 1,
  },
  qualityOrder: ['high', 'medium', 'low'],
  fogLowQualityMultiplier: 0.45,
  defaultBackground: 0x050400,
  defaultFogColor: 0x8a8450,
  defaultFogDensity: 0.05,
  camera: {
    fov: 75,
    near: 0.1,
    far: 80,
  },
  renderer: {
    antialias: true,
    shadowMapType: 'PCFSoft',
  },
  ambient: {
    color: 0xc9c17a,
    intensity: 0.35,
  },
  maze: {
    cellSize: 4,
    wallHeight: 3,
    wallThickness: 0.18,
  },
  lightCulling: {
    mediumModulo: 2,
    lowModulo: 3,
  },
  defaultGraphicsQuality: null,
};

export const SETTINGS_DEFAULTS = {
  masterVolume: 70,
  ambientVolume: 60,
  mouseSensitivity: CONTROLS_CONFIG.sensitivityDefault,
  invertY: false,
  graphicsQuality: null,
  reduceMotion: null,
  reduceLightFlicker: false,
};
