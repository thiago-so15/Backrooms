import { hasFinePointer } from '../../../../utils/platform.js';
import { UI_CONFIG } from '../../../../config/ui.config.js';
import { currencyManager } from '../../../../systems/economy/CurrencyManager.js';
import { saveManager } from '../../../../systems/save/SaveManager.js';
import { LEVELS } from '../../../../levels/shared/levels.js';

/**
 * Home / main menu overlay.
 */
export class HomeScreen {
  constructor(container, settingsPanel, shopPanel) {
    this.container = container;
    this.settingsPanel = settingsPanel;
    this.shopPanel = shopPanel;
    this.element = null;
    this.howToOverlay = null;
    this.onEnterClick = null;
    this.onEnter = null;
    this.onContinue = null;
    this._entering = false;
    this._build();
  }

  _build() {
    const finePointer = hasFinePointer();
    const compatWarning = finePointer
      ? ''
      : '<p class="home-compat-warning home-reveal home-reveal--compat" role="note">Modo celular — flechas para moverte, arrastrá a la derecha para mirar</p>';

    const el = document.createElement('div');
    el.id = 'screen-home';
    el.className = 'screen home-screen active';
    el.innerHTML = `
      <button type="button" class="home-settings-btn home-reveal home-reveal--settings" aria-label="Ajustes">&#9881;</button>
      <div class="home-content">
        <h1 class="home-title home-title-flicker home-reveal home-reveal--title">THE BACKROOMS</h1>
        <p class="home-subtitle home-reveal home-reveal--subtitle">no deberías estar acá</p>
        <div class="home-panel home-reveal home-reveal--panel">
          <p class="home-context">Te saliste de la realidad. Ahora estás atrapado entre pasillos amarillentos que no terminan nunca, bajo el zumbido de luces fluorescentes que nunca se apagan del todo. Encontrá todas las llaves de cada nivel para desbloquear la salida. A partir del nivel 2, no estás solo.</p>
        </div>
        ${compatWarning}
        <div class="home-actions home-reveal home-reveal--actions">
          <p class="home-coins home-reveal home-reveal--coins">Monedas: <span id="home-coin-balance">0</span></p>
          <div id="home-play-actions" class="home-play-actions"></div>
          <button type="button" id="btn-shop" class="home-btn home-btn--secondary">Tienda</button>
          <button type="button" id="btn-how-to-play" class="home-btn home-btn--secondary">Cómo jugar</button>
        </div>
      </div>
    `;

    this.container.appendChild(el);
    this.element = el;
    this._playActions = el.querySelector('#home-play-actions');
    this._buildHowToModal();

    el.querySelector('#btn-shop').addEventListener('click', () => this.shopPanel.open());
    el.querySelector('#btn-how-to-play').addEventListener('click', () => this._openHowTo());
    el.querySelector('.home-settings-btn').addEventListener('click', () => {
      this.settingsPanel.open();
    });

    this._coinBalanceEl = el.querySelector('#home-coin-balance');
    this._updateCoinBalance();
    currencyManager.subscribe(() => this._updateCoinBalance());
    this.refreshProgress();
  }

  _updateCoinBalance() {
    if (this._coinBalanceEl) {
      this._coinBalanceEl.textContent = String(currencyManager.getBalance());
    }
  }

  /**
   * Rebuilds play buttons from saved progress.
   * With progress: Continuar nivel N + Empezar nivel 1
   * Without: Entrar (starts level 1)
   */
  refreshProgress() {
    const continueIndex = saveManager.getContinueLevelIndex();
    this._playActions.innerHTML = '';

    if (continueIndex !== null) {
      const levelNumber = continueIndex + 1;
      const config = LEVELS[continueIndex];
      const label = config ? config.name : `nivel ${levelNumber}`;

      const continueBtn = document.createElement('button');
      continueBtn.type = 'button';
      continueBtn.id = 'btn-continue';
      continueBtn.className = 'home-btn home-btn--primary';
      continueBtn.textContent = `Continuar por el nivel ${levelNumber}`;
      continueBtn.title = label;
      continueBtn.addEventListener('click', () => this._handleEnter(continueIndex, 'continue'));

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.id = 'btn-start-level-1';
      startBtn.className = 'home-btn home-btn--secondary';
      startBtn.textContent = 'Empezar el nivel 1';
      startBtn.addEventListener('click', () => this._handleEnter(0, 'start'));

      this._playActions.append(continueBtn, startBtn);
    } else {
      const enterBtn = document.createElement('button');
      enterBtn.type = 'button';
      enterBtn.id = 'btn-enter';
      enterBtn.className = 'home-btn home-btn--primary';
      enterBtn.textContent = 'Entrar';
      enterBtn.addEventListener('click', () => this._handleEnter(0, 'start'));
      this._playActions.append(enterBtn);
    }
  }

  _buildHowToModal() {
    this.howToOverlay = document.createElement('div');
    this.howToOverlay.className = 'modal-overlay hidden';
    this.howToOverlay.setAttribute('aria-hidden', 'true');
    this.howToOverlay.innerHTML = `
      <div class="howto-panel" role="dialog" aria-modal="true" aria-labelledby="howto-title">
        <div class="settings-header">
          <h2 id="howto-title" class="settings-title">Cómo jugar</h2>
          <button type="button" class="modal-close howto-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="howto-body">
          <dl class="howto-controls">
            <div class="howto-row"><dt>WASD</dt><dd>Moverte</dd></div>
            <div class="howto-row"><dt>Mouse</dt><dd>Mirar alrededor</dd></div>
            <div class="howto-row"><dt>Shift</dt><dd>Correr</dd></div>
            <div class="howto-row"><dt>F</dt><dd>Encender / apagar la linterna</dd></div>
            <div class="howto-row"><dt>Esc</dt><dd>Pausar</dd></div>
          </dl>
          <p class="howto-objective">Encontrá todas las llaves de cada nivel y llegá a la salida. Juntá monedas en el mapa y gastalas en la Tienda para mejorar tu linterna y más. Cuidá tu cordura y la batería.</p>
        </div>
      </div>
    `;

    this.container.appendChild(this.howToOverlay);

    const close = () => this._closeHowTo();
    this.howToOverlay.querySelector('.howto-close').addEventListener('click', close);
    this.howToOverlay.addEventListener('click', (e) => {
      if (e.target === this.howToOverlay) close();
    });
    this.howToOverlay.querySelector('.howto-panel').addEventListener('click', (e) => e.stopPropagation());

    this._howToKeyDown = (e) => {
      if (e.key === 'Escape' && !this.howToOverlay.classList.contains('hidden')) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
  }

  _openHowTo() {
    this.howToOverlay.classList.remove('hidden');
    this.howToOverlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', this._howToKeyDown, true);
    this.howToOverlay.querySelector('.howto-close').focus();
  }

  _closeHowTo() {
    this.howToOverlay.classList.add('hidden');
    this.howToOverlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', this._howToKeyDown, true);
  }

  _handleEnter(levelIndex = 0, mode = 'start') {
    if (this._entering) return;
    this._entering = true;
    this._closeHowTo();

    this.onEnterClick?.();

    this.element.classList.add('home-exiting');

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.hide();
      if (mode === 'continue') {
        this.onContinue?.(levelIndex);
      } else {
        this.onEnter?.(levelIndex);
      }
    };

    const fadeMs = UI_CONFIG.home.enterFadeMs;
    const timeout = setTimeout(finish, fadeMs);

    const onFadeEnd = (e) => {
      if (e.target !== this.element || e.propertyName !== 'opacity') return;
      clearTimeout(timeout);
      this.element.removeEventListener('transitionend', onFadeEnd);
      finish();
    };

    this.element.addEventListener('transitionend', onFadeEnd);
  }

  show() {
    this._entering = false;
    this.element.classList.remove('hidden', 'home-exiting');
    this.element.classList.add('active');
    this.refreshProgress();
    this._updateCoinBalance();
  }

  hide() {
    this.element.classList.remove('active', 'home-exiting');
    this.element.classList.add('hidden');
    this._closeHowTo();
  }
}
