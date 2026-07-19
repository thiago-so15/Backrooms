import { settingsManager } from '../../../systems/save/SettingsManager.js';
import { saveManager } from '../../../systems/save/SaveManager.js';
import { currencyManager } from '../../../systems/economy/CurrencyManager.js';
import { shopManager } from '../../../systems/economy/ShopManager.js';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export class SettingsPanel {
  constructor(container, fullscreenTarget) {
    this.container = container;
    this.fullscreenTarget = fullscreenTarget;
    this.element = null;
    this.overlay = null;
    this.isOpen = false;
    this._resetConfirming = false;
    this._accountResetConfirming = false;
    this._previousFocus = null;
    this.onAccountReset = null;
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._build();
    this._syncFromStore();
    settingsManager.subscribe(() => this._syncFromStore());
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.setAttribute('aria-hidden', 'true');

    this.element = document.createElement('div');
    this.element.className = 'settings-panel';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'settings-title');
    this.element.innerHTML = `
      <div class="settings-header">
        <h2 id="settings-title" class="settings-title">Ajustes</h2>
        <button type="button" class="modal-close" aria-label="Cerrar ajustes">&times;</button>
      </div>
      <div class="settings-body">
        <section class="settings-section">
          <h3 class="settings-section-title">Audio</h3>
          <label class="settings-row">
            <span class="settings-label">Volumen general</span>
            <span class="settings-value" id="val-master-volume">70%</span>
            <input type="range" id="set-master-volume" min="0" max="100" step="1" value="70">
          </label>
          <label class="settings-row">
            <span class="settings-label">Sonido ambiental</span>
            <span class="settings-value" id="val-ambient-volume">60%</span>
            <input type="range" id="set-ambient-volume" min="0" max="100" step="1" value="60">
          </label>
        </section>

        <section class="settings-section">
          <h3 class="settings-section-title">Controles</h3>
          <label class="settings-row">
            <span class="settings-label">Sensibilidad del mouse</span>
            <span class="settings-value" id="val-mouse-sensitivity">1.0x</span>
            <input type="range" id="set-mouse-sensitivity" min="0.5" max="2.5" step="0.1" value="1">
          </label>
          <label class="settings-toggle-row">
            <input type="checkbox" id="set-invert-y" class="settings-checkbox">
            <span class="settings-toggle-ui" aria-hidden="true"></span>
            <span class="settings-label">Invertir eje Y</span>
          </label>
        </section>

        <section class="settings-section">
          <h3 class="settings-section-title">Video / Rendimiento</h3>
          <label class="settings-row settings-row--select">
            <span class="settings-label">Calidad gráfica</span>
            <select id="set-graphics-quality" class="settings-select">
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </label>
          <button type="button" id="btn-fullscreen" class="settings-action-btn">Pantalla completa</button>
        </section>

        <section class="settings-section">
          <h3 class="settings-section-title">Accesibilidad</h3>
          <label class="settings-toggle-row">
            <input type="checkbox" id="set-reduce-motion" class="settings-checkbox">
            <span class="settings-toggle-ui" aria-hidden="true"></span>
            <span class="settings-label">Reducir movimiento</span>
          </label>
          <label class="settings-toggle-row">
            <input type="checkbox" id="set-reduce-light-flicker" class="settings-checkbox">
            <span class="settings-toggle-ui" aria-hidden="true"></span>
            <span class="settings-label">Reducir parpadeo de luces</span>
          </label>
        </section>
        <section class="settings-section">
          <h3 class="settings-section-title">Progreso</h3>
          <p class="settings-note settings-note--inline">Borra niveles desbloqueados, monedas y mejoras de la tienda. Los ajustes de audio y video se mantienen.</p>
          <button type="button" id="btn-reset-account" class="settings-reset-btn settings-reset-btn--danger">Empezar de nuevo</button>
        </section>
      </div>
      <div class="settings-footer">
        <p class="settings-note">Los ajustes se guardan automáticamente en este navegador.</p>
        <button type="button" id="btn-reset-settings" class="settings-reset-btn">Restablecer valores por defecto</button>
      </div>
    `;

    this.overlay.appendChild(this.element);
    this.container.appendChild(this.overlay);

    this._refs = {
      masterVolume: this.element.querySelector('#set-master-volume'),
      ambientVolume: this.element.querySelector('#set-ambient-volume'),
      mouseSensitivity: this.element.querySelector('#set-mouse-sensitivity'),
      invertY: this.element.querySelector('#set-invert-y'),
      graphicsQuality: this.element.querySelector('#set-graphics-quality'),
      reduceMotion: this.element.querySelector('#set-reduce-motion'),
      reduceLightFlicker: this.element.querySelector('#set-reduce-light-flicker'),
      valMasterVolume: this.element.querySelector('#val-master-volume'),
      valAmbientVolume: this.element.querySelector('#val-ambient-volume'),
      valMouseSensitivity: this.element.querySelector('#val-mouse-sensitivity'),
      fullscreenBtn: this.element.querySelector('#btn-fullscreen'),
      resetBtn: this.element.querySelector('#btn-reset-settings'),
      resetAccountBtn: this.element.querySelector('#btn-reset-account'),
      closeBtn: this.element.querySelector('.modal-close'),
    };

    this._bindEvents();
    this._updateFullscreenButton();
    document.addEventListener('fullscreenchange', () => this._updateFullscreenButton());
  }

  _bindEvents() {
    const { _refs: r } = this;

    r.masterVolume.addEventListener('input', () => {
      settingsManager.setSetting('masterVolume', Number(r.masterVolume.value));
    });
    r.ambientVolume.addEventListener('input', () => {
      settingsManager.setSetting('ambientVolume', Number(r.ambientVolume.value));
    });
    r.mouseSensitivity.addEventListener('input', () => {
      settingsManager.setSetting('mouseSensitivity', Number(r.mouseSensitivity.value));
    });
    r.invertY.addEventListener('change', () => {
      settingsManager.setSetting('invertY', r.invertY.checked);
    });
    r.graphicsQuality.addEventListener('change', () => {
      settingsManager.setSetting('graphicsQuality', r.graphicsQuality.value);
    });
    r.reduceMotion.addEventListener('change', () => {
      settingsManager.setSetting('reduceMotion', r.reduceMotion.checked);
    });
    r.reduceLightFlicker.addEventListener('change', () => {
      settingsManager.setSetting('reduceLightFlicker', r.reduceLightFlicker.checked);
    });

    r.fullscreenBtn.addEventListener('click', () => this._toggleFullscreen());
    r.resetBtn.addEventListener('click', () => this._handleReset());
    r.resetAccountBtn.addEventListener('click', () => this._handleAccountReset());
    r.closeBtn.addEventListener('click', () => this.close());

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.element.addEventListener('click', (e) => e.stopPropagation());
  }

  _syncFromStore() {
    const s = settingsManager.getAll();
    const { _refs: r } = this;

    r.masterVolume.value = s.masterVolume;
    r.ambientVolume.value = s.ambientVolume;
    r.mouseSensitivity.value = s.mouseSensitivity;
    r.invertY.checked = s.invertY;
    r.graphicsQuality.value = s.graphicsQuality;
    r.reduceMotion.checked = settingsManager.getEffectiveReduceMotion();
    r.reduceLightFlicker.checked = s.reduceLightFlicker;

    r.valMasterVolume.textContent = `${s.masterVolume}%`;
    r.valAmbientVolume.textContent = `${s.ambientVolume}%`;
    r.valMouseSensitivity.textContent = `${s.mouseSensitivity.toFixed(1)}x`;

    this._resetConfirming = false;
    this._accountResetConfirming = false;
    r.resetBtn.textContent = 'Restablecer valores por defecto';
    r.resetBtn.classList.remove('settings-reset-btn--confirm');
    r.resetAccountBtn.textContent = 'Empezar de nuevo';
    r.resetAccountBtn.classList.remove('settings-reset-btn--confirm');
  }

  _handleReset() {
    const { resetBtn } = this._refs;
    if (!this._resetConfirming) {
      this._resetConfirming = true;
      this._accountResetConfirming = false;
      this._refs.resetAccountBtn.textContent = 'Empezar de nuevo';
      this._refs.resetAccountBtn.classList.remove('settings-reset-btn--confirm');
      resetBtn.textContent = '¿Restablecer ajustes?';
      resetBtn.classList.add('settings-reset-btn--confirm');
      return;
    }

    settingsManager.reset();
    this._resetConfirming = false;
  }

  _handleAccountReset() {
    const { resetAccountBtn } = this._refs;
    if (!this._accountResetConfirming) {
      this._accountResetConfirming = true;
      this._resetConfirming = false;
      this._refs.resetBtn.textContent = 'Restablecer valores por defecto';
      this._refs.resetBtn.classList.remove('settings-reset-btn--confirm');
      resetAccountBtn.textContent = '¿Borrar todo el progreso?';
      resetAccountBtn.classList.add('settings-reset-btn--confirm');
      return;
    }

    saveManager.resetAccount();
    currencyManager.reset();
    shopManager.reset();
    this._accountResetConfirming = false;
    resetAccountBtn.textContent = 'Empezar de nuevo';
    resetAccountBtn.classList.remove('settings-reset-btn--confirm');
    this.onAccountReset?.();
    this.close();
  }

  async _toggleFullscreen() {
    if (!document.fullscreenElement) {
      try {
        await this.fullscreenTarget.requestFullscreen();
      } catch (_) {
        /* fullscreen denied */
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (_) {
        /* ignore */
      }
    }
  }

  _updateFullscreenButton() {
    this._refs.fullscreenBtn.textContent = document.fullscreenElement
      ? 'Salir de pantalla completa'
      : 'Pantalla completa';
  }

  _handleKeyDown(e) {
    if (!this.isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = [...this.element.querySelectorAll(FOCUSABLE)].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._previousFocus = document.activeElement;
    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', this._onKeyDown, true);
    this._syncFromStore();
    this._refs.closeBtn.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', this._onKeyDown, true);
    this._resetConfirming = false;
    this._accountResetConfirming = false;

    if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
      this._previousFocus.focus();
    }
  }
}
