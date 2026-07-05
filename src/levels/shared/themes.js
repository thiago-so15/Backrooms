/**
 * Level visual themes — textures, fog, lights, props per Backrooms level.
 */
export const THEMES = {
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
