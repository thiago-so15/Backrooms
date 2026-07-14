import * as THREE from 'three';
import { MazeGenerator } from './MazeGenerator.js';
import { GRAPHICS_CONFIG } from '../../config/graphics.config.js';

const CELL_SIZE = GRAPHICS_CONFIG.maze.cellSize;
const WALL_HEIGHT = GRAPHICS_CONFIG.maze.wallHeight;
const WALL_THICKNESS = GRAPHICS_CONFIG.maze.wallThickness;

/* -------------------------------------------------------------------------- */
/*  Generadores de textura por canvas                                          */
/* -------------------------------------------------------------------------- */

function makeCanvas(w = 256, h = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function addNoise(ctx, w, h, amount) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function addGrime(ctx, w, h, count, maxAlpha) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 4 + Math.random() * 28;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(0,0,0,${0.04 + Math.random() * maxAlpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function tintOverlay(ctx, w, h, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}

function toTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTileTexture({ base, grout, tint, tiles = 4 }) {
  const w = 256;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  addNoise(ctx, w, h, 26);

  const step = w / tiles;
  ctx.strokeStyle = grout;
  ctx.lineWidth = 4;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, h);
    ctx.moveTo(0, i * step);
    ctx.lineTo(w, i * step);
    ctx.stroke();
  }
  // brillo sutil por baldosa (húmedo)
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
      ctx.fillRect(tx * step + 3, ty * step + 3, step * 0.4, step * 0.4);
    }
  }
  addGrime(ctx, w, h, 40, 0.14);
  if (tint) tintOverlay(ctx, w, h, tint, 0.08);
  return toTexture(canvas);
}

function createCheckerTexture({ a, b }) {
  const w = 256;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const tiles = 4;
  const step = w / tiles;
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? a : b;
      ctx.fillRect(tx * step, ty * step, step, step);
    }
  }
  addNoise(ctx, w, h, 18);
  addGrime(ctx, w, h, 60, 0.18);
  return toTexture(canvas);
}

function createAsphaltTexture({ base }) {
  const w = 256;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  addNoise(ctx, w, h, 34);
  // grava clara
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(${140 + Math.random() * 60},${140 + Math.random() * 60},${150 + Math.random() * 50},${0.15 + Math.random() * 0.25})`;
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  // grietas
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = Math.random() * w;
    let y = Math.random() * h;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  addGrime(ctx, w, h, 30, 0.2);
  return toTexture(canvas);
}

function createFacadeTexture({ base, grout, tint }) {
  const w = 256;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  addNoise(ctx, w, h, 22);

  // revestimiento horizontal (siding)
  ctx.strokeStyle = grout;
  ctx.lineWidth = 2;
  for (let y = 0; y < h; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // ventanas tapiadas / a oscuras
  const drawWindow = (x, y, ww, wh) => {
    ctx.fillStyle = '#141414';
    ctx.fillRect(x, y, ww, wh);
    ctx.strokeStyle = '#3a352a';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, ww, wh);
    ctx.beginPath();
    ctx.moveTo(x + ww / 2, y);
    ctx.lineTo(x + ww / 2, y + wh);
    ctx.moveTo(x, y + wh / 2);
    ctx.lineTo(x + ww, y + wh / 2);
    ctx.stroke();
  };
  drawWindow(40, 60, 60, 70);
  drawWindow(156, 60, 60, 70);

  // puerta
  ctx.fillStyle = '#241d15';
  ctx.fillRect(102, 150, 52, 96);
  ctx.strokeStyle = '#3a352a';
  ctx.lineWidth = 3;
  ctx.strokeRect(102, 150, 52, 96);
  ctx.fillStyle = '#b8a24a';
  ctx.fillRect(146, 198, 4, 8);

  addGrime(ctx, w, h, 34, 0.22);
  if (tint) tintOverlay(ctx, w, h, tint, 0.16);
  return toTexture(canvas);
}

/** Papel tapiz de pasillo de apartamento: rayas verticales descoloridas. */
function createWallpaperTexture({ base, pattern, tint }) {
  const w = 256;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  addNoise(ctx, w, h, 18);

  const stripeW = 18;
  for (let x = 0; x < w; x += stripeW * 2) {
    ctx.fillStyle = pattern || '#b5a468';
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, 0, stripeW, h);
  }
  ctx.globalAlpha = 1;

  // zócalo / baseboard
  ctx.fillStyle = 'rgba(60,50,30,0.55)';
  ctx.fillRect(0, h - 28, w, 28);
  ctx.strokeStyle = 'rgba(40,34,20,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h - 28);
  ctx.lineTo(w, h - 28);
  ctx.stroke();

  addGrime(ctx, w, h, 50, 0.16);
  if (tint) tintOverlay(ctx, w, h, tint, 0.1);
  return toTexture(canvas);
}

/** Alfombra de hotel/apartamento: trama densa y manchas. */
function createCarpetTexture({ base, pattern }) {
  const w = 256;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      if ((x + y) % 8 === 0) {
        ctx.fillStyle = pattern || '#4a3c28';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }
  ctx.globalAlpha = 1;
  addNoise(ctx, w, h, 28);
  addGrime(ctx, w, h, 70, 0.22);
  return toTexture(canvas);
}

function createNightTexture({ base }) {
  const w = 128;
  const h = 128;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  addNoise(ctx, w, h, 8);
  return toTexture(canvas);
}

/* -------------------------------------------------------------------------- */
/*  MazeBuilder                                                                 */
/* -------------------------------------------------------------------------- */

export class MazeBuilder {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.wallBoxes = [];
    this.exitDoor = null;
    this.exitUnlocked = false;
    this.exitTheme = null;
    this.textures = [];
    this.rng = Math.random;
  }

  build(mazeData, theme) {
    this.clear();
    this.theme = theme;
    const { width, height, walls } = mazeData;
    const worldW = width * CELL_SIZE;
    const worldH = height * CELL_SIZE;
    const wallRenderH = theme.wall.renderHeight || WALL_HEIGHT;

    const wallTex = this._makeWallTexture(theme.wall);
    if (theme.wall.repeat) wallTex.repeat.set(theme.wall.repeat[0], theme.wall.repeat[1]);
    const floorTex = this._makeFloorTexture(theme.floor);
    floorTex.repeat.set(width, height);
    this.textures.push(wallTex, floorTex);

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.9,
      metalness: 0.0,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.95,
      metalness: theme.floor.type === 'checker' ? 0.15 : 0.0,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(worldW / 2, 0, worldH / 2);
    floor.receiveShadow = true;
    this.group.add(floor);

    if (theme.ceiling && theme.ceiling.enabled) {
      const ceilTex =
        theme.ceiling.type === 'tile'
          ? createTileTexture(theme.ceiling)
          : createNightTexture(theme.ceiling);
      ceilTex.repeat.set(width, height);
      this.textures.push(ceilTex);
      const ceilMat = new THREE.MeshStandardMaterial({
        map: ceilTex,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.BackSide,
      });
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH), ceilMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(worldW / 2, WALL_HEIGHT, worldH / 2);
      this.group.add(ceiling);
    }

    const wallGeoH = new THREE.BoxGeometry(CELL_SIZE, wallRenderH, WALL_THICKNESS);
    const wallGeoV = new THREE.BoxGeometry(WALL_THICKNESS, wallRenderH, CELL_SIZE);
    const wy = wallRenderH / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cx = x * CELL_SIZE + CELL_SIZE / 2;
        const cz = y * CELL_SIZE + CELL_SIZE / 2;

        if (walls.north[y][x]) {
          this._wall(wallGeoH, wallMat, cx, wy, y * CELL_SIZE);
          this._addCollisionBox(cx, wy, y * CELL_SIZE, CELL_SIZE, wallRenderH, WALL_THICKNESS);
        }
        if (walls.south[y][x]) {
          this._wall(wallGeoH, wallMat, cx, wy, (y + 1) * CELL_SIZE);
          this._addCollisionBox(cx, wy, (y + 1) * CELL_SIZE, CELL_SIZE, wallRenderH, WALL_THICKNESS);
        }
        if (walls.west[y][x]) {
          this._wall(wallGeoV, wallMat, x * CELL_SIZE, wy, cz);
          this._addCollisionBox(x * CELL_SIZE, wy, cz, WALL_THICKNESS, wallRenderH, CELL_SIZE);
        }
        if (walls.east[y][x]) {
          this._wall(wallGeoV, wallMat, (x + 1) * CELL_SIZE, wy, cz);
          this._addCollisionBox((x + 1) * CELL_SIZE, wy, cz, WALL_THICKNESS, wallRenderH, CELL_SIZE);
        }
      }
    }

    if (theme.props === 'slides') this._buildWaterparkProps(mazeData);
    else if (theme.props === 'suburb') this._buildSuburbProps(mazeData);
    else if (theme.props === 'apartments') this._buildApartmentProps(mazeData);

    this._buildExit(mazeData, theme);
    return { worldW, worldH };
  }

  _wall(geo, mat, x, y, z) {
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    this.group.add(wall);
  }

  _makeWallTexture(cfg) {
    if (cfg.type === 'facade') return createFacadeTexture(cfg);
    if (cfg.type === 'wallpaper') return createWallpaperTexture(cfg);
    return createTileTexture(cfg);
  }

  _makeFloorTexture(cfg) {
    if (cfg.type === 'checker') return createCheckerTexture(cfg);
    if (cfg.type === 'asphalt') return createAsphaltTexture(cfg);
    if (cfg.type === 'carpet') return createCarpetTexture(cfg);
    return createTileTexture(cfg);
  }

  _addCollisionBox(x, y, z, sx, sy, sz) {
    this.wallBoxes.push({
      minX: x - sx / 2,
      maxX: x + sx / 2,
      minZ: z - sz / 2,
      maxZ: z + sz / 2,
      minY: y - sy / 2,
      maxY: y + sy / 2,
    });
  }

  /* -------------------- props: toboganes (Level 119) -------------------- */

  _buildWaterparkProps(mazeData) {
    const { width, height } = mazeData;
    const colors = [0x2a7fff, 0xff3a3a, 0xffd23a, 0xff6fae, 0x39d353, 0xff8a3a];
    const slideGeo = new THREE.TorusGeometry(1.05, 0.28, 8, 16, Math.PI);
    let placed = 0;
    const maxSlides = 18;

    for (let y = 0; y < height && placed < maxSlides; y++) {
      for (let x = 0; x < width && placed < maxSlides; x++) {
        if (x === 0 && y === 0) continue;
        if (Math.random() > 0.22) continue;
        const pos = MazeGenerator.cellToWorld(x, y, CELL_SIZE);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.35,
          roughness: 0.4,
          metalness: 0.2,
        });
        const slide = new THREE.Mesh(slideGeo, mat);
        slide.rotation.x = Math.PI / 2;
        slide.rotation.y = Math.random() * Math.PI * 2;
        const ox = (Math.random() - 0.5) * 1.2;
        const oz = (Math.random() - 0.5) * 1.2;
        slide.position.set(pos.x + ox, 1.05, pos.z + oz);
        this.group.add(slide);
        placed++;
      }
    }

    // charcos de agua en el piso
    const puddleGeo = new THREE.CircleGeometry(0.9, 16);
    for (let i = 0; i < 10; i++) {
      const cx = Math.floor(Math.random() * width);
      const cy = Math.floor(Math.random() * height);
      const pos = MazeGenerator.cellToWorld(cx, cy, CELL_SIZE);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2a6f78,
        emissive: 0x123338,
        emissiveIntensity: 0.4,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity: 0.75,
      });
      const puddle = new THREE.Mesh(puddleGeo, mat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(pos.x + (Math.random() - 0.5), 0.02, pos.z + (Math.random() - 0.5));
      this.group.add(puddle);
    }
  }

  /* -------------------- props: suburbios (Level 9) --------------------- */

  _buildSuburbProps(mazeData) {
    const { width, height } = mazeData;
    const density = Math.min(0.12, 1.8 / Math.max(width, height));
    const postGeo = new THREE.BoxGeometry(0.08, 0.9, 0.08);
    const bodyGeo = new THREE.BoxGeometry(0.22, 0.24, 0.4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.random() > density) continue;
        const pos = MazeGenerator.cellToWorld(x, y, CELL_SIZE);

        // buzón junto a la casa
        const post = new THREE.Mesh(
          postGeo,
          new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.9 })
        );
        post.position.set(pos.x + (Math.random() - 0.5) * 2, 0.45, pos.z + (Math.random() - 0.5) * 2);
        this.group.add(post);
        const box = new THREE.Mesh(
          bodyGeo,
          new THREE.MeshStandardMaterial({ color: 0x3a332a, roughness: 0.85 })
        );
        box.position.set(post.position.x, 0.95, post.position.z);
        this.group.add(box);
      }
    }
  }

  /* -------------------- props: apartamentos (Level 188) ----------------- */

  _buildApartmentProps(mazeData) {
    const { width, height } = mazeData;
    const density = Math.min(0.16, 2.4 / Math.max(width, height));
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.85 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6a5e48, roughness: 0.8 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x2a4a28, roughness: 0.9 });
    const potMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.7 });
    const doorGeo = new THREE.BoxGeometry(0.9, 2.1, 0.08);
    const frameGeo = new THREE.BoxGeometry(1.1, 2.3, 0.1);
    const potGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.28, 8);
    const foliageGeo = new THREE.SphereGeometry(0.28, 8, 8);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x === 0 && y === 0) continue;
        if (Math.random() > density) continue;
        const pos = MazeGenerator.cellToWorld(x, y, CELL_SIZE);
        const side = Math.random() > 0.5 ? 1 : -1;
        const ox = side * (CELL_SIZE * 0.35);
        const oz = (Math.random() - 0.5) * 1.2;

        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(pos.x + ox, 1.15, pos.z + oz);
        frame.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        this.group.add(frame);

        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(pos.x + ox * 0.98, 1.1, pos.z + oz);
        door.rotation.y = frame.rotation.y;
        this.group.add(door);

        // número de puerta (placa)
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.12, 0.02),
          new THREE.MeshStandardMaterial({
            color: 0xc9c17a,
            emissive: 0x8a8354,
            emissiveIntensity: 0.2,
            roughness: 0.5,
          })
        );
        plate.position.set(pos.x + ox * 0.95, 1.85, pos.z + oz);
        plate.rotation.y = frame.rotation.y;
        this.group.add(plate);

        if (Math.random() < 0.35) {
          const pot = new THREE.Mesh(potGeo, potMat);
          pot.position.set(pos.x + ox * 0.55, 0.14, pos.z + oz + side * 0.45);
          this.group.add(pot);
          const plant = new THREE.Mesh(foliageGeo, plantMat);
          plant.position.set(pot.position.x, 0.42, pot.position.z);
          this.group.add(plant);
        }
      }
    }
  }

  /* --------------------------- salida temática -------------------------- */

  _buildExit(mazeData, theme) {
    const { width, height } = mazeData;
    const pos = MazeGenerator.cellToWorld(width - 1, height - 1, CELL_SIZE);
    const exitZ = pos.z - 1.5;
    this.exitTheme = theme.exit;

    const group = new THREE.Group();
    let doorMesh;

    if (theme.exit.style === 'slide') {
      // boca de tobogán: anillo + disco portal
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.16, 10, 24),
        new THREE.MeshStandardMaterial({ color: 0xdfe9e8, roughness: 0.4, metalness: 0.3 })
      );
      ring.position.y = 1.4;
      group.add(ring);

      doorMesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.95, 24),
        new THREE.MeshStandardMaterial({
          color: theme.exit.locked,
          emissive: theme.exit.locked,
          emissiveIntensity: 0.5,
          roughness: 0.5,
        })
      );
      doorMesh.position.set(0, 1.4, 0.02);
      group.add(doorMesh);
    } else {
      // puerta / parada de casa
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.8, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.85 })
      );
      frame.position.y = 1.4;
      group.add(frame);

      doorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 2.4, 0.12),
        new THREE.MeshStandardMaterial({
          color: theme.exit.locked,
          emissive: theme.exit.locked,
          emissiveIntensity: 0.35,
          roughness: 0.7,
        })
      );
      doorMesh.position.set(0, 1.3, 0.1);
      group.add(doorMesh);
    }

    const exitLight = new THREE.PointLight(theme.exit.locked, 0.5, 6);
    exitLight.position.set(0, 1.6, 0.5);
    group.add(exitLight);

    group.position.set(pos.x, 0, exitZ);
    this.group.add(group);

    this.exitDoor = {
      group,
      doorMesh,
      light: exitLight,
      position: { x: pos.x, z: exitZ },
      radius: 1.2,
    };
    this.exitUnlocked = false;
  }

  unlockExit() {
    if (this.exitUnlocked || !this.exitDoor) return;
    this.exitUnlocked = true;
    const t = this.exitTheme;
    const door = this.exitDoor.doorMesh;
    door.material.color.setHex(t.unlocked);
    door.material.emissive.setHex(t.glow);
    door.material.emissiveIntensity = 0.7;
    this.exitDoor.light.color.setHex(t.unlocked);
    this.exitDoor.light.intensity = 1.2;
  }

  checkExitCollision(playerPos) {
    if (!this.exitUnlocked || !this.exitDoor) return false;
    const dx = playerPos.x - this.exitDoor.position.x;
    const dz = playerPos.z - this.exitDoor.position.z;
    return Math.sqrt(dx * dx + dz * dz) < this.exitDoor.radius;
  }

  _disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }

  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      this._disposeObject(child);
    }
    this.wallBoxes = [];
    this.exitDoor = null;
    this.exitUnlocked = false;
    this.exitTheme = null;
    for (const tex of this.textures) tex.dispose();
    this.textures = [];
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
  }
}

export { CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS };
