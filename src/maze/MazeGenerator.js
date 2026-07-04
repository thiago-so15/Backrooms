/**
 * Procedural maze generation using recursive backtracker,
 * with ~8% extra wall removal for loops.
 */
export class MazeGenerator {
  constructor(width, height, seed = null) {
    this.width = width;
    this.height = height;
    this.rng = seed != null ? this._mulberry32(seed) : Math.random;
    this.grid = [];
    this.walls = { north: [], south: [], east: [], west: [] };
    this.adjacency = [];
  }

  _mulberry32(seed) {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  generate() {
    this._initGrid();
    this._recursiveBacktracker();
    this._addLoops();
    this._buildAdjacency();
    return {
      width: this.width,
      height: this.height,
      grid: this.grid,
      walls: this.walls,
      adjacency: this.adjacency,
    };
  }

  _initGrid() {
    const w = this.width;
    const h = this.height;
    this.grid = Array.from({ length: h }, () => Array(w).fill(false));
    this.walls.north = Array.from({ length: h }, () => Array(w).fill(true));
    this.walls.south = Array.from({ length: h }, () => Array(w).fill(true));
    this.walls.east = Array.from({ length: h }, () => Array(w).fill(true));
    this.walls.west = Array.from({ length: h }, () => Array(w).fill(true));

    for (let x = 0; x < w; x++) {
      this.walls.north[0][x] = true;
      this.walls.south[h - 1][x] = true;
    }
    for (let y = 0; y < h; y++) {
      this.walls.west[y][0] = true;
      this.walls.east[y][w - 1] = true;
    }
  }

  _recursiveBacktracker() {
    const w = this.width;
    const h = this.height;
    const stack = [];
    let cx = 0;
    let cy = 0;
    this.grid[cy][cx] = true;
    stack.push([cx, cy]);

    const dirs = [
      [0, -1, 'north', 'south'],
      [0, 1, 'south', 'north'],
      [1, 0, 'east', 'west'],
      [-1, 0, 'west', 'east'],
    ];

    while (stack.length > 0) {
      const neighbors = [];
      for (const [dx, dy, dir, opp] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !this.grid[ny][nx]) {
          neighbors.push([nx, ny, dir, opp]);
        }
      }

      if (neighbors.length > 0) {
        const idx = Math.floor(this.rng() * neighbors.length);
        const [nx, ny, dir, opp] = neighbors[idx];
        this.walls[dir][cy][cx] = false;
        this.walls[opp][ny][nx] = false;
        this.grid[ny][nx] = true;
        cx = nx;
        cy = ny;
        stack.push([cx, cy]);
      } else {
        [cx, cy] = stack.pop();
      }
    }
  }

  _addLoops() {
    const w = this.width;
    const h = this.height;
    const candidates = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (this.walls.east[y][x] && x < w - 1) candidates.push(['east', y, x]);
        if (this.walls.south[y][x] && y < h - 1) candidates.push(['south', y, x]);
      }
    }

    const removeCount = Math.floor(candidates.length * 0.08);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (let i = 0; i < removeCount && i < candidates.length; i++) {
      const [dir, y, x] = candidates[i];
      if (dir === 'east') {
        this.walls.east[y][x] = false;
        this.walls.west[y][x + 1] = false;
      } else {
        this.walls.south[y][x] = false;
        this.walls.north[y + 1][x] = false;
      }
    }
  }

  _buildAdjacency() {
    const w = this.width;
    const h = this.height;
    this.adjacency = Array.from({ length: h * w }, () => []);

    const idx = (x, y) => y * w + x;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = idx(x, y);
        if (!this.walls.east[y][x] && x < w - 1) {
          this.adjacency[i].push(idx(x + 1, y));
        }
        if (!this.walls.west[y][x] && x > 0) {
          this.adjacency[i].push(idx(x - 1, y));
        }
        if (!this.walls.south[y][x] && y < h - 1) {
          this.adjacency[i].push(idx(x, y + 1));
        }
        if (!this.walls.north[y][x] && y > 0) {
          this.adjacency[i].push(idx(x, y - 1));
        }
      }
    }
  }

  static cellToWorld(x, y, cellSize = 4) {
    return {
      x: x * cellSize + cellSize / 2,
      z: y * cellSize + cellSize / 2,
    };
  }

  static worldToCell(wx, wz, cellSize = 4) {
    return {
      x: Math.floor(wx / cellSize),
      y: Math.floor(wz / cellSize),
    };
  }

  static cellIndex(x, y, width) {
    return y * width + x;
  }
}
