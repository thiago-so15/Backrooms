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
    sanityDrainLightOn: 0.5,
    sanityDrainLightOff: 1.6,
    sanityDrainEntityNear: 4.5,
    sanityRegenSafe: 1.2,
    entityProximity: 9.5,
    maxStat: 100,
    /**
     * Per-level multipliers so large maps (2+) stay completable.
     * Index matches LevelManager.currentLevel (0 = level 1).
     */
    byLevel: [
      // Level 1 — waterpark (small): keep base challenge
      {
        sanityDrainMult: 1,
        sanityEntityMult: 1,
        sanityRegenMult: 1,
        batteryDrainMult: 1,
      },
      // Level 2 — suburbs (large)
      {
        sanityDrainMult: 0.22,
        sanityEntityMult: 0.18,
        sanityRegenMult: 2.4,
        batteryDrainMult: 0.35,
      },
      // Level 3 — apartments (very large)
      {
        sanityDrainMult: 0.15,
        sanityEntityMult: 0.12,
        sanityRegenMult: 2.8,
        batteryDrainMult: 0.28,
      },
    ],
  },
};
