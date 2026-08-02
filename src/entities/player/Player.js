import * as THREE from 'three';
import { PLAYER_CONFIG } from '../../config/player.config.js';

const { baseSpeed, sprintMultiplier, eyeHeight, collisionRadius, headBob, flashlight } =
  PLAYER_CONFIG;

const THIRD_PERSON_DISTANCE = 3.4;
const THIRD_PERSON_HEIGHT = 1.15;
const CAMERA_COLLISION_RADIUS = 0.28;
const CAMERA_MIN_DISTANCE = 0.55;

/**
 * First-person player controller with optional visible body (third person).
 */
export class Player {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.bobTimer = 0;
    this.baseY = eyeHeight;
    this.bodyVisible = false;

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

    this.body = this._createBody();
    this.body.visible = false;
    scene.add(this.body);
  }

  _createBody() {
    const group = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.85 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x3a4a38, roughness: 0.75 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x1e2420, roughness: 0.8 });
    const shoes = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 });
    this._bodyMats = { skin, shirt, pants, shoes };

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.75, 10), shirt);
    torso.position.y = 1.05;
    group.add(torso);

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), pants);
    legs.position.y = 0.4;
    group.add(legs);

    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), shoes);
    footL.position.set(-0.12, 0.06, 0.04);
    group.add(footL);
    const footR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), shoes);
    footR.position.set(0.12, 0.06, 0.04);
    group.add(footR);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), skin);
    head.position.y = 1.62;
    group.add(head);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    leftEye.position.set(-0.08, 1.65, 0.2);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    rightEye.position.set(0.08, 1.65, 0.2);
    group.add(rightEye);

    return group;
  }

  /** Apply cosmetic outfit colors (third-person body). */
  applySkin(colors) {
    if (!this._bodyMats || !colors) return;
    const { skin, shirt, pants, shoes } = this._bodyMats;
    if (colors.skin != null) skin.color.setHex(colors.skin);
    if (colors.shirt != null) shirt.color.setHex(colors.shirt);
    if (colors.pants != null) pants.color.setHex(colors.pants);
    if (colors.shoes != null) shoes.color.setHex(colors.shoes);
  }

  reset(x, z) {
    this.position.set(x, eyeHeight, z);
    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.bobTimer = 0;
    this.flashlightOn = true;
    this.flashlight.visible = true;
    this.setBodyVisible(false);
    this._syncBody();
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

  /** Show/hide the player body (third-person when visible). */
  toggleBodyVisible() {
    this.setBodyVisible(!this.bodyVisible);
    return this.bodyVisible;
  }

  setBodyVisible(visible) {
    this.bodyVisible = Boolean(visible);
    if (this.body) this.body.visible = this.bodyVisible;
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
    if (this.bodyVisible) {
      this.bobTimer = 0;
      this._applyThirdPersonCamera(wallBoxes);
    } else if (moving) {
      this.bobTimer += dt * (sprinting ? headBob.sprintSpeed : headBob.walkSpeed);
      const bob = Math.sin(this.bobTimer) * headBob.amplitude;
      this.camera.position.set(this.position.x, this.baseY + bob, this.position.z);
    } else {
      this.bobTimer = 0;
      this.camera.position.set(this.position.x, this.baseY, this.position.z);
    }

    this._syncBody();

    return { x: this.position.x, z: this.position.z };
  }

  _applyThirdPersonCamera(wallBoxes) {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }

    const pitch = this.camera.rotation.x;
    const lift =
      this.baseY +
      THIRD_PERSON_HEIGHT * 0.35 +
      Math.sin(Math.max(-0.6, Math.min(0.6, pitch))) * 0.55;

    const originX = this.position.x;
    const originY = this.baseY;
    const originZ = this.position.z;

    // Direction from player toward the ideal camera (behind the look)
    const dirX = -forward.x;
    const dirZ = -forward.z;
    const dirY = (lift - originY) / THIRD_PERSON_DISTANCE;

    const idealDist = THIRD_PERSON_DISTANCE;
    const dist = this._clampCameraDistance(
      originX,
      originY,
      originZ,
      dirX,
      dirY,
      dirZ,
      idealDist,
      wallBoxes
    );

    this.camera.position.set(
      originX + dirX * dist,
      originY + dirY * dist,
      originZ + dirZ * dist
    );
  }

  /**
   * Pull the camera in if the path to the ideal spot hits a wall.
   */
  _clampCameraDistance(ox, oy, oz, dx, dy, dz, maxDist, wallBoxes) {
    if (!wallBoxes?.length) return maxDist;

    const r = CAMERA_COLLISION_RADIUS;
    const idealX = ox + dx * maxDist;
    const idealY = oy + dy * maxDist;
    const idealZ = oz + dz * maxDist;

    if (!this._sphereHitsWall(idealX, idealY, idealZ, r, wallBoxes)) {
      // Still check midpoints in case the camera sits in a gap past a thin wall
      const mid = maxDist * 0.5;
      if (!this._sphereHitsWall(ox + dx * mid, oy + dy * mid, oz + dz * mid, r, wallBoxes)) {
        return maxDist;
      }
    }

    let lo = CAMERA_MIN_DISTANCE;
    let hi = maxDist;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) * 0.5;
      if (this._sphereHitsWall(ox + dx * mid, oy + dy * mid, oz + dz * mid, r, wallBoxes)) {
        hi = mid;
      } else {
        lo = mid;
      }
    }

    return Math.max(CAMERA_MIN_DISTANCE, lo - 0.12);
  }

  _sphereHitsWall(x, y, z, radius, wallBoxes) {
    const r2 = radius * radius;
    for (const box of wallBoxes) {
      const cx = Math.max(box.minX, Math.min(x, box.maxX));
      const cy = Math.max(box.minY ?? -Infinity, Math.min(y, box.maxY ?? Infinity));
      const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
      const ddx = x - cx;
      const ddy = y - cy;
      const ddz = z - cz;
      if (ddx * ddx + ddy * ddy + ddz * ddz < r2) return true;
    }
    return false;
  }

  _syncBody() {
    if (!this.body) return;
    this.body.position.set(this.position.x, 0, this.position.z);
    // Mesh faces +Z by default; camera looks -Z → flip π
    this.body.rotation.y = this.camera.rotation.y + Math.PI;
    this.body.visible = this.bodyVisible;
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
