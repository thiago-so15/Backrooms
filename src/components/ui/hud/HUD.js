import { UI_CONFIG } from '../../../config/ui.config.js';
import { PLAYER_CONFIG } from '../../../config/player.config.js';
import { Minimap } from './Minimap.js';

/**
 * In-game HUD overlay (HTML, not canvas 3D).
 */
export class HUD {
  constructor(container) {
    this.container = container;
    this.flashTimer = 0;
    this.messageTimer = 0;
    this.messageText = '';
    this.vignetteIntensity = 0;
    this.minimap = null;
    this._build();
  }

  _build() {
    this.container.innerHTML = `
      <div id="hud" class="hidden">
        <div class="hud-top-left">
          <div id="hud-level">NIVEL 0</div>
          <div id="hud-keys">Llaves: 0 / 0</div>
          <div id="hud-coins">Monedas: 0</div>
          <div id="hud-objective">Encuentra las llaves</div>
        </div>
        <div class="hud-top-right">
          <div class="hud-minimap-wrap">
            <canvas id="hud-minimap" width="148" height="148" aria-label="Mapa"></canvas>
            <div class="hud-minimap-legend">
              <span><i class="leg-player"></i>Vos</span>
              <span><i class="leg-key"></i>Llave</span>
              <span><i class="leg-exit"></i>Salida</span>
              <span><i class="leg-entity"></i>Enemigo</span>
              <span><i class="leg-smiler"></i>Smiler</span>
            </div>
          </div>
          <div class="hud-bars">
            <div class="bar-label">CORDURA</div>
            <div class="bar-container"><div id="bar-sanity" class="bar-fill"></div></div>
            <div class="bar-label">BATERÍA</div>
            <div class="bar-container"><div id="bar-battery" class="bar-fill"></div></div>
          </div>
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
    this.coinsEl = this.container.querySelector('#hud-coins');
    this.objectiveEl = this.container.querySelector('#hud-objective');
    this.sanityBar = this.container.querySelector('#bar-sanity');
    this.batteryBar = this.container.querySelector('#bar-battery');
    this.messageEl = this.container.querySelector('#hud-message');
    this.vignetteEl = this.container.querySelector('#vignette');
    this.flashEl = this.container.querySelector('#flash-overlay');
    this.minimap = new Minimap(this.container.querySelector('#hud-minimap'));
  }

  setMaze(mazeData) {
    this.minimap?.setMaze(mazeData);
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
      coins,
      sanity,
      battery,
      maxSanity,
      maxBattery,
      entityDistance,
      exitUnlocked,
      playerPos,
      playerYaw,
      keys,
      exit,
      entity,
      entities,
    } = state;

    this.levelEl.textContent = levelName;
    this.keysEl.textContent = `Llaves: ${keysCollected} / ${keysTotal}`;
    this.coinsEl.textContent = `Monedas: ${coins ?? 0}`;
    this.objectiveEl.textContent = exitUnlocked
      ? 'Dirígete a la salida'
      : 'Encuentra las llaves';

    this._setBar(this.sanityBar, sanity, maxSanity ?? PLAYER_CONFIG.survival.maxStat);
    this._setBar(this.batteryBar, battery, maxBattery ?? PLAYER_CONFIG.survival.maxStat);

    this.minimap?.update({
      playerPos,
      playerYaw,
      keys,
      exit,
      exitUnlocked,
      entity,
      entities,
    });

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

  _setBar(el, current, max) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
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
