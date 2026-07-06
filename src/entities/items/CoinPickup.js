import * as THREE from 'three';
import { MazeGenerator } from '../../graphics/maze/MazeGenerator.js';
import { CELL_SIZE } from '../../graphics/maze/MazeBuilder.js';
import { GAME_CONFIG } from '../../config/game.config.js';
import { ECONOMY_CONFIG } from '../../config/shop.config.js';

/**
 * Collectible coins scattered across the maze.
 */
export class CoinPickup {
  constructor(scene) {
    this.scene = scene;
    this.coins = [];
    this.collected = 0;
    this.total = 0;
  }

  spawn(mazeData, count, startX, startZ, occupiedCells = new Set()) {
    this.clear();
    this.collected = 0;
    this.total = count;
    if (count <= 0) return;

    const { width, height } = mazeData;
    const pickupCfg = GAME_CONFIG.pickup;
    const candidates = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cellKey = `${x},${y}`;
        if (occupiedCells.has(cellKey)) continue;
        const pos = MazeGenerator.cellToWorld(x, y, CELL_SIZE);
        const dist = Math.sqrt((pos.x - startX) ** 2 + (pos.z - startZ) ** 2);
        if (dist > CELL_SIZE * pickupCfg.minSpawnDistanceCells) {
          candidates.push({ x, y, dist });
        }
      }
    }

    candidates.sort((a, b) => b.dist - a.dist);

    const placed = new Set(occupiedCells);
    let placedCount = 0;

    for (const c of candidates) {
      if (placedCount >= count) break;
      const key = `${c.x},${c.y}`;
      if (placed.has(key)) continue;
      placed.add(key);
      this._createCoin(c.x, c.y);
      placedCount++;
    }

    while (placedCount < count) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const key = `${x},${y}`;
      if (placed.has(key)) continue;
      const pos = MazeGenerator.cellToWorld(x, y, CELL_SIZE);
      const dist = Math.sqrt((pos.x - startX) ** 2 + (pos.z - startZ) ** 2);
      if (dist > CELL_SIZE * pickupCfg.fallbackMinDistanceCells) {
        placed.add(key);
        this._createCoin(x, y);
        placedCount++;
      }
    }
  }

  getOccupiedCells() {
    const cells = new Set();
    for (const coin of this.coins) {
      if (!coin.collected) cells.add(`${coin.cellX},${coin.cellY}`);
    }
    return cells;
  }

  _createCoin(cellX, cellY) {
    const pos = MazeGenerator.cellToWorld(cellX, cellY, CELL_SIZE);
    const geo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe8c84a,
      emissive: 0xc9a227,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.25,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(pos.x, ECONOMY_CONFIG.coinHeight, pos.z);
    this.scene.add(mesh);

    const light = new THREE.PointLight(0xe8c84a, 0.35, 2.5);
    light.position.copy(mesh.position);
    this.scene.add(light);

    this.coins.push({
      mesh,
      light,
      cellX,
      cellY,
      baseY: ECONOMY_CONFIG.coinHeight,
      rotSpeed: 2 + Math.random(),
      collected: false,
      collectRadius: ECONOMY_CONFIG.coinCollectRadius,
    });
  }

  update(dt, playerPos) {
    let collectedNow = 0;

    for (const coin of this.coins) {
      if (coin.collected) continue;

      coin.mesh.rotation.z += coin.rotSpeed * dt;
      coin.mesh.position.y =
        coin.baseY + Math.sin(Date.now() * 0.004 + coin.cellX) * 0.08;

      const dx = playerPos.x - coin.mesh.position.x;
      const dz = playerPos.z - coin.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < coin.collectRadius) {
        coin.collected = true;
        coin.mesh.visible = false;
        coin.light.visible = false;
        this.collected++;
        collectedNow += ECONOMY_CONFIG.coinValue;
      }
    }

    return collectedNow > 0 ? collectedNow : null;
  }

  clear() {
    for (const coin of this.coins) {
      this.scene.remove(coin.mesh);
      this.scene.remove(coin.light);
      coin.mesh.geometry.dispose();
      coin.mesh.material.dispose();
    }
    this.coins = [];
    this.collected = 0;
    this.total = 0;
  }

  dispose() {
    this.clear();
  }
}
