import * as THREE from 'three';

export class SceneSetup {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.ambient = null;
    this.lights = [];
    this.clock = new THREE.Clock();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050400);
    this.scene.fog = new THREE.FogExp2(0x8a8450, 0.05);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      80
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.ambient = new THREE.AmbientLight(0xc9c17a, 0.35);
    this.scene.add(this.ambient);

    window.addEventListener('resize', () => this._onResize());
    return { scene: this.scene, camera: this.camera, renderer: this.renderer };
  }

  applyTheme(theme) {
    this.scene.background.setHex(theme.background);
    this.scene.fog.color.setHex(theme.fog.color);
    this.scene.fog.density = theme.fog.density;
    this.ambient.color.setHex(theme.ambient.color);
    this.ambient.intensity = theme.ambient.intensity;
  }

  addLights(theme, mazeWidth, mazeHeight, cellSize = 4) {
    this.clearLights();
    const cfg = theme.lights;
    const worldW = mazeWidth * cellSize;
    const worldH = mazeHeight * cellSize;
    const spacing = cellSize * cfg.spacingMul;

    for (let x = spacing / 2; x < worldW; x += spacing) {
      for (let z = spacing / 2; z < worldH; z += spacing) {
        if (cfg.style === 'streetlamp') {
          this._addStreetlamp(cfg, x, z);
        } else {
          this._addCeilingLight(cfg, x, z, cellSize);
        }
      }
    }
  }

  _addCeilingLight(cfg, x, z, cellSize) {
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
    });
  }

  _addStreetlamp(cfg, x, z, cellSize = 4) {
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
    });
  }

  clearLights() {
    for (const fl of this.lights) {
      this.scene.remove(fl.light);
      this.scene.remove(fl.fixture);
      if (fl.light.dispose) fl.light.dispose();
      fl.fixture.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    this.lights = [];
  }

  updateLights(dt) {
    for (const fl of this.lights) {
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
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getDelta() {
    return this.clock.getDelta();
  }

  dispose() {
    this.clearLights();
    this.renderer.dispose();
  }
}
