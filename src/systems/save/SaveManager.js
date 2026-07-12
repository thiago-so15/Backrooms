import { STORAGE_KEYS } from '../../constants/storageKeys.js';
import { storageService } from '../../services/storage/StorageService.js';
import { LEVELS } from '../../levels/shared/levels.js';

/**
 * Handles persistent game progress (level unlock + victory).
 */
export class SaveManager {
  saveVictory() {
    storageService.save(STORAGE_KEYS.COMPLETED, true);
    storageService.save(STORAGE_KEYS.COMPLETED_AT, new Date().toISOString());
    // After finishing the game, clear mid-run continue checkpoint
    this.clearLevelProgress();
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

  /**
   * Saves the next level the player can continue from (0-based index).
   * Called when leaving to Home after completing a level.
   */
  saveLevelProgress(nextLevelIndex) {
    const maxIndex = LEVELS.length - 1;
    const clamped = Math.max(0, Math.min(maxIndex, Math.floor(nextLevelIndex)));
    storageService.save(STORAGE_KEYS.SAVE_DATA, {
      nextLevelIndex: clamped,
      savedAt: new Date().toISOString(),
    });
  }

  /**
   * @returns {number|null} 0-based level index to continue, or null if none.
   */
  getContinueLevelIndex() {
    const data = storageService.load(STORAGE_KEYS.SAVE_DATA, null);
    if (!data || typeof data.nextLevelIndex !== 'number') return null;
    const index = Math.floor(data.nextLevelIndex);
    if (index < 0 || index >= LEVELS.length) return null;
    // No "continue" if the only option is starting from the beginning with no progress
    if (index <= 0) return null;
    return index;
  }

  hasContinueProgress() {
    return this.getContinueLevelIndex() !== null;
  }

  clearLevelProgress() {
    storageService.remove(STORAGE_KEYS.SAVE_DATA);
  }

  clearProgress() {
    storageService.remove(STORAGE_KEYS.COMPLETED);
    storageService.remove(STORAGE_KEYS.COMPLETED_AT);
    storageService.remove(STORAGE_KEYS.SAVE_DATA);
  }
}

export const saveManager = new SaveManager();
