export const PLAYER_CONFIG = {
  baseSpeed: 3.4,
  sprintMultiplier: 1.6,
  eyeHeight: 1.65,
  collisionRadius: 0.32,
  headBob: {
    walkSpeed: 7,
    sprintSpeed: 10,
    amplitude: 0.04,
  },
  flashlight: {
    color: 0xfff5d0,
    intensity: 2.5,
    distance: 25,
    angle: Math.PI / 5,
    penumbra: 0.4,
    decay: 1.5,
  },
  survival: {
    batteryDrain: 3.2,
    batteryRecharge: 3.5,
    maxStat: 100,
    /** HP lost each time an entity bites the player. */
    damagePerHit: 25,
    /** Smiler bites harder. */
    smilerDamagePerHit: 30,
    /** Seconds of invulnerability after a hit. */
    hitInvulnSeconds: 1.35,
    entityProximity: 9.5,
    /**
     * Per-level battery multipliers so large maps stay completable.
     * Index matches LevelManager.currentLevel (0 = level 1).
     */
    byLevel: [
      { batteryDrainMult: 1 },
      { batteryDrainMult: 0.35 },
      { batteryDrainMult: 0.28 },
      { batteryDrainMult: 0.24 },
    ],
  },
};
