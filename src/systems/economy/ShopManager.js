import { SHOP_ITEMS } from '../../config/shop.config.js';
import { PLAYER_CONFIG } from '../../config/player.config.js';
import { STORAGE_KEYS } from '../../constants/storageKeys.js';
import { storageService } from '../../services/storage/StorageService.js';
import { eventBus } from '../events/EventBus.js';
import { GAME_EVENTS } from '../../constants/events.js';
import { currencyManager } from './CurrencyManager.js';

/**
 * Owned upgrades and purchase logic.
 */
class ShopManager {
  constructor() {
    this._owned = this._loadOwned();
    this._listeners = new Set();
  }

  _loadOwned() {
    const data = storageService.load(STORAGE_KEYS.ECONOMY, null);
    if (data && Array.isArray(data.upgrades)) {
      return [...data.upgrades];
    }
    return [];
  }

  _persist() {
    storageService.save(STORAGE_KEYS.ECONOMY, {
      coins: currencyManager.getBalance(),
      upgrades: this._owned,
    });
  }

  getOwned() {
    return [...this._owned];
  }

  owns(itemId) {
    return this._owned.includes(itemId);
  }

  getItem(itemId) {
    return SHOP_ITEMS.find((i) => i.id === itemId) ?? null;
  }

  getAllItems() {
    return SHOP_ITEMS;
  }

  canPurchase(itemId) {
    const item = this.getItem(itemId);
    if (!item || this.owns(itemId)) return false;
    if (item.requires && !this.owns(item.requires)) return false;
    return currencyManager.getBalance() >= item.price;
  }

  purchase(itemId) {
    const item = this.getItem(itemId);
    if (!item || !this.canPurchase(itemId)) return false;

    if (!currencyManager.spendCoins(item.price)) return false;

    this._owned.push(itemId);
    this._persist();
    this._notify();
    eventBus.emit(GAME_EVENTS.SHOP_PURCHASE, { itemId, item });
    return true;
  }

  /** Wipe owned upgrades for a fresh account. */
  reset() {
    this._owned = [];
    this._persist();
    this._notify();
  }

  /**
   * Combined modifiers from all owned upgrades.
   */
  getModifiers() {
    const base = PLAYER_CONFIG.survival.maxStat;
    let maxBattery = base;
    let maxHealth = base;
    let batteryDrainMult = 1;
    let speedMult = 1;

    for (const id of this._owned) {
      const item = this.getItem(id);
      if (!item?.effect) continue;
      const { effect } = item;
      if (effect.maxBatteryBonus) maxBattery += effect.maxBatteryBonus;
      if (effect.maxHealthBonus) maxHealth += effect.maxHealthBonus;
      // Legacy save key from when the upgrade boosted sanity
      if (effect.maxSanityBonus) maxHealth += effect.maxSanityBonus;
      if (effect.batteryDrainMult) batteryDrainMult *= effect.batteryDrainMult;
      if (effect.speedMult) speedMult *= effect.speedMult;
    }

    return { maxBattery, maxHealth, batteryDrainMult, speedMult };
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const fn of this._listeners) {
      fn(this.getModifiers());
    }
  }
}

export const shopManager = new ShopManager();
