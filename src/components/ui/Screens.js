import { HomeScreen } from './pages/menu/HomeScreen.js';
import { SettingsPanel } from './dialogs/SettingsPanel.js';
import { ShopPanel } from './dialogs/ShopPanel.js';
import { LEVELS } from '../../levels/shared/levels.js';

export class Screens {
  constructor(container, fullscreenTarget) {
    this.container = container;
    this.onEnterClick = null;
    this.onEnter = null;
    this.onContinue = null;
    this.onResume = null;
    this.onRetry = null;
    this.onNextLevel = null;
    this.onGoHome = null;

    this.settingsPanel = new SettingsPanel(container, fullscreenTarget);
    this.shopPanel = new ShopPanel(container);

    this._build();

    this.home = new HomeScreen(container, this.settingsPanel, this.shopPanel);
    this.home.onEnterClick = () => {
      if (this.onEnterClick) this.onEnterClick();
    };
    this.home.onEnter = (levelIndex) => {
      if (this.onEnter) this.onEnter(levelIndex);
    };
    this.home.onContinue = (levelIndex) => {
      if (this.onContinue) this.onContinue(levelIndex);
    };
  }

  _build() {
    this.container.insertAdjacentHTML('beforeend', `
      <div id="screen-intro" class="screen">
        <h2 id="intro-title"></h2>
        <p id="intro-subtitle" class="subtitle"></p>
        <p id="intro-device" class="intro-device"></p>
        <p id="intro-desc" class="intro-text"></p>
        <button id="btn-intro" class="btn">CONTINUAR</button>
      </div>

      <div id="screen-pause" class="screen">
        <h2>PAUSA</h2>
        <button id="btn-resume" class="btn">CONTINUAR</button>
        <button id="btn-shop-pause" class="btn btn-secondary">TIENDA</button>
        <button id="btn-settings-pause" class="btn btn-secondary">AJUSTES</button>
        <button id="btn-retry-pause" class="btn btn-secondary">VOLVER A INTENTAR</button>
      </div>

      <div id="screen-gameover" class="screen">
        <h2 class="danger">GAME OVER</h2>
        <p id="gameover-reason"></p>
        <button id="btn-retry-go" class="btn">VOLVER A INTENTAR</button>
        <button id="btn-gameover-home" class="btn btn-secondary">INICIO</button>
      </div>

      <div id="screen-victory-level" class="screen">
        <h2>NIVEL COMPLETADO</h2>
        <p id="victory-level-text"></p>
        <button id="btn-next-level" class="btn">SEGUIR NIVEL</button>
        <button id="btn-victory-home" class="btn btn-secondary">INICIO</button>
      </div>

      <div id="screen-victory" class="screen">
        <h1 class="title-flicker">SEGUÍS DESCENDIENDO</h1>
        <p class="intro-text">Cruzaste el parque acuático, los suburbios y el complejo de apartamentos. La puerta del ascensor se cierra detrás tuyo. Más abajo, algo espera... pero eso es otra historia.</p>
        <button id="btn-victory-retry" class="btn">VOLVER A INTENTAR</button>
        <button id="btn-victory-final-home" class="btn btn-secondary">INICIO</button>
      </div>
    `);

    this.screens = {
      intro: this.container.querySelector('#screen-intro'),
      pause: this.container.querySelector('#screen-pause'),
      gameover: this.container.querySelector('#screen-gameover'),
      victoryLevel: this.container.querySelector('#screen-victory-level'),
      victory: this.container.querySelector('#screen-victory'),
    };

    this.container.querySelector('#btn-intro').addEventListener('click', () => {
      if (this.onNextLevel) this.onNextLevel();
    });
    this.container.querySelector('#btn-resume').addEventListener('click', () => {
      if (this.onResume) this.onResume();
    });
    this.container.querySelector('#btn-settings-pause').addEventListener('click', () => {
      this.settingsPanel.open();
    });
    this.container.querySelector('#btn-shop-pause').addEventListener('click', () => {
      this.shopPanel.open();
    });
    this.container.querySelector('#btn-retry-pause').addEventListener('click', () => {
      if (this.onRetry) this.onRetry();
    });
    this.container.querySelector('#btn-retry-go').addEventListener('click', () => {
      if (this.onRetry) this.onRetry();
    });
    this.container.querySelector('#btn-gameover-home').addEventListener('click', () => {
      if (this.onGoHome) this.onGoHome();
    });
    this.container.querySelector('#btn-next-level').addEventListener('click', () => {
      if (this.onNextLevel) this.onNextLevel();
    });
    this.container.querySelector('#btn-victory-home').addEventListener('click', () => {
      if (this.onGoHome) this.onGoHome();
    });
    this.container.querySelector('#btn-victory-retry').addEventListener('click', () => {
      if (this.onRetry) this.onRetry();
    });
    this.container.querySelector('#btn-victory-final-home').addEventListener('click', () => {
      if (this.onGoHome) this.onGoHome({ fromFinalVictory: true });
    });
  }

  show(name) {
    for (const [key, el] of Object.entries(this.screens)) {
      el.classList.toggle('active', key === name);
    }
  }

  showIntro(levelConfig, deviceLabel, deviceHint) {
    this.container.querySelector('#intro-title').textContent = levelConfig.name;
    this.container.querySelector('#intro-subtitle').textContent = levelConfig.subtitle;
    this.container.querySelector('#intro-device').textContent =
      `Dispositivo: ${deviceLabel} — ${deviceHint}`;
    this.container.querySelector('#intro-desc').textContent = levelConfig.description;
    this.show('intro');
  }

  showGameOver(reason) {
    this.container.querySelector('#gameover-reason').textContent = reason;
    this.show('gameover');
  }

  showLevelComplete(levelName, nextLevelIndex) {
    const nextNumber = nextLevelIndex + 1;
    const nextConfig = LEVELS[nextLevelIndex];
    const nextLabel = nextConfig ? nextConfig.name : `NIVEL ${nextNumber}`;

    this.container.querySelector('#victory-level-text').textContent =
      `${levelName} completado. El pasillo siguiente te espera.`;

    const nextBtn = this.container.querySelector('#btn-next-level');
    nextBtn.textContent = `SEGUIR ${nextLabel}`;

    this.show('victoryLevel');
  }

  hideAll() {
    for (const el of Object.values(this.screens)) {
      el.classList.remove('active');
    }
  }

  showHome() {
    this.hideAll();
    this.home.refreshProgress();
    this.home.show();
  }
}
