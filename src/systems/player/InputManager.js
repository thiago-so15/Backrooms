import { settingsManager } from '../save/SettingsManager.js';
import { CONTROLS_CONFIG } from '../../config/controls.config.js';

/**
 * Keyboard + pointer lock input handling.
 */
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouseDelta = { x: 0, y: 0 };
    this.touchMove = { up: false, down: false, left: false, right: false };
    this.isMobile = false;
    this.isPointerLocked = false;
    this.onPointerLockChange = null;
    this.onEscape = null;

    this._bindEvents();
  }

  _bindEvents() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === CONTROLS_CONFIG.pauseKey && this.onEscape) {
        this.onEscape();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      this.onPointerLockChange?.(this.isPointerLocked);
    });

    this.canvas.addEventListener('click', () => {
      if (this.isMobile) return;
      if (!this.isPointerLocked && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }
    });
  }

  setMobileMode(enabled) {
    this.isMobile = enabled;
    if (enabled) this.releasePointerLock();
  }

  setTouchDirection(direction, active) {
    if (direction in this.touchMove) {
      this.touchMove[direction] = active;
    }
  }

  clearTouchDirections() {
    this.touchMove = { up: false, down: false, left: false, right: false };
  }

  requestPointerLock() {
    if (this.isMobile) return;
    this.canvas.requestPointerLock();
  }

  releasePointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }

  /** Touch drag look — accumulates pixel delta like mouse movement. */
  addLookDelta(dx, dy) {
    const scale = this.isMobile ? CONTROLS_CONFIG.touchLookScale : 1;
    this.mouseDelta.x += dx * scale;
    this.mouseDelta.y += dy * scale;
  }

  isMoving() {
    return (
      CONTROLS_CONFIG.movementKeys.some((key) => this.keys[key]) ||
      Object.values(this.touchMove).some(Boolean)
    );
  }

  isSprinting() {
    return CONTROLS_CONFIG.sprintKeys.some((key) => this.keys[key]);
  }

  isFlashlightToggle() {
    if (this.keys[CONTROLS_CONFIG.flashlightKey]) {
      this.keys[CONTROLS_CONFIG.flashlightKey] = false;
      return true;
    }
    return false;
  }

  getMovementVector() {
    let x = 0;
    let z = 0;
    if (this.keys['KeyW'] || this.touchMove.up) z -= 1;
    if (this.keys['KeyS'] || this.touchMove.down) z += 1;
    if (this.keys['KeyA'] || this.touchMove.left) x -= 1;
    if (this.keys['KeyD'] || this.touchMove.right) x += 1;

    const len = Math.sqrt(x * x + z * z);
    if (len > 0) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  applyLook(camera) {
    const mouse = this.consumeMouseDelta();
    const sensitivity =
      CONTROLS_CONFIG.baseMouseSensitivity * settingsManager.getSetting('mouseSensitivity');
    const invertY = settingsManager.getSetting('invertY') ? -1 : 1;

    camera.rotation.order = 'YXZ';
    camera.rotation.y -= mouse.x * sensitivity;
    camera.rotation.x -= mouse.y * sensitivity * invertY;
    camera.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, camera.rotation.x));
  }
}
