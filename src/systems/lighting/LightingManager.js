import * as THREE from 'three';
import { settingsManager } from '../save/SettingsManager.js';
import { GRAPHICS_CONFIG } from '../../config/graphics.config.js';

/**
 * Three.js scene, renderer, camera and dynamic lighting.
 */
export class LightingManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.ambient = null;
    this.lights = [];
    this.clock = new THREE.Clock();
    this.baseFogDensity = GRAPHICS_CONFIG.defaultFogDensity;
    this.currentTheme = null;

    this._unsubscribe = settingsManager.subscribe((key) => {
      if (key === 'graphicsQuality' || key === null) {
        this.applyGraphicsQuality();
      }
      if (key === 'reduceLightFlicker' || key === null) {
        this._stabilizeLights();
      }
    });
  }

  init() {
    const { camera: camCfg, renderer: renCfg, ambient: ambCfg } = GRAPHICS_CONFIG;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(GRAPHICS_CONFIG.defaultBackground);
    this.scene.fog = new THREE.FogExp2(GRAPHICS_CONFIG.defaultFogColor, GRAPHICS_CONFIG.defaultFogDensity);

    this.camera = new THREE.PerspectiveCamera(
      camCfg.fov,
      window.innerWidth / window.innerHeight,
      camCfg.near,
      camCfg.far
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: renCfg.antialias,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.applyGraphicsQuality();
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.ambient = new THREE.AmbientLight(ambCfg.color, ambCfg.intensity);
    this.scene.add(this.ambient);

    window.addEventListener('resize', () => this._onResize());
    return { scene: this.scene, camera: this.camera, renderer: this.renderer };
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    this.scene.background.setHex(theme.background);
    this.scene.fog.color.setHex(theme.fog.color);
    this.baseFogDensity = theme.fog.density;
    this.applyGraphicsQuality();
    this.ambient.color.setHex(theme.ambient.color);
    this.ambient.intensity = theme.ambient.intensity;
  }

  applyGraphicsQuality() {
    if (!this.renderer) return;

    const quality = settingsManager.getSetting('graphicsQuality') || 'high';
    const ratioCap = GRAPHICS_CONFIG.pixelRatio[quality] ?? 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, ratioCap));

    if (this.scene?.fog) {
      this.scene.fog.density =
        quality === 'low'
          ? this.baseFogDensity * GRAPHICS_CONFIG.fogLowQualityMultiplier
          : this.baseFogDensity;
    }

    this._applyLightVisibility(quality);
  }

  _shouldIncludeLight(index, quality) {
    if (quality === 'high') return true;
    if (quality === 'medium') return index % GRAPHICS_CONFIG.lightCulling.mediumModulo === 0;
    return index % GRAPHICS_CONFIG.lightCulling.lowModulo === 0;
  }

  _stabilizeLights() {
    for (const fl of this.lights) {
      if (!fl.light.visible) continue;
      fl.flickering = false;
      fl.light.intensity = fl.baseIntensity;
      if (fl.emissiveMat) fl.emissiveMat.emissiveIntensity = fl.baseEmissive;
    }
  }

  _applyLightVisibility(quality = settingsManager.getSetting('graphicsQuality')) {
    for (const fl of this.lights) {
      const visible = this._shouldIncludeLight(fl.gridIndex, quality);
      fl.light.visible = visible;
      fl.fixture.visible = visible;
      if (visible && !settingsManager.getSetting('reduceLightFlicker')) {
        fl.light.intensity = fl.baseIntensity;
        if (fl.emissiveMat) fl.emissiveMat.emissiveIntensity = fl.baseEmissive;
      }
    }
  }

  addLights(theme, mazeWidth, mazeHeight, cellSize = GRAPHICS_CONFIG.maze.cellSize) {
    this.clearLights();
    const cfg = theme.lights;
    const worldW = mazeWidth * cellSize;
    const worldH = mazeHeight * cellSize;
    const spacing = cellSize * cfg.spacingMul;
    let gridIndex = 0;

    for (let x = spacing / 2; x < worldW; x += spacing) {
      for (let z = spacing / 2; z < worldH; z += spacing) {
        if (cfg.style === 'streetlamp') {
          this._addStreetlamp(cfg, x, z, gridIndex, cellSize);
        } else if (cfg.style === 'beacon') {
          this._addBeaconLight(cfg, x, z, cellSize, gridIndex);
        } else {
          this._addCeilingLight(cfg, x, z, cellSize, gridIndex);
        }
        gridIndex += 1;
      }
    }

    this.applyGraphicsQuality();
  }

  _addBeaconLight(cfg, x, z, cellSize, gridIndex) {
    const light = new THREE.PointLight(cfg.color, cfg.intensity, cellSize * cfg.distanceMul);
    light.position.set(x, cfg.height, z);

    const group = new THREE.Group();
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x1a2822,
      roughness: 0.45,
      metalness: 0.8,
    });
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.45, 8, 1, true), cageMat);
    cage.position.set(x, cfg.height, z);
    group.add(cage);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.color,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), bulbMat);
    bulb.position.set(x, cfg.height - 0.05, z);
    group.add(bulb);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6),
      cageMat
    );
    stem.position.set(x, cfg.height + 0.35, z);
    group.add(stem);

    this.scene.add(group);
    this.scene.add(light);
    this.lights.push({
      light,
      fixture: group,
      emissiveMat: bulbMat,
      baseIntensity: cfg.intensity,
      baseEmissive: 1.4,
      flickerChance: cfg.flickerChance,
      flickerTimer: Math.random() * 5,
      flickering: false,
      flickerDuration: 0,
      gridIndex,
    });
  }

  _addCeilingLight(cfg, x, z, cellSize, gridIndex) {
    const light = new THREE.PointLight(cfg.color, cfg.intensity, cellSize * cfg.distanceMul);
    light.position.set(x, cfg.height, z);

    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xdfe9e8,
      emissive: cfg.color,
      emissiveIntensity: 0.3,
    });
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), panelMat);
    fixture.position.copy(light.position);

    this.scene.add(fixture);
    this.scene.add(light);
    this.lights.push({
      light,
      fixture,
      emissiveMat: panelMat,
      baseIntensity: cfg.intensity,
      baseEmissive: 0.3,
      flickerChance: cfg.flickerChance,
      flickerTimer: Math.random() * 5,
      flickering: false,
      flickerDuration: 0,
      gridIndex,
    });
  }

  _addStreetlamp(cfg, x, z, gridIndex, cellSize) {
    const light = new THREE.PointLight(cfg.color, cfg.intensity, cellSize * cfg.distanceMul);
    light.position.set(x, cfg.height, z);

    const group = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x14140f, roughness: 0.9 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, cfg.height, 6), poleMat);
    pole.position.set(x, cfg.height / 2, z);
    group.add(pole);

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a12,
      emissive: cfg.color,
      emissiveIntensity: 0.9,
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), headMat);
    head.position.set(x, cfg.height - 0.1, z);
    group.add(head);

    this.scene.add(group);
    this.scene.add(light);
    this.lights.push({
      light,
      fixture: group,
      emissiveMat: headMat,
      baseIntensity: cfg.intensity,
      baseEmissive: 0.9,
      flickerChance: cfg.flickerChance,
      flickerTimer: Math.random() * 5,
      flickering: false,
      flickerDuration: 0,
      gridIndex,
    });
  }

  clearLights() {
    for (const fl of this.lights) {
      this.scene.remove(fl.light);
      this.scene.remove(fl.fixture);
      fl.light.dispose?.();
      fl.fixture.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.lights = [];
  }

  /** Restore menu-safe clear color after leaving a level. */
  resetToDefaultBackground() {
    this.currentTheme = null;
    this.baseFogDensity = GRAPHICS_CONFIG.defaultFogDensity;
    if (this.scene?.background) {
      this.scene.background.setHex(GRAPHICS_CONFIG.defaultBackground);
    }
    if (this.scene?.fog) {
      this.scene.fog.color.setHex(GRAPHICS_CONFIG.defaultFogColor);
      this.scene.fog.density = GRAPHICS_CONFIG.defaultFogDensity;
    }
    if (this.ambient) {
      this.ambient.color.setHex(GRAPHICS_CONFIG.ambient.color);
      this.ambient.intensity = GRAPHICS_CONFIG.ambient.intensity;
    }
  }

  updateLights(dt) {
    const reduceFlicker = settingsManager.getSetting('reduceLightFlicker');

    for (const fl of this.lights) {
      if (!fl.light.visible) continue;

      if (reduceFlicker) {
        fl.light.intensity = fl.baseIntensity;
        if (fl.emissiveMat) fl.emissiveMat.emissiveIntensity = fl.baseEmissive;
        continue;
      }

      fl.flickerTimer -= dt;

      if (fl.flickering) {
        fl.flickerDuration -= dt;
        const flicker = Math.random() > 0.4 ? 0.05 : 0.9;
        fl.light.intensity = fl.baseIntensity * flicker;
        if (fl.emissiveMat) fl.emissiveMat.emissiveIntensity = flicker * fl.baseEmissive;

        if (fl.flickerDuration <= 0) {
          fl.flickering = false;
          fl.flickerTimer = 2 + Math.random() * 8;
        }
      } else if (fl.flickerTimer <= 0 && Math.random() < fl.flickerChance) {
        fl.flickering = true;
        fl.flickerDuration = 0.05 + Math.random() * 0.18;
      } else {
        fl.light.intensity = fl.baseIntensity;
        if (fl.emissiveMat) fl.emissiveMat.emissiveIntensity = fl.baseEmissive;
      }
    }
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.applyGraphicsQuality();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getDelta() {
    return this.clock.getDelta();
  }

  dispose() {
    this._unsubscribe?.();
    this.clearLights();
    this.renderer.dispose();
  }
}

/** @deprecated Alias for LightingManager */
export { LightingManager as SceneSetup };
