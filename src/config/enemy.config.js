export const ENEMY_CONFIG = {
  speedsByLevel: [0, 1.9, 2.05, 2.35],
  fallbackSpeed: 2.4,
  chaseMultiplier: 1.1,
  detectRadius: 7.5,
  catchRadius: 0.85,
  chaseProbability: 0.65,
  minActiveLevel: 2,
  /** Keep hostiles away from the player spawn cell. */
  minPlayerDistCells: 5,
};

/** Second hostile: Smiler — stalks, blinks closer, lunges when near. */
export const SMILER_CONFIG = {
  speedsByLevel: [0, 0, 1.55, 1.7],
  fallbackSpeed: 1.7,
  chaseMultiplier: 2.15,
  detectRadius: 10,
  catchRadius: 0.95,
  chaseProbability: 0.9,
  blinkCooldown: 7.5,
  blinkMinDist: 4,
  blinkMaxDist: 11,
  minActiveLevel: 2,
};
