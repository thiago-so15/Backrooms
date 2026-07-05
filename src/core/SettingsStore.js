const STORAGE_KEY = 'backrooms_settings';

export const DEFAULT_SETTINGS = {
  masterVolume: 70,
  ambientVolume: 60,
  mouseSensitivity: 1.0,
  invertY: false,
  graphicsQuality: null,
  reduceMotion: null,
  reduceLightFlicker: false,
};

const QUALITY_ORDER = ['high', 'medium', 'low'];

function detectDefaultQuality() {
  if (window.matchMedia('(pointer: coarse)').matches) return 'medium';
  return 'high';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

class SettingsStore {
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
      ...DEFAULT_SETTINGS,
      graphicsQuality: detectDefaultQuality(),
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaults };

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return { ...defaults };

      return {
        ...defaults,
        ...parsed,
        masterVolume: clamp(Number(parsed.masterVolume ?? defaults.masterVolume), 0, 100),
        ambientVolume: clamp(Number(parsed.ambientVolume ?? defaults.ambientVolume), 0, 100),
        mouseSensitivity: clamp(Number(parsed.mouseSensitivity ?? defaults.mouseSensitivity), 0.5, 2.5),
        invertY: Boolean(parsed.invertY),
        graphicsQuality: QUALITY_ORDER.includes(parsed.graphicsQuality)
          ? parsed.graphicsQuality
          : defaults.graphicsQuality,
        reduceMotion: parsed.reduceMotion === null || typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : defaults.reduceMotion,
        reduceLightFlicker: Boolean(parsed.reduceLightFlicker),
      };
    } catch (_) {
      return { ...defaults };
    }
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
    } catch (_) {
      /* localStorage unavailable */
    }
  }

  _notify(key, value) {
    for (const listener of this._listeners) {
      listener(key, value, { ...this._settings });
    }
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
    if (!(key in DEFAULT_SETTINGS)) return;

    if (key === 'masterVolume' || key === 'ambientVolume') {
      value = clamp(Number(value), 0, 100);
    } else if (key === 'mouseSensitivity') {
      value = clamp(Number(value), 0.5, 2.5);
    } else if (key === 'graphicsQuality') {
      if (!QUALITY_ORDER.includes(value)) return;
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
      ...DEFAULT_SETTINGS,
      graphicsQuality: detectDefaultQuality(),
    };
    this._persist();
    this._notify(null, null);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getEffectiveReduceMotion() {
    const override = this._settings.reduceMotion;
    if (override === true || override === false) return override;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  _applyReduceMotionClass() {
    document.documentElement.classList.toggle(
      'reduce-motion',
      this.getEffectiveReduceMotion()
    );
  }
}

export const settingsStore = new SettingsStore();
