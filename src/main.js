import { SceneSetup } from './core/SceneSetup.js';
import { InputManager } from './core/InputManager.js';
import { AudioManager } from './core/AudioManager.js';
import { MazeBuilder } from './maze/MazeBuilder.js';
import { Player } from './entities/Player.js';
import { Entity } from './entities/Entity.js';
import { Pickup } from './entities/Pickup.js';
import { SurvivalSystem } from './systems/SurvivalSystem.js';
import { LevelManager } from './systems/LevelManager.js';
import { HUD } from './ui/HUD.js';
import { Screens } from './ui/Screens.js';

const STATE = {
  HOME: 'home',
  INTRO: 'intro',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  VICTORY_LEVEL: 'victory_level',
  VICTORY: 'victory',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.gameContainer = document.getElementById('game-container');
    this.uiLayer = document.getElementById('ui-layer');

    this.sceneSetup = new SceneSetup(this.canvas);
    this.input = new InputManager(this.canvas);
    this.audio = new AudioManager();
    this.levelManager = new LevelManager();
    this.survival = new SurvivalSystem();
    this.hud = new HUD(this.uiLayer);
    this.screens = new Screens(this.uiLayer, this.gameContainer);

    this.mazeBuilder = null;
    this.player = null;
    this.entity = null;
    this.pickup = null;

    this.state = STATE.HOME;
    this.exitUnlocked = false;
    this.rafId = null;

    this._bindScreens();
    this._bindInput();
    this._init();
  }

  _init() {
    const { scene, camera } = this.sceneSetup.init();
    this.scene = scene;
    this.camera = camera;
    this.mazeBuilder = new MazeBuilder(scene);
    this.player = new Player(camera, scene);
    this.entity = new Entity(scene);
    this.pickup = new Pickup(scene);

    this._loop();
  }

  _bindScreens() {
    this.screens.onEnterClick = () => {
      this.audio.init();
      this.audio.resume();
    };

    this.screens.onEnter = () => {
      this.levelManager.reset();
      this._startLevel(0);
    };

    this.screens.onResume = () => {
      this.state = STATE.PLAYING;
      this.screens.hideAll();
      this.hud.show();
      this.input.requestPointerLock();
    };

    this.screens.onRetry = () => {
      this._cleanupLevel();
      this.levelManager.reset();
      this.survival.reset();
      this.hud.reset();
      this.audio.stopDrone();
      this._startLevel(0);
    };

    this.screens.onNextLevel = () => {
      if (this.state === STATE.INTRO) {
        this._beginGameplay();
      } else if (this.state === STATE.VICTORY_LEVEL) {
        this._cleanupLevel();
        this.levelManager.advanceLevel();
        this._startLevel(this.levelManager.currentLevel);
      }
    };
  }

  _bindInput() {
    this.input.onEscape = () => {
      if (this.screens.settingsPanel.isOpen) return;
      if (this.state === STATE.PLAYING) {
        this.state = STATE.PAUSED;
        this.input.releasePointerLock();
        this.hud.hide();
        this.screens.show('pause');
      }
    };
  }

  _startLevel(levelIndex) {
    this._cleanupLevel();
    this.survival.reset();
    this.exitUnlocked = false;

    const { config, mazeData } = this.levelManager.generateLevel(levelIndex);
    this.currentTheme = config.theme;
    this.sceneSetup.applyTheme(config.theme);
    this.mazeBuilder.build(mazeData, config.theme);
    this.sceneSetup.addLights(config.theme, mazeData.width, mazeData.height);

    const start = this.levelManager.getPlayerStart();
    this.player.reset(start.x, start.z);

    this.pickup.spawn(mazeData, config.keyCount, start.x, start.z);

    const entityStart = this.levelManager.getEntityStart(config);
    if (entityStart) {
      this.entity.spawn(mazeData, config.id, entityStart.x, entityStart.y);
    } else {
      this.entity.dispose();
    }

    this.state = STATE.INTRO;
    this.screens.showIntro(config);
    this.hud.hide();
  }

  _beginGameplay() {
    this.state = STATE.PLAYING;
    this.screens.hideAll();
    this.hud.show();
    this.hud.reset();
    this.audio.startDrone();
    this.audio.startAmbience(this.currentTheme ? this.currentTheme.ambience : null);
    this.input.requestPointerLock();
  }

  _cleanupLevel() {
    this.mazeBuilder.clear();
    this.sceneSetup.clearLights();
    this.pickup.clear();
    this.entity.dispose();
    this.exitUnlocked = false;
  }

  _gameOver(reason) {
    this.state = STATE.GAMEOVER;
    this.input.releasePointerLock();
    this.hud.hide();
    this.hud.triggerFlash(0.5);
    this.audio.playStaticBurst();
    this.audio.stopDrone();
    this.screens.showGameOver(reason);
  }

  _levelComplete() {
    this.input.releasePointerLock();
    this.hud.hide();
    this.audio.stopDrone();

    if (this.levelManager.isLastLevel) {
      this.state = STATE.VICTORY;
      this._saveVictory();
      this.screens.show('victory');
    } else {
      this.state = STATE.VICTORY_LEVEL;
      const config = this.levelManager.getLevelConfig();
      this.screens.showLevelComplete(config.name);
    }
  }

  _saveVictory() {
    try {
      localStorage.setItem('backrooms_completed', 'true');
      localStorage.setItem('backrooms_completed_at', new Date().toISOString());
    } catch (_) {
      /* localStorage unavailable */
    }
  }

  _updatePlaying(dt) {
    this.input.applyLook(this.camera);

    if (this.input.isFlashlightToggle()) {
      this.player.toggleFlashlight(this.survival.battery);
    }

    const playerPos = this.player.update(
      this.input,
      dt,
      this.mazeBuilder.wallBoxes
    );

    const survivalState = this.survival.update(
      dt,
      this.player.flashlightOn,
      this.entity.active ? this.entity.getDistanceTo(playerPos) : Infinity
    );

    if (!survivalState.flashlightOn && this.player.flashlightOn) {
      this.player.setFlashlightState(false);
    } else if (survivalState.flashlightOn && !this.player.flashlightOn && this.survival.battery > 0) {
      /* player toggled off manually, respect that */
    }

    if (survivalState.battery <= 0) {
      this.player.setFlashlightState(false);
    }

    const entityResult = this.entity.update(dt, playerPos);
    if (entityResult.caught) {
      this._gameOver('Te atrapó. El lugar te reclamó.');
      return;
    }

    if (survivalState.sanityDepleted) {
      this._gameOver('Te absorbió el lugar.');
      return;
    }

    const newKey = this.pickup.update(dt, playerPos);
    if (newKey !== null) {
      this.audio.playKeyPickup();
      const config = this.levelManager.getLevelConfig();
      this.hud.showMessage(`Llave ${newKey} / ${config.keyCount}`);
    }

    if (!this.exitUnlocked && this.pickup.allCollected()) {
      this.exitUnlocked = true;
      this.mazeBuilder.unlockExit();
      this.hud.showMessage('Salida desbloqueada');
    }

    if (this.exitUnlocked && this.mazeBuilder.checkExitCollision(playerPos)) {
      this._levelComplete();
      return;
    }

    const config = this.levelManager.getLevelConfig();
    this.hud.update({
      levelName: config.name,
      keysCollected: this.pickup.collected,
      keysTotal: config.keyCount,
      sanity: survivalState.sanity,
      battery: survivalState.battery,
      entityDistance: entityResult.distance,
      exitUnlocked: this.exitUnlocked,
      dt,
    });

    this.sceneSetup.updateLights(dt);
  }

  _loop() {
    const dt = Math.min(this.sceneSetup.getDelta(), 0.05);

    if (this.state === STATE.PLAYING) {
      this._updatePlaying(dt);
    }

    this.sceneSetup.render();
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this._cleanupLevel();
    this.mazeBuilder.dispose();
    this.entity.dispose();
    this.pickup.dispose();
    this.audio.dispose();
    this.sceneSetup.dispose();
  }
}

const game = new Game();
