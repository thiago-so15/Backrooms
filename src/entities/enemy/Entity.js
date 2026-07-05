import * as THREE from 'three';
import { MazeGenerator } from '../../graphics/maze/MazeGenerator.js';
import { CELL_SIZE } from '../../graphics/maze/MazeBuilder.js';
import { ENEMY_CONFIG } from '../../config/enemy.config.js';
import { eventBus } from '../../systems/events/EventBus.js';
import { GAME_EVENTS } from '../../constants/events.js';

const {
  speedsByLevel,
  fallbackSpeed,
  chaseMultiplier,
  detectRadius,
  catchRadius,
  chaseProbability,
  minActiveLevel,
} = ENEMY_CONFIG;

/**
 * Hostile entity that patrols the maze and chases the player.
 */
export class Entity {
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
  }

  create() {
    if (this.mesh) this.dispose();

    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.4, 8), bodyMat);
    body.position.y = 0.7;
    group.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), headMat);
    head.position.y = 1.6;
    group.add(head);

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
    });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    leftEye.position.set(-0.12, 1.65, 0.22);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    rightEye.position.set(0.12, 1.65, 0.22);
    group.add(rightEye);

    this.light = new THREE.PointLight(0xb23a3a, 0.3, 6);
    this.light.position.y = 1.5;
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
      eventBus.emit(GAME_EVENTS.ENTITY_SPAWN, { level, x: startCellX, y: startCellY });
    }
  }

  update(dt, playerPos) {
    if (!this.active) return { distance: Infinity, caught: false };

    const px = playerPos.x;
    const pz = playerPos.z;
    const dx = px - this.worldX;
    const dz = pz - this.worldZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < catchRadius) {
      return { distance: dist, caught: true };
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
      this.mesh.lookAt(px, 0.8, pz);
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
        eventBus.emit(GAME_EVENTS.ENTITY_DESPAWN, {});
      }
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        child.geometry?.dispose();
        child.material?.dispose();
      });
      this.mesh = null;
    }
    this.active = false;
  }
}

export { detectRadius as DETECT_RADIUS, catchRadius as CATCH_RADIUS };
