import { STORAGE_KEYS } from '../../constants/storageKeys.js';
import { storageService } from '../../services/storage/StorageService.js';
import { LEVELS } from '../../levels/shared/levels.js';

/**
 * Handles persistent game progress (level unlock + continue + victory).
 */
export class SaveManager {
  _readSave() {
    const data = storageService.load(STORAGE_KEYS.SAVE_DATA, null);
    if (!data || typeof data !== 'object') {
      return { nextLevelIndex: null, highestUnlocked: 0 };
    }
    const maxIndex = LEVELS.length - 1;
    let highestUnlocked = Number.isFinite(data.highestUnlocked)
      ? Math.floor(data.highestUnlocked)
      : 0;
    // Legacy: nextLevelIndex > 0 implies those levels are unlocked
    if (Number.isFinite(data.nextLevelIndex)) {
      highestUnlocked = Math.max(highestUnlocked, Math.floor(data.nextLevelIndex));
    }
    if (this.hasCompletedGame()) {
      highestUnlocked = maxIndex;
    }
    highestUnlocked = Math.max(0, Math.min(maxIndex, highestUnlocked));

    let nextLevelIndex = null;
    if (Number.isFinite(data.nextLevelIndex)) {
      const idx = Math.floor(data.nextLevelIndex);
      if (idx > 0 && idx <= maxIndex) nextLevelIndex = idx;
    }

    return { nextLevelIndex, highestUnlocked };
  }

  _writeSave(partial) {
    const current = this._readSave();
    storageService.save(STORAGE_KEYS.SAVE_DATA, {
      ...current,
      ...partial,
      savedAt: new Date().toISOString(),
    });
  }

  saveVictory() {
    storageService.save(STORAGE_KEYS.COMPLETED, true);
    storageService.save(STORAGE_KEYS.COMPLETED_AT, new Date().toISOString());
    this._writeSave({
      highestUnlocked: LEVELS.length - 1,
      nextLevelIndex: null,
    });
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
   * After beating a level at `completedIndex`, unlock the next one and
   * set continue checkpoint to that next level.
   */
  saveLevelProgress(nextLevelIndex) {
    const maxIndex = LEVELS.length - 1;
    const clamped = Math.max(0, Math.min(maxIndex, Math.floor(nextLevelIndex)));
    const current = this._readSave();
    this._writeSave({
      nextLevelIndex: clamped,
      highestUnlocked: Math.max(current.highestUnlocked, clamped),
    });
  }

  /** Highest unlocked level index (0 = only level 1). */
  getHighestUnlocked() {
    return this._readSave().highestUnlocked;
  }

  isLevelUnlocked(levelIndex) {
    return levelIndex <= this.getHighestUnlocked();
  }

  /**
   * @returns {number|null} 0-based level index to continue, or null if none.
   */
  getContinueLevelIndex() {
    return this._readSave().nextLevelIndex;
  }

  hasContinueProgress() {
    return this.getContinueLevelIndex() !== null;
  }

  clearLevelProgress() {
    const unlocked = this.getHighestUnlocked();
    storageService.remove(STORAGE_KEYS.SAVE_DATA);
    if (unlocked > 0) {
      this._writeSave({ highestUnlocked: unlocked, nextLevelIndex: null });
    }
  }

  clearProgress() {
    storageService.remove(STORAGE_KEYS.COMPLETED);
    storageService.remove(STORAGE_KEYS.COMPLETED_AT);
    storageService.remove(STORAGE_KEYS.SAVE_DATA);
  }

  /**
   * Full account wipe: levels, victory flags, coins and shop upgrades.
   * Keeps audio/video settings.
   */
  resetAccount() {
    this.clearProgress();
    storageService.remove(STORAGE_KEYS.ECONOMY);
    storageService.remove(STORAGE_KEYS.META);
  }
}

export const saveManager = new SaveManager();
