import * as THREE from 'three';
import { MazeGenerator } from '../../graphics/maze/MazeGenerator.js';
import { CELL_SIZE } from '../../graphics/maze/MazeBuilder.js';
import { SMILER_CONFIG } from '../../config/enemy.config.js';
import { eventBus } from '../../systems/events/EventBus.js';
import { GAME_EVENTS } from '../../constants/events.js';

const {
  speedsByLevel,
  fallbackSpeed,
  chaseMultiplier,
  detectRadius,
  catchRadius,
  chaseProbability,
  blinkCooldown,
  blinkMinDist,
  blinkMaxDist,
  minActiveLevel,
} = SMILER_CONFIG;

/**
 * Smiler — pale stalker that blinks closer and lunges when nearby.
 */
export class Smiler {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.active = false;
    this.cellX = 0;
    this.cellY = 0;
    this.targetCellX = 0;
    this.targetCellY = 0;
    this.worldX = 0;
    this.worldZ = 0;
    this.moveProgress = 1;
    this.prevCellIndex = -1;
    this.mazeWidth = 0;
    this.mazeHeight = 0;
    this.adjacency = [];
    this.level = 1;
    this.light = null;
    this.smileMat = null;
    this.blinkTimer = 0;
  }

  create() {
    if (this.mesh) this.dispose();

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0c,
      roughness: 1,
      metalness: 0,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.85, 10), bodyMat);
    body.position.y = 0.95;
    group.add(body);

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x1c1c22,
      roughness: 0.55,
      emissive: 0x111118,
      emissiveIntensity: 0.4,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), headMat);
    head.position.y = 2.05;
    head.scale.set(1, 1.15, 0.9);
    group.add(head);

    this.smileMat = new THREE.MeshStandardMaterial({
      color: 0xfff4c2,
      emissive: 0xffe089,
      emissiveIntensity: 3.2,
      roughness: 0.35,
    });

    // Crescent smile made from small spheres along an arc
    const smileGroup = new THREE.Group();
    smileGroup.position.set(0, 1.95, 0.34);
    const toothCount = 9;
    for (let i = 0; i < toothCount; i++) {
      const t = i / (toothCount - 1);
      const angle = Math.PI * 0.18 + t * Math.PI * 0.64;
      const tooth = new THREE.Mesh(
        new THREE.SphereGeometry(0.045 + Math.sin(t * Math.PI) * 0.02, 6, 6),
        this.smileMat
      );
      tooth.position.set(Math.cos(angle) * 0.28, -Math.sin(angle) * 0.16, 0);
      smileGroup.add(tooth);
    }
    group.add(smileGroup);

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xfff8d6,
      emissive: 0xffe8a0,
      emissiveIntensity: 2.5,
    });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    leftEye.position.set(-0.14, 2.18, 0.32);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    rightEye.position.set(0.14, 2.18, 0.32);
    group.add(rightEye);

    this.light = new THREE.PointLight(0xffe089, 0.55, 8);
    this.light.position.y = 2;
    group.add(this.light);

    this.mesh = group;
    this.scene.add(this.mesh);
  }

  spawn(mazeData, level, startCellX, startCellY) {
    this.create();
    this.active = level >= minActiveLevel;
    this.mesh.visible = this.active;
    this.level = level;
    this.mazeWidth = mazeData.width;
    this.mazeHeight = mazeData.height;
    this.adjacency = mazeData.adjacency;
    this.blinkTimer = blinkCooldown * 0.4;

    this.cellX = startCellX;
    this.cellY = startCellY;
    this.targetCellX = startCellX;
    this.targetCellY = startCellY;
    this.moveProgress = 1;
    this.prevCellIndex = -1;

    const pos = MazeGenerator.cellToWorld(startCellX, startCellY, CELL_SIZE);
    this.worldX = pos.x;
    this.worldZ = pos.z;
    this.mesh.position.set(this.worldX, 0, this.worldZ);

    if (this.active) {
      eventBus.emit(GAME_EVENTS.ENTITY_SPAWN, {
        type: 'smiler',
        level,
        x: startCellX,
        y: startCellY,
      });
    }
  }

  update(dt, playerPos) {
    if (!this.active) return { distance: Infinity, caught: false };

    const px = playerPos.x;
    const pz = playerPos.z;
    const dx = px - this.worldX;
    const dz = pz - this.worldZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (this.smileMat) {
      const pulse = 2.4 + Math.sin(Date.now() * 0.006) * 0.9;
      this.smileMat.emissiveIntensity = pulse;
      if (this.light) this.light.intensity = 0.35 + pulse * 0.12;
    }

    if (dist < catchRadius) {
      return { distance: dist, caught: true };
    }

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0 && dist > blinkMinDist && dist < blinkMaxDist) {
      if (this._tryBlinkNearPlayer(px, pz)) {
        this.blinkTimer = blinkCooldown;
      } else {
        this.blinkTimer = 1.5;
      }
    }

    if (this.moveProgress < 1) {
      const speed = this._getSpeed(dist);
      this.moveProgress += (speed / CELL_SIZE) * dt;
      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.cellX = this.targetCellX;
        this.cellY = this.targetCellY;
      }
      const startPos = MazeGenerator.cellToWorld(this.cellX, this.cellY, CELL_SIZE);
      const endPos = MazeGenerator.cellToWorld(this.targetCellX, this.targetCellY, CELL_SIZE);
      const t = this.moveProgress;
      this.worldX = startPos.x + (endPos.x - startPos.x) * t;
      this.worldZ = startPos.z + (endPos.z - startPos.z) * t;
      this.mesh.position.set(this.worldX, 0, this.worldZ);
      this.mesh.lookAt(px, 1.2, pz);
    } else {
      this._pickNextCell(px, pz, dist);
    }

    return { distance: dist, caught: false };
  }

  _getSpeed(distToPlayer) {
    let speed = speedsByLevel[this.level] || fallbackSpeed;
    if (distToPlayer < detectRadius) {
      speed *= chaseMultiplier;
    }
    return speed;
  }

  _tryBlinkNearPlayer(px, pz) {
    const playerCell = MazeGenerator.worldToCell(px, pz, CELL_SIZE);
    const candidates = [];

    for (let y = 0; y < this.mazeHeight; y++) {
      for (let x = 0; x < this.mazeWidth; x++) {
        const manhattan = Math.abs(x - playerCell.x) + Math.abs(y - playerCell.y);
        if (manhattan < 2 || manhattan > 4) continue;
        const idx = MazeGenerator.cellIndex(x, y, this.mazeWidth);
        if (!this.adjacency[idx]?.length) continue;
        if (x === this.cellX && y === this.cellY) continue;
        candidates.push({ x, y, idx });
      }
    }

    if (!candidates.length) return false;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.prevCellIndex = MazeGenerator.cellIndex(this.cellX, this.cellY, this.mazeWidth);
    this.cellX = chosen.x;
    this.cellY = chosen.y;
    this.targetCellX = chosen.x;
    this.targetCellY = chosen.y;
    this.moveProgress = 1;

    const pos = MazeGenerator.cellToWorld(chosen.x, chosen.y, CELL_SIZE);
    this.worldX = pos.x;
    this.worldZ = pos.z;
    this.mesh.position.set(this.worldX, 0, this.worldZ);
    return true;
  }

  _pickNextCell(px, pz, dist) {
    const cellIdx = MazeGenerator.cellIndex(this.cellX, this.cellY, this.mazeWidth);
    const neighbors = this.adjacency[cellIdx];
    if (!neighbors?.length) return;

    const playerCell = MazeGenerator.worldToCell(px, pz, CELL_SIZE);
    let chosen = null;

    if (dist < detectRadius && Math.random() < chaseProbability) {
      let bestDist = Infinity;
      for (const nIdx of neighbors) {
        if (nIdx === this.prevCellIndex && neighbors.length > 1) continue;
        const nx = nIdx % this.mazeWidth;
        const ny = Math.floor(nIdx / this.mazeWidth);
        const manhattan = Math.abs(nx - playerCell.x) + Math.abs(ny - playerCell.y);
        if (manhattan < bestDist) {
          bestDist = manhattan;
          chosen = { x: nx, y: ny, idx: nIdx };
        }
      }
    }

    if (!chosen) {
      const filtered = neighbors.filter((n) => n !== this.prevCellIndex || neighbors.length === 1);
      const nIdx = filtered[Math.floor(Math.random() * filtered.length)];
      chosen = {
        x: nIdx % this.mazeWidth,
        y: Math.floor(nIdx / this.mazeWidth),
        idx: nIdx,
      };
    }

    this.prevCellIndex = cellIdx;
    this.targetCellX = chosen.x;
    this.targetCellY = chosen.y;
    this.moveProgress = 0;
  }

  getDistanceTo(playerPos) {
    const dx = playerPos.x - this.worldX;
    const dz = playerPos.z - this.worldZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  dispose() {
    if (this.mesh) {
      if (this.active) {
        eventBus.emit(GAME_EVENTS.ENTITY_DESPAWN, { type: 'smiler' });
      }
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        child.geometry?.dispose();
        child.material?.dispose();
      });
      this.mesh = null;
    }
    this.smileMat = null;
    this.light = null;
    this.active = false;
  }
}
