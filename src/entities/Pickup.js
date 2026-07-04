import * as THREE from 'three';
import { MazeGenerator } from '../maze/MazeGenerator.js';
import { CELL_SIZE } from '../maze/MazeBuilder.js';

export class Pickup {
  constructor(scene) {
    this.scene = scene;
    this.keys = [];
    this.collected = 0;
    this.total = 0;
  }

  spawn(mazeData, count, startX, startZ) {
    this.clear();
    this.collected = 0;
    this.total = count;
    const { width, height } = mazeData;
    const candidates = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = MazeGenerator.cellToWorld(x, y, CELL_SIZE);
        const dist = Math.sqrt((pos.x - startX) ** 2 + (pos.z - startZ) ** 2);
        if (dist > CELL_SIZE * 3) {
          candidates.push({ x, y, dist });
        }
      }
    }

    candidates.sort((a, b) => b.dist - a.dist);

    const placed = new Set();
    let placedCount = 0;
    for (const c of candidates) {
      if (placedCount >= count) break;
      const key = `${c.x},${c.y}`;
      if (placed.has(key)) continue;
      placed.add(key);
      this._createKey(c.x, c.y);
      placedCount++;
    }

    while (placedCount < count) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const key = `${x},${y}`;
      if (placed.has(key)) continue;
      const pos = MazeGenerator.cellToWorld(x, y, CELL_SIZE);
      const dist = Math.sqrt((pos.x - startX) ** 2 + (pos.z - startZ) ** 2);
      if (dist > CELL_SIZE * 2) {
        placed.add(key);
        this._createKey(x, y);
        placedCount++;
      }
    }
  }

  _createKey(cellX, cellY) {
    const pos = MazeGenerator.cellToWorld(cellX, cellY, CELL_SIZE);
    const geo = new THREE.OctahedronGeometry(0.25, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd4a843,
      emissive: 0xd4a843,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 1.2, pos.z);
    this.scene.add(mesh);

    const light = new THREE.PointLight(0xd4a843, 0.4, 3);
    light.position.copy(mesh.position);
    this.scene.add(light);

    this.keys.push({
      mesh,
      light,
      cellX,
      cellY,
      baseY: 1.2,
      rotSpeed: 1.5 + Math.random(),
      collected: false,
      collectRadius: 1.0,
    });
  }

  update(dt, playerPos) {
    let newPickup = null;

    for (const key of this.keys) {
      if (key.collected) continue;

      key.mesh.rotation.y += key.rotSpeed * dt;
      key.mesh.position.y = key.baseY + Math.sin(Date.now() * 0.003 + key.cellX) * 0.1;

      const dx = playerPos.x - key.mesh.position.x;
      const dz = playerPos.z - key.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < key.collectRadius) {
        key.collected = true;
        key.mesh.visible = false;
        key.light.visible = false;
        this.collected++;
        newPickup = this.collected;
      }
    }

    return newPickup;
  }

  allCollected() {
    return this.collected >= this.total;
  }

  clear() {
    for (const key of this.keys) {
      this.scene.remove(key.mesh);
      this.scene.remove(key.light);
      key.mesh.geometry.dispose();
      key.mesh.material.dispose();
    }
    this.keys = [];
    this.collected = 0;
    this.total = 0;
  }

  dispose() {
    this.clear();
  }
}
