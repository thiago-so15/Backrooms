import { CELL_SIZE } from '../../../graphics/maze/MazeBuilder.js';
import { MazeGenerator } from '../../../graphics/maze/MazeGenerator.js';

const COLORS = {
  background: '#050400',
  floor: '#1a1810',
  wall: '#8a8354',
  player: '#c9c17a',
  key: '#e8c84a',
  exitLocked: '#b23a3a',
  exitUnlocked: '#3ad07a',
  entity: '#5a5a5a',
  smiler: '#ffe089',
  border: 'rgba(138, 131, 84, 0.55)',
};

/**
 * Top-down HTML canvas minimap showing maze, player, keys, exit and enemies.
 */
export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mazeData = null;
    this.size = 148;
    this.padding = 4;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
  }

  setMaze(mazeData) {
    this.mazeData = mazeData;
  }

  clear() {
    this.mazeData = null;
    this.ctx.clearRect(0, 0, this.size, this.size);
  }

  /**
   * @param {{
   *   playerPos: {x:number,z:number},
   *   playerYaw: number,
   *   keys: Array<{cellX:number,cellY:number,collected:boolean}>,
   *   exit: {x:number,z:number}|null,
   *   exitUnlocked: boolean,
   *   entity: {x:number,z:number,active:boolean}|null,
   *   entities?: Array<{x:number,z:number,active:boolean,type?:string}>,
   * }} state
   */
  update(state) {
    const { ctx, mazeData, size, padding } = this;
    ctx.clearRect(0, 0, size, size);

    if (!mazeData) return;

    const { width, height, walls } = mazeData;
    const drawW = size - padding * 2;
    const drawH = size - padding * 2;
    const cellW = drawW / width;
    const cellH = drawH / height;

    // Panel background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    // Floor cells
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(padding, padding, drawW, drawH);

    // Walls
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = Math.max(1.2, Math.min(cellW, cellH) * 0.18);
    ctx.beginPath();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ox = padding + x * cellW;
        const oy = padding + y * cellH;

        if (walls.north[y][x]) {
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + cellW, oy);
        }
        if (walls.west[y][x]) {
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox, oy + cellH);
        }
        if (walls.south[y][x]) {
          ctx.moveTo(ox, oy + cellH);
          ctx.lineTo(ox + cellW, oy + cellH);
        }
        if (walls.east[y][x]) {
          ctx.moveTo(ox + cellW, oy);
          ctx.lineTo(ox + cellW, oy + cellH);
        }
      }
    }
    ctx.stroke();

    const toMap = (wx, wz) => ({
      x: padding + (wx / (width * CELL_SIZE)) * drawW,
      y: padding + (wz / (height * CELL_SIZE)) * drawH,
    });

    // Keys
    if (state.keys) {
      for (const key of state.keys) {
        if (key.collected) continue;
        const world = MazeGenerator.cellToWorld(key.cellX, key.cellY, CELL_SIZE);
        const p = toMap(world.x, world.z);
        ctx.fillStyle = COLORS.key;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, Math.min(cellW, cellH) * 0.22), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Exit / portal
    if (state.exit) {
      const p = toMap(state.exit.x, state.exit.z);
      const r = Math.max(3, Math.min(cellW, cellH) * 0.35);
      ctx.fillStyle = state.exitUnlocked ? COLORS.exitUnlocked : COLORS.exitLocked;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      ctx.strokeStyle = state.exitUnlocked ? '#8fffcf' : '#ff6a6a';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - r, p.y - r, r * 2, r * 2);
    }

    // Entities / monsters
    const entities = state.entities?.length
      ? state.entities
      : state.entity?.active
        ? [state.entity]
        : [];
    for (const ent of entities) {
      if (!ent?.active) continue;
      const p = toMap(ent.x, ent.z);
      const r = Math.max(2.5, Math.min(cellW, cellH) * 0.28);
      ctx.fillStyle = ent.type === 'smiler' ? COLORS.smiler : COLORS.entity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (triangle pointing view direction)
    if (state.playerPos) {
      const p = toMap(state.playerPos.x, state.playerPos.z);
      const yaw = state.playerYaw ?? 0;
      // Three.js yaw: looking down -Z when rotation.y = 0
      const angle = -yaw - Math.PI / 2;
      const len = Math.max(4, Math.min(cellW, cellH) * 0.45);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.moveTo(len, 0);
      ctx.lineTo(-len * 0.55, len * 0.45);
      ctx.lineTo(-len * 0.55, -len * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
