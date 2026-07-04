const MOUSE_SENSITIVITY = 0.0022;

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouseDelta = { x: 0, y: 0 };
    this.isPointerLocked = false;
    this.onPointerLockChange = null;
    this.onEscape = null;

    this._bindEvents();
  }

  _bindEvents() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape' && this.onEscape) {
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
      if (this.onPointerLockChange) {
        this.onPointerLockChange(this.isPointerLocked);
      }
    });

    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }
    });
  }

  requestPointerLock() {
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

  isMoving() {
    return (
      this.keys['KeyW'] ||
      this.keys['KeyS'] ||
      this.keys['KeyA'] ||
      this.keys['KeyD']
    );
  }

  isSprinting() {
    return this.keys['ShiftLeft'] || this.keys['ShiftRight'];
  }

  isFlashlightToggle() {
    if (this.keys['KeyF']) {
      this.keys['KeyF'] = false;
      return true;
    }
    return false;
  }

  getMovementVector() {
    let x = 0;
    let z = 0;
    if (this.keys['KeyW']) z -= 1;
    if (this.keys['KeyS']) z += 1;
    if (this.keys['KeyA']) x -= 1;
    if (this.keys['KeyD']) x += 1;

    const len = Math.sqrt(x * x + z * z);
    if (len > 0) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  applyLook(camera, delta) {
    const mouse = this.consumeMouseDelta();
    camera.rotation.order = 'YXZ';
    camera.rotation.y -= mouse.x * MOUSE_SENSITIVITY;
    camera.rotation.x -= mouse.y * MOUSE_SENSITIVITY;
    camera.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, camera.rotation.x));
  }
}
