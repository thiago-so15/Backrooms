import { ENEMY_CONFIG } from '../../config/enemy.config.js';
import { PLAYER_CONFIG } from '../../config/player.config.js';
import { shopManager } from '../economy/ShopManager.js';

export const DETECT_RADIUS = ENEMY_CONFIG.detectRadius;
export const ENTITY_PROXIMITY_RADIUS = PLAYER_CONFIG.survival.entityProximity;

/**
 * Tracks sanity and flashlight battery drain/regen.
 * Max stats scale with shop upgrades.
 */
export class SurvivalSystem {
  constructor() {
    this.maxSanity = PLAYER_CONFIG.survival.maxStat;
    this.maxBattery = PLAYER_CONFIG.survival.maxStat;
    this.sanity = this.maxSanity;
    this.battery = this.maxBattery;
    this.flashlightOn = true;
  }

  _applyModifiers() {
    const mods = shopManager.getModifiers();
    this.maxSanity = mods.maxSanity;
    this.maxBattery = mods.maxBattery;
    this._batteryDrainMult = mods.batteryDrainMult;
  }

  reset() {
    this._applyModifiers();
    this.sanity = this.maxSanity;
    this.battery = this.maxBattery;
    this.flashlightOn = true;
  }

  update(dt, flashlightOn, entityDistance) {
    this._applyModifiers();
    const cfg = PLAYER_CONFIG.survival;
    this.flashlightOn = flashlightOn;

    const drain = cfg.batteryDrain * (this._batteryDrainMult ?? 1);

    if (flashlightOn) {
      this.battery = Math.max(0, this.battery - drain * dt);
      if (this.battery <= 0) {
        this.battery = 0;
        this.flashlightOn = false;
      }
    } else {
      this.battery = Math.min(this.maxBattery, this.battery + cfg.batteryRecharge * dt);
    }

    let sanityDrain = flashlightOn ? cfg.sanityDrainLightOn : cfg.sanityDrainLightOff;

    const entityNear = entityDistance < cfg.entityProximity;
    if (entityNear) {
      const proximity = 1 - entityDistance / cfg.entityProximity;
      sanityDrain += cfg.sanityDrainEntityNear * proximity;
    }

    if (flashlightOn && !entityNear) {
      this.sanity = Math.min(this.maxSanity, this.sanity + cfg.sanityRegenSafe * dt);
    } else {
      this.sanity = Math.max(0, this.sanity - sanityDrain * dt);
    }

    return {
      sanity: this.sanity,
      battery: this.battery,
      maxSanity: this.maxSanity,
      maxBattery: this.maxBattery,
      flashlightOn: this.flashlightOn && this.battery > 0,
      sanityDepleted: this.sanity <= 0,
      batteryDepleted: this.battery <= 0,
    };
  }

  getSanityPercent() {
    return (this.sanity / this.maxSanity) * 100;
  }

  getBatteryPercent() {
    return (this.battery / this.maxBattery) * 100;
  }
}
