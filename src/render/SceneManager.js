/**
 * Bucket Elevator Master - Scene Manager
 * Engineered for Maximum Component Clarity, Contrast & Visual Prominence:
 * - High-Contrast Environment Engine (Dark Slate / CAD Gray / Calibrated Light)
 * - Silhouette Rim & Contour Backlighting (separates machine from background)
 * - CAD Edge Outlines & Substantial Casing Tint (eliminates washed-out bleached effect)
 * - High-Visibility Interior Conveying Train (Safety-Orange Buckets, Antistatic Belt, Crowned Pulleys)
 * - Smart Staggered 3D Callout Badges with 3D Leader Lines (eliminates label bunching)
 * - Three Label Modes: 'all' | 'focused' | 'off'
 * - Active-Quest-Aware Smart Raycast Penetration
 * - In-World 3D Information Billboard & Dynamic Focused Spotlight
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ELEVATOR_CONFIG } from '../config.js';

export class SceneManager {
  constructor(containerElement, onModelLoadedCallback, onSelectCallback) {
    this.container = containerElement;
    this.onModelLoaded = onModelLoadedCallback;
    this.onSelect = onSelectCallback;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;

    this.pulleys = [];
    this.casings = [];
    this.buckets = [];
    this.streams = [];
    this.edgeOutlines = [];
    this.selectableObjects = [];
    this.selectedObject = null;
    this.hoveredObject = null;

    // Active Quest Guidance State
    this.activeQuestKeywords = [];
    this.activeTargetMesh = null;
    this.allowVisualBeacon = true;

    // 3D Numbered Part Labels & Leader Lines
    this.labelsGroup = null;
    this.leaderLinesGroup = null;
    this.labelMode = 'all'; // 'all' | 'focused' | 'off'

    // Visual Prominence Helpers
    this.highlightBox = null;
    this.beaconMesh = null;
    this.targetArrow = null;
    this.focusedSpotlight = null;
    this.infoSprite = null;
    this.infoCanvas = null;
    this.infoCtx = null;
    this.infoTexture = null;

    // Environment & Material Configuration
    this.currentTheme = 'dark'; // 'dark' | 'cad' | 'light'
    this.isCutaway = true; // Cutaway with CAD outlines & tinted acrylic
    this.isAutoRotate = false;
    this.speed = ELEVATOR_CONFIG.machine.nominalSpeed_m_s;
    this.pulleyRadius = ELEVATOR_CONFIG.machine.headPulleyRadius_m;
    this.activeModelMode = 'full';

    // Lighting References
    this.hemiLight = null;
    this.keyLight = null;
    this.fillLight = null;
    this.rimLight = null;
    this.groundMesh = null;
    this.gridHelper = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.pointerDownPos = { x: 0, y: 0 };
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    // 1. Scene with Rich High-Contrast Background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101726); // Default: Deep Industrial Slate
    this.scene.fog = new THREE.FogExp2(0x101726, 0.015);

    // 2. Camera with Tightened Machine Framing
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    const p = ELEVATOR_CONFIG.cameraPresets.full;
    this.camera.position.set(...p.cam);

    // 3. High-Performance Renderer with Drawing Buffer Preservation for Video/Snapshots
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false, 
      preserveDrawingBuffer: true,
      powerPreference: "high-performance" 
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(...p.look);
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 0.4;
    this.controls.maxDistance = 22.0;

    // 5. Studio Lighting with Contour / Rim Lighting
    this.setupLighting();

    // 6. High-Contrast Ground Staging Platform & Grid
    this.setupGround();

    // 7. Visual Prominence Helpers
    this.setupHighlightVisuals();

    // 8. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.pointerDownPos.x = e.clientX;
      this.pointerDownPos.y = e.clientY;
    });

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      this.processPointerHover(e);
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist < 6) {
        this.processPointerClick(e);
      }
    });

    // 9. Load Master Model
    this.loadModel('assets/models/elevator_full_diagram69b.glb');
  }

  setupLighting() {
    // Ambient / Hemisphere Light (balanced so dark metals and shadows retain contrast)
    this.hemiLight = new THREE.HemisphereLight(0xeef4fa, 0x1a2636, 1.1);
    this.scene.add(this.hemiLight);

    // Primary Key Light (crisp specular highlights)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.keyLight.position.set(7.0, 13.0, 7.0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.bias = -0.00015;
    this.scene.add(this.keyLight);

    // Fill Light (soft cool blue)
    this.fillLight = new THREE.DirectionalLight(0x88bbdd, 1.0);
    this.fillLight.position.set(-7.0, 6.0, -4.0);
    this.scene.add(this.fillLight);

    // CRITICAL: Silhouette Rim / Backlight (separates machine components from background!)
    this.rimLight = new THREE.DirectionalLight(0x00e5ff, 2.4);
    this.rimLight.position.set(0, 9.0, -6.5);
    this.scene.add(this.rimLight);
  }

  setupGround() {
    // Staging Disc Ground Plane
    const groundGeo = new THREE.CircleGeometry(7.5, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141d2b,
      roughness: 0.65,
      metalness: 0.3
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.005;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Polar/Radial Ground Grid with SAGMA Accent Colors
    this.gridHelper = new THREE.PolarGridHelper(7.0, 14, 7, 64, 0x006544, 0x223245);
    this.gridHelper.position.y = 0.002;
    this.scene.add(this.gridHelper);

    // Center Machine Base Ring
    const baseRingGeo = new THREE.RingGeometry(1.25, 1.30, 64);
    const baseRingMat = new THREE.MeshBasicMaterial({ color: 0xc98818, side: THREE.DoubleSide });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.008;
    this.scene.add(baseRing);
  }

  setupHighlightVisuals() {
    // 1. Highlight bounding wireframe in luminous gold
    this.highlightBox = new THREE.BoxHelper(new THREE.Mesh(new THREE.BufferGeometry()), 0xffaa00);
    this.highlightBox.visible = false;
    this.highlightBox.material.linewidth = 2;
    this.scene.add(this.highlightBox);

    // 2. Base Beacon Ring
    const beaconGeo = new THREE.RingGeometry(0.25, 0.35, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.rotation.x = Math.PI / 2;
    this.beaconMesh.visible = false;
    this.scene.add(this.beaconMesh);

    // 3. 3D Bobbing Target Pointer Arrow (Golden Cone + Shaft)
    const arrowGroup = new THREE.Group();
    const coneGeo = new THREE.ConeGeometry(0.14, 0.32, 16);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff7700,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.4
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = Math.PI;
    arrowGroup.add(cone);

    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 16);
    const shaft = new THREE.Mesh(shaftGeo, coneMat);
    shaft.position.y = 0.26;
    arrowGroup.add(shaft);

    this.targetArrow = arrowGroup;
    this.targetArrow.visible = false;
    this.scene.add(this.targetArrow);

    // 4. In-World Floating 3D Info Billboard (Sprite)
    this.infoCanvas = document.createElement('canvas');
    this.infoCanvas.width = 512;
    this.infoCanvas.height = 256;
    this.infoCtx = this.infoCanvas.getContext('2d');
    this.infoTexture = new THREE.CanvasTexture(this.infoCanvas);
    this.infoTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.infoTexture,
      transparent: true,
      depthTest: false
    });
    this.infoSprite = new THREE.Sprite(spriteMat);
    this.infoSprite.scale.set(1.4, 0.7, 1);
    this.infoSprite.visible = false;
    this.infoSprite.renderOrder = 999;
    this.scene.add(this.infoSprite);

    // 5. Dynamic Focused Spotlight
    this.focusedSpotlight = new THREE.SpotLight(0xfff3d6, 4.2, 16, Math.PI / 5, 0.35, 1.2);
    this.focusedSpotlight.visible = false;
    this.scene.add(this.focusedSpotlight);
    this.scene.add(this.focusedSpotlight.target);

    // 6. 3D Callout Badges & Leader Lines Groups
    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'diagram69b_labels';
    this.scene.add(this.labelsGroup);

    this.leaderLinesGroup = new THREE.Group();
    this.leaderLinesGroup.name = 'diagram69b_leaders';
    this.scene.add(this.leaderLinesGroup);
  }

  // Environment Theme Switcher (Dark Slate / CAD Gray / Light Studio)
  setEnvironmentTheme(theme) {
    this.currentTheme = theme;
    if (theme === 'dark') {
      this.scene.background.set(0x101726); // Deep Slate
      this.scene.fog.color.set(0x101726);
      if (this.groundMesh) this.groundMesh.material.color.set(0x141d2b);
      if (this.hemiLight) this.hemiLight.intensity = 1.1;
      if (this.keyLight) this.keyLight.intensity = 2.2;
      if (this.rimLight) {
        this.rimLight.color.set(0x00e5ff);
        this.rimLight.intensity = 2.4;
      }
    } else if (theme === 'cad') {
      this.scene.background.set(0x232f3e); // CAD Steel Gray
      this.scene.fog.color.set(0x232f3e);
      if (this.groundMesh) this.groundMesh.material.color.set(0x2d3a4d);
      if (this.hemiLight) this.hemiLight.intensity = 1.2;
      if (this.keyLight) this.keyLight.intensity = 2.4;
      if (this.rimLight) {
        this.rimLight.color.set(0xffffff);
        this.rimLight.intensity = 2.0;
      }
    } else if (theme === 'light') {
      this.scene.background.set(0xdbe4ec); // Warm Silver Studio
      this.scene.fog.color.set(0xdbe4ec);
      if (this.groundMesh) this.groundMesh.material.color.set(0x334155); // Grounded dark stage
      if (this.hemiLight) this.hemiLight.intensity = 1.3;
      if (this.keyLight) this.keyLight.intensity = 2.0;
      if (this.rimLight) {
        this.rimLight.color.set(0x406080);
        this.rimLight.intensity = 1.8;
      }
    }
    // Update edge lines contrast for current background
    this.updateEdgeOutlines();
  }

  loadModel(assetPath) {
    const loader = new GLTFLoader();

    if (this.model) {
      this.scene.remove(this.model);
      this.pulleys = [];
      this.casings = [];
      this.buckets = [];
      this.streams = [];
      this.edgeOutlines = [];
      this.selectableObjects = [];
      this.selectedObject = null;
      if (this.highlightBox) this.highlightBox.visible = false;
      if (this.beaconMesh) this.beaconMesh.visible = false;
      if (this.targetArrow) this.targetArrow.visible = false;
      if (this.infoSprite) this.infoSprite.visible = false;
      if (this.focusedSpotlight) this.focusedSpotlight.visible = false;
    }

    loader.load(
      assetPath,
      (gltf) => {
        this.model = gltf.scene;

        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
              child.material = child.material.clone();
            }

            this.selectableObjects.push(child);
            const n = child.name;

            // 1. Pulleys: Machined stainless steel with crowned camber highlights
            if (n.includes('Pulley') || n.includes('Shaft')) {
              this.pulleys.push(child);
              child.material.color.set(0xcbd5e1);
              child.material.metalness = 0.85;
              child.material.roughness = 0.22;
            } 
            // 2. Casings & Flanges: High-contrast structural steel with CAD edge outlines
            else if (n.includes('Casing') || n.includes('Hood') || n.includes('Leg') || n.includes('Boot_Casing')) {
              this.casings.push(child);
              child.userData.isCasing = true;

              // Setup CAD edge outline line segments
              try {
                const edgeGeo = new THREE.EdgesGeometry(child.geometry, 24);
                const edgeMat = new THREE.LineBasicMaterial({
                  color: 0x475569,
                  transparent: true,
                  opacity: 0.75,
                  linewidth: 1
                });
                const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
                child.add(edgeLines);
                this.edgeOutlines.push(edgeLines);
              } catch (_) {}

              // Configure Casing Material based on current cutaway state
              this.applyCasingMaterial(child, this.isCutaway);
            } 
            // 3. Buckets: High-visibility safety orange with warm emissive glow
            else if (n.includes('Bucket')) {
              this.buckets.push(child);
              child.material.color.set(0xff5500); // Safety Orange
              child.material.metalness = 0.25;
              child.material.roughness = 0.3;
              if (child.material.emissive) {
                child.material.emissive.set(0xff2200);
                child.material.emissiveIntensity = 0.15;
              }
            } 
            // 4. Belt: Solid matte black vulcanized rubber
            else if (n.includes('Belt')) {
              child.material.color.set(0x141416);
              child.material.metalness = 0.1;
              child.material.roughness = 0.85;
            }
            // 5. Drive Unit: SAGMA Green with bright accents
            else if (n.includes('Drive') || n.includes('Motor')) {
              child.material.color.set(0x006544);
              child.material.metalness = 0.6;
              child.material.roughness = 0.3;
            }
            // 6. Cleanout Doors & Tensioner Screws: Safety Amber
            else if (n.includes('TakeUp') || n.includes('Cleanout')) {
              child.material.color.set(0xf59e0b);
              child.material.metalness = 0.7;
              child.material.roughness = 0.3;
            }
            // 7. Material Flows / Grains
            else if (n.includes('Stream') || n.includes('Discharge') || n.includes('Grain') || n.includes('Inflow')) {
              this.streams.push(child);
              child.material.color.set(0xfacc15); // Grain Gold
            }
          }
        });

        this.scene.add(this.model);

        // Build 3D floating callout labels with staggered layout & leader lines
        this.buildDiagram69bLabels();

        if (this.activeTargetMesh && this.allowVisualBeacon) {
          this.showMissionBeacon(this.activeTargetMesh, this.activeQuestKeywords, this.allowVisualBeacon);
        }
        if (this.onModelLoaded) this.onModelLoaded(this.model);
      },
      undefined,
      (err) => {
        console.error("Error loading elevator model:", err);
      }
    );
  }

  applyCasingMaterial(mesh, isCutaway) {
    if (!mesh || !mesh.material) return;
    if (isCutaway) {
      // Sleek Tinted Acrylic Cutaway (clearly visible structural volume + internal transparency)
      mesh.material.color.set(0x1e293b); // Slate blue tint
      mesh.material.transparent = true;
      mesh.material.opacity = 0.35;
      mesh.material.roughness = 0.15;
      mesh.material.metalness = 0.25;
      mesh.material.depthWrite = true;
    } else {
      // Solid Heavy Industrial Steel
      mesh.material.color.set(0x243242);
      mesh.material.transparent = false;
      mesh.material.opacity = 1.0;
      mesh.material.roughness = 0.35;
      mesh.material.metalness = 0.55;
    }
    mesh.material.needsUpdate = true;
  }

  updateEdgeOutlines() {
    const isDark = (this.currentTheme === 'dark');
    const outlineColor = isDark ? 0x64748b : 0x1e293b;
    this.edgeOutlines.forEach(lines => {
      if (lines.material) {
        lines.material.color.set(outlineColor);
        lines.material.opacity = this.isCutaway ? 0.85 : 0.4;
        lines.material.needsUpdate = true;
      }
    });
  }

  // Build Staggered 3D Callout Badges with Leader Lines (eliminates label bunching)
  buildDiagram69bLabels() {
    if (!this.labelsGroup || !this.leaderLinesGroup) return;

    while (this.labelsGroup.children.length > 0) {
      this.labelsGroup.remove(this.labelsGroup.children[0]);
    }
    while (this.leaderLinesGroup.children.length > 0) {
      this.leaderLinesGroup.remove(this.leaderLinesGroup.children[0]);
    }

    if (!this.model) return;

    // Staggered layout offsets to distribute badges along left and right sides without overlap
    const STAGGER_LAYOUT = {
      // Head Section (y ~ 8.0 - 9.8m)
      "01": { side: -1, yOffset: 0.35, xDist: 0.95 },  // Split Hood (Top Left)
      "02": { side: 1,  yOffset: 0.25, xDist: 0.95 },  // Crowned Pulley (Top Right)
      "03": { side: 1,  yOffset: -0.35, xDist: 1.05 }, // Saddle (Mid Right)
      "04": { side: 1,  yOffset: -0.85, xDist: 1.15 }, // Wear Plates (Lower Right)
      "05": { side: -1, yOffset: -0.30, xDist: 1.05 }, // Motor (Mid Left)
      "06": { side: -1, yOffset: -0.75, xDist: 0.95 }, // Sensor (Lower Left)

      // Trunking & Conveying Section (y ~ 1.5 - 7.0m)
      "07": { side: 1,  yOffset: 1.20, xDist: 0.90 },  // Trunking Legs (Up-Leg Right)
      "08": { side: -1, yOffset: 0.00, xDist: 0.85 },  // Antistatic Belt (Center Left)
      "09": { side: 1,  yOffset: -0.80, xDist: 0.85 }, // Buckets (Right Up-Leg)
      "10": { side: -1, yOffset: 0.15, xDist: 1.05 },  // Floor Tie Frame (Mid Left)

      // Boot Section (y ~ 0.1 - 1.2m)
      "11": { side: -1, yOffset: 0.15, xDist: 0.95 },  // Take-Up Screws (Boot Left)
      "12": { side: 1,  yOffset: 0.25, xDist: 0.95 },  // Boot Feed Spout (Boot Right)
      "13": { side: 0,  yOffset: -0.15, xDist: 0.00, zDist: 0.65 } // Cleanout Doors (Front Center)
    };

    ELEVATOR_CONFIG.diagram69bCallouts.forEach((callout) => {
      const mesh = this.model.getObjectByName(callout.meshTarget);
      if (!mesh) return;

      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());

      const layout = STAGGER_LAYOUT[callout.tag] || { side: 1, yOffset: 0, xDist: 0.85 };
      const badgePos = new THREE.Vector3(
        center.x + (layout.side * (layout.xDist || 0.85)),
        center.y + (layout.yOffset || 0.0),
        center.z + (layout.zDist || 0.18)
      );

      // 1. Draw 3D Leader Line from component center to badge
      const lineGeo = new THREE.BufferGeometry().setFromPoints([center, badgePos]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xc98818,
        transparent: true,
        opacity: 0.75,
        linewidth: 1
      });
      const leaderLine = new THREE.Line(lineGeo, lineMat);
      leaderLine.userData = { tag: callout.tag, targetMesh: mesh };
      this.leaderLinesGroup.add(leaderLine);

      // 2. Anchor Dot at component center
      const dotGeo = new THREE.SphereGeometry(0.025, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const anchorDot = new THREE.Mesh(dotGeo, dotMat);
      anchorDot.position.copy(center);
      this.leaderLinesGroup.add(anchorDot);

      // 3. Create High-Contrast Pill Badge Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 416;
      canvas.height = 104;
      const ctx = canvas.getContext('2d');

      // Rounded Capsule Badge with Deep Slate Background & Gold Border
      ctx.fillStyle = "rgba(10, 16, 26, 0.94)";
      ctx.roundRect(6, 6, 404, 92, 22);
      ctx.fill();

      ctx.strokeStyle = "#c98818"; // SAGMA Gold
      ctx.lineWidth = 4;
      ctx.roundRect(6, 6, 404, 92, 22);
      ctx.stroke();

      // Number Tag Box (SAGMA Forest Green)
      ctx.fillStyle = "#006544";
      ctx.roundRect(16, 16, 74, 72, 12);
      ctx.fill();
      ctx.strokeStyle = "#c98818";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(callout.tag, 53, 52);

      // Part Name Text (High contrast white)
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px -apple-system, sans-serif";
      ctx.textAlign = "left";
      const shortTitle = callout.title.length > 18 ? callout.title.substring(0, 16) + "..." : callout.title;
      ctx.fillText(shortTitle, 104, 44);

      // Section Subtitle (Glowing cyan)
      ctx.fillStyle = "#00d2ff";
      ctx.font = "bold 16px monospace";
      ctx.fillText(callout.section.toUpperCase(), 104, 74);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;

      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.92, 0.23, 1);
      sprite.position.copy(badgePos);
      sprite.renderOrder = 850;
      sprite.userData = { callout: callout, targetMesh: mesh, tag: callout.tag };

      this.labelsGroup.add(sprite);
    });

    this.applyLabelMode(this.labelMode);
  }

  // Label Mode Handler: 'all' | 'focused' | 'off'
  setLabelMode(mode) {
    this.labelMode = mode;
    this.applyLabelMode(mode);
    return this.labelMode;
  }

  applyLabelMode(mode) {
    if (!this.labelsGroup || !this.leaderLinesGroup) return;

    if (mode === 'off') {
      this.labelsGroup.visible = false;
      this.leaderLinesGroup.visible = false;
    } else if (mode === 'all') {
      this.labelsGroup.visible = true;
      this.leaderLinesGroup.visible = true;
      this.labelsGroup.children.forEach(s => s.visible = true);
      this.leaderLinesGroup.children.forEach(l => l.visible = true);
    } else if (mode === 'focused') {
      this.labelsGroup.visible = true;
      this.leaderLinesGroup.visible = true;
      const targetTag = this.selectedObject ? (this.selectedObject.userData.diagramCallout?.tag || '') : '';
      this.labelsGroup.children.forEach(s => {
        s.visible = (s.userData.tag === targetTag);
      });
      this.leaderLinesGroup.children.forEach(l => {
        l.visible = (l.userData.tag === targetTag);
      });
    }
  }

  toggleLabels() {
    // Cycles: 'all' -> 'focused' -> 'off' -> 'all'
    if (this.labelMode === 'all') {
      this.setLabelMode('focused');
    } else if (this.labelMode === 'focused') {
      this.setLabelMode('off');
    } else {
      this.setLabelMode('all');
    }
    return this.labelMode;
  }

  processPointerHover(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.selectableObjects, false);

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  processPointerClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Check if user clicked a floating 3D label sprite
    if (this.labelMode !== 'off' && this.labelsGroup && this.labelsGroup.children.length > 0) {
      const visibleSprites = this.labelsGroup.children.filter(s => s.visible);
      const labelHits = this.raycaster.intersectObjects(visibleSprites, false);
      if (labelHits.length > 0 && labelHits[0].object.userData.targetMesh) {
        const targetMesh = labelHits[0].object.userData.targetMesh;
        this.highlightObject(targetMesh, true);
        if (this.onSelect) this.onSelect(targetMesh, labelHits);
        return;
      }
    }

    // 2. Raycast against 3D elevator components with smart penetration
    const intersects = this.raycaster.intersectObjects(this.selectableObjects, false);

    if (intersects.length > 0) {
      let targetHit = intersects[0].object;

      // Active Quest Awareness: match quest target if intersected anywhere along the ray
      if (this.activeQuestKeywords && this.activeQuestKeywords.length > 0) {
        for (const hit of intersects) {
          const hitName = hit.object.name.toLowerCase();
          if (this.activeQuestKeywords.some(kw => hitName.includes(kw.toLowerCase()))) {
            targetHit = hit.object;
            break;
          }
        }
      } else {
        // Standard Click: penetrate outer casing to reach internal pulleys, belt, buckets, doors
        const firstName = targetHit.name;
        const isOuterCasing = firstName.includes('Casing_') || firstName.includes('Hood') || 
                              firstName.includes('Housing') || firstName.includes('Trunking');

        if (isOuterCasing) {
          for (let i = 1; i < intersects.length; i++) {
            const obj = intersects[i].object;
            const n = obj.name;
            if (n.includes('Pulley') || n.includes('Belt') || n.includes('Screw') || 
                n.includes('Bucket') || n.includes('Saddle') || n.includes('Cleanout') || 
                n.includes('Motor') || n.includes('Sensor') || n.includes('Door')) {
              targetHit = obj;
              break;
            }
          }
        }
      }

      this.highlightObject(targetHit, true);
      if (this.onSelect) this.onSelect(targetHit, intersects);
    }
  }

  highlightObject(mesh, shouldZoom = false) {
    this.selectedObject = mesh;

    // Reset non-selected casings to ghosted opacity for intense focus
    this.selectableObjects.forEach((m) => {
      if (m.material) {
        if (m.material.emissive) {
          m.material.emissive.setHex(0x000000);
          m.material.emissiveIntensity = 0.0;
        }
        if (m.userData.isCasing) {
          m.material.transparent = true;
          m.material.opacity = 0.08; // Ultra-transparent ghosting on selection!
          m.material.needsUpdate = true;
        }
      }
    });

    if (mesh && mesh.material) {
      mesh.material.transparent = false;
      mesh.material.opacity = 1.0;
      if (mesh.material.emissive) {
        mesh.material.emissive.setHex(0xffaa00); // Radiant Warm Gold
        mesh.material.emissiveIntensity = 1.6;
      }
      mesh.material.needsUpdate = true;

      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxSpan = Math.max(size.x, size.y, size.z);

      // 1. Update BoxHelper
      if (this.highlightBox) {
        this.highlightBox.setFromObject(mesh);
        this.highlightBox.visible = true;
      }

      // 2. Position Beacon Ring directly at the base of the component
      if (this.beaconMesh) {
        this.beaconMesh.position.set(center.x, Math.max(0.01, box.min.y + 0.01), center.z);
        const radius = Math.max(0.3, maxSpan * 1.5);
        this.beaconMesh.scale.set(radius, radius, 1);
        this.beaconMesh.visible = true;
      }

      // 3. Position Dynamic Focused Spotlight
      if (this.focusedSpotlight) {
        this.focusedSpotlight.position.set(center.x + 1.5, center.y + 2.5, center.z + 1.5);
        this.focusedSpotlight.target.position.copy(center);
        this.focusedSpotlight.target.updateMatrixWorld();
        this.focusedSpotlight.visible = true;
      }

      // 4. Update In-World 3D Billboard Info Sprite
      this.updateInfoBillboard(mesh.name, center, box.max.y);

      // 5. If label mode is 'focused', update leader lines & badge to show this part
      if (this.labelMode === 'focused') {
        this.applyLabelMode('focused');
      }

      // 6. Smooth camera swoop
      if (shouldZoom) {
        const targetCamDist = Math.max(1.2, maxSpan * 2.8);
        const targetCamPos = new THREE.Vector3(
          center.x + targetCamDist * 0.7,
          center.y + targetCamDist * 0.35,
          center.z + targetCamDist * 0.7
        );
        this.swoopCamera(targetCamPos, center);
      }
    }
  }

  updateInfoBillboard(meshName, centerPos, maxY) {
    if (!this.infoCtx || !this.infoSprite) return;

    const ctx = this.infoCtx;
    ctx.clearRect(0, 0, 512, 256);

    const callout = ELEVATOR_CONFIG.diagram69bCallouts.find(
      c => c.meshTarget === meshName || meshName.includes(c.meshTarget)
    );

    const title = callout ? callout.title : meshName.replace(/_/g, ' ');
    const tag = callout ? `[${callout.tag}]` : "SPECIFICATION";
    const note = callout ? callout.source : "SAGMA Certified Component";

    // Rounded Card Background
    ctx.fillStyle = "rgba(0, 75, 50, 0.95)"; // SAGMA Deep Green
    ctx.roundRect(16, 16, 480, 224, 24);
    ctx.fill();

    // Gold Border
    ctx.strokeStyle = "#c98818";
    ctx.lineWidth = 6;
    ctx.roundRect(16, 16, 480, 224, 24);
    ctx.stroke();

    // Tag Badge
    ctx.fillStyle = "#c98818";
    ctx.roundRect(36, 36, 120, 36, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(tag, 48, 60);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px sans-serif";
    const truncatedTitle = title.length > 26 ? title.substring(0, 24) + "..." : title;
    ctx.fillText(truncatedTitle, 36, 115);

    // Source / Subtitle
    ctx.fillStyle = "#fef8eb";
    ctx.font = "20px sans-serif";
    ctx.fillText(note, 36, 155);

    // Status
    ctx.fillStyle = "#86efac";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("✓ SELECTED IN 3D VIEW", 36, 195);

    this.infoTexture.needsUpdate = true;
    this.infoSprite.position.set(centerPos.x, maxY + 0.45, centerPos.z);
    this.infoSprite.visible = true;
  }

  showMissionBeacon(targetMeshName, keywords = [], allowVisualBeacon = true) {
    this.activeTargetMesh = targetMeshName;
    this.activeQuestKeywords = keywords;
    this.allowVisualBeacon = allowVisualBeacon;

    if (!allowVisualBeacon) {
      if (this.targetArrow) this.targetArrow.visible = false;
      return;
    }

    if (!this.model) return;
    const mesh = this.model.getObjectByName(targetMeshName);
    if (mesh) {
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());

      if (this.targetArrow) {
        this.targetArrow.position.set(center.x, box.max.y + 0.5, center.z);
        this.targetArrow.visible = true;
      }

      if (this.beaconMesh) {
        this.beaconMesh.position.set(center.x, Math.max(0.01, box.min.y + 0.01), center.z);
        const size = box.getSize(new THREE.Vector3());
        const maxSpan = Math.max(size.x, size.y, size.z);
        this.beaconMesh.scale.set(maxSpan * 1.5, maxSpan * 1.5, 1);
        this.beaconMesh.visible = true;
      }
    }
  }

  hideMissionBeacon() {
    this.activeTargetMesh = null;
    this.activeQuestKeywords = [];
    if (this.targetArrow) this.targetArrow.visible = false;
  }

  focusAndHighlight(meshName, shouldZoom = true) {
    if (!this.model) return;
    const mesh = this.model.getObjectByName(meshName);
    if (mesh) {
      this.highlightObject(mesh, shouldZoom);
    }
  }

  swoopCamera(targetCamPos, targetLookPos) {
    const startPos = this.camera.position.clone();
    const startLook = this.controls.target.clone();

    let t = 0;
    const animateSwoop = () => {
      t += 0.05;
      this.camera.position.lerpVectors(startPos, targetCamPos, t);
      this.controls.target.lerpVectors(startLook, targetLookPos, t);
      if (t < 1.0) {
        requestAnimationFrame(animateSwoop);
      }
    };
    animateSwoop();
  }

  toggleCutaway() {
    this.isCutaway = !this.isCutaway;
    this.casings.forEach((m) => {
      this.applyCasingMaterial(m, this.isCutaway);
    });
    this.updateEdgeOutlines();
    return this.isCutaway;
  }

  toggleAutoRotate() {
    this.isAutoRotate = !this.isAutoRotate;
    this.controls.autoRotate = this.isAutoRotate;
    this.controls.autoRotateSpeed = 0.8;
    return this.isAutoRotate;
  }

  setSpeed(speed_m_s) {
    this.speed = speed_m_s;
  }

  toggleModelMode() {
    this.activeModelMode = (this.activeModelMode === 'full') ? 'slice' : 'full';
    const path = (this.activeModelMode === 'full')
      ? 'assets/models/elevator_full_diagram69b.glb'
      : 'assets/models/elevator_slice_poc.glb';
    this.loadModel(path);
    return this.activeModelMode;
  }

  focusPreset(presetKey) {
    const p = ELEVATOR_CONFIG.cameraPresets[presetKey];
    if (!p) return;

    const startPos = this.camera.position.clone();
    const startLook = this.controls.target.clone();
    const endPos = new THREE.Vector3(...p.cam);
    const endLook = new THREE.Vector3(...p.look);

    let t = 0;
    const animateTransition = () => {
      t += 0.05;
      this.camera.position.lerpVectors(startPos, endPos, t);
      this.controls.target.lerpVectors(startLook, endLook, t);
      if (t < 1.0) {
        requestAnimationFrame(animateTransition);
      }
    };
    animateTransition();
  }

  onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  startAnimationLoop() {
    this.renderer.setAnimationLoop(() => this.render());
  }

  render() {
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Rotate pulleys and belt drives at authentic speed
    if (this.speed > 0 && this.pulleys.length > 0) {
      const omega = (this.speed / this.pulleyRadius) * delta;
      this.pulleys.forEach((p) => {
        p.rotation.y += omega;
      });
    }

    // 2. Pulse selected component highlight & beacon
    if (this.selectedObject && this.selectedObject.material && this.selectedObject.material.emissive) {
      const pulse = 1.0 + 0.5 * Math.sin(elapsedTime * 6.0);
      this.selectedObject.material.emissiveIntensity = pulse;
      if (this.highlightBox) this.highlightBox.update();
      if (this.beaconMesh && this.beaconMesh.visible) {
        this.beaconMesh.material.opacity = 0.5 + 0.4 * Math.sin(elapsedTime * 6.0);
      }
    }

    // 3. Bob and spin 3D Target Arrow
    if (this.targetArrow && this.targetArrow.visible) {
      this.targetArrow.rotation.y += 0.03;
      this.targetArrow.position.y += Math.sin(elapsedTime * 5.0) * 0.003;
    }

    // 4. Billboard 3D Callout Badges to face camera
    if (this.labelsGroup && this.labelsGroup.children.length > 0) {
      this.labelsGroup.children.forEach(sprite => {
        sprite.quaternion.copy(this.camera.quaternion);
      });
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Capture pristine high-resolution snapshot for AI video generation or documentation.
   * @returns {string} Base64 PNG data URL
   */
  captureFrame() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
}
