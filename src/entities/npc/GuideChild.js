import * as THREE from 'three';
import { MazeGenerator } from '../../graphics/maze/MazeGenerator.js';
import { CELL_SIZE } from '../../graphics/maze/MazeBuilder.js';

const SPEED = 2.55;
const WAIT_DISTANCE = 6.5;
const RESUME_DISTANCE = 4.2;
const ARRIVE_CELL_DIST = 0.15;

/**
 * Child guide NPC — leads the player to the exit.
 * Hostiles ignore this NPC (they only chase the player).
 */
export class GuideChild {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.active = false;
    this.mazeWidth = 0;
    this.mazeHeight = 0;
    this.adjacency = [];
    this.cellX = 0;
    this.cellY = 0;
    this.targetCellX = 0;
    this.targetCellY = 0;
    this.worldX = 0;
    this.worldZ = 0;
    this.moveProgress = 1;
    this.path = [];
    this.pathIndex = 0;
    this.goalX = 0;
    this.goalY = 0;
    this.waiting = false;
    this.arrivedAtExit = false;
    this._spokeIntro = false;
    this._waitPromptAt = 0;
  }

  create() {
    if (this.mesh) this.dispose();

    const group = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({
      color: 0xc4a882,
      roughness: 0.85,
    });
    const clothes = new THREE.MeshStandardMaterial({
      color: 0x2a4a6a,
      roughness: 0.75,
    });
    const pants = new THREE.MeshStandardMaterial({
      color: 0x1a2430,
      roughness: 0.8,
    });
    const hair = new THREE.MeshStandardMaterial({
      color: 0x1a1410,
      roughness: 0.9,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8), clothes);
    body.position.y = 0.55;
    group.add(body);

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.45, 8), pants);
    legs.position.y = 0.22;
    group.add(legs);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), skin);
    head.position.y = 1.05;
    group.add(head);

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    hairCap.position.y = 1.12;
    group.add(hairCap);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
    leftEye.position.set(-0.07, 1.08, 0.16);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
    rightEye.position.set(0.07, 1.08, 0.16);
    group.add(rightEye);

    // Soft marker so the player can spot them in the dark
    const glow = new THREE.PointLight(0x7ec8ff, 0.35, 4);
    glow.position.y = 1.1;
    group.add(glow);

    this.mesh = group;
    this.scene.add(this.mesh);
  }

  /**
   * @param {object} mazeData
   * @param {number} startCellX
   * @param {number} startCellY
   * @param {{x:number,y:number}} goalCell
   */
  spawn(mazeData, startCellX, startCellY, goalCell) {
    this.create();
    this.active = true;
    this.mazeWidth = mazeData.width;
    this.mazeHeight = mazeData.height;
    this.adjacency = mazeData.adjacency;
    this.goalX = goalCell.x;
    this.goalY = goalCell.y;
    this.cellX = startCellX;
    this.cellY = startCellY;
    this.targetCellX = startCellX;
    this.targetCellY = startCellY;
    this.moveProgress = 1;
    this.arrivedAtExit = false;
    this.waiting = false;
    this._spokeIntro = false;
    this._waitPromptAt = 0;

    const pos = MazeGenerator.cellToWorld(startCellX, startCellY, CELL_SIZE);
    this.worldX = pos.x;
    this.worldZ = pos.z;
    this.mesh.position.set(this.worldX, 0, this.worldZ);
    this.mesh.visible = true;

    this._recomputePath();
  }

  _recomputePath() {
    this.path = this._bfsPath(this.cellX, this.cellY, this.goalX, this.goalY);
    this.pathIndex = 0;
    // First node is current cell — skip it
    if (this.path.length && this.path[0].x === this.cellX && this.path[0].y === this.cellY) {
      this.pathIndex = 1;
    }
  }

  _bfsPath(sx, sy, gx, gy) {
    const w = this.mazeWidth;
    const start = MazeGenerator.cellIndex(sx, sy, w);
    const goal = MazeGenerator.cellIndex(gx, gy, w);
    if (start === goal) return [{ x: sx, y: sy }];

    const prev = new Map();
    const queue = [start];
    prev.set(start, -1);

    while (queue.length) {
      const cur = queue.shift();
      if (cur === goal) break;
      const neighbors = this.adjacency[cur] || [];
      for (const n of neighbors) {
        if (prev.has(n)) continue;
        prev.set(n, cur);
        queue.push(n);
      }
    }

    if (!prev.has(goal)) return [];

    const cells = [];
    let cur = goal;
    while (cur !== -1) {
      cells.push({
        x: cur % w,
        y: Math.floor(cur / w),
      });
      cur = prev.get(cur);
    }
    cells.reverse();
    return cells;
  }

  /**
   * @returns {{ message: string|null, arrivedAtExit: boolean, waiting: boolean }}
   */
  update(dt, playerPos) {
    if (!this.active) {
      return { message: null, arrivedAtExit: false, waiting: false };
    }

    let message = null;
    if (!this._spokeIntro) {
      this._spokeIntro = true;
      message = 'Niño: — Seguíme. Sé dónde está la salida. —';
    }

    const dx = playerPos.x - this.worldX;
    const dz = playerPos.z - this.worldZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (!this.arrivedAtExit) {
      if (dist > WAIT_DISTANCE) {
        this.waiting = true;
        if (performance.now() > this._waitPromptAt) {
          message = 'Niño: — No te quedes atrás… seguíme. —';
          this._waitPromptAt = performance.now() + 4500;
        }
      } else if (this.waiting && dist <= RESUME_DISTANCE) {
        this.waiting = false;
      }
    }

    // Face player when waiting, else face movement / exit
    if (this.waiting || this.arrivedAtExit) {
      this.mesh.lookAt(playerPos.x, 0.8, playerPos.z);
    }

    if (this.arrivedAtExit) {
      return { message, arrivedAtExit: true, waiting: this.waiting };
    }

    if (this.waiting) {
      return { message, arrivedAtExit: false, waiting: true };
    }

    if (this.moveProgress < 1) {
      this.moveProgress += (SPEED / CELL_SIZE) * dt;
      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.cellX = this.targetCellX;
        this.cellY = this.targetCellY;
        if (this.cellX === this.goalX && this.cellY === this.goalY) {
          this.arrivedAtExit = true;
          message = 'Niño: — Acá. La salida. Vení. —';
        }
      }
      const startPos = MazeGenerator.cellToWorld(this.cellX, this.cellY, CELL_SIZE);
      const endPos = MazeGenerator.cellToWorld(this.targetCellX, this.targetCellY, CELL_SIZE);
      const t = Math.min(1, this.moveProgress);
      this.worldX = startPos.x + (endPos.x - startPos.x) * t;
      this.worldZ = startPos.z + (endPos.z - startPos.z) * t;
      this.mesh.position.set(this.worldX, 0, this.worldZ);
      this.mesh.lookAt(endPos.x, 0.8, endPos.z);
    } else {
      this._pickNextAlongPath();
    }

    return { message, arrivedAtExit: this.arrivedAtExit, waiting: this.waiting };
  }

  _pickNextAlongPath() {
    if (this.cellX === this.goalX && this.cellY === this.goalY) {
      this.arrivedAtExit = true;
      return;
    }

    // Refresh path occasionally if stuck / empty
    if (this.pathIndex >= this.path.length) {
      this._recomputePath();
    }
    if (this.pathIndex >= this.path.length) return;

    const next = this.path[this.pathIndex];
    this.pathIndex += 1;
    this.targetCellX = next.x;
    this.targetCellY = next.y;
    this.moveProgress = next.x === this.cellX && next.y === this.cellY ? 1 : 0;
    if (this.moveProgress === 1) {
      this._pickNextAlongPath();
    }
  }

  getDistanceTo(playerPos) {
    const dx = playerPos.x - this.worldX;
    const dz = playerPos.z - this.worldZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        child.geometry?.dispose();
        child.material?.dispose();
      });
      this.mesh = null;
    }
    this.active = false;
    this.arrivedAtExit = false;
  }
}
