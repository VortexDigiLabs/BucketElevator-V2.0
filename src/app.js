/**
 * SAGMA Continuous Milling Exploration Suite & Fleet Registry
 * Diagram 69(b) Bucket Elevator with Live 58-Bucket Kinematics (2.80 m/s),
 * Screen-Space Floating 3D HUD Callout Banners, Dedicated Machine Fleet Registry,
 * Automated Multi-Format Asset Intake Pipeline, and Official SAGMA Light Mode.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import elevatorAnatomy from './data/machines/bucket_elevator.json';
import satakeAnatomy from './data/machines/satake_degermer.json';
import { TRANSLATIONS } from './data/translations.js';
import { FLEET_MACHINES } from './data/fleet_data.js';

class ElevatorViewer {
  constructor() {
    this.container = document.getElementById('three-container');
    this.hudOverlay = document.getElementById('hud-overlay');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;

    // Dual Machine Support
    this.activeMachine = 'bucket_elevator'; // 'bucket_elevator' | 'satake_vbf'
    this.elevatorAnatomy = elevatorAnatomy;
    this.satakeAnatomy = satakeAnatomy;
    this.activeManifest = elevatorAnatomy;
    this.activeParts = this.normalizeParts(elevatorAnatomy.parts);
    this.currentRotorSpeed = 0;
    this.satakeRotors = [];
    this.satakeFan = null;

    // Theme Engine: SAGMA Light Mode Default
    this.currentTheme = 'light';
    this.floorMesh = null;
    this.gridHelper = null;
    this.ambientLight = null;

    // Kinematics Geometry Truth (CAD Model):
    // Head pulley Y = 9.20m, Boot pulley Y = 0.65m, Camber Radius R = 0.2605m
    this.R = 0.2605;
    this.Y_boot = 0.65;
    this.Y_head = 9.20;
    this.H = this.Y_head - this.Y_boot; // 8.55m vertical leg height
    this.arc = Math.PI * this.R; // 0.818385m semi-circle arc
    this.L_total = 2 * this.H + 2 * this.arc; // 18.7368m total closed belt loop

    // Machine Kinematics State:
    // ACTIVELY MOVING ON INITIAL PAGE LOAD!
    this.isMachineRunning = true;
    this.currentBeltSpeed = 2.80; // Scale-accurate 2.80 m/s
    this.targetBeltSpeed = 2.80;
    this.nominalRPM = 136.8;
    this.nominalTonnage = 78.5; // t/h
    this.distanceTraveled = 0.0;

    // Turntable State (0.002 rad/frame)
    this.isTurntableActive = true;
    this.turntableSpeed = 0.002;

    // Audio Engine (Web Audio API synthetic mechanical sound)
    this.isSoundEnabled = false;
    this.audioCtx = null;
    this.motorOsc = null;
    this.motorGain = null;
    this.noiseNode = null;
    this.noiseGain = null;

    // Exploded View & Casing Opacity
    this.casingOpacity = 0.35;
    this.isCutaway = false;
    this.explodeFactor = 0.0;
    this.originalMaterials = new Map();
    this.explodedMeshes = [];

    // Mesh Collections
    this.pulleys = [];
    this.buckets = [];
    this.casings = [];
    this.streams = [];
    this.upLegBelt = null;
    this.downLegBelt = null;

    // Camera Framing (Full 9.63m Elevator)
    this.defaultCamPos = new THREE.Vector3(5.6, 5.2, 7.8);
    this.defaultLookPos = new THREE.Vector3(0, 4.8, 0);
    this.camStartPos = new THREE.Vector3();
    this.camTargetPos = new THREE.Vector3();
    this.lookStartPos = new THREE.Vector3();
    this.lookTargetPos = new THREE.Vector3();
    this.isDryingCamera = false;
    this.camLerpAlpha = 0;

    // Screen-Space Floating 3D HUD Callout Banners
    this.hudElements = [];
    this.activePart = (elevatorAnatomy.parts && elevatorAnatomy.parts[0]) || null;
    this.clock = new THREE.Clock();

    // Guided Tour State
    this.isAutoTourActive = false;
    this.isTourPlaying = true;
    this.tourIndex = 0;
    this.tourTimer = null;

    // Fault Simulation
    this.activeSimulatedFault = null;
    this.isFaultSimulated = false;

    // Language Localization
    this.currentLang = 'en';

    // 16:9 Cinema Frame
    this.isCinema169 = false;

    // 30s Master Showcase Recording State
    this.isShowcaseRecording = false;
    this.isShowcaseActive = false;
    this.showcaseStartTime = 0;
    this.showcaseRafId = null;
    this.showcaseMediaRecorder = null;
    this.showcaseStream = null;
    this.lastShowcaseNodeId = null;

    // Explored Progress
    this.exploredParts = new Set();

    // Machine Fleet Registry State
    this.fleetMachines = [...FLEET_MACHINES];
    this.activeFleetFilter = 'all';

    // Automated Asset Intake Pipeline State

    this.init();
  }

  init() {
    try {
      this.setupScene();
      this.setupLighting();
      this.setupControls();
      this.setupThemeEngine();
      this.setupUI();
      this.setupFloatingHUD();
      this.setupFleetRegistryUI();
      this.loadModel();
      this.animate();
    } catch (err) {
      console.error('Fatal initialization error in ElevatorViewer:', err);
    }
  }

  /* ============================================================
     1. SCENE, CAMERA, LIGHTING & CONTACT SHADOW
     ============================================================ */
  setupScene() {
    this.scene = new THREE.Scene();
    // Default: Soft Studio Sage (#EAF0EB)
    this.scene.background = new THREE.Color(0xEAF0EB);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 120);
    this.camera.position.copy(this.defaultCamPos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Mill Floor Pedestal Base
    const floorGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.12, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xD5DFD7,
      roughness: 0.85,
      metalness: 0.1
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, -0.06, 0);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Soft Radial Contact Shadow Plane directly beneath the boot base
    const shadowGeo = new THREE.PlaneGeometry(5.2, 5.2);
    const shadowMat = this.createContactShadowMaterial();
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.003;
    this.scene.add(shadowPlane);

    // Engineering Precision Grid (SAGMA Forest Green axes & Sage-Grey lines)
    this.gridHelper = new THREE.GridHelper(10, 20, 0x005A36, 0xCBD7CE);
    this.gridHelper.position.y = 0.005;
    this.scene.add(this.gridHelper);
  }

  createContactShadowMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0, 90, 54, 0.45)');
    grad.addColorStop(0.5, 'rgba(0, 90, 54, 0.18)');
    grad.addColorStop(1, 'rgba(0, 90, 54, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.25);
    this.scene.add(this.ambientLight);

    // Key Light: Warm studio directional light
    const keyLight = new THREE.DirectionalLight(0xFFFBF2, 1.4);
    keyLight.position.set(7, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0004;
    this.scene.add(keyLight);

    // Fill Light: Soft slate fill light
    const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.7);
    fillLight.position.set(-8, 9, -7);
    this.scene.add(fillLight);

    // Rim Light: Fresh sage accent rim definition
    const rimLight = new THREE.DirectionalLight(0xD9EED1, 0.35);
    rimLight.position.set(0, 6, -9);
    this.scene.add(rimLight);

    // Local Point Lights for internal component illumination
    const headPoint = new THREE.PointLight(0xFFEEDD, 0.75, 7);
    headPoint.position.set(0, 9.4, 1.6);
    this.scene.add(headPoint);

    const bootPoint = new THREE.PointLight(0xFFEEDD, 0.7, 6);
    bootPoint.position.set(0, 1.1, 1.6);
    this.scene.add(bootPoint);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultLookPos);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 26.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;

    // Slow continuous turntable orbit (0.002 rad/frame ~ 0.70 in OrbitControls)
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.70;

    this.controls.addEventListener('start', () => {
      if (this.isTurntableActive && !this.isAutoTourActive) {
        this.pauseTurntable();
      }
    });

    // 3D Mesh click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist < 6 && e.button === 0 && this.model) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, this.camera);

        const hits = raycaster.intersectObjects(this.model.children, true);
        if (hits.length > 0) {
          this.handleMeshClick(hits[0].object);
        }
      }
    });

    window.addEventListener('resize', () => this.onWindowResize());
  }

  /* ============================================================
     2. THEME ENGINE: SAGMA LIGHT MODE & DARK SLATE TOGGLE
     ============================================================ */
  setupThemeEngine() {
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.currentTheme);

    const btnThemeToggle = document.getElementById('btn-theme-toggle');

    if (this.currentTheme === 'dark') {
      // Dark Slate Theme (#080E18)
      if (btnThemeToggle) {
        btnThemeToggle.innerHTML = `
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        `;
        btnThemeToggle.title = 'Switch to SAGMA Light Mode';
      }

      this.scene.background = new THREE.Color(0x080E18);
      if (this.floorMesh) this.floorMesh.material.color.setHex(0x0F1B2C);
      if (this.ambientLight) this.ambientLight.intensity = 0.95;

      // Update GridHelper
      if (this.gridHelper) {
        this.scene.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(10, 20, 0x10B981, 0x1E2D42);
        this.gridHelper.position.y = 0.005;
        this.scene.add(this.gridHelper);
      }
    } else {
      // SAGMA Light Industrial Mode (#EAF0EB)
      if (btnThemeToggle) {
        btnThemeToggle.innerHTML = `
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        `;
        btnThemeToggle.title = 'Switch to Technical Dark Slate';
      }

      this.scene.background = new THREE.Color(0xEAF0EB);
      if (this.floorMesh) this.floorMesh.material.color.setHex(0xD5DFD7);
      if (this.ambientLight) this.ambientLight.intensity = 1.25;

      if (this.gridHelper) {
        this.scene.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(10, 20, 0x005A36, 0xCBD7CE);
        this.gridHelper.position.y = 0.005;
        this.scene.add(this.gridHelper);
      }
    }
  }

  /* ============================================================
     3. SCREEN-SPACE FLOATING 3D HUD CALLOUT BANNERS
     ============================================================ */
  setupFloatingHUD() {
    if (!this.hudOverlay) return;
    this.hudOverlay.innerHTML = '';
    this.hudElements = [];

    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;

    this.activeParts.forEach((part) => {
      const localized = (dict.parts && dict.parts[part.partNumber]) || part;

      const hudItem = document.createElement('div');
      hudItem.className = 'hud-item';
      hudItem.id = `hud-pin-${part.partNumber}`;
      hudItem.dataset.part = part.partNumber;

      const keySuffix = (this.activeMachine === 'satake_vbf' && part.drawingKey)
        ? ` <span class="hud-banner-key">${part.drawingKey}</span>`
        : '';

      hudItem.innerHTML = `
        <div class="hud-capsule-banner" title="Inspect ${localized.name || part.officialName}">
          <span class="hud-pill-badge">${part.partNumber}</span>
          <span class="hud-banner-title">${localized.name || part.officialName}${keySuffix}</span>
        </div>
        <div class="hud-leader-line"></div>
        <div class="hud-anchor-ring">
          <div class="hud-anchor-dot"></div>
        </div>
      `;

      hudItem.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isAutoTourActive) this.stopAutoTour();
        this.selectPart(part);
      });

      this.hudOverlay.appendChild(hudItem);

      this.hudElements.push({
        domEl: hudItem,
        part,
        anchorVec: new THREE.Vector3(...part.anchorPosition)
      });
    });
  }

  updateFloatingHUDPositions() {
    if (!this.hudOverlay || !this.camera || this.hudElements.length === 0) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const tempVec = new THREE.Vector3();

    this.hudElements.forEach(({ domEl, part, anchorVec }) => {
      tempVec.copy(anchorVec);

      // Add exploded view offset if exploded slider is active
      if (this.explodeFactor > 0.01 && part.meshNodeName) {
        if (part.meshNodeName.includes('SplitHood')) tempVec.addScaledVector(new THREE.Vector3(0, 0.85, 0.55), this.explodeFactor);
        else if (part.meshNodeName.includes('Head_Lower')) tempVec.addScaledVector(new THREE.Vector3(0, 0.35, 0.40), this.explodeFactor);
        else if (part.meshNodeName.includes('Discharge_Spout')) tempVec.addScaledVector(new THREE.Vector3(0.65, 0.20, 0), this.explodeFactor);
        else if (part.meshNodeName.includes('Trunking_UpLeg')) tempVec.addScaledVector(new THREE.Vector3(-0.55, 0, 0.30), this.explodeFactor);
        else if (part.meshNodeName.includes('Cleanout_Door')) tempVec.addScaledVector(new THREE.Vector3(0, 0, 0.45), this.explodeFactor);
        else if (part.meshNodeName.includes('Feed_Spout')) tempVec.addScaledVector(new THREE.Vector3(0.50, 0.15, 0), this.explodeFactor);
        else if (part.meshNodeName.includes('Motor')) tempVec.addScaledVector(new THREE.Vector3(-0.65, 0, 0), this.explodeFactor);
      }

      // Project world coordinates into NDC (-1 to +1)
      tempVec.project(this.camera);

      // Check if behind camera
      if (tempVec.z > 1.0) {
        domEl.style.display = 'none';
        return;
      }

      domEl.style.display = 'flex';

      const screenX = (tempVec.x * 0.5 + 0.5) * width;
      const screenY = (-tempVec.y * 0.5 + 0.5) * height;

      domEl.style.left = `${screenX.toFixed(1)}px`;
      domEl.style.top = `${screenY.toFixed(1)}px`;

      // Highlight active part banner
      const isSelected = (this.activePart && this.activePart.partNumber === part.partNumber);
      domEl.classList.toggle('active', isSelected);
    });
  }

  /* ============================================================
     4. MACHINE FLEET REGISTRY (Requirement 2)
     ============================================================ */
  setupFleetRegistryUI() {
    const btnNavFleet = document.getElementById('btn-nav-fleet');
    const modalFleet = document.getElementById('fleet-modal');
    const btnCloseFleet = document.getElementById('btn-close-fleet');

    if (btnNavFleet && modalFleet) {
      btnNavFleet.addEventListener('click', () => {
        this.openFleetModal();
      });
    }

    if (btnCloseFleet && modalFleet) {
      btnCloseFleet.addEventListener('click', () => {
        modalFleet.style.display = 'none';
      });
    }

    // Filter tabs
    const filterBtns = document.querySelectorAll('.fleet-filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFleetFilter = btn.dataset.filter;
        this.renderFleetCards();
      });
    });

    this.renderFleetCards();
  }

  openFleetModal() {
    const modalFleet = document.getElementById('fleet-modal');
    if (modalFleet) {
      this.renderFleetCards();
      modalFleet.style.display = 'flex';
    }
  }

  switchMachineProfile(machineId) {
    if (machineId === 'satake_vbf' || machineId === 'satake_degermer') {
      this.loadMachineProfile('satake_vbf');
    } else {
      this.loadMachineProfile('bucket_elevator');
    }
  }

  loadMachineProfile(machineId) {
    this.activeMachine = machineId;
    const modalFleet = document.getElementById('fleet-modal');
    if (modalFleet) modalFleet.style.display = 'none';

    const eyebrow = document.getElementById('components-eyebrow') || document.querySelector('.panel-eyebrow');
    const sub = document.getElementById('components-sub') || document.querySelector('.panel-sub');

    if (machineId === 'satake_vbf') {
      // 1. Set active manifest & 10 parts
      this.activeManifest = this.satakeAnatomy;
      this.activeParts = this.normalizeParts(this.satakeAnatomy.parts);
      this.exploredParts.clear();

      // 2. Update Header Chip, Left Panel Eyebrow and Subtitle
      const chip = document.getElementById('brand-sub-txt');
      if (chip) chip.textContent = 'Satake VBF Maize Degermer (Diagram 3 & 4a)';

      if (eyebrow) eyebrow.textContent = 'SATAKE VBF DEGERMER (DIAGRAM 3 & 4a)';
      if (sub) sub.textContent = `${this.activeParts.length} registered nodes`;

      const readoutsEl = document.querySelector('.machine-readouts');
      if (readoutsEl) {
        readoutsEl.innerHTML = `
          <span class="readout-item"><strong id="readout-speed">465.0</strong> RPM</span>
          <span class="readout-sep">&bull;</span>
          <span class="readout-item"><strong id="readout-rpm">65.0</strong> A (CCU)</span>
          <span class="readout-sep">&bull;</span>
          <span class="readout-item"><strong id="readout-tonnage">4.5</strong> t/h</span>
        `;
      }
      this.nominalRPM = 465.0;
      this.nominalAmps = 65.0;
      this.nominalTonnage = 4.5;

      // 3. Reframe camera to 1.85 m vertical envelope (target [0, 0.95, 0])
      this.defaultCamPos.set(2.4, 1.4, 2.7);
      this.defaultLookPos.set(0, 0.95, 0);
      this.dollyCameraTo(this.defaultCamPos, this.defaultLookPos);

      // 4. Load Satake 3D model
      this.loadSatakeModel();

      // 5. Wire 10 HUD Banners, Specs, and LOTO Advisories
      this.populatePartsList();
      this.setupFloatingHUD();
      this.populateElevatorScheduleTable();
      this.populateSatakeScheduleTable();
      this.populateHazardSensors();
      this.setupFaultDiagnosticsUI();
      if (this.activeParts.length > 0) {
        this.selectPart(this.activeParts[0]);
      }

      this.showToast('Active Machine: Satake VBF Vertical Maize Degermer (Diagram 3 & 4a) • 10 Nodes Loaded', 'success');
    } else {
      // 1. Bucket Elevator
      this.activeManifest = this.elevatorAnatomy;
      this.activeParts = this.normalizeParts(this.elevatorAnatomy.parts);
      this.exploredParts.clear();

      const chip = document.getElementById('brand-sub-txt');
      if (chip) chip.textContent = 'Diagram 69(b) - Live';

      if (eyebrow) eyebrow.textContent = 'DIAGRAM 69(B)';
      if (sub) sub.textContent = `${this.activeParts.length} registered nodes`;

      const readoutsEl = document.querySelector('.machine-readouts');
      if (readoutsEl) {
        readoutsEl.innerHTML = `
          <span class="readout-item"><strong id="readout-speed">2.80</strong> m/s</span>
          <span class="readout-sep">&bull;</span>
          <span class="readout-item"><strong id="readout-rpm">136.8</strong> RPM</span>
          <span class="readout-sep">&bull;</span>
          <span class="readout-item"><strong id="readout-tonnage">78.5</strong> t/h</span>
        `;
      }
      this.nominalRPM = 136.8;
      this.nominalBeltSpeed = 2.80;
      this.nominalTonnage = 78.5;

      this.defaultCamPos.set(5.6, 5.2, 7.8);
      this.defaultLookPos.set(0, 4.8, 0);
      this.dollyCameraTo(this.defaultCamPos, this.defaultLookPos);

      this.loadElevatorModel();

      this.populatePartsList();
      this.setupFloatingHUD();
      this.populateElevatorScheduleTable();
      this.populateSatakeScheduleTable();
      this.populateHazardSensors();
      this.setupFaultDiagnosticsUI();
      if (this.activeParts.length > 0) {
        this.selectPart(this.activeParts[0]);
      }

      this.showToast('Active Machine: Diagram 69(b) Bucket Elevator (Module 2) • 13 Nodes Loaded', 'success');
    }
  }

  loadSatakeModel() {
    const loader = new GLTFLoader();
    const modelUrl = '/assets/machines/satake_degermer/models/satake_vbf.glb';

    const loaderOverlay = document.getElementById('loader-overlay');
    if (loaderOverlay) {
      const sub = loaderOverlay.querySelector('.loader-sub');
      if (sub) sub.textContent = 'satake_vbf.glb';
      loaderOverlay.style.display = 'flex';
      loaderOverlay.style.opacity = '1';
    }

    loader.load(
      modelUrl,
      (gltf) => {
        try {
          if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
          }
          this.model = gltf.scene;

          this.satakeRotors = [];
          this.satakeFan = null;
          this.casings = [];
          this.originalMaterials.clear();

          this.model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              this.originalMaterials.set(child, child.material);

              const n = child.name || '';
              const p = (child.parent && child.parent.name) || '';

              if (n.includes('Rotor') || p.includes('Rotor') ||
                  n.includes('Beater') || p.includes('Beater') ||
                  n.includes('Scroll') || p.includes('Scroll')) {
                this.satakeRotors.push(child);
              } else if (n.includes('Fan') || p.includes('Fan')) {
                this.satakeFan = child;
              } else if (n.includes('Screen') || p.includes('Screen') ||
                         n.includes('Hood') || p.includes('Hood')) {
                this.casings.push(child);
                this.registerExplodedMesh(child);
              } else {
                this.registerExplodedMesh(child);
              }
            }
          });

          this.scene.add(this.model);
          this.applyCasingOpacity();

          if (loaderOverlay) {
            loaderOverlay.style.opacity = '0';
            setTimeout(() => { loaderOverlay.style.display = 'none'; }, 400);
          }

          if (this.activeParts.length > 0) {
            this.selectPart(this.activeParts[0], false);
          }
        } catch (err) {
          console.error('[SAGMA Viewer] Error processing Satake model:', err);
        }
      },
      undefined,
      (err) => {
        console.error('[SAGMA Viewer] Error loading Satake model:', err);
      }
    );
  }

  loadElevatorModel() {
    this.loadModel();
  }

  showToast(message, type = 'info') {
    let toast = document.getElementById('sagma-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sagma-toast';
      toast.className = 'sagma-toast-notification';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `sagma-toast-notification visible ${type}`;
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.className = 'sagma-toast-notification';
    }, 3800);
  }

  renderFleetCards() {
    const container = document.getElementById('fleet-cards-container');
    if (!container) return;
    container.innerHTML = '';

    const filtered = this.fleetMachines.filter((m) => {
      if (this.activeFleetFilter === 'all') return true;
      if (this.activeFleetFilter === 'live') return m.status === 'live';
      return true;
    });

    filtered.forEach((machine) => {
      const card = document.createElement('div');
      card.className = 'machine-card';

      const isElevator = machine.id === 'elevator_69b';

      card.innerHTML = `
        <div class="machine-thumb-wrap">
          <img src="${machine.thumbnail}" alt="${machine.name}" class="machine-thumb-img" onerror="this.src='${machine.fallbackImg}'" />
          <span class="status-pill ${machine.status}">
            &bull; ${machine.statusLabel}
          </span>
        </div>
        <div class="machine-card-content">
          <span class="machine-card-syllabus">${machine.syllabus}</span>
          <h3 class="machine-card-title">${machine.name}</h3>
          <p class="machine-card-sub">${machine.subtitle}</p>

          <div class="machine-metrics-row">
            <div class="machine-metric-item">
              <span class="metric-lbl">Capacity</span>
              <span class="metric-val">${machine.specs.capacity}</span>
            </div>
            <div class="machine-metric-item">
              <span class="metric-lbl">Speed</span>
              <span class="metric-val">${machine.specs.velocity}</span>
            </div>
            <div class="machine-metric-item">
              <span class="metric-lbl">Height</span>
              <span class="metric-val">${machine.specs.elevation}</span>
            </div>
          </div>

          <button class="btn-launch-machine" data-machine="${machine.id}">
            ${isElevator ? 'Launch 3D Simulator' : 'Switch Machine Profile'}
          </button>
        </div>
      `;

      const launchBtn = card.querySelector('.btn-launch-machine');
      launchBtn.addEventListener('click', () => {
        this.switchMachineProfile(machine.id);
      });

      container.appendChild(card);
    });



    const pill = document.getElementById('fleet-count-pill');
    if (pill) pill.textContent = `Fleet (${this.fleetMachines.length})`;
  }

  /* ============================================================
     5. AUTOMATED ASSET INTAKE & DIRECTORY CLUSTERING (Requirement 3)
     ============================================================ */
  setupIntakePipelineUI() {
    const btnOpenIntake = document.getElementById('btn-open-intake');
    const modalIntake = document.getElementById('intake-modal');
    const btnCloseIntake = document.getElementById('btn-close-intake');
    const dropzone = document.getElementById('intake-dropzone');
    const fileInput = document.getElementById('intake-file-input');
    const btnBrowse = document.getElementById('btn-trigger-file-browse');
    const btnSampleChief = document.getElementById('btn-load-sample-chief');
    const btnSampleRaw = document.getElementById('btn-load-sample-raw');
    const btnRegisterFleet = document.getElementById('btn-register-intake-fleet');

    if (btnOpenIntake && modalIntake) {
      btnOpenIntake.addEventListener('click', () => {
        this.openIntakePipelineModal();
      });
    }

    if (btnCloseIntake && modalIntake) {
      btnCloseIntake.addEventListener('click', () => {
        modalIntake.style.display = 'none';
      });
    }

    if (btnBrowse && fileInput) {
      btnBrowse.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.processUploadedFiles(Array.from(e.target.files));
        }
      });
    }

    // Drag-and-drop
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.add('drag-active');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.remove('drag-active');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.processUploadedFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    // Sample bundle loaders
    if (btnSampleChief) {
      btnSampleChief.addEventListener('click', () => {
            this.renderClusteredDirectoryView();
      });
    }

    if (btnSampleRaw) {
      btnSampleRaw.addEventListener('click', () => {
        this.currentIntakeBundle = SAMPLE_INTAKE_BUNDLES[2];
        this.renderClusteredDirectoryView();
      });
    }

    if (btnRegisterFleet) {
      btnRegisterFleet.addEventListener('click', () => {
        modalIntake.style.display = 'none';
        this.openFleetModal();
      });
    }

    this.renderClusteredDirectoryView();
  }

  openIntakePipelineModal() {
    const modalIntake = document.getElementById('intake-modal');
    if (modalIntake) {
      this.renderClusteredDirectoryView();
      modalIntake.style.display = 'flex';
    }
  }

  processUploadedFiles(fileList) {
    const parsedFiles = fileList.map((f) => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      let type = 'manifests';
      let isGlb = false;

      if (['step', 'stp', 'dwg', 'dxf', 'sldprt', 'stl', 'glb'].includes(ext)) {
        type = 'cad';
        if (ext === 'glb') isGlb = true;
      } else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
        type = 'diagrams';
      } else if (['pdf'].includes(ext)) {
        type = 'manuals';
      }

      return {
        name: f.name,
        size: f.size || 1200000,
        type,
        isGlb
      };
    });

    this.currentIntakeBundle = {
      bundleName: 'User Uploaded Industrial Assembly',
      machineTitle: 'Custom Machinery Intake Bundle',
      files: parsedFiles
    };

    this.renderClusteredDirectoryView();
  }

  renderClusteredDirectoryView() {
    const b = this.currentIntakeBundle;
    if (!b) return;

    const listCad = document.getElementById('list-folder-cad');
    const listDiag = document.getElementById('list-folder-diagrams');
    const listMan = document.getElementById('list-folder-manuals');
    const listMani = document.getElementById('list-folder-manifests');

    if (listCad) listCad.innerHTML = '';
    if (listDiag) listDiag.innerHTML = '';
    if (listMan) listMan.innerHTML = '';
    if (listMani) listMani.innerHTML = '';

    let cadCount = 0;
    let diagCount = 0;
    let manCount = 0;
    let maniCount = 0;
    let totalBytes = 0;
    let hasGlb = false;

    const formatSize = (bytes) => {
      if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / 1024).toFixed(0) + ' KB';
    };

    b.files.forEach((file) => {
      totalBytes += file.size;
      if (file.isGlb || file.name.endsWith('.glb')) hasGlb = true;

      const chip = document.createElement('div');
      chip.className = 'file-chip-row';
      chip.innerHTML = `
        <span class="file-chip-name" title="${file.name}">${file.name}</span>
        <span class="file-chip-size">${formatSize(file.size)}</span>
      `;

      if (file.type === 'cad' && listCad) { listCad.appendChild(chip); cadCount++; }
      else if (file.type === 'diagrams' && listDiag) { listDiag.appendChild(chip); diagCount++; }
      else if (file.type === 'manuals' && listMan) { listMan.appendChild(chip); manCount++; }
      else if (listMani) { listMani.appendChild(chip); maniCount++; }
    });

    // Counts
    const cCad = document.getElementById('count-cad'); if (cCad) cCad.textContent = `${cadCount} files`;
    const cDiag = document.getElementById('count-diagrams'); if (cDiag) cDiag.textContent = `${diagCount} files`;
    const cMan = document.getElementById('count-manuals'); if (cMan) cMan.textContent = `${manCount} files`;
    const cMani = document.getElementById('count-manifests'); if (cMani) cMani.textContent = `${maniCount} files`;

    const metaPill = document.getElementById('intake-meta-pill');
    if (metaPill) metaPill.textContent = `${b.files.length} Files • ${formatSize(totalBytes)} Total`;

    // Validation Card
    const valCard = document.getElementById('webgl-validation-card');
    const valTitle = document.getElementById('val-status-title');
    const valDesc = document.getElementById('val-status-desc');
    const valActionContainer = document.getElementById('val-action-container');

    if (valCard && valTitle && valDesc && valActionContainer) {
      if (hasGlb) {
        valCard.className = 'webgl-validation-card ready';
        valTitle.innerHTML = '&check; 3D Ready (WebGL Live)';
        valDesc.textContent = 'Optimized .glb web mesh detected in bundle. Ready for interactive viewport rendering.';
        valActionContainer.innerHTML = `
          <button class="btn-register-fleet" id="btn-register-intake-fleet">Register to Machine Fleet</button>
        `;
        const regBtn = document.getElementById('btn-register-intake-fleet');
        if (regBtn) {
          regBtn.addEventListener('click', () => {
            const modalIntake = document.getElementById('intake-modal');
            if (modalIntake) modalIntake.style.display = 'none';
            this.openFleetModal();
          });
        }
      } else {
        valCard.className = 'webgl-validation-card warning';
        valTitle.innerHTML = '&#9888; GLB Required for 3D Viewport (Run Draco Pipeline)';
        valDesc.textContent = 'Raw CAD detected (.step, .dwg) without WebGL asset. Run automated Draco geometry decimation pipeline.';
        valActionContainer.innerHTML = `
          <button class="btn-draco-optimize" id="btn-run-draco">⚡ Run Draco &amp; KTX2 Optimizer</button>
        `;
        const dracoBtn = document.getElementById('btn-run-draco');
        if (dracoBtn) {
          dracoBtn.addEventListener('click', () => {
            dracoBtn.textContent = 'Optimizing Meshes... (Draco / KTX2)';
            setTimeout(() => {
              // Add converted GLB file to current bundle
              b.files.unshift({
                name: 'optimized_assembly_draco.glb',
                size: 4200000,
                type: 'cad',
                isGlb: true
              });
              this.renderClusteredDirectoryView();
            }, 1200);
          });
        }
      }
    }
  }

  /* ============================================================
     6. MODEL LOADING, ERROR BOUNDARIES & MESH REGISTRATION
     ============================================================ */
  normalizeParts(rawParts) {
    if (!rawParts) return [];
    return rawParts.map((p) => ({
      partNumber: p.partNumber || p.id,
      officialName: p.officialName || p.name,
      meshNodeName: p.meshNodeName || p.nodeName,
      anchorPosition: p.anchorPosition || p.anchor || [0, 1, 0],
      section: p.section || p.category || 'ASSEMBLY',
      feedFlowDirection: p.feedFlowDirection || p.feed || 'Operational Flow',
      safetyNotice: p.safetyNotice || p.safety || 'Follow standard industrial safety protocols.',
      engineeringTolerance: p.engineeringTolerance || p.tolerance || 'Precision tolerance.',
      description: p.description || `${p.feed || ''} Elevation: ${p.elevation || 'N/A'}, Velocity: ${p.velocity || 'N/A'}.`,
      hazardDecal: p.hazardDecal || (p.safety ? p.safety.split('.')[0] : 'CAUTION: ROTATING MACHINERY'),
      elevation: p.elevation,
      velocity: p.velocity,
      category: p.category || p.section,
      ...p
    }));
  }

  loadModel() {
    const loader = new GLTFLoader();
    const modelUrl = '/assets/machines/bucket_elevator/models/elevator_full_diagram69b.glb';

    loader.load(
      modelUrl,
      (gltf) => {
        try {
          this.model = gltf.scene;

          const beltTexture = this.createBeltRubberTexture();

          this.model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              this.originalMaterials.set(child, child.material);

              const n = child.name || '';

              if (n.includes('Pulley') || n.includes('Shaft')) {
                this.pulleys.push(child);
              } else if (n.includes('Belt_Strand_UpLeg')) {
                this.upLegBelt = child;
                this.applyBeltMaterial(child, beltTexture);
              } else if (n.includes('Belt_Strand_DownLeg')) {
                this.downLegBelt = child;
                this.applyBeltMaterial(child, beltTexture);
              } else if (n.includes('Casing') || n.includes('Hood') || n.includes('Trunking') ||
                         n.includes('Door') || n.includes('Spout') || n.includes('Flange') || n.includes('Drive')) {
                this.casings.push(child);
                this.registerExplodedMesh(child);
              } else if (n.startsWith('Bucket_')) {
                this.buckets.push(child);
                this.initBucketLoopPosition(child);
              } else if (n.includes('Grain_Flow') || n.includes('Stream')) {
                this.streams.push(child);
              }
            }
          });

          this.scene.add(this.model);

          this.applyCasingOpacity();

          // Hide loading overlay smoothly
          const loaderOverlay = document.getElementById('loader-overlay');
          if (loaderOverlay) {
            loaderOverlay.style.opacity = '0';
            setTimeout(() => { loaderOverlay.style.display = 'none'; }, 400);
          }

          if (elevatorAnatomy.parts && elevatorAnatomy.parts.length > 0) {
            this.selectPart(elevatorAnatomy.parts[0], false);
          }
        } catch (meshErr) {
          console.error('[SAGMA Viewer] Error during mesh processing:', meshErr);
        }
      },
      undefined,
      (err) => {
        console.error('[SAGMA Viewer] Error loading GLB model:', err);
      }
    );
  }

  createBeltRubberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#222830';
    ctx.fillRect(0, 0, 256, 512);

    ctx.fillStyle = '#2f3640';
    for (let y = 0; y < 512; y += 16) {
      ctx.fillRect(0, y, 256, 3);
    }

    ctx.fillStyle = 'rgba(0, 90, 54, 0.35)';
    ctx.fillRect(124, 0, 8, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  }

  applyBeltMaterial(mesh, texture) {
    if (!mesh) return;
    const beltMat = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x333A42,
      roughness: 0.82,
      metalness: 0.08
    });
    mesh.material = beltMat;
    this.originalMaterials.set(mesh, beltMat);
  }

  initBucketLoopPosition(bucketMesh) {
    if (!bucketMesh) return;
    const y = bucketMesh.position.y;
    let s_init = 0;

    if (bucketMesh.name.startsWith('Bucket_UpLeg_')) {
      s_init = y - this.Y_boot;
    } else if (bucketMesh.name === 'Bucket_Crown_01') {
      s_init = this.H + this.arc * 0.25;
    } else if (bucketMesh.name === 'Bucket_Crown_02') {
      s_init = this.H + this.arc * 0.75;
    } else if (bucketMesh.name.startsWith('Bucket_DownLeg_')) {
      s_init = this.H + this.arc + (this.Y_head - y);
    } else if (bucketMesh.name === 'Bucket_Boot_Scoop_Turn') {
      s_init = 2 * this.H + this.arc + this.arc * 0.5;
    }

    bucketMesh.userData.s_init = s_init;
    bucketMesh.userData.origPos = bucketMesh.position.clone();
  }

  getLoopTransform(s) {
    s = ((s % this.L_total) + this.L_total) % this.L_total;
    const R = this.R;
    const H = this.H;
    const arc = this.arc;
    const Y_boot = this.Y_boot;
    const Y_head = this.Y_head;

    if (s < H) {
      return { x: -R, y: Y_boot + s, rotZ: 0 };
    } else if (s < H + arc) {
      const u = (s - H) / R;
      return {
        x: -R * Math.cos(u),
        y: Y_head + R * Math.sin(u),
        rotZ: -u
      };
    } else if (s < 2 * H + arc) {
      const d = s - (H + arc);
      return { x: R, y: Y_head - d, rotZ: -Math.PI };
    } else {
      const w = (s - (2 * H + arc)) / R;
      return {
        x: R * Math.cos(w),
        y: Y_boot - R * Math.sin(w),
        rotZ: -(Math.PI + w)
      };
    }
  }

  registerExplodedMesh(mesh) {
    if (!mesh) return;
    const origPos = mesh.position.clone();
    const n = mesh.name || '';
    let offsetVec = new THREE.Vector3(0, 0, 0);

    if (n.includes('SplitHood')) offsetVec.set(0, 0.85, 0.55);
    else if (n.includes('Head_Lower')) offsetVec.set(0, 0.35, 0.40);
    else if (n.includes('Discharge_Spout')) offsetVec.set(0.65, 0.20, 0);
    else if (n.includes('Trunking_UpLeg')) offsetVec.set(-0.55, 0, 0.30);
    else if (n.includes('Trunking_DownLeg')) offsetVec.set(0.55, 0, 0.30);
    else if (n.includes('Cleanout_Door_Front')) offsetVec.set(0, 0, 0.45);
    else if (n.includes('Cleanout_Door_Back')) offsetVec.set(0, 0, -0.45);
    else if (n.includes('Feed_Spout')) offsetVec.set(0.50, 0.15, 0);
    else if (n.includes('Boot_Casing')) offsetVec.set(0, -0.45, 0);
    else if (n.includes('Motor')) offsetVec.set(-0.65, 0, 0);

    this.explodedMeshes.push({ mesh, origPos, offsetVec });
  }

  applyExplosion() {
    this.explodedMeshes.forEach(({ mesh, origPos, offsetVec }) => {
      if (mesh) mesh.position.copy(origPos).addScaledVector(offsetVec, this.explodeFactor);
    });
  }

  applyCasingOpacity() {
    if (!this.model) return;
    this.casings.forEach((child) => {
      if (child && child.isMesh) {
        const origMat = this.originalMaterials.get(child);
        if (!origMat) return;

        if (this.casingOpacity < 0.98) {
          const transMat = origMat.clone();
          transMat.transparent = true;
          transMat.opacity = Math.max(0.12, this.casingOpacity);
          transMat.depthWrite = true;
          transMat.metalness = 0.55;
          transMat.roughness = 0.28;
          child.material = transMat;
        } else {
          child.material = origMat;
        }
      }
    });
  }

  handleMeshClick(mesh) {
    let curr = mesh;
    while (curr) {
      const matchedPart = elevatorAnatomy.parts.find(p => p.meshNodeName === curr.name);
      if (matchedPart) {
        if (this.isAutoTourActive) this.stopAutoTour();
        this.selectPart(matchedPart);
        return;
      }
      curr = curr.parent;
    }
  }

  selectPart(part, smoothCamera = true) {
    if (!part) return;
    this.activePart = part;
    this.exploredParts.add(part.partNumber);

    this.pauseTurntable();

    // 1. Highlight 3D mesh in SAGMA Forest Green Emissive
    if (this.model) {
      const targetMesh = this.model.getObjectByName(part.meshNodeName);
      if (targetMesh) {
        this.highlightMeshNode(targetMesh);
      }
    }

    // 2. Camera framing: update orbitControls.target directly to part's [x,y,z]
    const [ax, ay, az] = part.anchorPosition || part.anchor || [0, 1, 0];
    const targetLook = new THREE.Vector3(ax, ay, az);
    const distScalar = (this.activeMachine === 'satake_vbf') ? 1.25 : 2.1;
    const cameraOffset = new THREE.Vector3(1.15, 0.35, 1.30).normalize().multiplyScalar(distScalar);
    const targetCam = targetLook.clone().add(cameraOffset);

    if (smoothCamera) {
      this.dollyCameraTo(targetCam, targetLook);
    } else {
      this.camera.position.copy(targetCam);
      this.controls.target.copy(targetLook);
    }

    // 3. Update UI Telemetry Card & Left Drawer
    this.updateTelemetryCard(part);
    this.updatePartsDrawerUI(part.partNumber);
    this.updateExplorationProgress();

    // 4. Update Tour HUD if active
    if (this.isAutoTourActive) {
      this.updateTourHUD(part);
    }
  }

  highlightMeshNode(activeNode) {
    const targetMeshes = new Set();
    if (activeNode) {
      activeNode.traverse((c) => {
        if (c && c.isMesh) targetMeshes.add(c);
      });
    }

    this.model.traverse((child) => {
      if (child && child.isMesh) {
        const origMat = this.originalMaterials.get(child);
        const isMatch = targetMeshes.has(child);
        if (isMatch) {
          const glowMat = (origMat && !Array.isArray(origMat)) ? origMat.clone() : new THREE.MeshStandardMaterial();
          glowMat.color = new THREE.Color(0x005A36);
          glowMat.emissive = new THREE.Color(0x005A36);
          glowMat.emissiveIntensity = 0.75;
          glowMat.roughness = 0.28;
          glowMat.metalness = 0.35;
          glowMat.transparent = false;
          glowMat.opacity = 1.0;
          child.material = glowMat;
        } else {
          child.material = origMat;
        }
      }
    });

    this.applyCasingOpacity();
  }

  dollyCameraTo(targetCam, targetLook) {
    this.camStartPos.copy(this.camera.position);
    this.camTargetPos.copy(targetCam);
    this.lookStartPos.copy(this.controls.target);
    this.lookTargetPos.copy(targetLook);
    this.camLerpAlpha = 0;
    this.isDryingCamera = true;
  }

  /* ============================================================
     7. MACHINE OPERATION & KINEMATICS
     ============================================================ */
  toggleMachine() {
    this.isMachineRunning = !this.isMachineRunning;
    this.updateMachineUI();

    if (this.isMachineRunning) {
      this.startAudio();
    } else {
      this.stopAudio();
    }
  }

  updateMachineUI() {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;

    const headerBtn = document.getElementById('btn-header-machine-toggle');
    const headerLabel = document.getElementById('header-machine-label');

    const canvasBtn = document.getElementById('btn-machine-toggle');
    const canvasLabel = document.getElementById('machine-btn-label');
    const canvasIcon = document.getElementById('machine-btn-icon');
    const badge = document.getElementById('machine-status-badge');
    const badgeText = document.getElementById('machine-status-text');

    if (this.isMachineRunning) {
      if (headerBtn) headerBtn.className = 'header-action-btn header-machine-btn running';
      if (headerLabel) headerLabel.innerHTML = '&#9632; ' + dict.machineStop;

      if (canvasBtn) canvasBtn.classList.add('running');
      if (canvasLabel) canvasLabel.textContent = dict.machineStop;
      if (canvasIcon) canvasIcon.innerHTML = '&#9632;';

      if (badge) badge.className = 'machine-status-badge running';
      if (badgeText) badgeText.textContent = dict.machineRunning;
    } else {
      if (headerBtn) headerBtn.className = 'header-action-btn header-machine-btn stopped';
      if (headerLabel) headerLabel.innerHTML = '&#9654; ' + dict.machineStart;

      if (canvasBtn) canvasBtn.classList.remove('running');
      if (canvasLabel) canvasLabel.textContent = dict.machineStart;
      if (canvasIcon) canvasIcon.innerHTML = '&#9654;';

      if (badge) badge.className = 'machine-status-badge standby';
      if (badgeText) badgeText.textContent = dict.machineStandby;
    }
  }

  startAudio() {
    if (!this.isSoundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.motorOsc = this.audioCtx.createOscillator();
      this.motorOsc.type = 'sawtooth';
      this.motorOsc.frequency.setValueAtTime(48, this.audioCtx.currentTime);

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.audioCtx.currentTime);

      this.motorGain = this.audioCtx.createGain();
      this.motorGain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      this.motorGain.gain.linearRampToValueAtTime(0.12, this.audioCtx.currentTime + 1.2);

      this.motorOsc.connect(filter);
      filter.connect(this.motorGain);
      this.motorGain.connect(this.audioCtx.destination);
      this.motorOsc.start();

      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(800, this.audioCtx.currentTime);

      this.noiseGain = this.audioCtx.createGain();
      this.noiseGain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      this.noiseGain.gain.linearRampToValueAtTime(0.06, this.audioCtx.currentTime + 1.5);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.audioCtx.destination);
      whiteNoise.start();
      this.noiseNode = whiteNoise;
    } catch (e) {
      console.warn('Audio start error:', e);
    }
  }

  stopAudio() {
    if (this.motorGain && this.audioCtx) {
      this.motorGain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
      setTimeout(() => {
        if (this.motorOsc) {
          try { this.motorOsc.stop(); this.motorOsc.disconnect(); } catch (_) {}
          this.motorOsc = null;
        }
      }, 900);
    }
    if (this.noiseGain && this.audioCtx) {
      this.noiseGain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
      setTimeout(() => {
        if (this.noiseNode) {
          try { this.noiseNode.stop(); this.noiseNode.disconnect(); } catch (_) {}
          this.noiseNode = null;
        }
      }, 900);
    }
  }

  toggleSound() {
    this.isSoundEnabled = !this.isSoundEnabled;
    const btn = document.getElementById('btn-sound-toggle');
    const label = document.getElementById('sound-toggle-label');
    const icon = document.getElementById('sound-icon');
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;

    if (this.isSoundEnabled) {
      if (btn) btn.classList.add('active');
      if (label) label.textContent = dict.soundOn;
      if (icon) icon.innerHTML = '&#128266;';
      if (this.isMachineRunning) this.startAudio();
    } else {
      if (btn) btn.classList.remove('active');
      if (label) label.textContent = dict.soundOff;
      if (icon) icon.innerHTML = '&#128263;';
      this.stopAudio();
    }
  }

  /* ============================================================
     8. GUIDED COMPONENT TOUR
     ============================================================ */
  startAutoTour() {
    this.isAutoTourActive = true;
    this.isTourPlaying = true;
    this.pauseTurntable();

    const tourHud = document.getElementById('tour-hud');
    if (tourHud) tourHud.style.display = 'flex';

    const btn = document.getElementById('btn-auto-tour');
    if (btn) btn.classList.add('active');

    this.tourIndex = 0;
    this.runTourStep();
    this.startTourTimer();
  }

  startTourTimer() {
    if (this.tourTimer) clearInterval(this.tourTimer);
    this.tourTimer = setInterval(() => {
      if (this.isTourPlaying) {
        this.tourIndex = (this.tourIndex + 1) % elevatorAnatomy.parts.length;
        this.runTourStep();
      }
    }, 4500);
  }

  runTourStep() {
    const part = elevatorAnatomy.parts[this.tourIndex];
    this.selectPart(part);
  }

  updateTourHUD(part) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;
    const stepBadge = document.getElementById('tour-step-badge');
    const partNum = document.getElementById('tour-part-num');
    const partTitle = document.getElementById('tour-part-title');
    const narrative = document.getElementById('tour-narrative');
    const progressFill = document.getElementById('tour-progress-fill');

    const localizedPart = dict.parts[part.partNumber] || part;

    if (stepBadge) stepBadge.textContent = `${dict.tourStep} ${this.tourIndex + 1} ${dict.tourOf} 13`;
    if (partNum) partNum.textContent = part.partNumber;
    if (partTitle) partTitle.textContent = localizedPart.name || part.officialName;
    if (narrative) narrative.textContent = localizedPart.specs || part.description;

    const pct = ((this.tourIndex + 1) / elevatorAnatomy.parts.length) * 100;
    if (progressFill) progressFill.style.width = `${pct}%`;
  }

  stopAutoTour() {
    this.isAutoTourActive = false;
    if (this.tourTimer) {
      clearInterval(this.tourTimer);
      this.tourTimer = null;
    }
    const tourHud = document.getElementById('tour-hud');
    if (tourHud) tourHud.style.display = 'none';

    const btn = document.getElementById('btn-auto-tour');
    if (btn) btn.classList.remove('active');
  }

  tourNext() {
    this.tourIndex = (this.tourIndex + 1) % elevatorAnatomy.parts.length;
    this.runTourStep();
    if (this.isTourPlaying) this.startTourTimer();
  }

  tourPrev() {
    this.tourIndex = (this.tourIndex - 1 + elevatorAnatomy.parts.length) % elevatorAnatomy.parts.length;
    this.runTourStep();
    if (this.isTourPlaying) this.startTourTimer();
  }

  tourTogglePlay() {
    this.isTourPlaying = !this.isTourPlaying;
    const playBtn = document.getElementById('btn-tour-play');
    const playTxt = document.getElementById('tour-play-txt');
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;

    if (this.isTourPlaying) {
      if (playBtn) playBtn.classList.add('active');
      if (playTxt) playTxt.textContent = dict.tourPause;
      this.startTourTimer();
    } else {
      if (playBtn) playBtn.classList.remove('active');
      if (playTxt) playTxt.textContent = dict.tourResume;
      if (this.tourTimer) clearInterval(this.tourTimer);
    }
  }

  /* ============================================================
     9. UI INITIALIZATION & EVENT LISTENERS
     ============================================================ */
  setupUI() {
    this.populatePartsList();
    this.populateHazardSensors();
    this.setupFaultDiagnosticsUI();
    this.setupEventListeners();
    this.populateElevatorScheduleTable();
      this.populateSatakeScheduleTable();
    this.updateExplorationProgress();
    this.updateMachineUI();
  }

  populatePartsList() {
    const listContainer = document.getElementById('parts-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;

    this.activeParts.forEach((part) => {
      const localized = dict.parts[part.partNumber] || part;
      const item = document.createElement('div');
      item.className = 'part-item';
      item.id = `part-item-${part.partNumber}`;
      item.dataset.part = part.partNumber;

      const keyTag = (this.activeMachine === 'satake_vbf' && part.drawingKey)
        ? `<span class="part-key-tag">${part.drawingKey}</span> • `
        : '';

      item.innerHTML = `
        <span class="part-badge">${part.partNumber}</span>
        <div class="part-card-text">
          <span class="part-card-name">${localized.name || part.officialName}</span>
          <span class="part-card-sub">${keyTag}${localized.section || part.section}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        if (this.isAutoTourActive) this.stopAutoTour();
        this.selectPart(part);
      });

      listContainer.appendChild(item);
    });
  }

  populateHazardSensors() {
    const sensorsContainer = document.getElementById('sensors-container');
    if (!sensorsContainer || !elevatorAnatomy.hazardSensors) return;
    sensorsContainer.innerHTML = '';

    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;

    elevatorAnatomy.hazardSensors.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'sensor-card';
      card.innerHTML = `
        <div class="sensor-card-top">
          <span class="sensor-name">${s.name}</span>
          <span class="sensor-status">${dict.sensorOnline}</span>
        </div>
        <div class="sensor-detail">${s.purpose}</div>
        <div class="sensor-tol"><strong>${dict.setpointLabel}</strong> ${s.setpoint} &bull; ${s.location}</div>
      `;
      card.addEventListener('click', () => {
        const targetPart = elevatorAnatomy.parts.find(p => p.partNumber === s.partTarget);
        if (targetPart) this.selectPart(targetPart);
      });
      sensorsContainer.appendChild(card);
    });
  }

  populatePartsScheduleTable() {
    const tbody = document.getElementById('parts-schedule-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;

    this.activeParts.forEach((part) => {
      const loc = dict.parts[part.partNumber] || part;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><span class="part-tag-pill">${part.partNumber}</span></td>
        <td><strong>${loc.name || part.officialName}</strong></td>
        <td>${loc.section || part.section}</td>
        <td>${loc.flow || part.feedFlowDirection}</td>
        <td>${loc.tolerance || part.engineeringTolerance}</td>
      `;
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        const modal = document.getElementById('library-modal');
        if (modal) modal.style.display = 'none';
        this.selectPart(part);
      });
      tbody.appendChild(row);
    });
  }

  setupEventListeners() {
    // 1. Language Selector
    const selectLang = document.getElementById('select-lang');
    if (selectLang) {
      selectLang.addEventListener('change', (e) => {
        this.setLanguage(e.target.value);
      });
    }

    // 2. Machine Controller Buttons (Header & Canvas synchronized)
    const btnHeaderMachine = document.getElementById('btn-header-machine-toggle');
    if (btnHeaderMachine) {
      btnHeaderMachine.addEventListener('click', () => this.toggleMachine());
    }

    const btnCanvasMachine = document.getElementById('btn-machine-toggle');
    if (btnCanvasMachine) {
      btnCanvasMachine.addEventListener('click', () => this.toggleMachine());
    }

    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => this.toggleSound());
    }

    // 3. Navigation Rail CTAs
    const btnRailExplore = document.getElementById('btn-rail-explore');
    if (btnRailExplore) {
      btnRailExplore.addEventListener('click', () => {
        this.setRailActive(btnRailExplore);
        if (this.isAutoTourActive) this.stopAutoTour();
        this.clearSimulatedFault();
        this.dollyCameraTo(this.defaultCamPos, this.defaultLookPos);
      });
    }

    const btnRailParts = document.getElementById('btn-rail-parts');
    if (btnRailParts) {
      btnRailParts.addEventListener('click', () => {
        this.setRailActive(btnRailParts);
        const telemSpecsBtn = document.getElementById('telem-btn-specs');
        if (telemSpecsBtn) telemSpecsBtn.click();
      });
    }

    const btnRailHazard = document.getElementById('btn-rail-hazard');
    if (btnRailHazard) {
      btnRailHazard.addEventListener('click', () => {
        this.setRailActive(btnRailHazard);
        const telemSensorsBtn = document.getElementById('telem-btn-sensors');
        if (telemSensorsBtn) telemSensorsBtn.click();
      });
    }

    const btnRailFaults = document.getElementById('btn-rail-faults');
    if (btnRailFaults) {
      btnRailFaults.addEventListener('click', () => {
        this.setRailActive(btnRailFaults);
        const telemFaultsBtn = document.getElementById('telem-btn-faults');
        if (telemFaultsBtn) telemFaultsBtn.click();
      });
    }

    const btnRailLibrary = document.getElementById('btn-rail-library');
    if (btnRailLibrary) {
      btnRailLibrary.addEventListener('click', () => this.openLibraryModal());
    }

    // 4. Header Top Navigation
    const btnNavExplore = document.getElementById('btn-nav-explore');
    if (btnNavExplore) {
      btnNavExplore.addEventListener('click', () => {
        this.setHeaderNavActive(btnNavExplore);
        if (this.isAutoTourActive) this.stopAutoTour();
        this.dollyCameraTo(this.defaultCamPos, this.defaultLookPos);
      });
    }

    const btnNavLibrary = document.getElementById('btn-nav-library');
    if (btnNavLibrary) {
      btnNavLibrary.addEventListener('click', () => this.openLibraryModal());
    }

    const btnNavTour = document.getElementById('btn-nav-tour');
    if (btnNavTour) {
      btnNavTour.addEventListener('click', () => this.startAutoTour());
    }

    const btnNavStudio = document.getElementById('btn-nav-studio');
    if (btnNavStudio) {
      btnNavStudio.addEventListener('click', () => this.toggleCutaway());
    }

    // 5. Header Actions
    const btnTurntable = document.getElementById('btn-turntable');
    if (btnTurntable) {
      btnTurntable.addEventListener('click', () => {
        if (this.isTurntableActive) this.pauseTurntable();
        else this.resumeTurntable();
      });
    }

    const btnAutoTour = document.getElementById('btn-auto-tour');
    if (btnAutoTour) {
      btnAutoTour.addEventListener('click', () => {
        if (this.isAutoTourActive) this.stopAutoTour();
        else this.startAutoTour();
      });
    }

    const btnCinema = document.getElementById('btn-toggle-cinema');
    if (btnCinema) {
      btnCinema.addEventListener('click', () => this.toggleCinema169());
    }

    const btnShowcase = document.getElementById('btn-record-showcase');
    if (btnShowcase) {
      btnShowcase.addEventListener('click', () => {
        if (this.isShowcaseRecording) {
          this.stopShowcaseRecording();
        } else {
          this.startMasterShowcase();
        }
      });
    }

    const btnVR = document.getElementById('btn-enter-vr');
    if (btnVR) {
      btnVR.addEventListener('click', () => this.enterVR());
    }

    const btnReset = document.getElementById('btn-reset-view');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (this.isAutoTourActive) this.stopAutoTour();
        this.clearSimulatedFault();
        this.dollyCameraTo(this.defaultCamPos, this.defaultLookPos);
      });
    }

    const btnExplodeQuick = document.getElementById('btn-explode-quick');
    if (btnExplodeQuick) {
      btnExplodeQuick.addEventListener('click', () => {
        this.explodeFactor = this.explodeFactor > 0.05 ? 0 : 0.75;
        const slider = document.getElementById('slider-exploded');
        const readout = document.getElementById('exploded-readout');
        if (slider) slider.value = this.explodeFactor;
        if (readout) readout.textContent = `${Math.round(this.explodeFactor * 100)}% Offset`;
        this.applyExplosion();
      });
    }

    // 6. View Controls & Sliders
    const btnExterior = document.getElementById('btn-exterior');
    const btnCutaway = document.getElementById('btn-cutaway');
    if (btnExterior && btnCutaway) {
      btnExterior.addEventListener('click', () => {
        btnExterior.classList.add('active');
        btnCutaway.classList.remove('active');
        this.casingOpacity = 1.0;
        this.updateOpacitySlider(1.0);
        this.applyCasingOpacity();
      });
      btnCutaway.addEventListener('click', () => {
        btnCutaway.classList.add('active');
        btnExterior.classList.remove('active');
        this.casingOpacity = 0.35;
        this.updateOpacitySlider(0.35);
        this.applyCasingOpacity();
      });
    }

    const sliderOpacity = document.getElementById('slider-opacity');
    if (sliderOpacity) {
      sliderOpacity.addEventListener('input', (e) => {
        this.casingOpacity = parseFloat(e.target.value);
        this.updateOpacitySlider(this.casingOpacity);
        this.applyCasingOpacity();
      });
    }

    const sliderExploded = document.getElementById('slider-exploded');
    if (sliderExploded) {
      sliderExploded.addEventListener('input', (e) => {
        this.explodeFactor = parseFloat(e.target.value);
        const readout = document.getElementById('exploded-readout');
        if (readout) readout.textContent = `${Math.round(this.explodeFactor * 100)}% Offset`;
        this.applyExplosion();
      });
    }

    // 7. Telemetry Tab Switching
    const tabBtns = document.querySelectorAll('.telem-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        document.querySelectorAll('.telem-view').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const targetId = btn.dataset.tab;
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
      });
    });

    // 8. Guided Tour HUD Controls
    const btnTourClose = document.getElementById('btn-tour-close');
    if (btnTourClose) btnTourClose.addEventListener('click', () => this.stopAutoTour());

    const btnTourPrev = document.getElementById('btn-tour-prev');
    if (btnTourPrev) btnTourPrev.addEventListener('click', () => this.tourPrev());

    const btnTourNext = document.getElementById('btn-tour-next');
    if (btnTourNext) btnTourNext.addEventListener('click', () => this.tourNext());

    const btnTourPlay = document.getElementById('btn-tour-play');
    if (btnTourPlay) btnTourPlay.addEventListener('click', () => this.tourTogglePlay());

    // 9. Technical Library Modal Controls
    this.setupCoursewareLibraryUI();
  }

  setupCoursewareLibraryUI() {
    const btnNavLibrary = document.getElementById('btn-nav-library');
    const btnRailLibrary = document.getElementById('btn-rail-library');
    const btnCloseLib = document.getElementById('btn-close-library');
    const modal = document.getElementById('library-modal');

    if (btnNavLibrary) btnNavLibrary.addEventListener('click', () => this.openLibraryModal());
    if (btnRailLibrary) btnRailLibrary.addEventListener('click', () => this.openLibraryModal());
    if (btnCloseLib) {
      btnCloseLib.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });
    }

    // Machine Selector Toggle inside Courseware Library Modal
    const btnLibMachElevator = document.getElementById('btn-lib-mach-elevator');
    const btnLibMachSatake = document.getElementById('btn-lib-mach-satake');

    if (btnLibMachElevator) {
      btnLibMachElevator.addEventListener('click', () => {
        this.setLibraryMachine('bucket_elevator');
      });
    }
    if (btnLibMachSatake) {
      btnLibMachSatake.addEventListener('click', () => {
        this.setLibraryMachine('satake_vbf');
      });
    }

    // Tabs for Bucket Elevator
    const elevatorTabs = document.querySelectorAll('#lib-tabs-elevator .library-tab-btn');
    elevatorTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        elevatorTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabKey = btn.dataset.libtab;
        this.showLibraryTabContent('bucket_elevator', tabKey);
      });
    });

    // Tabs for Satake VBF
    const satakeTabs = document.querySelectorAll('#lib-tabs-satake .library-tab-btn');
    satakeTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        satakeTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabKey = btn.dataset.libtab;
        this.showLibraryTabContent('satake_vbf', tabKey);
      });
    });

    this.populateElevatorScheduleTable();
    this.populateSatakeScheduleTable();
  }

  setLibraryMachine(machineId) {
    this.libraryActiveMachine = machineId;

    const btnElevator = document.getElementById('btn-lib-mach-elevator');
    const btnSatake = document.getElementById('btn-lib-mach-satake');
    const tabsElevator = document.getElementById('lib-tabs-elevator');
    const tabsSatake = document.getElementById('lib-tabs-satake');
    const subTitle = document.getElementById('lib-subtitle');

    if (machineId === 'satake_vbf') {
      if (btnElevator) btnElevator.classList.remove('active');
      if (btnSatake) btnSatake.classList.add('active');
      if (tabsElevator) tabsElevator.style.display = 'none';
      if (tabsSatake) tabsSatake.style.display = 'flex';
      if (subTitle) subTitle.textContent = 'Official Reference Drawings - Module 4: Mechanical Degermination - Diagram 4(a) / Diagram 3';

      // Hide all elevator panes
      document.querySelectorAll('#libtab-elevator-schematic, #libtab-elevator-diagram19b, #libtab-elevator-schedule')
        .forEach(el => el.style.display = 'none');

      // Show active Satake tab
      const activeSatakeTab = document.querySelector('#lib-tabs-satake .library-tab-btn.active') ||
                              document.querySelector('#lib-tabs-satake .library-tab-btn');
      const tabKey = activeSatakeTab ? activeSatakeTab.dataset.libtab : 'satake-diagram4a';
      this.showLibraryTabContent('satake_vbf', tabKey);

    } else {
      if (btnElevator) btnElevator.classList.add('active');
      if (btnSatake) btnSatake.classList.remove('active');
      if (tabsElevator) tabsElevator.style.display = 'flex';
      if (tabsSatake) tabsSatake.style.display = 'none';
      if (subTitle) subTitle.textContent = 'Official Reference Drawings - Module 2 Section 1.1.1 - Diagram 69(b) / 19(a)';

      // Hide all Satake panes
      document.querySelectorAll('#libtab-satake-diagram4a, #libtab-satake-exploded, #libtab-satake-diagram3, #libtab-satake-schedule')
        .forEach(el => el.style.display = 'none');

      // Show active Elevator tab
      const activeElevatorTab = document.querySelector('#lib-tabs-elevator .library-tab-btn.active') ||
                                document.querySelector('#lib-tabs-elevator .library-tab-btn');
      const tabKey = activeElevatorTab ? activeElevatorTab.dataset.libtab : 'elevator-schematic';
      this.showLibraryTabContent('bucket_elevator', tabKey);
    }
  }

  showLibraryTabContent(machine, tabKey) {
    const allPanes = document.querySelectorAll(
      '#libtab-elevator-schematic, #libtab-elevator-diagram19b, #libtab-elevator-schedule, ' +
      '#libtab-satake-diagram4a, #libtab-satake-exploded, #libtab-satake-diagram3, #libtab-satake-schedule'
    );
    allPanes.forEach(p => p.style.display = 'none');

    const targetEl = document.getElementById(`libtab-${tabKey}`);
    if (targetEl) targetEl.style.display = 'flex';
  }

  populateElevatorScheduleTable() {
    const tbody = document.getElementById('elevator-schedule-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;
    const parts = this.elevatorAnatomy.parts || [];

    parts.forEach((part) => {
      const loc = (dict.parts && dict.parts[part.partNumber]) || part;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><span class="part-tag-pill">${part.partNumber}</span></td>
        <td><strong>${loc.name || part.officialName}</strong></td>
        <td>${loc.section || part.section}</td>
        <td>${loc.flow || part.feedFlowDirection}</td>
        <td>${loc.tolerance || part.engineeringTolerance}</td>
      `;
      row.style.cursor = 'pointer';
      row.title = `Click to inspect ${loc.name || part.officialName} in 3D simulator`;
      row.addEventListener('click', () => {
        const modal = document.getElementById('library-modal');
        if (modal) modal.style.display = 'none';

        if (this.activeMachine !== 'bucket_elevator') {
          this.switchMachineProfile('bucket_elevator');
        }

        const normalized = this.activeParts.find(p => p.partNumber === part.partNumber) || part;
        this.selectPart(normalized);
      });
      tbody.appendChild(row);
    });
  }

  populateSatakeScheduleTable() {
    const tbody = document.getElementById('satake-schedule-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const parts = this.satakeAnatomy.parts || [];

    parts.forEach((part) => {
      const row = document.createElement('tr');
      const drawingTag = part.drawingKey ? `<span class="drawing-key-tag">${part.drawingKey}</span>` : '';
      row.innerHTML = `
        <td><span class="part-tag-pill">${part.id || part.partNumber}</span></td>
        <td><strong>${part.name || part.officialName}</strong> ${drawingTag}</td>
        <td>${part.category || part.section}</td>
        <td>${part.feed || part.feedFlowDirection}</td>
        <td>${part.tolerance || part.engineeringTolerance}</td>
      `;
      row.style.cursor = 'pointer';
      row.title = `Click to inspect ${part.name || part.officialName} in 3D simulator`;
      row.addEventListener('click', () => {
        const modal = document.getElementById('library-modal');
        if (modal) modal.style.display = 'none';

        if (this.activeMachine !== 'satake_vbf') {
          this.switchMachineProfile('satake_vbf');
        }

        const normalized = this.activeParts.find(p => (p.partNumber === part.id || p.partNumber === part.partNumber)) || part;
        this.selectPart(normalized);
      });
      tbody.appendChild(row);
    });
  }

  openLibraryModal() {
    const modal = document.getElementById('library-modal');
    if (modal) {
      modal.style.display = 'flex';
      this.setLibraryMachine(this.activeMachine);
    }
  }

  updateOpacitySlider(val) {
    const slider = document.getElementById('slider-opacity');
    const readout = document.getElementById('opacity-readout');
    if (slider) slider.value = val;
    if (readout) readout.textContent = `${Math.round(val * 100)}%`;
  }

  pauseTurntable() {
    this.isTurntableActive = false;
    this.controls.autoRotate = false;
    const btnLabel = document.getElementById('turntable-label');
    const btn = document.getElementById('btn-turntable');
    if (btnLabel) btnLabel.textContent = 'Turntable';
    if (btn) btn.classList.remove('active');
  }

  resumeTurntable() {
    this.isTurntableActive = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.70;
    const btnLabel = document.getElementById('turntable-label');
    const btn = document.getElementById('btn-turntable');
    if (btnLabel) btnLabel.textContent = 'Rotating';
    if (btn) btn.classList.add('active');
  }

  toggleCinema169() {
    this.isCinema169 = !this.isCinema169;
    document.body.classList.toggle('cinema-16-9', this.isCinema169);
    const btnLabel = document.getElementById('cinema-label');
    const btn = document.getElementById('btn-toggle-cinema');
    if (btnLabel) btnLabel.textContent = this.isCinema169 ? 'Exit 16:9' : '16:9';
    if (btn) btn.classList.toggle('active', this.isCinema169);
    this.onWindowResize();
  }

  updateExplodedSlider(val) {
    this.explodeFactor = Math.max(0, Math.min(1.0, val));
    const slider = document.getElementById('slider-exploded');
    const readout = document.getElementById('exploded-readout');
    if (slider) slider.value = this.explodeFactor;
    if (readout) readout.textContent = `${Math.round(this.explodeFactor * 100)}% Offset`;
    this.applyExplosion();
  }

  selectShowcaseNode(nodeId) {
    const part = this.activeParts.find(p => p.partNumber === nodeId);
    if (!part) return;
    this.activePart = part;
    this.exploredParts.add(part.partNumber);

    // 1. Highlight 3D mesh
    if (this.model) {
      const targetMesh = this.model.getObjectByName(part.meshNodeName);
      if (targetMesh) {
        this.highlightMeshNode(targetMesh);
      }
    }

    // 2. Update Right Specifications Panel
    this.updateTelemetryCard(part);

    // 3. Highlight in Left Components list and smoothly scroll into view
    this.updatePartsDrawerUI(part.partNumber);

    // 4. Update exploration progress
    this.updateExplorationProgress();
  }

  async startMasterShowcase() {
    if (this.isShowcaseRecording) return;

    if (this.isAutoTourActive) this.stopAutoTour();
    this.pauseTurntable();
    this.isDryingCamera = false;

    // 1. One-Click 16:9 Full-Tab Video Recorder (getDisplayMedia)
    let stream;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('getDisplayMedia is not supported in this browser. Please use Chrome, Edge, or Firefox.');
        return;
      }

      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          aspectRatio: { ideal: 16 / 9 },
          frameRate: { ideal: 60 }
        },
        audio: false,
        preferCurrentTab: true
      });
    } catch (err) {
      console.warn('[Showcase] Screen capture cancelled or denied:', err);
      return;
    }

    this.showcaseStream = stream;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener('ended', () => {
        if (this.isShowcaseRecording) {
          this.stopShowcaseRecording(false);
        }
      });
    }

    // 2. Strict 16:9 Landscape Full-UI Lock & Fullscreen
    document.body.classList.add('showcase-16-9');
    document.body.classList.add('showcase-declutter');
    this.isCinema169 = true;
    const cinemaLabel = document.getElementById('cinema-label');
    const cinemaBtn = document.getElementById('btn-toggle-cinema');
    if (cinemaLabel) cinemaLabel.textContent = 'Exit 16:9';
    if (cinemaBtn) cinemaBtn.classList.add('active');

    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (fsErr) {
        console.warn('[Showcase] Fullscreen request:', fsErr);
      }
    }

    this.onWindowResize();

    this.controls.enabled = false;
    this.controls.autoRotate = false;

    const btnShowcase = document.getElementById('btn-record-showcase');
    const lblShowcase = document.getElementById('record-showcase-label');
    if (btnShowcase) btnShowcase.classList.add('recording');
    if (lblShowcase) lblShowcase.textContent = 'Recording 30s...';

    // State: Machine Operational/Running (2.80 m/s, 136.8 RPM), View = Exterior, Opacity = 100%, Explode = 0%
    this.isMachineRunning = true;
    this.targetBeltSpeed = 2.80;
    this.currentBeltSpeed = 2.80;
    this.nominalRPM = 136.8;
    this.nominalTonnage = 78.5;

    const btnMachineToggle = document.getElementById('btn-machine-toggle');
    const machineStatusBadge = document.getElementById('machine-status-badge');
    const machineStatusText = document.getElementById('machine-status-text');
    const headerMachineLabel = document.getElementById('header-machine-label');
    const headerMachineToggle = document.getElementById('btn-header-machine-toggle');
    if (btnMachineToggle) {
      btnMachineToggle.classList.add('running');
      const machineBtnLabel = document.getElementById('machine-btn-label');
      if (machineBtnLabel) machineBtnLabel.textContent = 'Stop Machine';
    }
    if (headerMachineToggle) {
      headerMachineToggle.classList.add('running');
      headerMachineToggle.classList.remove('stopped');
      if (headerMachineLabel) headerMachineLabel.innerHTML = '&#9632; Stop Machine';
    }
    if (machineStatusBadge) {
      machineStatusBadge.classList.add('running');
      machineStatusBadge.classList.remove('standby');
    }
    if (machineStatusText) machineStatusText.textContent = 'OPERATIONAL - 2.80 m/s';

    const btnExt = document.getElementById('btn-exterior');
    const btnCut = document.getElementById('btn-cutaway');
    if (btnExt) btnExt.classList.add('active');
    if (btnCut) btnCut.classList.remove('active');

    this.casingOpacity = 1.0;
    this.updateOpacitySlider(1.0);
    this.applyCasingOpacity();
    this.updateExplodedSlider(0.0);

    this.lastShowcaseNodeId = null;
    this.selectShowcaseNode('13');

    // Camera initial pose for Boot
    this.camera.position.set(2.4, 1.2, 2.6);
    this.controls.target.set(0, 0.55, 0);

    // 3. Wait 1.2 seconds for fullscreen toast notification to disappear before starting MediaRecorder & timeline
    await new Promise(resolve => setTimeout(resolve, 1200));

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    const recordedChunks = [];
    try {
      this.showcaseMediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12000000
      });
    } catch (e) {
      this.showcaseMediaRecorder = new MediaRecorder(stream);
    }

    this.showcaseMediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    this.showcaseMediaRecorder.onstop = () => {
      if (this.showcaseStream) {
        this.showcaseStream.getTracks().forEach(t => t.stop());
        this.showcaseStream = null;
      }

      if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: mimeType });
        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.style.display = 'none';
        downloadLink.href = downloadUrl;
        downloadLink.download = 'sagma-bucket-elevator-30s-master-16x9.webm';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        setTimeout(() => {
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(downloadUrl);
        }, 1500);
      }

      this.cleanupShowcase();
    };

    this.isShowcaseRecording = true;
    this.isShowcaseActive = true;
    this.showcaseMediaRecorder.start(100);

    const timelineStartPerf = performance.now();
    this.showcaseStartTime = timelineStartPerf;

    const timelineTick = (now) => {
      if (!this.isShowcaseActive) return;

      const elapsedSec = (now - timelineStartPerf) / 1000.0;
      this.updateShowcaseTimeline(elapsedSec);

      if (elapsedSec < 30.0) {
        this.showcaseRafId = requestAnimationFrame(timelineTick);
      } else {
        setTimeout(() => {
          if (this.showcaseMediaRecorder && this.showcaseMediaRecorder.state === 'recording') {
            this.showcaseMediaRecorder.stop();
          }
        }, 200);
      }
    };

    this.showcaseRafId = requestAnimationFrame(timelineTick);
  }

  updateShowcaseTimeline(t) {
    const tClamped = Math.max(0, Math.min(30.0, t));

    const smoothstep = (min, max, value) => {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    // Node Schedule
    let scheduledNodeId = '13';
    if (tClamped >= 27.5) scheduledNodeId = '11';
    else if (tClamped >= 25.0) scheduledNodeId = '06';
    else if (tClamped >= 22.5) scheduledNodeId = '05';
    else if (tClamped >= 20.0) scheduledNodeId = '02';
    else if (tClamped >= 18.0) scheduledNodeId = '03';
    else if (tClamped >= 15.5) scheduledNodeId = '08';
    else if (tClamped >= 12.5) scheduledNodeId = '09';
    else if (tClamped >= 10.0) scheduledNodeId = '12';
    else if (tClamped >= 8.5) scheduledNodeId = '01';
    else if (tClamped >= 6.6) scheduledNodeId = '07';
    else if (tClamped >= 3.3) scheduledNodeId = '10';
    else scheduledNodeId = '13';

    if (this.lastShowcaseNodeId !== scheduledNodeId) {
      this.lastShowcaseNodeId = scheduledNodeId;
      this.selectShowcaseNode(scheduledNodeId);
    }

    // ACT 1: (0.0s to 10.0s) - Normal Exterior & Structural Sweep
    if (tClamped <= 10.0) {
      const p1 = smoothstep(0.0, 10.0, tClamped);

      if (this.casingOpacity !== 1.0) {
        this.casingOpacity = 1.0;
        this.updateOpacitySlider(1.0);
        this.applyCasingOpacity();
      }
      if (this.explodeFactor !== 0.0) {
        this.updateExplodedSlider(0.0);
      }

      const theta = 0.85 + p1 * 0.70;
      const radius = 3.2;
      this.camera.position.x = Math.sin(theta) * radius;
      this.camera.position.z = Math.cos(theta) * radius;
      this.camera.position.y = 1.10 + p1 * (9.80 - 1.10);

      this.controls.target.x = 0;
      this.controls.target.y = 0.55 + p1 * (9.20 - 0.55);
      this.controls.target.z = 0;
    }
    // ACT 2: (10.0s to 20.0s) - Working Belt & Buckets (X-Ray Cutaway)
    else if (tClamped <= 20.0) {
      const btnExt = document.getElementById('btn-exterior');
      const btnCut = document.getElementById('btn-cutaway');
      if (btnCut && !btnCut.classList.contains('active')) {
        btnCut.classList.add('active');
        if (btnExt) btnExt.classList.remove('active');
      }

      if (tClamped <= 11.5) {
        const pGlide = smoothstep(10.0, 11.5, tClamped);

        const curOp = 1.0 - pGlide * 0.70;
        this.casingOpacity = curOp;
        this.updateOpacitySlider(curOp);
        this.applyCasingOpacity();

        const theta10 = 0.85 + 0.70;
        const startCamX = Math.sin(theta10) * 3.2;
        const startCamZ = Math.cos(theta10) * 3.2;
        const startCamY = 9.80;

        const endCamX = 1.60;
        const endCamY = 1.00;
        const endCamZ = 1.80;

        this.camera.position.x = startCamX + pGlide * (endCamX - startCamX);
        this.camera.position.y = startCamY + pGlide * (endCamY - startCamY);
        this.camera.position.z = startCamZ + pGlide * (endCamZ - startCamZ);

        this.controls.target.x = pGlide * 0.15;
        this.controls.target.y = 9.20 - pGlide * (9.20 - 0.65);
        this.controls.target.z = pGlide * 0.10;
      } else if (tClamped <= 18.0) {
        const pTrack = smoothstep(11.5, 18.0, tClamped);

        if (this.casingOpacity !== 0.30) {
          this.casingOpacity = 0.30;
          this.updateOpacitySlider(0.30);
          this.applyCasingOpacity();
        }

        this.camera.position.x = 1.60 - pTrack * 0.30;
        this.camera.position.y = 1.00 + pTrack * (9.40 - 1.00);
        this.camera.position.z = 1.80 - pTrack * 0.20;

        this.controls.target.x = -0.25 + pTrack * 0.35;
        this.controls.target.y = 0.65 + pTrack * (9.10 - 0.65);
        this.controls.target.z = 0.05 * (1 - pTrack);
      } else {
        const pHold = (tClamped - 18.0) / 2.0;
        this.camera.position.x = 1.30 + Math.sin(pHold * 0.8) * 0.15;
        this.camera.position.y = 9.40 + Math.cos(pHold * 0.8) * 0.05;
        this.camera.position.z = 1.60 + Math.sin(pHold * 0.8) * 0.15;

        this.controls.target.x = 0.10;
        this.controls.target.y = 9.10;
        this.controls.target.z = 0;
      }
    }
    // ACT 3: (20.0s to 30.0s) - Exploded Engineering View & Diagnostics
    else {
      if (this.casingOpacity !== 0.35) {
        this.casingOpacity = 0.35;
        this.updateOpacitySlider(0.35);
        this.applyCasingOpacity();
      }

      if (tClamped < 20.5) {
        this.updateExplodedSlider(0.0);
      } else if (tClamped <= 25.5) {
        const pExp = smoothstep(20.5, 25.5, tClamped);
        this.updateExplodedSlider(pExp);
      } else if (tClamped <= 29.0) {
        this.updateExplodedSlider(1.0);
      } else {
        const pCollapse = smoothstep(29.0, 30.0, tClamped);
        this.updateExplodedSlider(1.0 - pCollapse);
      }

      if (tClamped <= 21.5) {
        const pPull = smoothstep(20.0, 21.5, tClamped);

        const startCamX = 1.30;
        const startCamY = 9.40;
        const startCamZ = 1.60;

        const endCamX = 8.60;
        const endCamY = 5.40;
        const endCamZ = 10.20;

        this.camera.position.x = startCamX + pPull * (endCamX - startCamX);
        this.camera.position.y = startCamY + pPull * (endCamY - startCamY);
        this.camera.position.z = startCamZ + pPull * (endCamZ - startCamZ);

        this.controls.target.x = 0.10 * (1 - pPull);
        this.controls.target.y = 9.10 - pPull * (9.10 - 4.80);
        this.controls.target.z = 0;
      } else {
        const orbitTime = tClamped - 21.5;
        const initialAngle = Math.atan2(8.60, 10.20);
        const currentAngle = initialAngle + orbitTime * 0.055;
        const radius = Math.hypot(8.60, 10.20);

        this.camera.position.x = Math.sin(currentAngle) * radius;
        this.camera.position.z = Math.cos(currentAngle) * radius;
        this.camera.position.y = 5.40;

        this.controls.target.set(0, 4.80, 0);
      }
    }
  }

  stopShowcaseRecording(download = true) {
    if (!this.isShowcaseRecording) return;
    this.isShowcaseActive = false;

    if (this.showcaseRafId) {
      cancelAnimationFrame(this.showcaseRafId);
      this.showcaseRafId = null;
    }

    if (this.showcaseMediaRecorder && this.showcaseMediaRecorder.state === 'recording') {
      if (!download) {
        this.showcaseMediaRecorder.ondataavailable = null;
      }
      this.showcaseMediaRecorder.stop();
    } else {
      this.cleanupShowcase();
    }
  }

  cleanupShowcase() {
    this.isShowcaseRecording = false;
    this.isShowcaseActive = false;

    if (this.showcaseStream) {
      this.showcaseStream.getTracks().forEach(t => t.stop());
      this.showcaseStream = null;
    }

    const btnShowcase = document.getElementById('btn-record-showcase');
    const lblShowcase = document.getElementById('record-showcase-label');
    if (btnShowcase) btnShowcase.classList.remove('recording');
    if (lblShowcase) lblShowcase.textContent = 'Record 30s Showcase';

    document.body.classList.remove('showcase-16-9');
    document.body.classList.remove('showcase-declutter');

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    this.updateExplodedSlider(0.0);
    this.casingOpacity = 0.35;
    this.updateOpacitySlider(0.35);
    this.applyCasingOpacity();

    this.controls.enabled = true;
    this.camera.position.copy(this.defaultCamPos);
    this.controls.target.copy(this.defaultLookPos);

    this.onWindowResize();
  }

  toggleCutaway() {
    this.isCutaway = !this.isCutaway;
    this.casingOpacity = this.isCutaway ? 0.25 : 1.0;
    this.updateOpacitySlider(this.casingOpacity);
    this.applyCasingOpacity();
  }

  enterVR() {
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
          navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
          }).then((session) => {
            this.renderer.xr.setSession(session);
          });
        } else {
          alert('WebXR immersive-vr not supported on this device. Use Meta Quest Browser or WebXR emulator.');
        }
      }).catch((err) => {
        alert('WebXR error: ' + err.message);
      });
    } else {
      alert('WebXR API is not supported in this browser.');
    }
  }

  /* ============================================================
     10. TELEMETRY, PROGRESS & FAULT DIAGNOSTICS
     ============================================================ */
  updateTelemetryCard(part) {
    if (!part) return;
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;
    const loc = (dict.parts && dict.parts[part.partNumber]) || part;

    const elTag = document.getElementById('tel-part-num');
    const elSection = document.getElementById('tel-part-section');
    const elTitle = document.getElementById('tel-part-title');
    const elFlow = document.getElementById('tel-flow-dir');
    const elSafety = document.getElementById('tel-safety-notice');
    const elSpecs = document.getElementById('tel-specs-desc');
    const elElevation = document.getElementById('tel-elevation');
    const elDecal = document.getElementById('decal-text');
    const elTolShort = document.getElementById('tel-tolerance-short');

    if (elTag) elTag.textContent = (this.activeMachine === 'satake_vbf') ? `Node ${part.partNumber}` : `Part ${part.partNumber}`;
    if (elSection) elSection.textContent = loc.section || part.section;
    if (elTitle) elTitle.textContent = loc.name || part.officialName;
    if (elFlow) elFlow.textContent = loc.flow || part.feedFlowDirection;
    if (elSafety) elSafety.textContent = loc.safety || part.safetyNotice || part.safety;
    if (elSpecs) elSpecs.textContent = loc.specs || part.specs || part.description;
    const yVal = (part.anchorPosition && part.anchorPosition[1] !== undefined) ? part.anchorPosition[1] : (part.anchor ? part.anchor[1] : 1.0);
    if (elElevation) elElevation.textContent = `Z = ${yVal.toFixed(2)} m`;
    if (elDecal) elDecal.textContent = loc.decal || part.hazardDecal;
    if (elTolShort) elTolShort.textContent = (loc.tolerance || part.engineeringTolerance || part.tolerance || '').split('.')[0];
  }

  updatePartsDrawerUI(activePartNumber) {
    document.querySelectorAll('.part-item').forEach((item) => {
      const isMatch = (item.dataset.part === activePartNumber);
      item.classList.toggle('active', isMatch);
      if (isMatch) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  updateExplorationProgress() {
    const countEl = document.getElementById('explored-count');
    const fillEl = document.getElementById('progress-fill');
    const total = this.activeParts.length;
    const count = this.exploredParts.size;

    if (countEl) countEl.textContent = `${count} / ${total}`;
    if (fillEl) fillEl.style.width = `${(count / total) * 100}%`;
  }

  setupFaultDiagnosticsUI() {
    const faultBtns = document.querySelectorAll('.fault-btn');
    const faultName = document.getElementById('fault-name');
    const faultTrigger = document.getElementById('fault-trigger');
    const faultSymptom = document.getElementById('fault-symptom');
    const faultRemedy = document.getElementById('fault-remedy');
    const btnSim = document.getElementById('btn-simulate-fault');
    const btnResolve = document.getElementById('btn-resolve-fault');

    let currentFault = (elevatorAnatomy.faultDiagnostics && elevatorAnatomy.faultDiagnostics[0]) || null;

    const displayFault = (f) => {
      if (!f) return;
      currentFault = f;
      if (faultName) faultName.textContent = f.name;
      if (faultTrigger) faultTrigger.textContent = f.triggerSource;
      if (faultSymptom) faultSymptom.textContent = f.symptom;
      if (faultRemedy) faultRemedy.textContent = f.remedy;
    };

    faultBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        faultBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const fid = btn.dataset.fault;
        const f = elevatorAnatomy.faultDiagnostics.find(item => item.id === fid);
        if (f) displayFault(f);
      });
    });

    if (btnSim) {
      btnSim.addEventListener('click', () => {
        if (currentFault) this.simulateFault(currentFault);
        if (btnSim) btnSim.style.display = 'none';
        if (btnResolve) btnResolve.style.display = 'block';
      });
    }

    if (btnResolve) {
      btnResolve.addEventListener('click', () => {
        this.clearSimulatedFault();
        if (btnSim) btnSim.style.display = 'block';
        if (btnResolve) btnResolve.style.display = 'none';
      });
    }
  }

  simulateFault(fault) {
    if (!fault) return;
    this.activeSimulatedFault = fault;
    this.isFaultSimulated = true;

    const targetPartNum = fault.affectedParts[0];
    const targetPart = elevatorAnatomy.parts.find(p => p.partNumber === targetPartNum);
    if (targetPart) this.selectPart(targetPart);

    fault.affectedParts.forEach((partNum) => {
      const p = elevatorAnatomy.parts.find(item => item.partNumber === partNum);
      if (p && this.model) {
        const mesh = this.model.getObjectByName(p.meshNodeName);
        if (mesh) {
          const alertMat = new THREE.MeshStandardMaterial({
            color: 0xDC2626,
            emissive: 0xDC2626,
            emissiveIntensity: 0.9,
            roughness: 0.2
          });
          mesh.material = alertMat;
        }
      }
    });
  }

  clearSimulatedFault() {
    this.isFaultSimulated = false;
    this.activeSimulatedFault = null;
    if (this.activePart) {
      this.selectPart(this.activePart);
    }
  }

  /* ============================================================
     11. MULTILINGUAL LOCALIZATION ENGINE
     ============================================================ */
  setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    this.currentLang = lang;
    const dict = TRANSLATIONS[lang];

    const elNavExp = document.getElementById('nav-explore-txt');
    if (elNavExp) elNavExp.textContent = dict.navExplore;
    const elNavLib = document.getElementById('nav-library-txt');
    if (elNavLib) elNavLib.textContent = dict.navLibrary;
    const elNavTour = document.getElementById('nav-tour-txt');
    if (elNavTour) elNavTour.textContent = dict.navLearningPaths;
    const elNavStudio = document.getElementById('nav-studio-txt');
    if (elNavStudio) elNavStudio.textContent = dict.navStudio;

    this.updateMachineUI();

    const sBtn = document.getElementById('sound-toggle-label');
    if (sBtn) sBtn.textContent = this.isSoundEnabled ? dict.soundOn : dict.soundOff;

    const bExt = document.getElementById('btn-exterior-txt');
    if (bExt) bExt.textContent = dict.exteriorView;
    const bCut = document.getElementById('btn-cutaway-txt');
    if (bCut) bCut.textContent = dict.xrayView;
    const lblOpac = document.getElementById('lbl-casing-opacity');
    if (lblOpac) lblOpac.textContent = dict.casingOpacity;
    const lblExpl = document.getElementById('lbl-exploded-view');
    if (lblExpl) lblExpl.textContent = dict.explodedView;

    const pTitle = document.getElementById('parts-panel-title');
    if (pTitle) pTitle.textContent = dict.componentsTitle;
    const pReg = document.getElementById('parts-counter');
    if (pReg) pReg.textContent = dict.registeredNodes;
    const pExp = document.getElementById('lbl-your-exploration');
    if (pExp) pExp.textContent = dict.yourExploration;

    this.populatePartsList();
    this.populateHazardSensors();
    this.populateElevatorScheduleTable();
      this.populateSatakeScheduleTable();
    this.setupFloatingHUD();
    if (this.activePart) this.updateTelemetryCard(this.activePart);
    if (this.isAutoTourActive && this.activePart) this.updateTourHUD(this.activePart);
  }

  /* ============================================================
     12. ANIMATION LOOP: KINEMATICS, BELT & BUCKET CYCLING
     ============================================================ */
  onWindowResize() {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    this.renderer.setAnimationLoop(() => {
      try {
        const delta = Math.min(this.clock.getDelta(), 0.1);
        const time = this.clock.getElapsedTime();

        // 1. Camera Dolly Interpolation
        if (this.isDryingCamera) {
          this.camLerpAlpha += delta * 1.8;
          if (this.camLerpAlpha >= 1.0) {
            this.camLerpAlpha = 1.0;
            this.isDryingCamera = false;
          }
          const t = 1 - Math.pow(1 - this.camLerpAlpha, 3);
          this.camera.position.lerpVectors(this.camStartPos, this.camTargetPos, t);
          this.controls.target.lerpVectors(this.lookStartPos, this.lookTargetPos, t);
        }

        // 2. Slow Continuous 360-degree Turntable Orbit (0.002 rad/frame)
        if (this.isTurntableActive && !this.isDryingCamera && !this.renderer.xr.isPresenting) {
          this.controls.autoRotate = true;
          this.controls.autoRotateSpeed = 0.70;
        } else {
          this.controls.autoRotate = false;
        }

        // 3. Machine Kinematics: Satake VBF (465 RPM) vs Bucket Elevator (2.80 m/s)
        if (this.activeMachine === 'satake_vbf') {
          const targetRotorSpeed = this.isMachineRunning ? 48.69 : 0; // rad/s (465 RPM)
          if (this.currentRotorSpeed < targetRotorSpeed) {
            this.currentRotorSpeed += delta * 24.0;
            if (this.currentRotorSpeed > targetRotorSpeed) this.currentRotorSpeed = targetRotorSpeed;
          } else if (this.currentRotorSpeed > targetRotorSpeed) {
            this.currentRotorSpeed -= delta * 28.0;
            if (this.currentRotorSpeed < 0) this.currentRotorSpeed = 0;
          }

          if (this.currentRotorSpeed > 0.001) {
            const rotDelta = this.currentRotorSpeed * delta;
            this.satakeRotors.forEach((mesh) => {
              if (mesh) mesh.rotateY(rotDelta);
            });
            if (this.satakeFan) {
              this.satakeFan.rotateX(rotDelta * 1.5);
            }
          }

          // Active Telemetry Readouts
          const ratio = this.currentRotorSpeed / 48.69;
          const spdEl = document.getElementById('readout-speed');
          const rpmEl = document.getElementById('readout-rpm');
          const tonEl = document.getElementById('readout-tonnage');
          if (spdEl) spdEl.textContent = (ratio * 465.0).toFixed(1);
          if (rpmEl) rpmEl.textContent = (ratio * 88.4).toFixed(1);
          if (tonEl) tonEl.textContent = (ratio * 4.5).toFixed(1);

        } else {
          if (this.isMachineRunning) {
            if (this.currentBeltSpeed < this.targetBeltSpeed) {
              this.currentBeltSpeed += delta * 2.4;
              if (this.currentBeltSpeed > this.targetBeltSpeed) this.currentBeltSpeed = this.targetBeltSpeed;
            }
          } else {
            if (this.currentBeltSpeed > 0) {
              this.currentBeltSpeed -= delta * 2.8;
              if (this.currentBeltSpeed < 0) this.currentBeltSpeed = 0;
            }
          }

        // 4. Continuous Vertical Belt & 58-Bucket Cycling at 2.80 m/s
        if (this.currentBeltSpeed > 0.001) {
          const distDelta = this.currentBeltSpeed * delta;
          this.distanceTraveled = (this.distanceTraveled + distDelta) % this.L_total;

          // Animate Conveyor Belt UV texture offset
          const uvShift = (this.currentBeltSpeed * delta) / 2.1;
          if (this.upLegBelt && this.upLegBelt.material && this.upLegBelt.material.map) {
            this.upLegBelt.material.map.offset.y -= uvShift;
          }
          if (this.downLegBelt && this.downLegBelt.material && this.downLegBelt.material.map) {
            this.downLegBelt.material.map.offset.y += uvShift;
          }

          // Rotate head and boot pulleys around shaft axis
          const omega = (this.currentBeltSpeed / this.R) * delta;
          this.pulleys.forEach((p) => {
            if (p) p.rotateY(omega);
          });

          // Translate all 58 instanced buckets along the 18.7368m continuous path
          this.buckets.forEach((bucketMesh) => {
            if (bucketMesh && bucketMesh.userData) {
              const s = (bucketMesh.userData.s_init + this.distanceTraveled) % this.L_total;
              const tr = this.getLoopTransform(s);

              bucketMesh.position.set(tr.x, tr.y, 0);
              bucketMesh.rotation.set(0, 0, tr.rotZ);

              if (this.explodeFactor > 0.01) {
                const explodeX = (tr.x > 0 ? 0.35 : -0.35) * this.explodeFactor;
                bucketMesh.position.x += explodeX;
              }
            }
          });

          // Animate centrifugal grain streams
          this.streams.forEach((s) => {
            if (s) {
              s.visible = true;
              if (s.material) {
                s.material.opacity = 0.75 + Math.sin(time * 12) * 0.2;
              }
            }
          });

          // Update telemetry readout numbers
          const rSpeed = document.getElementById('readout-speed');
          const rRpm = document.getElementById('readout-rpm');
          const rTon = document.getElementById('readout-tonnage');

          if (rSpeed) rSpeed.textContent = this.currentBeltSpeed.toFixed(2);
          if (rRpm) rRpm.textContent = ((this.currentBeltSpeed / 2.80) * this.nominalRPM).toFixed(1);
          if (rTon) rTon.textContent = ((this.currentBeltSpeed / 2.80) * this.nominalTonnage).toFixed(1);
        } else {
          const rSpeed = document.getElementById('readout-speed');
          const rRpm = document.getElementById('readout-rpm');
          const rTon = document.getElementById('readout-tonnage');

          if (rSpeed) rSpeed.textContent = '0.00';
          if (rRpm) rRpm.textContent = '0.0';
          if (rTon) rTon.textContent = '0.0';

          this.streams.forEach((s) => { if (s) s.visible = false; });
        }
      }

        // 5. Fault Warning Pulse if active
        if (this.isFaultSimulated && this.activeSimulatedFault && this.model) {
          const pulse = Math.sin(time * 8) * 0.4 + 0.6;
          this.activeSimulatedFault.affectedParts.forEach((partNum) => {
            const p = elevatorAnatomy.parts.find(item => item.partNumber === partNum);
            if (p) {
              const mesh = this.model.getObjectByName(p.meshNodeName);
              if (mesh && mesh.material && mesh.material.emissive) {
                mesh.material.emissiveIntensity = pulse;
              }
            }
          });
        }

        // 6. Update Screen-Space Floating 3D HUD Callout Banners
        this.updateFloatingHUDPositions();

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      } catch (renderErr) {
        console.error('[SAGMA Viewer] Render loop error:', renderErr);
      }
    });
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new ElevatorViewer();
});
