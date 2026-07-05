import { STORAGE_VERSION } from '../../constants/storageKeys.js';

/**
 * Single access layer for localStorage.
 * Supports versioning and future migrations.
 */
class StorageService {
  constructor() {
    this._version = STORAGE_VERSION;
  }

  version() {
    return this._version;
  }

  save(key, value) {
    try {
      const payload = {
        v: this._version,
        data: value,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (_) {
      return false;
    }
  }

  load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;

      const parsed = JSON.parse(raw);

      // Legacy: plain JSON without wrapper
      if (parsed === null || typeof parsed !== 'object' || !('v' in parsed)) {
        return parsed ?? fallback;
      }

      return parsed.data ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (_) {
      return false;
    }
  }

  exists(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (_) {
      return false;
    }
  }

  /** Raw read for legacy keys not yet migrated to wrapped format. */
  loadRaw(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  saveRaw(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }
}

export const storageService = new StorageService();
