import { SETTINGS_DEFAULTS, GRAPHICS_CONFIG } from '../../config/graphics.config.js';
import { CONTROLS_CONFIG } from '../../config/controls.config.js';
import { STORAGE_KEYS } from '../../constants/storageKeys.js';
import { GAME_EVENTS } from '../../constants/events.js';
import { storageService } from '../../services/storage/StorageService.js';
import { eventBus } from '../events/EventBus.js';
import { clamp } from '../../utils/math.js';
import { detectDefaultGraphicsQuality, prefersReducedMotion } from '../../utils/platform.js';

export const DEFAULT_SETTINGS = { ...SETTINGS_DEFAULTS };

/**
 * Persists and broadcasts user preferences.
 * All systems read settings from here — never from localStorage directly.
 */
class SettingsManager {
  constructor() {
    this._settings = this._load();
    this._listeners = new Set();
    this._applyReduceMotionClass();

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      if (this._settings.reduceMotion === null) {
        this._applyReduceMotionClass();
      }
    });
  }

  _load() {
    const defaults = {
      ...SETTINGS_DEFAULTS,
      graphicsQuality: detectDefaultGraphicsQuality(),
    };

    const parsed = storageService.load(STORAGE_KEYS.SETTINGS);
    if (!parsed || typeof parsed !== 'object') return { ...defaults };

    return {
      ...defaults,
      ...parsed,
      masterVolume: clamp(Number(parsed.masterVolume ?? defaults.masterVolume), 0, 100),
      ambientVolume: clamp(Number(parsed.ambientVolume ?? defaults.ambientVolume), 0, 100),
      mouseSensitivity: clamp(
        Number(parsed.mouseSensitivity ?? defaults.mouseSensitivity),
        CONTROLS_CONFIG.sensitivityMin,
        CONTROLS_CONFIG.sensitivityMax
      ),
      invertY: Boolean(parsed.invertY),
      graphicsQuality: GRAPHICS_CONFIG.qualityOrder.includes(parsed.graphicsQuality)
        ? parsed.graphicsQuality
        : defaults.graphicsQuality,
      reduceMotion:
        parsed.reduceMotion === null || typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : defaults.reduceMotion,
      reduceLightFlicker: Boolean(parsed.reduceLightFlicker),
    };
  }

  _persist() {
    storageService.save(STORAGE_KEYS.SETTINGS, this._settings);
  }

  _notify(key, value) {
    for (const listener of this._listeners) {
      listener(key, value, { ...this._settings });
    }
    eventBus.emit(GAME_EVENTS.SETTINGS_CHANGED, { key, value, settings: this.getAll() });
    if (key === 'reduceMotion' || key === null) {
      this._applyReduceMotionClass();
    }
  }

  getSetting(key) {
    return this._settings[key];
  }

  getAll() {
    return { ...this._settings };
  }

  setSetting(key, value) {
    if (!(key in SETTINGS_DEFAULTS)) return;

    if (key === 'masterVolume' || key === 'ambientVolume') {
      value = clamp(Number(value), 0, 100);
    } else if (key === 'mouseSensitivity') {
      value = clamp(Number(value), CONTROLS_CONFIG.sensitivityMin, CONTROLS_CONFIG.sensitivityMax);
    } else if (key === 'graphicsQuality') {
      if (!GRAPHICS_CONFIG.qualityOrder.includes(value)) return;
    } else if (key === 'reduceMotion') {
      if (value !== null && typeof value !== 'boolean') return;
    } else if (key === 'invertY' || key === 'reduceLightFlicker') {
      value = Boolean(value);
    }

    this._settings[key] = value;
    this._persist();
    this._notify(key, value);
  }

  reset() {
    this._settings = {
      ...SETTINGS_DEFAULTS,
      graphicsQuality: detectDefaultGraphicsQuality(),
    };
    this._persist();
    this._notify(null, null);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getEffectiveReduceMotion() {
    return prefersReducedMotion(this._settings.reduceMotion);
  }

  _applyReduceMotionClass() {
    document.documentElement.classList.toggle('reduce-motion', this.getEffectiveReduceMotion());
  }
}

export const settingsManager = new SettingsManager();

/** @deprecated Use settingsManager — kept for backward compatibility. */
export const settingsStore = settingsManager;
