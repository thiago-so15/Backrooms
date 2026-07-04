import { MazeGenerator } from '../maze/MazeGenerator.js';
import { CELL_SIZE } from '../maze/MazeBuilder.js';

/**
 * Cada nivel define, además de tamaño/llaves/entidad, un "theme" que controla
 * texturas, niebla, luces, props y salida para reproducir un nivel concreto de
 * The Backrooms.
 */
export const THEMES = {
  // Level 119 - "Average Waterpark": parque acuático abandonado, toboganes
  // infinitos de colores, tinte turquesa, azulejos, baldosas y sonido de olas.
  waterpark: {
    key: 'waterpark',
    background: 0x0b1f22,
    fog: { color: 0x1f5f63, density: 0.05 },
    ambient: { color: 0x9fe0e0, intensity: 0.55 },
    lights: {
      style: 'ceiling',
      color: 0x7fe6e6,
      intensity: 0.75,
      distanceMul: 3.6,
      spacingMul: 2,
      height: 2.85,
      flickerChance: 0.006,
    },
    ceiling: { enabled: true, type: 'tile', base: '#bcd8d6', grout: '#6fa6a6', tint: '#bfe8e4' },
    wall: {
      type: 'tile',
      base: '#dfe9e8',
      grout: '#5f8f8f',
      tint: '#bfe8e4',
      repeat: [2, 1],
      renderHeight: 3,
    },
    floor: { type: 'checker', a: '#20242b', b: '#e4e4dc', repeat: 'grid' },
    exit: { style: 'slide', locked: 0xb23a3a, unlocked: 0x3ad07a, glow: 0x8fffcf },
    props: 'slides',
    ambience: 'waves',
  },

  // Level 9 - "The Suburbs": suburbio infinito, niebla densa, noche perpetua,
  // calles de asfalto, faroles y casas residenciales. Zona peligrosa.
  suburbs: {
    key: 'suburbs',
    background: 0x05070d,
    fog: { color: 0x0a1018, density: 0.07 },
    ambient: { color: 0x2a3550, intensity: 0.26 },
    lights: {
      style: 'streetlamp',
      color: 0xffb257,
      intensity: 1.0,
      distanceMul: 3.2,
      spacingMul: 2,
      height: 4.2,
      flickerChance: 0.022,
    },
    ceiling: { enabled: false },
    wall: {
      type: 'facade',
      base: '#6c6552',
      grout: '#2a2620',
      tint: '#39415a',
      repeat: [1, 1],
      renderHeight: 3.6,
    },
    floor: { type: 'asphalt', base: '#15161a', repeat: 'grid' },
    exit: { style: 'door', locked: 0xb23a3a, unlocked: 0x3ad07a, glow: 0x8fffcf },
    props: 'suburb',
    ambience: 'wind',
  },
};

export const LEVELS = [
  {
    id: 1,
    name: 'NIVEL 119',
    subtitle: 'Average Waterpark',
    description:
      'Hiciste no-clip a través de una pared y caíste en un parque acuático abandonado. Cientos de toboganes se retuercen hacia el infinito. Se escucha el eco de olas que no existen. Encontrá el tobogán amarillo: la salida está cerca.',
    mazeSize: 5,
    keyCount: 2,
    entityEnabled: false,
    theme: THEMES.waterpark,
  },
  {
    id: 2,
    name: 'NIVEL 9',
    subtitle: 'The Suburbs',
    description:
      'Un tobogán amarillo te escupió a un suburbio interminable, atrapado en una noche perpetua. Niebla espesa, asfalto húmedo, faroles que titilan. Las casas se repiten iguales. Algo camina entre ellas, siempre a la misma distancia. No te salgas de la luz.',
    mazeSize: 10,
    keyCount: 4,
    entityEnabled: true,
    entityStartCell: { x: 0, y: 0 },
    theme: THEMES.suburbs,
  },
];

export class LevelManager {
  constructor() {
    this.currentLevel = 0;
    this.mazeData = null;
    this.seed = 0;
  }

  getLevelConfig(index = this.currentLevel) {
    return LEVELS[index] || LEVELS[LEVELS.length - 1];
  }

  get currentLevelIndex() {
    return this.currentLevel;
  }

  get isLastLevel() {
    return this.currentLevel >= LEVELS.length - 1;
  }

  get totalLevels() {
    return LEVELS.length;
  }

  generateLevel(levelIndex = this.currentLevel) {
    this.currentLevel = levelIndex;
    const config = this.getLevelConfig();
    this.seed = (Date.now() ^ (Math.random() * 0xffffffff)) | 0;
    const gen = new MazeGenerator(config.mazeSize, config.mazeSize, this.seed);
    this.mazeData = gen.generate();
    return {
      config,
      mazeData: this.mazeData,
      seed: this.seed,
    };
  }

  getPlayerStart() {
    const pos = MazeGenerator.cellToWorld(0, 0, CELL_SIZE);
    return { x: pos.x, z: pos.z };
  }

  getEntityStart(config) {
    if (!config.entityEnabled) return null;
    const ec = config.entityStartCell || { x: 0, y: 0 };
    const size = config.mazeSize;
    return {
      x: size - 1 - ec.x,
      y: size - 1 - ec.y,
    };
  }

  advanceLevel() {
    if (this.isLastLevel) return null;
    this.currentLevel++;
    return this.generateLevel(this.currentLevel);
  }

  reset() {
    this.currentLevel = 0;
    this.mazeData = null;
    this.seed = 0;
  }
}
