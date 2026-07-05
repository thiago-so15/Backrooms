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
  },
};
