import { LEVELS } from '../../../levels/shared/levels.js';
import { saveManager } from '../../../systems/save/SaveManager.js';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Level select modal — shows all levels; locked until previous is beaten.
 */
export class LevelsPanel {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.onSelectLevel = null;
    this._previousFocus = null;
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._build();
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.setAttribute('aria-hidden', 'true');

    this.element = document.createElement('div');
    this.element.className = 'levels-panel';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'levels-title');
    this.element.innerHTML = `
      <div class="settings-header">
        <h2 id="levels-title" class="settings-title">Niveles</h2>
        <button type="button" class="modal-close levels-close" aria-label="Cerrar niveles">&times;</button>
      </div>
      <p class="levels-hint">Completá un nivel para desbloquear el siguiente.</p>
      <div id="levels-list" class="levels-list"></div>
    `;

    this.overlay.appendChild(this.element);
    this.container.appendChild(this.overlay);

    this._listEl = this.element.querySelector('#levels-list');
    this.element.querySelector('.levels-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    this.element.addEventListener('click', (e) => e.stopPropagation());
  }

  _render() {
    const unlocked = saveManager.getHighestUnlocked();
    const completedGame = saveManager.hasCompletedGame();

    this._listEl.innerHTML = LEVELS.map((level, index) => {
      const isUnlocked = index <= unlocked;
      const number = index + 1;
      let status;
      if (!isUnlocked) {
        status = `Bloqueado — completá el nivel ${number - 1}`;
      } else if (completedGame || index < unlocked) {
        status = 'Completado';
      } else {
        status = 'Disponible';
      }

      return `
        <article class="level-card ${isUnlocked ? 'level-card--unlocked' : 'level-card--locked'}">
          <div class="level-card-info">
            <p class="level-card-num">Nivel ${number}</p>
            <h3 class="level-card-name">${level.name}</h3>
            <p class="level-card-sub">${level.subtitle}</p>
            <p class="level-card-status">${status}</p>
          </div>
          <button type="button"
            class="level-play-btn ${isUnlocked ? '' : 'level-play-btn--locked'}"
            data-index="${index}"
            ${isUnlocked ? '' : 'disabled'}
            aria-label="${isUnlocked ? `Jugar ${level.name}` : `${level.name} bloqueado`}">
            ${isUnlocked ? 'Jugar' : 'Bloqueado'}
          </button>
        </article>
      `;
    }).join('');

    for (const btn of this._listEl.querySelectorAll('.level-play-btn:not(:disabled)')) {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.index);
        this.close();
        this.onSelectLevel?.(index);
      });
    }
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
    this._render();
    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', this._onKeyDown, true);
    this.element.querySelector('.levels-close').focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', this._onKeyDown, true);
    this._previousFocus?.focus?.();
  }
}
