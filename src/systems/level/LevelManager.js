import { MazeGenerator } from '../../graphics/maze/MazeGenerator.js';
import { CELL_SIZE } from '../../graphics/maze/MazeBuilder.js';
import { LEVELS } from '../../levels/shared/levels.js';
import { ENEMY_CONFIG } from '../../config/enemy.config.js';
import { eventBus } from '../events/EventBus.js';
import { GAME_EVENTS } from '../../constants/events.js';

export { THEMES } from '../../levels/shared/themes.js';
export { LEVELS } from '../../levels/shared/levels.js';

/**
 * Procedural level generation and progression.
 */
export class LevelManager {
  constructor() {
    this.currentLevel = 0;
    this.mazeData = null;
    this.seed = 0;
  }

  getLevelConfig(index = this.currentLevel) {
    return LEVELS[index] || LEVELS[LEVELS.length - 1];
  }

  get currentLevelIndex() {
    return this.currentLevel;
  }

  get isLastLevel() {
    return this.currentLevel >= LEVELS.length - 1;
  }

  get totalLevels() {
    return LEVELS.length;
  }

  generateLevel(levelIndex = this.currentLevel) {
    this.currentLevel = levelIndex;
    const config = this.getLevelConfig();
    this.seed = (Date.now() ^ (Math.random() * 0xffffffff)) | 0;
    const gen = new MazeGenerator(config.mazeSize, config.mazeSize, this.seed);
    this.mazeData = gen.generate();

    eventBus.emit(GAME_EVENTS.LEVEL_STARTED, { levelIndex, config });

    return {
      config,
      mazeData: this.mazeData,
      seed: this.seed,
    };
  }

  getPlayerStart() {
    const pos = MazeGenerator.cellToWorld(0, 0, CELL_SIZE);
    return { x: pos.x, z: pos.z };
  }

  /**
   * Spread hostiles across the maze so they start in different regions.
   * @returns {Array<{ type: string, x: number, y: number }>}
   */
  getHostileSpawns(config, mazeData = this.mazeData) {
    const groups = config.hostiles || [];
    const types = [];
    for (const group of groups) {
      const n = Math.max(0, Math.floor(group.count || 0));
      for (let i = 0; i < n; i++) types.push(group.type || 'entity');
    }
    if (!types.length || !mazeData) return [];

    this._shuffle(types);

    const { width, height } = mazeData;
    const minPlayerDist = config.hostileMinPlayerDist ?? ENEMY_CONFIG.minPlayerDistCells;
    const cells = this._pickSpreadCells(width, height, types.length, minPlayerDist);

    return types.map((type, i) => ({
      type,
      x: cells[i].x,
      y: cells[i].y,
    }));
  }

  /** @deprecated Prefer getHostileSpawns */
  getEntityStart(config) {
    const spawns = this.getHostileSpawns(config).filter((s) => s.type === 'entity');
    return spawns[0] || null;
  }

  /** @deprecated Prefer getHostileSpawns */
  getSmilerStart(config) {
    const spawns = this.getHostileSpawns(config).filter((s) => s.type === 'smiler');
    return spawns[0] || null;
  }

  _pickSpreadCells(width, height, count, minPlayerDist) {
    if (count <= 0) return [];

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const chosen = [];
    const used = new Set();

    for (let r = 0; r < rows && chosen.length < count; r++) {
      for (let c = 0; c < cols && chosen.length < count; c++) {
        const x0 = Math.floor((c * width) / cols);
        const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * width) / cols));
        const y0 = Math.floor((r * height) / rows);
        const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * height) / rows));

        const region = [];
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            if (x + y < minPlayerDist) continue;
            const key = `${x},${y}`;
            if (used.has(key)) continue;
            region.push({ x, y });
          }
        }

        if (!region.length) continue;
        const pick = region[Math.floor(Math.random() * region.length)];
        used.add(`${pick.x},${pick.y}`);
        chosen.push(pick);
      }
    }

    // Fallback fill if some regions were empty (near spawn)
    if (chosen.length < count) {
      const pool = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (x + y < minPlayerDist) continue;
          const key = `${x},${y}`;
          if (used.has(key)) continue;
          pool.push({ x, y });
        }
      }
      this._shuffle(pool);
      while (chosen.length < count && pool.length) {
        const pick = pool.pop();
        used.add(`${pick.x},${pick.y}`);
        chosen.push(pick);
      }
    }

    this._shuffle(chosen);
    return chosen;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  advanceLevel() {
    if (this.isLastLevel) return null;
    this.currentLevel++;
    return this.generateLevel(this.currentLevel);
  }

  reset() {
    this.currentLevel = 0;
    this.mazeData = null;
    this.seed = 0;
  }
}
