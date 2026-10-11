/**
 * SAGMA Industrial WebXR Machinery Inspection Pilot
 * Diagram 69(b) Master Model (9.63m Elevation • 391mm Crowned Pulleys • 58 Buckets)
 * Compliant with HANDOVER_MASTER_REGISTER.md & SAGMA Module 8
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { MACHINE_SPECS, CAMERA_PRESETS, DIAGRAM_69B_CALLOUTS, calculateElevatorMetrics } from './diagram69b_data.js';
import { audio } from './audio.js';

// Application State
const state = {
  activeModelType: 'diagram69b',
  loadedModel: null,
  isExploded: false,
  isWireframe: false,
  isRotating: true,
  isCutaway: true,
  areLabelsVisible: true,
  isLifeSize: false,
  currentLighting: 'studio',
  beltSpeed_m_s: 2.80,
  selectedCallout: DIAGRAM_69B_CALLOUTS[1], // Default: [02] Crowned Head Pulley
  xrSession: null,
  controllers: [],
  grabbedObject: null,
  grabOffset: new THREE.Vector3(),
  rotationSpeed: 0.006,
  tabletopScale: 1.0,
  lifeSizeScale: 1.0
};

// Container & Dimensions
const container = document.getElementById('canvas-container');
let width = window.innerWidth;
let height = window.innerHeight;

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c111a);
scene.fog = new THREE.FogExp2(0x0c111a, 0.04);

const camera = new THREE.PerspectiveCamera(48, width / height, 0.05, 100);
camera.position.set(2.8, 1.6, 3.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

// Orbit Controls (Desktop fallback)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.1, 0);
controls.minDistance = 0.4;
controls.maxDistance = 25.0;
controls.maxPolarAngle = Math.PI / 2 + 0.04;

// Lighting Setup
const lightingRig = new THREE.Group();
scene.add(lightingRig);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
lightingRig.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xeef5ff, 2.6);
mainKeyLight.position.set(4, 7, 4);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
mainKeyLight.shadow.bias = -0.0001;
lightingRig.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x00d2ff, 1.3);
fillLight.position.set(-4, 4, -3);
lightingRig.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffaa44, 1.1);
rimLight.position.set(0, 6, -5);
lightingRig.add(rimLight);

const floorPointLight = new THREE.PointLight(0x00f2fe, 1.6, 6);
floorPointLight.position.set(0, 0.1, 0);
lightingRig.add(floorPointLight);

// Lighting Presets
function setLightingMode(mode) {
  state.currentLighting = mode;
  document.querySelectorAll('[id^="btn-light-"]').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-light-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  if (mode === 'studio') {
    scene.background.set(0x0c111a);
    scene.fog.color.set(0x0c111a);
    ambientLight.color.set(0xffffff);
    ambientLight.intensity = 0.85;
    mainKeyLight.color.set(0xeef5ff);
    mainKeyLight.intensity = 2.6;
    fillLight.color.set(0x00d2ff);
    fillLight.intensity = 1.3;
    rimLight.intensity = 1.1;
  } else if (mode === 'factory') {
    scene.background.set(0x14100c);
    scene.fog.color.set(0x14100c);
    ambientLight.color.set(0xfff0dd);
    ambientLight.intensity = 0.7;
    mainKeyLight.color.set(0xffcc88);
    mainKeyLight.intensity = 3.0;
    fillLight.color.set(0x88aacc);
    fillLight.intensity = 0.8;
    rimLight.intensity = 1.6;
  } else if (mode === 'contrast') {
    scene.background.set(0x05070a);
    scene.fog.color.set(0x05070a);
    ambientLight.color.set(0x406080);
    ambientLight.intensity = 0.35;
    mainKeyLight.color.set(0xffffff);
    mainKeyLight.intensity = 4.0;
    fillLight.color.set(0x00e5ff);
    fillLight.intensity = 1.8;
    rimLight.intensity = 2.4;
  }
  audio.playClick();
}

// Pedestal & Ground Grid
const pedestalGroup = new THREE.Group();
pedestalGroup.position.set(0, 0, 0);
scene.add(pedestalGroup);

// Radial Grid Floor
const gridHelper = new THREE.PolarGridHelper(4.5, 18, 9, 64, 0x00d2ff, 0x1f364d);
gridHelper.position.y = 0.005;
scene.add(gridHelper);

// Circular Base Platform
const baseGeometry = new THREE.CylinderGeometry(1.3, 1.45, 0.12, 64);
const baseMaterial = new THREE.MeshStandardMaterial({
  color: 0x161f2d,
  roughness: 0.35,
  metalness: 0.85
});
const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
baseMesh.position.y = 0.06;
baseMesh.receiveShadow = true;
baseMesh.castShadow = true;
pedestalGroup.add(baseMesh);

// Glowing Turntable Ring
const ringGeometry = new THREE.RingGeometry(1.22, 1.28, 64);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x00f2fe,
  side: THREE.DoubleSide
});
const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
ringMesh.rotation.x = -Math.PI / 2;
ringMesh.position.y = 0.125;
pedestalGroup.add(ringMesh);

// High-Tech Industrial Turntable Top
const turntableTopGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.02, 64);
const turntableTopMat = new THREE.MeshStandardMaterial({
  color: 0x222d3d,
  roughness: 0.4,
  metalness: 0.7
});
const turntableMesh = new THREE.Mesh(turntableTopGeo, turntableTopMat);
turntableMesh.position.y = 0.13;
turntableMesh.receiveShadow = true;
pedestalGroup.add(turntableMesh);

// Machinery Assembly Root (Placed on the turntable)
const machineryAssembly = new THREE.Group();
machineryAssembly.position.set(0, 0.14, 0);
pedestalGroup.add(machineryAssembly);

// Dynamic Focused Spotlight on Selected Components
const focusedSpotlight = new THREE.SpotLight(0xffd54f, 4.0, 10, Math.PI / 6, 0.4, 1.2);
focusedSpotlight.position.set(2, 4, 3);
focusedSpotlight.castShadow = false;
scene.add(focusedSpotlight);
scene.add(focusedSpotlight.target);

// Highlight Bounding Wireframe Helper
const highlightBox = new THREE.BoxHelper(new THREE.Mesh(new THREE.BufferGeometry()), 0xffaa00);
highlightBox.visible = false;
highlightBox.material.linewidth = 2;
scene.add(highlightBox);

// 3D Numbered Part Labels Group
const labelsGroup = new THREE.Group();
labelsGroup.name = 'diagram69b_labels';
pedestalGroup.add(labelsGroup);

// Tracking Maps for 3D Parts & Components
const calloutMeshMap = new Map();
const selectableObjects = [];
const explodedPartsList = [];
const cutawayCasingMeshes = [];
let topDrivePulleyMesh = null;
let botTakeUpPulleyMesh = null;
const rotatingBuckets = [];

// Camera Presets Smooth Transition
let isCameraTransitioning = false;
const camStartPos = new THREE.Vector3();
const camEndPos = new THREE.Vector3();
const lookStartPos = new THREE.Vector3();
const lookEndPos = new THREE.Vector3();
let camLerpProgress = 1.0;

function transitionCameraTo(camCoords, lookCoords, duration = 0.8) {
  camStartPos.copy(camera.position);
  camEndPos.set(...camCoords);
  lookStartPos.copy(controls.target);
  lookEndPos.set(...lookCoords);
  camLerpProgress = 0.0;
  isCameraTransitioning = true;
}

// 3D Floating Pill Label Generator
function create3DCalloutBadge(callout) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');

  // Background rounded badge pill
  ctx.fillStyle = 'rgba(10, 17, 28, 0.92)';
  ctx.strokeStyle = '#00d2ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(4, 4, 376, 104, 20);
  ctx.fill();
  ctx.stroke();

  // Tag Badge Box
  ctx.fillStyle = '#006544';
  ctx.beginPath();
  ctx.roundRect(14, 16, 76, 80, 14);
  ctx.fill();
  ctx.strokeStyle = '#c98818';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Tag Number Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(callout.tag, 52, 56);

  // Title Text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px -apple-system, sans-serif';
  const displayTitle = callout.title.length > 18 ? callout.title.substring(0, 16) + '...' : callout.title;
  ctx.fillText(displayTitle, 102, 46);

  // Section Subtitle
  ctx.fillStyle = '#00f2fe';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(callout.section.toUpperCase(), 102, 78);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.42, 0.125, 1.0);
  sprite.userData = { callout };
  return sprite;
}

// Select Callout and Update Inspector & Visuals
function selectCallout(callout, zoomCamera = false) {
  state.selectedCallout = callout;
  audio.playSelect();

  // Update Inspector Card
  const inspTag = document.getElementById('insp-tag');
  const inspSection = document.getElementById('insp-section');
  const inspTitle = document.getElementById('insp-title');
  const inspSource = document.getElementById('insp-source');
  const inspDesc = document.getElementById('insp-desc');
  const inspSafety = document.getElementById('insp-safety');

  if (inspTag) inspTag.textContent = `[${callout.tag}]`;
  if (inspSection) inspSection.textContent = callout.section.toUpperCase();
  if (inspTitle) inspTitle.textContent = callout.title;
  if (inspSource) inspSource.textContent = `Source: ${callout.source}`;
  if (inspDesc) inspDesc.textContent = callout.desc;
  if (inspSafety) inspSafety.innerHTML = `⚠️ <strong>Safety Interlock:</strong> ${callout.safety}`;

  // Update Quick Parts List Active State
  document.querySelectorAll('.part-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tag === callout.tag);
  });

  // Highlight 3D Mesh
  const mesh = calloutMeshMap.get(callout.id);
  if (mesh) {
    highlightBox.setFromObject(mesh);
    highlightBox.visible = true;

    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);

    focusedSpotlight.target.position.copy(center);
    focusedSpotlight.position.set(center.x + 1.2, center.y + 1.5, center.z + 1.5);
    focusedSpotlight.intensity = 4.5;

    if (zoomCamera && callout.camPreset) {
      transitionCameraTo(callout.camPreset.cam, callout.camPreset.look);
    }
  }

  // Update WebXR Spatial HUD if active
  if (webXRManager) {
    webXRManager.updateSpatialHUD(`[${callout.tag}] ${callout.title}`, callout.desc);
  }
}

// Populate Quick Diagram 69(b) 13 Callouts in HTML HUD
function populateQuickCalloutsList() {
  const container = document.getElementById('parts-quick-list');
  if (!container) return;
  container.innerHTML = '';

  DIAGRAM_69B_CALLOUTS.forEach(callout => {
    const btn = document.createElement('button');
    btn.className = 'part-item-btn';
    btn.dataset.tag = callout.tag;
    btn.innerHTML = `<span class="part-num">[${callout.tag}]</span> <span>${callout.title}</span>`;
    btn.addEventListener('click', () => {
      selectCallout(callout, true);
    });
    container.appendChild(btn);
  });
}
populateQuickCalloutsList();

// Update Module 8 Kinematics & Sizing Telemetry Readout
function updateCalculations(beltSpeed = state.beltSpeed_m_s) {
  state.beltSpeed_m_s = beltSpeed;
  const metrics = calculateElevatorMetrics({ beltSpeed_m_s: beltSpeed });

  const teleSpeed = document.getElementById('tele-speed');
  const teleCap = document.getElementById('tele-capacity');
  const teleRPM = document.getElementById('tele-rpm');
  const telePower = document.getElementById('tele-power');

  if (teleSpeed) teleSpeed.textContent = `${metrics.beltSpeed_m_s} m/s (${metrics.beltSpeed_m_min} m/min)`;
  if (teleCap) teleCap.textContent = `${metrics.capacity_t_h} t/h (Wheat/Maize)`;
  if (teleRPM) teleRPM.textContent = `${metrics.headRPM} RPM (391mm Crown)`;
  if (telePower) telePower.textContent = `${metrics.motorPower_kW} kW (η = 70%)`;
}
updateCalculations();

// Belt Speed Slider Listener
const speedSlider = document.getElementById('belt-speed-slider');
if (speedSlider) {
  speedSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    updateCalculations(val);
  });
}

// Exploded View Register
function registerExplodedPart(mesh, dx, dy, dz) {
  explodedPartsList.push({
    mesh,
    originPos: mesh.position.clone(),
    offset: new THREE.Vector3(dx, dy, dz)
  });
}

// Mount and Configure Custom 3D Model
const gltfLoader = new GLTFLoader();
const stlLoader = new STLLoader();

function mountCustomModel(model, name, isDiagram69b = false) {
  machineryAssembly.clear();
  labelsGroup.clear();
  calloutMeshMap.clear();
  selectableObjects.length = 0;
  explodedPartsList.length = 0;
  cutawayCasingMeshes.length = 0;
  rotatingBuckets.length = 0;
  topDrivePulleyMesh = null;
  botTakeUpPulleyMesh = null;
  highlightBox.visible = false;

  if (state.loadedModel) {
    state.loadedModel = null;
  }

  // Calculate Bounding Box and Center Model
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Tabletop Scale (~1.8m height) vs True Life Size (9.63m)
  const maxDim = size.y || 9.63;
  state.tabletopScale = 1.8 / maxDim;
  state.lifeSizeScale = 1.0;

  const currentScale = state.isLifeSize ? state.lifeSizeScale : state.tabletopScale;
  model.scale.setScalar(currentScale);

  // Align base to turntable surface
  const scaledBottom = box.min.y * currentScale;
  model.position.set(-center.x * currentScale, 0.14 - scaledBottom, -center.z * currentScale);

  // Traverse Model and Configure Materials, Callouts & Animations
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // Register selectable objects for raycast
      selectableObjects.push(child);

      // Track 13 Diagram 69(b) Callouts
      DIAGRAM_69B_CALLOUTS.forEach(callout => {
        if (child.name.includes(callout.meshTarget) || child.name === callout.meshTarget) {
          calloutMeshMap.set(callout.id, child);
          child.userData.diagramCallout = callout;
        }
      });

      // Track Pulleys
      if (child.name.includes('Pulley_Head') || child.name.includes('topPulley')) {
        topDrivePulleyMesh = child;
      }
      if (child.name.includes('Pulley_Boot') || child.name.includes('botPulley')) {
        botTakeUpPulleyMesh = child;
      }

      // Track Buckets
      if (child.name.includes('Bucket_')) {
        rotatingBuckets.push(child);
      }

      // Track Casing Trunks for Cutaway X-Ray
      if (
        child.name.includes('Casing_Trunking') ||
        child.name.includes('Casing_Head') ||
        child.name.includes('Boot_Casing')
      ) {
        cutawayCasingMeshes.push(child);
        child.userData.originalMaterial = child.material;
      }

      // Configure Exploded View Offsets
      if (child.name.includes('Casing_Head_SplitHood')) {
        registerExplodedPart(child, 0, 0.45, 0);
      } else if (child.name.includes('Drive_Electric_Motor')) {
        registerExplodedPart(child, -0.4, 0.1, 0);
      } else if (child.name.includes('Boot_Cleanout_Door_Front')) {
        registerExplodedPart(child, 0, 0, 0.35);
      } else if (child.name.includes('Boot_Cleanout_Door_Back')) {
        registerExplodedPart(child, 0, 0, -0.35);
      } else if (child.name.includes('Discharge_Spout')) {
        registerExplodedPart(child, 0.35, -0.1, 0);
      } else if (child.name.includes('Casing_Trunking_UpLeg')) {
        registerExplodedPart(child, 0.18, 0, 0);
      } else if (child.name.includes('Casing_Trunking_DownLeg')) {
        registerExplodedPart(child, -0.18, 0, 0);
      }
    }
  });

  machineryAssembly.add(model);
  state.loadedModel = model;

  // Generate 3D Floating Callout Badges
  if (isDiagram69b) {
    DIAGRAM_69B_CALLOUTS.forEach(callout => {
      const targetMesh = calloutMeshMap.get(callout.id);
      if (targetMesh) {
        const badge = create3DCalloutBadge(callout);
        const meshBox = new THREE.Box3().setFromObject(targetMesh);
        const meshCenter = new THREE.Vector3();
        meshBox.getCenter(meshCenter);

        // Position badge just slightly offset in front and above component
        badge.position.set(meshCenter.x + 0.18, meshCenter.y + 0.08, meshCenter.z + 0.22);
        labelsGroup.add(badge);
        selectableObjects.push(badge);
      }
    });
  }

  // Apply default Cutaway Casing state
  applyCutawayMode(state.isCutaway);

  // Auto-select callout [02]
  selectCallout(state.selectedCallout, false);

  const profileText = document.getElementById('profile-text');
  if (profileText) profileText.textContent = name;
}

// Casing Cutaway X-Ray Mode
function applyCutawayMode(isCutaway) {
  cutawayCasingMeshes.forEach(mesh => {
    if (isCutaway) {
      if (!mesh.userData.cutawayMaterial) {
        mesh.userData.cutawayMaterial = mesh.material.clone();
        mesh.userData.cutawayMaterial.transparent = true;
        mesh.userData.cutawayMaterial.opacity = 0.25;
        mesh.userData.cutawayMaterial.roughness = 0.1;
      }
      mesh.material = mesh.userData.cutawayMaterial;
    } else {
      if (mesh.userData.originalMaterial) {
        mesh.material = mesh.userData.originalMaterial;
      }
    }
  });
}

// Model Loading Controller
function loadModelByType(type) {
  state.activeModelType = type;
  audio.playSweep();

  const modelMap = {
    'diagram69b': {
      url: './models/elevator_full_diagram69b.glb',
      name: 'Diagram 69(b) Master (9.63m GLB)',
      isStl: false,
      isDiagram: true
    },
    'slice': {
      url: './models/elevator_slice.glb',
      name: 'Elevator Head Slice (GLB)',
      isStl: false,
      isDiagram: false
    },
    'highpoly': {
      url: './models/sagma_elevator_highpoly.glb',
      name: 'High-Poly CAD Elevator (48MB)',
      isStl: false,
      isDiagram: false
    },
    'stl': {
      url: './models/bucket_elevator.stl',
      name: 'SolidWorks CAD (36MB STL)',
      isStl: true,
      isDiagram: false
    }
  };

  const item = modelMap[type];
  if (!item) return;

  const profileText = document.getElementById('profile-text');
  if (profileText) profileText.textContent = `Loading ${item.name}...`;

  if (item.isStl) {
    stlLoader.load(item.url, (geometry) => {
      geometry.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3d4f68,
        metalness: 0.75,
        roughness: 0.3
      });
      const mesh = new THREE.Mesh(geometry, mat);
      const group = new THREE.Group();
      group.add(mesh);
      mountCustomModel(group, item.name, false);
    });
  } else {
    gltfLoader.load(item.url, (gltf) => {
      mountCustomModel(gltf.scene, item.name, item.isDiagram);
    }, undefined, (err) => {
      console.error('Failed to load GLTF:', err);
      if (profileText) profileText.textContent = 'Error loading 3D model';
    });
  }
}

// Initial Model Load: Always load the authoritative Diagram 69(b) Master Model!
loadModelByType('diagram69b');

// Model Select Dropdown
const modelSelect = document.getElementById('model-select');
if (modelSelect) {
  modelSelect.addEventListener('change', (e) => {
    loadModelByType(e.target.value);
  });
}

// Camera Preset Buttons
document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const presetKey = btn.dataset.preset;
    const preset = CAMERA_PRESETS[presetKey];
    if (preset) {
      transitionCameraTo(preset.cam, preset.look);
      audio.playClick();
    }
  });
});

// Focus Button in Component Inspector
const btnFocusComp = document.getElementById('btn-focus-component');
if (btnFocusComp) {
  btnFocusComp.addEventListener('click', () => {
    if (state.selectedCallout && state.selectedCallout.camPreset) {
      transitionCameraTo(state.selectedCallout.camPreset.cam, state.selectedCallout.camPreset.look);
      audio.playClick();
    }
  });
}

// 3D Labels Toggle Button & 'L' Key
const btnLabels = document.getElementById('btn-labels');
function toggleLabels() {
  state.areLabelsVisible = !state.areLabelsVisible;
  labelsGroup.visible = state.areLabelsVisible;
  if (btnLabels) {
    btnLabels.classList.toggle('active', state.areLabelsVisible);
    btnLabels.innerHTML = `<span>🏷️ 3D Labels: ${state.areLabelsVisible ? 'ON' : 'OFF'}</span>`;
  }
  audio.playClick();
}

if (btnLabels) btnLabels.addEventListener('click', toggleLabels);
window.addEventListener('keydown', (e) => {
  if (e.key === 'l' || e.key === 'L') {
    toggleLabels();
  }
});

// Cutaway Casing Toggle
const btnCutaway = document.getElementById('btn-cutaway');
if (btnCutaway) {
  btnCutaway.addEventListener('click', () => {
    state.isCutaway = !state.isCutaway;
    btnCutaway.classList.toggle('active', state.isCutaway);
    applyCutawayMode(state.isCutaway);
    audio.playClick();
  });
}

// Exploded View Toggle
const btnExplode = document.getElementById('btn-explode');
if (btnExplode) {
  btnExplode.addEventListener('click', () => {
    state.isExploded = !state.isExploded;
    btnExplode.classList.toggle('active', state.isExploded);
    audio.playSweep();
  });
}

// Wireframe Toggle
const btnWireframe = document.getElementById('btn-wireframe');
if (btnWireframe) {
  btnWireframe.addEventListener('click', () => {
    state.isWireframe = !state.isWireframe;
    btnWireframe.classList.toggle('active', state.isWireframe);
    if (state.loadedModel) {
      state.loadedModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = state.isWireframe;
        }
      });
    }
    audio.playClick();
  });
}

// Turntable Rotation Toggle
const btnRotate = document.getElementById('btn-rotate');
if (btnRotate) {
  btnRotate.addEventListener('click', () => {
    state.isRotating = !state.isRotating;
    btnRotate.classList.toggle('active', state.isRotating);
    audio.playClick();
  });
}

// Scale Mode Toggle (Tabletop vs 1:1 Life Size 9.63m)
const btnScale = document.getElementById('btn-scale');
if (btnScale) {
  btnScale.addEventListener('click', () => {
    state.isLifeSize = !state.isLifeSize;
    btnScale.classList.toggle('active', state.isLifeSize);
    btnScale.innerHTML = `<span>📏 Scale: ${state.isLifeSize ? '1:1 Life Size (9.63m)' : 'Tabletop (1.8m)'}</span>`;

    if (state.loadedModel) {
      const targetScale = state.isLifeSize ? state.lifeSizeScale : state.tabletopScale;
      state.loadedModel.scale.setScalar(targetScale);

      // Adjust camera distance for life-size view
      if (state.isLifeSize) {
        transitionCameraTo([5.2, 5.0, 7.5], [0, 4.8, 0]);
      } else {
        transitionCameraTo([2.8, 1.6, 3.8], [0, 1.1, 0]);
      }
    }
    audio.playSweep();
  });
}

// Lighting Preset Listeners
document.getElementById('btn-light-studio').addEventListener('click', () => setLightingMode('studio'));
document.getElementById('btn-light-factory').addEventListener('click', () => setLightingMode('factory'));
document.getElementById('btn-light-contrast').addEventListener('click', () => setLightingMode('contrast'));

// Reset Camera Button
document.getElementById('btn-reset-cam').addEventListener('click', () => {
  transitionCameraTo([2.8, 1.6, 3.8], [0, 1.1, 0]);
  pedestalGroup.rotation.y = 0;
  audio.playClick();
});

// Audio Toggle Button
const btnAudio = document.getElementById('btn-audio-toggle');
if (btnAudio) {
  btnAudio.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    btnAudio.textContent = isMuted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
    btnAudio.classList.toggle('active', !isMuted);
  });
}

// Desktop Raycaster Pointer Interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const pointerDownPos = { x: 0, y: 0 };

window.addEventListener('pointerdown', (e) => {
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
});

window.addEventListener('pointerup', (e) => {
  if (e.button !== 0) return;
  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  // Only process click if movement was minimal (distinguish orbit drag from click)
  if (dist < 6) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(selectableObjects, true);
    if (intersects.length > 0) {
      for (const hit of intersects) {
        // Check if hit is a 3D badge Sprite
        if (hit.object.userData && hit.object.userData.callout) {
          selectCallout(hit.object.userData.callout, false);
          break;
        }
        // Check if hit mesh has an authoritative Diagram 69(b) callout
        if (hit.object.userData && hit.object.userData.diagramCallout) {
          selectCallout(hit.object.userData.diagramCallout, false);
          break;
        }
      }
    }
  }
});

// WebXR Manager Class (Meta Quest & Immersive Web Emulator)
class PilotWebXRManager {
  constructor() {
    this.spatialHUD = null;
    this.hudCanvas = null;
    this.hudContext = null;
    this.hudTexture = null;
    this.xrControllerPointers = [];
    this.init();
  }

  init() {
    this.buildControllers();
    this.createSpatialHUD();
  }

  buildControllers() {
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      scene.add(controller);

      // Laser Pointer Line (Cyan for Left, Green for Right)
      const beamGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -2.5)
      ]);
      const beamMat = new THREE.LineBasicMaterial({
        color: i === 0 ? 0x00d2ff : 0x00e676,
        transparent: true,
        opacity: 0.75
      });
      const laserBeam = new THREE.Line(beamGeo, beamMat);
      controller.add(laserBeam);

      // Target Reticle
      const reticleGeo = new THREE.RingGeometry(0.015, 0.022, 24);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.z = -2.5;
      controller.add(reticle);

      // Controller Grip / Model
      const grip = renderer.xr.getControllerGrip(i);
      scene.add(grip);

      // Controller Events
      controller.addEventListener('selectstart', (e) => this.onSelectStart(e.target));
      controller.addEventListener('squeezestart', (e) => {
        state.grabbedObject = pedestalGroup;
      });
      controller.addEventListener('squeezeend', (e) => {
        state.grabbedObject = null;
      });

      this.xrControllerPointers.push({ controller, laserBeam, reticle });
    }
  }

  onSelectStart(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    const xrRaycaster = new THREE.Raycaster();
    xrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    xrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = xrRaycaster.intersectObjects(selectableObjects, true);
    if (intersects.length > 0) {
      for (const hit of intersects) {
        if (hit.object.userData && hit.object.userData.callout) {
          selectCallout(hit.object.userData.callout, false);
          this.triggerHaptic(controller);
          break;
        }
        if (hit.object.userData && hit.object.userData.diagramCallout) {
          selectCallout(hit.object.userData.diagramCallout, false);
          this.triggerHaptic(controller);
          break;
        }
      }
    } else {
      // Toggle rotation on empty space trigger
      state.isRotating = !state.isRotating;
      if (btnRotate) btnRotate.classList.toggle('active', state.isRotating);
    }
  }

  triggerHaptic(controller) {
    if (controller && controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
      controller.gamepad.hapticActuators[0].pulse(0.6, 60);
    }
  }

  createSpatialHUD() {
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = 1024;
    this.hudCanvas.height = 512;
    this.hudContext = this.hudCanvas.getContext('2d');

    this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);
    this.hudTexture.minFilter = THREE.LinearFilter;

    const geometry = new THREE.PlaneGeometry(1.2, 0.6);
    const material = new THREE.MeshBasicMaterial({
      map: this.hudTexture,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.spatialHUD = new THREE.Mesh(geometry, material);
    this.spatialHUD.position.set(0, 1.5, -1.6);
    this.spatialHUD.visible = false;
    scene.add(this.spatialHUD);

    this.updateSpatialHUD("SAGMA DIAGRAM 69(b)", "Meta Quest VR Mode Active. Point laser and trigger to inspect machine callouts.");
  }

  updateSpatialHUD(title, subtitle) {
    if (!this.hudContext) return;
    const ctx = this.hudContext;

    // Card background
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(0, 0, 1024, 512, 28);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(0, 0, 1024, 512, 28);
    ctx.stroke();

    // Header banner
    ctx.fillStyle = '#006544';
    ctx.beginPath();
    ctx.roundRect(4, 4, 1016, 90, [24, 24, 0, 0]);
    ctx.fill();

    // Banner Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px -apple-system, sans-serif';
    ctx.fillText("SAGMA DIAGRAM 69(b) • 3D TECHNICAL SIMULATOR", 40, 58);

    // Title
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 42px -apple-system, sans-serif';
    ctx.fillText(title, 40, 160);

    // Subtitle
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '28px -apple-system, sans-serif';
    this.wrapText(ctx, subtitle, 40, 230, 930, 42);

    // Footer
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText("TRIGGER: SELECT CALLOUT | SQUEEZE: MOVE PLATFORM", 40, 465);

    this.hudTexture.needsUpdate = true;
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }
}

const webXRManager = new PilotWebXRManager();

// WebXR Session Management
const xrButton = document.getElementById('xr-button');
const xrStatusDot = document.getElementById('xr-status-dot');
const xrStatusText = document.getElementById('xr-status-text');

if ('xr' in navigator) {
  navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
    if (supported) {
      xrStatusDot.classList.add('active');
      xrStatusText.textContent = 'WebXR Ready (Quest / Emulator)';
      xrButton.disabled = false;
    } else {
      xrStatusDot.classList.add('emulator');
      xrStatusText.textContent = 'Desktop Preview / Dev Mode';
    }
  }).catch(() => {
    xrStatusText.textContent = 'WebXR Unsupported (Desktop View)';
  });
} else {
  xrStatusText.textContent = 'WebXR API Not Present (Desktop View)';
}

xrButton.addEventListener('click', () => {
  if (state.xrSession === null) {
    const sessionInit = {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
    };
    navigator.xr.requestSession('immersive-vr', sessionInit).then((session) => {
      state.xrSession = session;
      renderer.xr.setSession(session);
      xrButton.innerHTML = '<span>❌ Exit Immersive VR</span>';
      xrButton.style.background = '#d32f2f';

      if (webXRManager && webXRManager.spatialHUD) {
        webXRManager.spatialHUD.visible = true;
      }

      if (session.updateTargetFrameRate) {
        session.updateTargetFrameRate(90).catch(() => {});
      }

      session.addEventListener('end', () => {
        state.xrSession = null;
        if (webXRManager && webXRManager.spatialHUD) {
          webXRManager.spatialHUD.visible = false;
        }
        xrButton.innerHTML = '<span>🥽 Enter Immersive VR</span>';
        xrButton.style.background = 'linear-gradient(135deg, var(--sagma-green), #00c853)';
      });
    }).catch((err) => {
      console.error('Failed to start WebXR session:', err);
      alert('Could not start WebXR session. Verify that Immersive Web Emulator is enabled or Meta Quest Browser is connected over HTTPS.');
    });
  } else {
    state.xrSession.end();
  }
});

// Resize Handler
window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// Render & Animation Loop
const clock = new THREE.Clock();
let explodedFactor = 0;
let bucketCirculationOffset = 0;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Camera Smooth Preset Transition
  if (isCameraTransitioning) {
    camLerpProgress += delta * 1.8;
    if (camLerpProgress >= 1.0) {
      camLerpProgress = 1.0;
      isCameraTransitioning = false;
    }
    const t = 1 - Math.pow(1 - camLerpProgress, 3); // Ease out cubic
    camera.position.lerpVectors(camStartPos, camEndPos, t);
    controls.target.lerpVectors(lookStartPos, lookEndPos, t);
  }

  // Turntable Auto-Rotation
  if (state.isRotating && !renderer.xr.isPresenting) {
    pedestalGroup.rotation.y += state.rotationSpeed;
  }

  // Smooth Exploded View Interpolation
  const targetExplode = state.isExploded ? 1.0 : 0.0;
  explodedFactor += (targetExplode - explodedFactor) * 0.08;

  explodedPartsList.forEach(({ mesh, originPos, offset }) => {
    mesh.position.lerpVectors(originPos, originPos.clone().add(offset), explodedFactor);
  });

  // Pulley & Bucket Circulation at Machine Nominal Speed (2.80 m/s)
  const angularVelocity = state.beltSpeed_m_s / MACHINE_SPECS.headPulleyRadius_m;
  if (topDrivePulleyMesh) {
    topDrivePulleyMesh.rotation.x += delta * angularVelocity;
  }
  if (botTakeUpPulleyMesh) {
    botTakeUpPulleyMesh.rotation.x += delta * angularVelocity;
  }

  // Animate buckets along vertical path
  bucketCirculationOffset += delta * state.beltSpeed_m_s * 0.4;
  rotatingBuckets.forEach((bucket, idx) => {
    bucket.position.y += Math.sin(bucketCirculationOffset + idx * 0.3) * 0.0006;
  });

  // Billboard 3D Callout Badges to face camera
  labelsGroup.children.forEach(badge => {
    badge.quaternion.copy(camera.quaternion);
  });

  // Controls update when not in XR
  if (!renderer.xr.isPresenting) {
    controls.update();
  }

  renderer.render(scene, camera);
});
