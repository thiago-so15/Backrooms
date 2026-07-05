import { ENEMY_CONFIG } from '../../config/enemy.config.js';
import { PLAYER_CONFIG } from '../../config/player.config.js';

export const DETECT_RADIUS = ENEMY_CONFIG.detectRadius;
export const ENTITY_PROXIMITY_RADIUS = PLAYER_CONFIG.survival.entityProximity;

/**
 * Tracks sanity and flashlight battery drain/regen.
 */
export class SurvivalSystem {
  constructor() {
    const { maxStat } = PLAYER_CONFIG.survival;
    this.sanity = maxStat;
    this.battery = maxStat;
    this.flashlightOn = true;
  }

  reset() {
    const { maxStat } = PLAYER_CONFIG.survival;
    this.sanity = maxStat;
    this.battery = maxStat;
    this.flashlightOn = true;
  }

  update(dt, flashlightOn, entityDistance) {
    const cfg = PLAYER_CONFIG.survival;
    this.flashlightOn = flashlightOn;

    if (flashlightOn) {
      this.battery = Math.max(0, this.battery - cfg.batteryDrain * dt);
      if (this.battery <= 0) {
        this.battery = 0;
        this.flashlightOn = false;
      }
    } else {
      this.battery = Math.min(cfg.maxStat, this.battery + cfg.batteryRecharge * dt);
    }

    let sanityDrain = flashlightOn ? cfg.sanityDrainLightOn : cfg.sanityDrainLightOff;

    const entityNear = entityDistance < cfg.entityProximity;
    if (entityNear) {
      const proximity = 1 - entityDistance / cfg.entityProximity;
      sanityDrain += cfg.sanityDrainEntityNear * proximity;
    }

    if (flashlightOn && !entityNear) {
      this.sanity = Math.min(cfg.maxStat, this.sanity + cfg.sanityRegenSafe * dt);
    } else {
      this.sanity = Math.max(0, this.sanity - sanityDrain * dt);
    }

    return {
      sanity: this.sanity,
      battery: this.battery,
      flashlightOn: this.flashlightOn && this.battery > 0,
      sanityDepleted: this.sanity <= 0,
      batteryDepleted: this.battery <= 0,
    };
  }

  getSanityPercent() {
    return this.sanity;
  }

  getBatteryPercent() {
    return this.battery;
  }
}
