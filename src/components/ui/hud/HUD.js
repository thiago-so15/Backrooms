import { UI_CONFIG } from '../../../config/ui.config.js';
import { PLAYER_CONFIG } from '../../../config/player.config.js';

/**
 * In-game HUD overlay (HTML, not canvas).
 */
export class HUD {
  constructor(container) {
    this.container = container;
    this.flashTimer = 0;
    this.messageTimer = 0;
    this.messageText = '';
    this.vignetteIntensity = 0;
    this._build();
  }

  _build() {
    this.container.innerHTML = `
      <div id="hud" class="hidden">
        <div class="hud-top-left">
          <div id="hud-level">NIVEL 0</div>
          <div id="hud-keys">Llaves: 0 / 0</div>
          <div id="hud-objective">Encuentra las llaves</div>
        </div>
        <div class="hud-top-right">
          <div class="bar-label">CORDURA</div>
          <div class="bar-container"><div id="bar-sanity" class="bar-fill"></div></div>
          <div class="bar-label">BATERÍA</div>
          <div class="bar-container"><div id="bar-battery" class="bar-fill"></div></div>
        </div>
        <div id="crosshair">+</div>
        <div id="hud-message"></div>
        <div id="vignette"></div>
        <div id="flash-overlay"></div>
      </div>
    `;

    this.hud = this.container.querySelector('#hud');
    this.levelEl = this.container.querySelector('#hud-level');
    this.keysEl = this.container.querySelector('#hud-keys');
    this.objectiveEl = this.container.querySelector('#hud-objective');
    this.sanityBar = this.container.querySelector('#bar-sanity');
    this.batteryBar = this.container.querySelector('#bar-battery');
    this.messageEl = this.container.querySelector('#hud-message');
    this.vignetteEl = this.container.querySelector('#vignette');
    this.flashEl = this.container.querySelector('#flash-overlay');
  }

  show() {
    this.hud.classList.remove('hidden');
  }

  hide() {
    this.hud.classList.add('hidden');
  }

  update(state) {
    const {
      levelName,
      keysCollected,
      keysTotal,
      sanity,
      battery,
      entityDistance,
      exitUnlocked,
    } = state;

    this.levelEl.textContent = levelName;
    this.keysEl.textContent = `Llaves: ${keysCollected} / ${keysTotal}`;
    this.objectiveEl.textContent = exitUnlocked
      ? 'Dirígete a la salida'
      : 'Encuentra las llaves';

    this._setBar(this.sanityBar, sanity);
    this._setBar(this.batteryBar, battery);

    const hudCfg = UI_CONFIG.hud;
    const entityRadius = hudCfg.entityProximityRadius;

    let vignette = 0;
    if (sanity < hudCfg.sanityWarningThreshold) {
      vignette = Math.max(vignette, (hudCfg.sanityWarningThreshold - sanity) / hudCfg.sanityWarningThreshold);
    }
    if (entityDistance < entityRadius) {
      vignette = Math.max(vignette, ((entityRadius - entityDistance) / entityRadius) * 0.8);
    }
    this.vignetteIntensity = vignette;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
    this.vignetteEl.style.opacity = String(vignette * (0.5 + pulse * 0.5));

    if (this.messageTimer > 0) {
      this.messageTimer -= state.dt;
      this.messageEl.textContent = this.messageText;
      this.messageEl.style.opacity = String(Math.min(1, this.messageTimer));
      if (this.messageTimer <= 0) {
        this.messageEl.textContent = '';
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= state.dt;
      this.flashEl.style.opacity = String(Math.min(1, this.flashTimer * 4));
      if (this.flashTimer <= 0) {
        this.flashEl.style.opacity = '0';
      }
    }
  }

  _setBar(el, value) {
    const pct = Math.max(0, Math.min(PLAYER_CONFIG.survival.maxStat, value));
    el.style.width = `${pct}%`;
    const colors = UI_CONFIG.hud.barColors;
    if (pct > 50) {
      el.style.background = colors.high;
    } else if (pct > 25) {
      el.style.background = colors.medium;
    } else {
      el.style.background = colors.low;
    }
  }

  showMessage(text, duration = UI_CONFIG.hud.messageDuration) {
    this.messageText = text;
    this.messageTimer = duration;
  }

  triggerFlash(duration = UI_CONFIG.hud.flashDuration) {
    this.flashTimer = duration;
  }

  reset() {
    this.messageTimer = 0;
    this.flashTimer = 0;
    this.messageText = '';
    this.vignetteIntensity = 0;
    this.vignetteEl.style.opacity = '0';
    this.flashEl.style.opacity = '0';
  }
}
