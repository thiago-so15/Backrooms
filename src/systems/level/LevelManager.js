import { MazeGenerator } from '../../graphics/maze/MazeGenerator.js';
import { CELL_SIZE } from '../../graphics/maze/MazeBuilder.js';
import { LEVELS } from '../../levels/shared/levels.js';
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

  getEntityStart(config) {
    if (!config.entityEnabled) return null;
    const ec = config.entityStartCell || { x: 0, y: 0 };
    const size = config.mazeSize;
    return {
      x: size - 1 - ec.x,
      y: size - 1 - ec.y,
    };
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
