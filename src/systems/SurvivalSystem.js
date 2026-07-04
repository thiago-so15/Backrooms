import { DETECT_RADIUS } from '../entities/Entity.js';

const BATTERY_DRAIN = 3.2;
const BATTERY_RECHARGE = 3.5;
const SANITY_DRAIN_LIGHT_ON = 0.5;
const SANITY_DRAIN_LIGHT_OFF = 1.6;
const SANITY_DRAIN_ENTITY_NEAR = 4.5;
const SANITY_REGEN_SAFE = 1.2;
const ENTITY_PROXIMITY = 9.5;

export class SurvivalSystem {
  constructor() {
    this.sanity = 100;
    this.battery = 100;
    this.flashlightOn = true;
  }

  reset() {
    this.sanity = 100;
    this.battery = 100;
    this.flashlightOn = true;
  }

  update(dt, flashlightOn, entityDistance) {
    this.flashlightOn = flashlightOn;

    if (flashlightOn) {
      this.battery = Math.max(0, this.battery - BATTERY_DRAIN * dt);
      if (this.battery <= 0) {
        this.battery = 0;
        this.flashlightOn = false;
      }
    } else {
      this.battery = Math.min(100, this.battery + BATTERY_RECHARGE * dt);
    }

    let sanityDrain = flashlightOn ? SANITY_DRAIN_LIGHT_ON : SANITY_DRAIN_LIGHT_OFF;

    const entityNear = entityDistance < ENTITY_PROXIMITY;
    if (entityNear) {
      const proximity = 1 - entityDistance / ENTITY_PROXIMITY;
      sanityDrain += SANITY_DRAIN_ENTITY_NEAR * proximity;
    }

    if (flashlightOn && !entityNear) {
      this.sanity = Math.min(100, this.sanity + SANITY_REGEN_SAFE * dt);
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

export { DETECT_RADIUS as ENTITY_PROXIMITY_RADIUS };
