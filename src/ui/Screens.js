export class Screens {
  constructor(container) {
    this.container = container;
    this.onStart = null;
    this.onResume = null;
    this.onRetry = null;
    this.onNextLevel = null;
    this._build();
  }

  _build() {
    this.container.innerHTML = `
      <div id="screen-menu" class="screen active">
        <h1 class="title-flicker">THE BACKROOMS</h1>
        <p class="subtitle">Hiciste no-clip fuera de la realidad. Ahora estás acá.</p>
        <div class="instructions">
          <p><strong>WASD</strong> — Moverse &nbsp; <strong>Shift</strong> — Correr</p>
          <p><strong>Mouse</strong> — Mirar &nbsp; <strong>F</strong> — Linterna</p>
          <p><strong>Esc</strong> — Pausa</p>
          <p class="hint">Juntá todas las llaves de cada nivel para abrir la salida.</p>
          <p class="hint">Nivel 119: el parque acuático. Nivel 9: los suburbios.</p>
        </div>
        <button id="btn-start" class="btn">HACER NO-CLIP</button>
      </div>

      <div id="screen-intro" class="screen">
        <h2 id="intro-title"></h2>
        <p id="intro-subtitle" class="subtitle"></p>
        <p id="intro-desc" class="intro-text"></p>
        <button id="btn-intro" class="btn">CONTINUAR</button>
      </div>

      <div id="screen-pause" class="screen">
        <h2>PAUSA</h2>
        <button id="btn-resume" class="btn">CONTINUAR</button>
        <button id="btn-retry-pause" class="btn btn-secondary">REINTENTAR</button>
      </div>

      <div id="screen-gameover" class="screen">
        <h2 class="danger">GAME OVER</h2>
        <p id="gameover-reason"></p>
        <button id="btn-retry-go" class="btn">REINTENTAR</button>
      </div>

      <div id="screen-victory-level" class="screen">
        <h2>NIVEL COMPLETADO</h2>
        <p id="victory-level-text"></p>
        <button id="btn-next-level" class="btn">SIGUIENTE NIVEL</button>
      </div>

      <div id="screen-victory" class="screen">
        <h1 class="title-flicker">SEGUÍS DESCENDIENDO</h1>
        <p class="intro-text">Cruzaste el parque acuático y los suburbios. La puerta se cierra detrás tuyo. Más abajo, algo espera... pero eso es otra historia.</p>
        <button id="btn-victory-retry" class="btn">VOLVER A EMPEZAR</button>
      </div>
    `;

    this.screens = {
      menu: this.container.querySelector('#screen-menu'),
      intro: this.container.querySelector('#screen-intro'),
      pause: this.container.querySelector('#screen-pause'),
      gameover: this.container.querySelector('#screen-gameover'),
      victoryLevel: this.container.querySelector('#screen-victory-level'),
      victory: this.container.querySelector('#screen-victory'),
    };

    this.container.querySelector('#btn-start').addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });
    this.container.querySelector('#btn-intro').addEventListener('click', () => {
      if (this.onNextLevel) this.onNextLevel();
    });
    this.container.querySelector('#btn-resume').addEventListener('click', () => {
      if (this.onResume) this.onResume();
    });
    this.container.querySelector('#btn-retry-pause').addEventListener('click', () => {
      if (this.onRetry) this.onRetry();
    });
    this.container.querySelector('#btn-retry-go').addEventListener('click', () => {
      if (this.onRetry) this.onRetry();
    });
    this.container.querySelector('#btn-next-level').addEventListener('click', () => {
      if (this.onNextLevel) this.onNextLevel();
    });
    this.container.querySelector('#btn-victory-retry').addEventListener('click', () => {
      if (this.onRetry) this.onRetry();
    });
  }

  show(name) {
    for (const [key, el] of Object.entries(this.screens)) {
      el.classList.toggle('active', key === name);
    }
  }

  showIntro(levelConfig) {
    this.container.querySelector('#intro-title').textContent = levelConfig.name;
    this.container.querySelector('#intro-subtitle').textContent = levelConfig.subtitle;
    this.container.querySelector('#intro-desc').textContent = levelConfig.description;
    this.show('intro');
  }

  showGameOver(reason) {
    this.container.querySelector('#gameover-reason').textContent = reason;
    this.show('gameover');
  }

  showLevelComplete(levelName) {
    this.container.querySelector('#victory-level-text').textContent =
      `${levelName} completado. El pasillo siguiente te espera.`;
    this.show('victoryLevel');
  }

  hideAll() {
    for (const el of Object.values(this.screens)) {
      el.classList.remove('active');
    }
  }
}
