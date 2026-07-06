import * as THREE from 'three';
import { PLAYER_CONFIG } from '../../config/player.config.js';

const { baseSpeed, sprintMultiplier, eyeHeight, collisionRadius, headBob, flashlight } =
  PLAYER_CONFIG;

/**
 * First-person player controller with collision and flashlight.
 */
export class Player {
  constructor(camera, scene) {
    this.camera = camera;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.bobTimer = 0;
    this.baseY = eyeHeight;

    this.flashlight = new THREE.SpotLight(
      flashlight.color,
      flashlight.intensity,
      flashlight.distance,
      flashlight.angle,
      flashlight.penumbra,
      flashlight.decay
    );
    this.flashlight.position.set(0, 0, 0);
    this.flashlight.target.position.set(0, 0, -1);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);
    scene.add(this.camera);

    this.flashlightOn = true;
    this.flashlight.visible = true;
    this.speedMultiplier = 1;
  }

  reset(x, z) {
    this.position.set(x, eyeHeight, z);
    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.bobTimer = 0;
    this.flashlightOn = true;
    this.flashlight.visible = true;
  }

  toggleFlashlight(battery) {
    if (battery <= 0) {
      this.flashlightOn = false;
      this.flashlight.visible = false;
      return false;
    }
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.visible = this.flashlightOn;
    return this.flashlightOn;
  }

  setFlashlightState(on) {
    this.flashlightOn = on && this.flashlight.intensity > 0;
    this.flashlight.visible = this.flashlightOn;
  }

  update(input, dt, wallBoxes) {
    const move = input.getMovementVector();
    const sprinting = input.isSprinting();
    const speed = baseSpeed * (sprinting ? sprintMultiplier : 1) * this.speedMultiplier;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const wishDir = new THREE.Vector3();
    wishDir.addScaledVector(forward, -move.z);
    wishDir.addScaledVector(right, move.x);
    if (wishDir.lengthSq() > 0) wishDir.normalize();

    this.velocity.x = wishDir.x * speed;
    this.velocity.z = wishDir.z * speed;

    let newX = this.position.x + this.velocity.x * dt;
    let newZ = this.position.z + this.velocity.z * dt;

    newX = this._resolveAxis(this.position.x, newX, this.position.z, wallBoxes, 'x');
    newZ = this._resolveAxis(this.position.z, newZ, this.position.x, wallBoxes, 'z');

    this.position.x = newX;
    this.position.z = newZ;

    const moving = input.isMoving();
    if (moving) {
      this.bobTimer += dt * (sprinting ? headBob.sprintSpeed : headBob.walkSpeed);
      const bob = Math.sin(this.bobTimer) * headBob.amplitude;
      this.camera.position.set(this.position.x, this.baseY + bob, this.position.z);
    } else {
      this.bobTimer = 0;
      this.camera.position.set(this.position.x, this.baseY, this.position.z);
    }

    return { x: this.position.x, z: this.position.z };
  }

  _resolveAxis(current, next, fixed, wallBoxes, axis) {
    const r = collisionRadius;
    for (const box of wallBoxes) {
      let testX;
      let testZ;
      if (axis === 'x') {
        testX = next;
        testZ = fixed;
      } else {
        testX = fixed;
        testZ = next;
      }

      const closestX = Math.max(box.minX, Math.min(testX, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(testZ, box.maxZ));
      const dx = testX - closestX;
      const dz = testZ - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < r * r) {
        if (axis === 'x') {
          if (current <= box.minX || current >= box.maxX) {
            next = current;
          } else if (testX > current) {
            next = box.minX - r - 0.001;
          } else {
            next = box.maxX + r + 0.001;
          }
        } else if (current <= box.minZ || current >= box.maxZ) {
          next = current;
        } else if (testZ > current) {
          next = box.minZ - r - 0.001;
        } else {
          next = box.maxZ + r + 0.001;
        }
      }
    }
    return next;
  }

  getPosition() {
    return { x: this.position.x, y: this.position.y, z: this.position.z };
  }

  getWorldPosition() {
    return this.position.clone();
  }
}

export const EYE_HEIGHT = eyeHeight;
export const COLLISION_RADIUS = collisionRadius;
