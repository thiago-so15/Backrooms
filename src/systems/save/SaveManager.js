import { STORAGE_KEYS } from '../../constants/storageKeys.js';
import { storageService } from '../../services/storage/StorageService.js';

/**
 * Handles persistent game progress (victory, future save slots).
 */
export class SaveManager {
  saveVictory() {
    storageService.save(STORAGE_KEYS.COMPLETED, true);
    storageService.save(STORAGE_KEYS.COMPLETED_AT, new Date().toISOString());
  }

  hasCompletedGame() {
    const value = storageService.load(STORAGE_KEYS.COMPLETED, null);
    if (value !== null) return Boolean(value);
    try {
      return localStorage.getItem(STORAGE_KEYS.COMPLETED) === 'true';
    } catch (_) {
      return false;
    }
  }

  getCompletedAt() {
    const value = storageService.load(STORAGE_KEYS.COMPLETED_AT, null);
    if (value !== null) return value;
    try {
      return localStorage.getItem(STORAGE_KEYS.COMPLETED_AT);
    } catch (_) {
      return null;
    }
  }

  clearProgress() {
    storageService.remove(STORAGE_KEYS.COMPLETED);
    storageService.remove(STORAGE_KEYS.COMPLETED_AT);
    storageService.remove(STORAGE_KEYS.SAVE_DATA);
  }
}

export const saveManager = new SaveManager();
