export const GAME_CONFIG = {
  maxDeltaTime: 0.05,
  pickup: {
    minSpawnDistanceCells: 3,
    fallbackMinDistanceCells: 2,
    collectRadius: 1.0,
    keyHeight: 1.2,
    floatAmplitude: 0.1,
  },
  maze: {
    loopRemovalChance: 0.08,
  },
  levelCompleteMessages: {
    suffix: 'completado. El pasillo siguiente te espera.',
  },
  gameOverMessages: {
    caught: 'Te atrapó. El lugar te reclamó.',
    health: 'Te comieron vivo.',
  },
};
