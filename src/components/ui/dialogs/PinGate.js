import { ACCESS_CODE_CONFIG } from '../../../config/accessCode.config.js';
import { saveManager } from '../../../systems/save/SaveManager.js';
import { currencyManager } from '../../../systems/economy/CurrencyManager.js';

/**
 * Startup gate: asks for a 4-digit code before the home menu.
 * Correct code unlocks all levels and grants coins; any other code continues normally.
 */
export class PinGate {
  constructor(container) {
    this.container = container;
    this.overlay = null;
    this.onComplete = null;
    this._digits = '';
    this._submitting = false;
    this._build();
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay pin-gate-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-labelledby', 'pin-gate-title');
    this.overlay.innerHTML = `
      <div class="pin-gate-panel">
        <h2 id="pin-gate-title" class="pin-gate-title">Introducir clave</h2>
        <p class="pin-gate-hint">Ingresá 4 números para continuar</p>
        <div class="pin-gate-slots" aria-live="polite">
          <span class="pin-slot" data-i="0"></span>
          <span class="pin-slot" data-i="1"></span>
          <span class="pin-slot" data-i="2"></span>
          <span class="pin-slot" data-i="3"></span>
        </div>
        <div class="pin-gate-pad" role="group" aria-label="Teclado numérico">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'borrar', 0, 'ok']
            .map((key) => {
              if (key === 'borrar') {
                return `<button type="button" class="pin-key pin-key--action" data-action="back">⌫</button>`;
              }
              if (key === 'ok') {
                return `<button type="button" class="pin-key pin-key--action pin-key--ok" data-action="submit">OK</button>`;
              }
              return `<button type="button" class="pin-key" data-digit="${key}">${key}</button>`;
            })
            .join('')}
        </div>
        <p class="pin-gate-status" id="pin-gate-status" aria-live="polite"></p>
      </div>
    `;

    this.container.appendChild(this.overlay);
    this._slots = [...this.overlay.querySelectorAll('.pin-slot')];
    this._statusEl = this.overlay.querySelector('#pin-gate-status');

    for (const btn of this.overlay.querySelectorAll('.pin-key')) {
      btn.addEventListener('click', () => {
        if (btn.dataset.digit !== undefined) this._pushDigit(btn.dataset.digit);
        else if (btn.dataset.action === 'back') this._backspace();
        else if (btn.dataset.action === 'submit') this._submit();
      });
    }

    this._onKeyDown = (e) => {
      if (this.overlay.classList.contains('hidden')) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        this._pushDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        this._backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._submit();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
    this._renderSlots();
  }

  _pushDigit(d) {
    if (this._submitting || this._digits.length >= 4) return;
    this._digits += d;
    this._statusEl.textContent = '';
    this._renderSlots();
    if (this._digits.length === 4) {
      // Small pause so the last digit is visible, then submit
      setTimeout(() => this._submit(), 120);
    }
  }

  _backspace() {
    if (this._submitting || !this._digits.length) return;
    this._digits = this._digits.slice(0, -1);
    this._statusEl.textContent = '';
    this._renderSlots();
  }

  _renderSlots() {
    this._slots.forEach((slot, i) => {
      const filled = i < this._digits.length;
      slot.textContent = filled ? '•' : '';
      slot.classList.toggle('pin-slot--filled', filled);
      slot.classList.toggle('pin-slot--active', i === this._digits.length && this._digits.length < 4);
    });
  }

  _submit() {
    if (this._submitting) return;
    if (this._digits.length !== 4) {
      this._statusEl.textContent = 'Ingresá 4 números';
      return;
    }

    this._submitting = true;
    const code = this._digits;
    const { unlockCode, rewardCoins } = ACCESS_CODE_CONFIG;

    if (code === unlockCode) {
      saveManager.unlockAllLevels();
      currencyManager.setBalance(rewardCoins);
      this._statusEl.textContent = `Clave correcta — ${rewardCoins} monedas y niveles desbloqueados`;
      setTimeout(() => this._finish(), 700);
    } else {
      // Wrong code: continue as normal, no feedback reward
      this._finish();
    }
  }

  _finish() {
    document.removeEventListener('keydown', this._onKeyDown);
    this.overlay.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.onComplete?.();
  }

  show() {
    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden', 'false');
  }
}
