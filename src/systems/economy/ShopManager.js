import { SHOP_ITEMS, SHOP_SKINS, DEFAULT_SKIN } from '../../config/shop.config.js';
import { PLAYER_CONFIG } from '../../config/player.config.js';
import { STORAGE_KEYS } from '../../constants/storageKeys.js';
import { storageService } from '../../services/storage/StorageService.js';
import { eventBus } from '../events/EventBus.js';
import { GAME_EVENTS } from '../../constants/events.js';
import { currencyManager } from './CurrencyManager.js';

/**
 * Owned upgrades, skins, and purchase logic.
 */
class ShopManager {
  constructor() {
    const saved = this._load();
    this._owned = saved.upgrades;
    this._equippedSkinId = saved.equippedSkinId;
    this._listeners = new Set();
  }

  _load() {
    const data = storageService.load(STORAGE_KEYS.ECONOMY, null);
    const upgrades =
      data && Array.isArray(data.upgrades) ? [...data.upgrades] : [];
    let equippedSkinId = DEFAULT_SKIN.id;
    if (data && typeof data.equippedSkinId === 'string') {
      const id = data.equippedSkinId;
      if (id === DEFAULT_SKIN.id || upgrades.includes(id)) {
        equippedSkinId = id;
      }
    }
    return { upgrades, equippedSkinId };
  }

  _persist() {
    const existing = storageService.load(STORAGE_KEYS.ECONOMY, {}) || {};
    storageService.save(STORAGE_KEYS.ECONOMY, {
      ...existing,
      coins: currencyManager.getBalance(),
      upgrades: this._owned,
      equippedSkinId: this._equippedSkinId,
    });
  }

  getOwned() {
    return [...this._owned];
  }

  owns(itemId) {
    if (itemId === DEFAULT_SKIN.id) return true;
    return this._owned.includes(itemId);
  }

  getItem(itemId) {
    return (
      SHOP_ITEMS.find((i) => i.id === itemId) ??
      SHOP_SKINS.find((i) => i.id === itemId) ??
      null
    );
  }

  getUpgradeItems() {
    return SHOP_ITEMS;
  }

  getSkinItems() {
    return SHOP_SKINS;
  }

  /** @deprecated Prefer getUpgradeItems / getSkinItems */
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
    const isSkin = SHOP_SKINS.some((s) => s.id === itemId);
    if (isSkin) {
      this._equippedSkinId = itemId;
    }
    this._persist();
    this._notify();
    eventBus.emit(GAME_EVENTS.SHOP_PURCHASE, { itemId, item });
    if (isSkin) {
      eventBus.emit(GAME_EVENTS.SHOP_SKIN_EQUIPPED, { skinId: itemId });
    }
    return true;
  }

  getEquippedSkinId() {
    return this._equippedSkinId;
  }

  isSkinEquipped(skinId) {
    return this._equippedSkinId === skinId;
  }

  /** Equip a owned skin (or the free default). */
  equipSkin(skinId) {
    if (skinId === DEFAULT_SKIN.id) {
      this._equippedSkinId = DEFAULT_SKIN.id;
      this._persist();
      this._notify();
      eventBus.emit(GAME_EVENTS.SHOP_SKIN_EQUIPPED, { skinId });
      return true;
    }
    if (!this.owns(skinId) || !SHOP_SKINS.some((s) => s.id === skinId)) {
      return false;
    }
    this._equippedSkinId = skinId;
    this._persist();
    this._notify();
    eventBus.emit(GAME_EVENTS.SHOP_SKIN_EQUIPPED, { skinId });
    return true;
  }

  /** Colors for the currently equipped outfit. */
  getEquippedSkinColors() {
    if (this._equippedSkinId === DEFAULT_SKIN.id) {
      return { ...DEFAULT_SKIN.colors };
    }
    const skin = SHOP_SKINS.find((s) => s.id === this._equippedSkinId);
    if (skin) return { ...skin.colors };
    return { ...DEFAULT_SKIN.colors };
  }

  /** Wipe owned upgrades/skins for a fresh account. */
  reset() {
    this._owned = [];
    this._equippedSkinId = DEFAULT_SKIN.id;
    this._persist();
    this._notify();
  }

  /**
   * Combined modifiers from all owned upgrades (skins ignored).
   */
  getModifiers() {
    const base = PLAYER_CONFIG.survival.maxStat;
    let maxBattery = base;
    let maxHealth = base;
    let batteryDrainMult = 1;
    let speedMult = 1;

    for (const id of this._owned) {
      const item = SHOP_ITEMS.find((i) => i.id === id);
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
