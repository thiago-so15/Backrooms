import { STORAGE_KEYS } from '../../constants/storageKeys.js';
import { storageService } from '../../services/storage/StorageService.js';
import { eventBus } from '../events/EventBus.js';
import { GAME_EVENTS } from '../../constants/events.js';

/**
 * Persistent coin wallet (localStorage only).
 */
class CurrencyManager {
  constructor() {
    this._coins = this._load();
    this._listeners = new Set();
  }

  _load() {
    const data = storageService.load(STORAGE_KEYS.ECONOMY, null);
    if (data && typeof data.coins === 'number') {
      return Math.max(0, Math.floor(data.coins));
    }
    return 0;
  }

  _persist() {
    const existing = storageService.load(STORAGE_KEYS.ECONOMY, {}) || {};
    storageService.save(STORAGE_KEYS.ECONOMY, {
      ...existing,
      coins: this._coins,
    });
  }

  getBalance() {
    return this._coins;
  }

  addCoins(amount) {
    if (amount <= 0) return;
    this._coins += amount;
    this._persist();
    this._notify();
    eventBus.emit(GAME_EVENTS.COIN_COLLECTED, { amount, balance: this._coins });
  }

  spendCoins(amount) {
    if (amount <= 0 || this._coins < amount) return false;
    this._coins -= amount;
    this._persist();
    this._notify();
    return true;
  }

  /** Set absolute coin balance (e.g. access-code reward). */
  setBalance(amount) {
    this._coins = Math.max(0, Math.floor(amount));
    this._persist();
    this._notify();
  }

  /** Wipe coins for a fresh account. */
  reset() {
    this._coins = 0;
    this._persist();
    this._notify();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const fn of this._listeners) {
      fn(this._coins);
    }
  }
}

export const currencyManager = new CurrencyManager();
