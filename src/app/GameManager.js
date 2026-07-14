import { GAME_STATE } from '../constants/gameState.js';
import { GAME_EVENTS } from '../constants/events.js';
import { GAME_CONFIG } from '../config/game.config.js';
import { eventBus } from '../systems/events/EventBus.js';
import { LightingManager } from '../systems/lighting/LightingManager.js';
import { InputManager } from '../systems/player/InputManager.js';
import { AudioManager } from '../systems/audio/AudioManager.js';
import { LevelManager } from '../systems/level/LevelManager.js';
import { SurvivalSystem } from '../systems/survival/SurvivalSystem.js';
import { UIManager } from '../systems/ui/UIManager.js';
import { saveManager } from '../systems/save/SaveManager.js';
import { MazeBuilder } from '../graphics/maze/MazeBuilder.js';
import { Player } from '../entities/player/Player.js';
import { Entity } from '../entities/enemy/Entity.js';
import { Pickup } from '../entities/items/Pickup.js';
import { CoinPickup } from '../entities/items/CoinPickup.js';
import { currencyManager } from '../systems/economy/CurrencyManager.js';
import { shopManager } from '../systems/economy/ShopManager.js';
import { getDeviceType, getDeviceLabel, getDeviceHint, isMobileDevice } from '../utils/platform.js';

/**
 * Central game orchestrator — wires managers and runs the main loop.
 */
export class GameManager {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.gameContainer = document.getElementById('game-container');
    this.uiLayer = document.getElementById('ui-layer');

    this.lighting = new LightingManager(this.canvas);
    this.input = new InputManager(this.canvas);
    this.audio = new AudioManager();
    this.levelManager = new LevelManager();
    this.survival = new SurvivalSystem();
    this.deviceType = getDeviceType();
    this.input.setMobileMode(isMobileDevice());
    this.ui = new UIManager(this.uiLayer, this.gameContainer, this.input);

    this.mazeBuilder = null;
    this.player = null;
    this.entity = null;
    this.pickup = null;
    this.coinPickup = null;

    this.scene = null;
    this.camera = null;
    this.currentTheme = null;
    this.state = GAME_STATE.HOME;
    this.exitUnlocked = false;
    this.rafId = null;

    this._bindScreens();
    this._bindInput();
    this._bindEvents();
    this._init();
  }

  _init() {
    const { scene, camera } = this.lighting.init();
    this.scene = scene;
    this.camera = camera;
    this.mazeBuilder = new MazeBuilder(scene);
    this.player = new Player(camera, scene);
    this.entity = new Entity(scene);
    this.pickup = new Pickup(scene);
    this.coinPickup = new CoinPickup(scene);
    this._loop();
  }

  _setState(next) {
    this.state = next;
    eventBus.emit(GAME_EVENTS.STATE_CHANGED, { state: next });
  }

  _bindEvents() {
    eventBus.on(GAME_EVENTS.OBJECT_PICKED, ({ index, total }) => {
      this.ui.hud.showMessage(`Llave ${index} / ${total}`);
    });
  }

  _bindScreens() {
    const { screens } = this.ui;

    screens.onEnterClick = () => {
      this.audio.init();
      this.audio.resume();
      eventBus.emit(GAME_EVENTS.GAME_STARTED, {});
    };

    screens.onEnter = (levelIndex = 0) => {
      this.levelManager.reset();
      this._startLevel(levelIndex);
    };

    screens.onContinue = (levelIndex) => {
      this._startLevel(levelIndex);
    };

    screens.onResume = () => {
      this._setState(GAME_STATE.PLAYING);
      screens.hideAll();
      this.ui.hud.show();
      this._showPlayControls();
      eventBus.emit(GAME_EVENTS.GAME_RESUMED, {});
    };

    screens.onRetry = () => {
      this._cleanupLevel();
      this.levelManager.reset();
      this.survival.reset();
      this.ui.hud.reset();
      this.audio.stopDrone();
      this._startLevel(0);
    };

    screens.onNextLevel = () => {
      if (this.state === GAME_STATE.INTRO) {
        this._beginGameplay();
      } else if (this.state === GAME_STATE.VICTORY_LEVEL) {
        this._cleanupLevel();
        this.levelManager.advanceLevel();
        // Persist checkpoint so closing the tab mid-run still allows continue
        saveManager.saveLevelProgress(this.levelManager.currentLevel);
        this._startLevel(this.levelManager.currentLevel);
      }
    };

    screens.onGoHome = (opts = {}) => {
      this._cleanupLevel();
      this.audio.stopDrone();
      this.ui.hud.hide();
      this._hidePlayControls();

      if (opts.fromFinalVictory) {
        saveManager.clearLevelProgress();
      } else if (this.state === GAME_STATE.VICTORY_LEVEL) {
        // Save the next level so Home offers "Continuar por el nivel N"
        const nextIndex = this.levelManager.currentLevel + 1;
        saveManager.saveLevelProgress(nextIndex);
      }

      this._setState(GAME_STATE.HOME);
      this.ui.screens.showHome();
    };
  }

  _bindInput() {
    this.input.onEscape = () => {
      if (this.ui.settingsPanel.isOpen || this.ui.shopPanel.isOpen) return;
      if (this.state === GAME_STATE.PLAYING) {
        this._setState(GAME_STATE.PAUSED);
        this._hidePlayControls();
        this.ui.hud.hide();
        this.ui.screens.show('pause');
        eventBus.emit(GAME_EVENTS.GAME_PAUSED, {});
      }
    };
  }

  _startLevel(levelIndex) {
    this._cleanupLevel();
    this.survival.reset();
    this.exitUnlocked = false;

    const { config, mazeData } = this.levelManager.generateLevel(levelIndex);
    this.currentTheme = config.theme;
    this.currentMazeData = mazeData;
    this.lighting.applyTheme(config.theme);
    this.mazeBuilder.build(mazeData, config.theme);
    this.lighting.addLights(config.theme, mazeData.width, mazeData.height);
    this.ui.hud.setMaze(mazeData);

    const start = this.levelManager.getPlayerStart();
    this.player.reset(start.x, start.z);
    this.pickup.spawn(mazeData, config.keyCount, start.x, start.z);
    this.coinPickup.spawn(
      mazeData,
      config.coinCount ?? 5,
      start.x,
      start.z,
      this.pickup.getOccupiedCells()
    );

    this._applyShopModifiers();

    const entityStart = this.levelManager.getEntityStart(config);
    if (entityStart) {
      this.entity.spawn(mazeData, config.id, entityStart.x, entityStart.y);
    } else {
      this.entity.dispose();
    }

    this._setState(GAME_STATE.INTRO);
    this.ui.screens.showIntro(
      config,
      getDeviceLabel(this.deviceType),
      getDeviceHint(this.deviceType)
    );
    this.ui.hud.hide();
    this.ui.touchControls.hide();
  }

  _applyShopModifiers() {
    const mods = shopManager.getModifiers();
    this.player.speedMultiplier = mods.speedMult;
  }

  _showPlayControls() {
    if (this.input.isMobile) {
      this.ui.touchControls.show();
    } else {
      this.input.requestPointerLock();
    }
  }

  _hidePlayControls() {
    this.ui.touchControls.hide();
    this.input.releasePointerLock();
  }

  _beginGameplay() {
    this._setState(GAME_STATE.PLAYING);
    this.ui.screens.hideAll();
    this.ui.hud.show();
    this.ui.hud.reset();
    this._applyShopModifiers();
    this.survival.reset();
    this.audio.startDrone();
    this.audio.startAmbience(this.currentTheme?.ambience ?? null);
    this._showPlayControls();
    eventBus.emit(GAME_EVENTS.GAME_RESUMED, {});
  }

  _cleanupLevel() {
    this.mazeBuilder.clear();
    this.lighting.clearLights();
    this.pickup.clear();
    this.coinPickup.clear();
    this.entity.dispose();
    this.exitUnlocked = false;
  }

  _gameOver(reason) {
    this._setState(GAME_STATE.GAMEOVER);
    this._hidePlayControls();
    this.ui.hud.hide();
    this.ui.hud.triggerFlash();
    this.audio.playStaticBurst();
    this.audio.stopDrone();
    this.ui.screens.showGameOver(reason);
    eventBus.emit(GAME_EVENTS.PLAYER_DIED, { reason });
  }

  _levelComplete() {
    this._hidePlayControls();
    this.ui.hud.hide();
    this.audio.stopDrone();

    if (this.levelManager.isLastLevel) {
      this._setState(GAME_STATE.VICTORY);
      saveManager.saveVictory();
      this.ui.screens.show('victory');
    } else {
      this._setState(GAME_STATE.VICTORY_LEVEL);
      const config = this.levelManager.getLevelConfig();
      const nextIndex = this.levelManager.currentLevel + 1;
      this.ui.screens.showLevelComplete(config.name, nextIndex);
    }

    eventBus.emit(GAME_EVENTS.LEVEL_COMPLETED, {
      levelIndex: this.levelManager.currentLevel,
      isLast: this.levelManager.isLastLevel,
    });
  }

  _updatePlaying(dt) {
    this.input.applyLook(this.camera);

    if (this.input.isFlashlightToggle()) {
      this.player.toggleFlashlight(this.survival.battery);
    }

    const playerPos = this.player.update(this.input, dt, this.mazeBuilder.wallBoxes);

    const survivalState = this.survival.update(
      dt,
      this.player.flashlightOn,
      this.entity.active ? this.entity.getDistanceTo(playerPos) : Infinity
    );

    if (!survivalState.flashlightOn && this.player.flashlightOn) {
      this.player.setFlashlightState(false);
    }

    if (survivalState.battery <= 0) {
      this.player.setFlashlightState(false);
      eventBus.emit(GAME_EVENTS.BATTERY_LOW, { battery: 0 });
    }

    const entityResult = this.entity.update(dt, playerPos);
    if (entityResult.caught) {
      this._gameOver(GAME_CONFIG.gameOverMessages.caught);
      return;
    }

    if (survivalState.sanityDepleted) {
      this._gameOver(GAME_CONFIG.gameOverMessages.sanity);
      return;
    }

    const newKey = this.pickup.update(dt, playerPos);
    if (newKey !== null) {
      this.audio.playKeyPickup();
    }

    const coinsCollected = this.coinPickup.update(dt, playerPos);
    if (coinsCollected !== null) {
      currencyManager.addCoins(coinsCollected);
      this.audio.playKeyPickup();
      this.ui.hud.showMessage(`+${coinsCollected} moneda${coinsCollected > 1 ? 's' : ''}`);
    }

    if (!this.exitUnlocked && this.pickup.allCollected()) {
      this.exitUnlocked = true;
      this.mazeBuilder.unlockExit();
      this.ui.hud.showMessage('Salida desbloqueada');
      eventBus.emit(GAME_EVENTS.EXIT_UNLOCKED, {});
    }

    if (this.exitUnlocked && this.mazeBuilder.checkExitCollision(playerPos)) {
      this._levelComplete();
      return;
    }

    const config = this.levelManager.getLevelConfig();
    const exitDoor = this.mazeBuilder.exitDoor;
    this.ui.hud.update({
      levelName: config.name,
      keysCollected: this.pickup.collected,
      keysTotal: config.keyCount,
      coins: currencyManager.getBalance(),
      sanity: survivalState.sanity,
      battery: survivalState.battery,
      maxSanity: survivalState.maxSanity,
      maxBattery: survivalState.maxBattery,
      entityDistance: entityResult.distance,
      exitUnlocked: this.exitUnlocked,
      playerPos,
      playerYaw: this.camera.rotation.y,
      keys: this.pickup.keys,
      exit: exitDoor ? exitDoor.position : null,
      entity: this.entity.active
        ? { x: this.entity.worldX, z: this.entity.worldZ, active: true }
        : null,
      dt,
    });

    this.lighting.updateLights(dt);
  }

  _loop() {
    const dt = Math.min(this.lighting.getDelta(), GAME_CONFIG.maxDeltaTime);

    if (this.state === GAME_STATE.PLAYING) {
      this._updatePlaying(dt);
    }

    this.lighting.render();
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this._cleanupLevel();
    this.mazeBuilder.dispose();
    this.entity.dispose();
    this.pickup.dispose();
    this.coinPickup.dispose();
    this.audio.dispose();
    this.lighting.dispose();
    this.ui.dispose();
  }
}
