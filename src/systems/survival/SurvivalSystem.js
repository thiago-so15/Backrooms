import { ENEMY_CONFIG } from '../../config/enemy.config.js';
import { PLAYER_CONFIG } from '../../config/player.config.js';
import { shopManager } from '../economy/ShopManager.js';

export const DETECT_RADIUS = ENEMY_CONFIG.detectRadius;
export const ENTITY_PROXIMITY_RADIUS = PLAYER_CONFIG.survival.entityProximity;

const DEFAULT_LEVEL_MODS = {
  batteryDrainMult: 1,
};

/**
 * Tracks player health and flashlight battery.
 * Health only drops when an entity bites the player.
 */
export class SurvivalSystem {
  constructor() {
    this.maxHealth = PLAYER_CONFIG.survival.maxStat;
    this.maxBattery = PLAYER_CONFIG.survival.maxStat;
    this.health = this.maxHealth;
    this.battery = this.maxBattery;
    this.flashlightOn = true;
    this.levelIndex = 0;
    this.invulnTimer = 0;
    this._shopBatteryDrainMult = 1;
  }

  setLevelIndex(levelIndex) {
    this.levelIndex = Math.max(0, levelIndex | 0);
  }

  _levelMods() {
    const list = PLAYER_CONFIG.survival.byLevel || [];
    return list[this.levelIndex] || list[list.length - 1] || DEFAULT_LEVEL_MODS;
  }

  _applyModifiers() {
    const mods = shopManager.getModifiers();
    this.maxHealth = mods.maxHealth;
    this.maxBattery = mods.maxBattery;
    this._shopBatteryDrainMult = mods.batteryDrainMult;
  }

  reset() {
    this._applyModifiers();
    this.health = this.maxHealth;
    this.battery = this.maxBattery;
    this.flashlightOn = true;
    this.invulnTimer = 0;
  }

  get isInvulnerable() {
    return this.invulnTimer > 0;
  }

  /**
   * Apply bite damage. Returns true if damage was applied.
   */
  takeDamage(amount) {
    if (this.invulnTimer > 0 || this.health <= 0) return false;
    const dmg = Math.max(0, amount);
    if (dmg <= 0) return false;

    this.health = Math.max(0, this.health - dmg);
    this.invulnTimer = PLAYER_CONFIG.survival.hitInvulnSeconds;
    return true;
  }

  update(dt, flashlightOn) {
    this._applyModifiers();
    const cfg = PLAYER_CONFIG.survival;
    const levelMods = this._levelMods();
    this.flashlightOn = flashlightOn;

    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    }

    // Keep current health within new max (e.g. after shop buy mid-run)
    this.health = Math.min(this.health, this.maxHealth);

    const batteryDrain =
      cfg.batteryDrain *
      (this._shopBatteryDrainMult ?? 1) *
      (levelMods.batteryDrainMult ?? 1);

    if (flashlightOn) {
      this.battery = Math.max(0, this.battery - batteryDrain * dt);
      if (this.battery <= 0) {
        this.battery = 0;
        this.flashlightOn = false;
      }
    } else {
      this.battery = Math.min(this.maxBattery, this.battery + cfg.batteryRecharge * dt);
    }

    return {
      health: this.health,
      battery: this.battery,
      maxHealth: this.maxHealth,
      maxBattery: this.maxBattery,
      flashlightOn: this.flashlightOn && this.battery > 0,
      healthDepleted: this.health <= 0,
      batteryDepleted: this.battery <= 0,
      invulnerable: this.invulnTimer > 0,
    };
  }

  getHealthPercent() {
    return (this.health / this.maxHealth) * 100;
  }

  getBatteryPercent() {
    return (this.battery / this.maxBattery) * 100;
  }
}
