import { hasFinePointer } from '../../../../utils/platform.js';
import { UI_CONFIG } from '../../../../config/ui.config.js';

/**
 * Home / main menu overlay shown once per session.
 */
export class HomeScreen {
  constructor(container, settingsPanel) {
    this.container = container;
    this.settingsPanel = settingsPanel;
    this.element = null;
    this.howToOverlay = null;
    this.onEnterClick = null;
    this.onEnter = null;
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
          <button type="button" id="btn-enter" class="home-btn home-btn--primary">Entrar</button>
          <button type="button" id="btn-how-to-play" class="home-btn home-btn--secondary">Cómo jugar</button>
        </div>
      </div>
    `;

    this.container.appendChild(el);
    this.element = el;
    this._buildHowToModal();

    el.querySelector('#btn-enter').addEventListener('click', () => this._handleEnter());
    el.querySelector('#btn-how-to-play').addEventListener('click', () => this._openHowTo());
    el.querySelector('.home-settings-btn').addEventListener('click', () => {
      this.settingsPanel.open();
    });
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
          <p class="howto-objective">Encontrá todas las llaves de cada nivel y llegá a la salida. Cuidá tu cordura y la batería de tu linterna.</p>
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

  _handleEnter() {
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
      this.onEnter?.();
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

  hide() {
    this.element.classList.remove('active', 'home-exiting');
    this.element.classList.add('hidden');
    this._closeHowTo();
  }
}
