import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Play,
  Pause,
  Folder,
  Layers,
  Eye,
  CheckCircle2,
  X,
  ChevronRight,
  ShieldAlert,
  Activity,
  Wrench,
  Search,
  BookOpen
} from 'lucide-react';

import elevatorAnatomy from './data/machines/bucket_elevator.json';
import satakeAnatomy from './data/machines/satake_degermer.json';
import { FLEET_MACHINES } from './data/fleet_data.js';

export default function SagmaDigitalTwin() {
  // 1. Dynamic Machine Selector State ('bucket_elevator' | 'satake_vbf')
  const [activeMachine, setActiveMachine] = useState('bucket_elevator');
  const [activePartId, setActivePartId] = useState('01');
  const [isRunning, setIsRunning] = useState(false);
  const [isTurntable, setIsTurntable] = useState(true);
  const [theme, setTheme] = useState('light');

  // Modals
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryActiveMachine, setLibraryActiveMachine] = useState('bucket_elevator');
  const [libraryActiveTab, setLibraryActiveTab] = useState('schematic');
  const [toastMessage, setToastMessage] = useState(null);

  // Active Manifest & Normalized Parts
  const currentManifest = useMemo(() => {
    return activeMachine === 'satake_vbf' ? satakeAnatomy : elevatorAnatomy;
  }, [activeMachine]);

  const normalizedParts = useMemo(() => {
    if (!currentManifest.parts) return [];
    return currentManifest.parts.map((p) => ({
      id: p.id || p.partNumber,
      name: p.name || p.officialName,
      nodeName: p.nodeName || p.meshNodeName,
      anchor: p.anchor || p.anchorPosition || [0, 1, 0],
      category: p.category || p.section || 'COMPONENT',
      feed: p.feed || p.feedFlowDirection || 'Operating flow',
      safety: p.safety || p.safetyNotice || 'Follow standard industrial safety protocols.',
      tolerance: p.tolerance || p.engineeringTolerance || 'Standard tolerance',
      elevation: p.elevation || `${(p.anchor ? p.anchor[1] : 1).toFixed(2)} m`,
      velocity: p.velocity || (activeMachine === 'satake_vbf' ? '465 RPM' : '2.80 m/s'),
      description: p.description || `${p.feed || ''} Elevation: ${p.elevation || ''}`
    }));
  }, [currentManifest, activeMachine]);

  const activePart = useMemo(() => {
    return normalizedParts.find((p) => p.id === activePartId) || normalizedParts[0] || null;
  }, [normalizedParts, activePartId]);

  // Three.js References
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const originalMaterialsRef = useRef(new Map());
  const rotatorsRef = useRef([]);
  const fanRef = useRef(null);
  const casingsRef = useRef([]);

  // Toast Trigger
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3600);
  };

  // Machine Switch Handler
  const handleSelectMachine = (machineId) => {
    const target = (machineId === 'satake_vbf' || machineId === 'satake_degermer')
      ? 'satake_vbf'
      : 'bucket_elevator';

    setActiveMachine(target);
    setLibraryActiveMachine(target);
    setIsFleetModalOpen(false);

    if (target === 'satake_vbf') {
      setActivePartId('01');
      triggerToast('Active Machine: Satake VBF Vertical Maize Degermer (Module 4) — Loaded');
    } else {
      setActivePartId('01');
      triggerToast('Active Machine: Diagram 69(b) Bucket Elevator (Module 2) — Loaded');
    }
  };

  const handleOpenLibrary = () => {
    setLibraryActiveMachine(activeMachine);
    setLibraryActiveTab(activeMachine === 'satake_vbf' ? 'diagram4a' : 'schematic');
    setIsLibraryModalOpen(true);
  };

  // Setup Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(theme === 'light' ? 0xEAF0EB : 0x0A131F);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(8, 14, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xa7f3d0, 0.8);
    fillLight.position.set(-8, 6, -8);
    scene.add(fillLight);

    // Floor Grid
    const grid = new THREE.GridHelper(14, 28, 0x005A36, 0xCBD5E1);
    grid.position.y = 0;
    scene.add(grid);

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (controlsRef.current) {
        controlsRef.current.autoRotate = isTurntable;
        controlsRef.current.autoRotateSpeed = 0.6;
        controlsRef.current.update();
      }

      if (isRunning && rotatorsRef.current.length > 0) {
        const rotSpeed = activeMachine === 'satake_vbf' ? 48.69 : 14.3; // rad/s
        rotatorsRef.current.forEach((mesh) => {
          if (mesh) mesh.rotateY(rotSpeed * delta);
        });
        if (fanRef.current) {
          fanRef.current.rotateX(rotSpeed * 1.5 * delta);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [theme]);

  // Load Model on Machine Switch
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !controlsRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    rotatorsRef.current = [];
    fanRef.current = null;
    casingsRef.current = [];
    originalMaterialsRef.current.clear();

    const loader = new GLTFLoader();
    const modelPath = activeMachine === 'satake_vbf'
      ? '/assets/machines/satake_degermer/models/satake_vbf.glb'
      : '/assets/machines/bucket_elevator/models/elevator_full_diagram69b.glb';

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            originalMaterialsRef.current.set(child, child.material);

            const n = child.name || '';
            const p = (child.parent && child.parent.name) || '';

            if (n.includes('Rotor') || p.includes('Rotor') ||
                n.includes('Beater') || p.includes('Beater') ||
                n.includes('Scroll') || p.includes('Scroll') ||
                n.includes('Pulley') || n.includes('Shaft')) {
              rotatorsRef.current.push(child);
            } else if (n.includes('Fan') || p.includes('Fan')) {
              fanRef.current = child;
            } else if (n.includes('Screen') || n.includes('Casing') || n.includes('Hood')) {
              casingsRef.current.push(child);
            }
          }
        });

        scene.add(model);

        if (activeMachine === 'satake_vbf') {
          controls.target.set(0, 0.95, 0);
          camera.position.set(2.3, 1.4, 2.6);
        } else {
          controls.target.set(0, 4.8, 0);
          camera.position.set(5.6, 5.2, 7.8);
        }
        controls.update();
      },
      undefined,
      (err) => {
        console.error('Error loading GLTF model:', err);
      }
    );
  }, [activeMachine]);

  // Highlight Selected Part Node
  useEffect(() => {
    if (!modelRef.current || !activePart) return;

    modelRef.current.traverse((child) => {
      if (child.isMesh) {
        const orig = originalMaterialsRef.current.get(child);
        const isTarget = child.name === activePart.nodeName ||
          (child.parent && child.parent.name === activePart.nodeName);

        if (isTarget) {
          const glow = orig ? orig.clone() : new THREE.MeshStandardMaterial();
          glow.color = new THREE.Color(0x005A36);
          glow.emissive = new THREE.Color(0x005A36);
          glow.emissiveIntensity = 0.75;
          child.material = glow;
        } else if (orig) {
          child.material = orig;
        }
      }
    });

    if (controlsRef.current && cameraRef.current && activePart.anchor) {
      const [ax, ay, az] = activePart.anchor;
      controlsRef.current.target.set(ax, ay, az);
      controlsRef.current.update();
    }
  }, [activePartId, activePart]);

  return (
    <div className={`digital-twin-container ${theme}`} style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: theme === 'light' ? '#EAF0EB' : '#0A131F', color: '#1E293B', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* STICKY HEADER */}
      <header style={{ height: '56px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,90,54,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#005A36', color: '#fff', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', fontSize: '13px' }}>SAGMA</div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#005A36' }}>
            {activeMachine === 'satake_vbf' ? 'Satake VBF Maize Degermer (Module 4)' : 'Diagram 69(b) Bucket Elevator (Module 2)'}
          </span>
          <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
            WebGL Live ({normalizedParts.length} Nodes)
          </span>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleOpenLibrary}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,90,54,0.08)', color: '#005A36', border: '1px solid rgba(0,90,54,0.2)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <BookOpen size={14} /> Courseware Library
          </button>
          <button
            onClick={() => setIsFleetModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#005A36', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Folder size={14} /> Machine Fleet (2)
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isRunning ? '#D97706' : '#0D6E45', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />} {isRunning ? 'Stop Machine' : 'Start Machine'}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE STAGE */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 320px', overflow: 'hidden' }}>

        {/* LEFT PANEL: Parts Drawer */}
        <aside style={{ background: 'rgba(255,255,255,0.75)', borderRight: '1px solid rgba(0,90,54,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,90,54,0.1)', fontWeight: 700, fontSize: '12px', color: '#005A36', display: 'flex', justifyContent: 'space-between' }}>
            <span>EXPLORATION PARTS</span>
            <span>{normalizedParts.length} NODES</span>
          </div>
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {normalizedParts.map((p) => {
              const isSelected = p.id === activePartId;
              return (
                <div
                  key={p.id}
                  onClick={() => setActivePartId(p.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: isSelected ? 'rgba(0,90,54,0.12)' : 'transparent',
                    border: isSelected ? '1px solid #005A36' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, background: '#005A36', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>{p.id}</span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748B' }}>{p.category}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER VIEWPORT: Three.js 3D Canvas */}
        <main style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
          <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

          {/* Floating Telemetry Strip */}
          <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,90,54,0.15)', borderRadius: '8px', padding: '8px 16px', display: 'flex', gap: '16px', alignItems: 'center', fontSize: '11px', fontWeight: 700 }}>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '9px' }}>{activeMachine === 'satake_vbf' ? 'ROTOR SPEED' : 'SCALE SPEED'}</span>
              <span style={{ color: '#005A36', fontSize: '14px' }}>{isRunning ? (activeMachine === 'satake_vbf' ? '465 RPM' : '2.80 m/s') : '0.0'}</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '9px' }}>{activeMachine === 'satake_vbf' ? 'MOTOR LOAD' : 'SHAFT RPM'}</span>
              <span style={{ color: '#005A36', fontSize: '14px' }}>{isRunning ? (activeMachine === 'satake_vbf' ? '88.4 A (75 kW)' : '136.8 RPM') : '0.0'}</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '9px' }}>CAPACITY</span>
              <span style={{ color: '#005A36', fontSize: '14px' }}>{isRunning ? (activeMachine === 'satake_vbf' ? '4.5 t/h' : '78.5 t/h') : '0.0'}</span>
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: Specs & LOTO Safety */}
        <aside style={{ background: 'rgba(255,255,255,0.75)', borderLeft: '1px solid rgba(0,90,54,0.12)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          {activePart && (
            <>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#005A36', textTransform: 'uppercase' }}>{activePart.category}</span>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0 2px 0', color: '#1E293B' }}>{activePart.name}</h2>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Part ID: #{activePart.id} &bull; Node: {activePart.nodeName}</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid rgba(0,90,54,0.15)', borderRadius: '8px', padding: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#005A36', textTransform: 'uppercase' }}>ENGINEERING TOLERANCE</span>
                <p style={{ fontSize: '11px', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.4 }}>{activePart.tolerance}</p>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706', fontWeight: 700, fontSize: '11px' }}>
                  <ShieldAlert size={14} />
                  <span>SAFETY &amp; LOTO PROTOCOL</span>
                </div>
                <p style={{ fontSize: '11px', color: '#92400e', margin: '6px 0 0 0', lineHeight: 1.4 }}>{activePart.safety}</p>
              </div>

              <div style={{ background: '#fff', border: '1px solid rgba(0,90,54,0.15)', borderRadius: '8px', padding: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#005A36', textTransform: 'uppercase' }}>FEED &amp; FLOW SPECIFICATION</span>
                <p style={{ fontSize: '11px', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.4 }}>{activePart.feed}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', marginTop: '6px' }}>
                  <span>Elevation: <strong>{activePart.elevation}</strong></span>
                  <span>Velocity: <strong>{activePart.velocity}</strong></span>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* MACHINE FLEET REGISTRY MODAL (Strictly 2 live machines) */}
      {isFleetModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '720px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(0,90,54,0.2)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#005A36', margin: 0 }}>SAGMA Milling Equipment Registry &amp; Fleet</h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Select active machinery digital twin profile</p>
              </div>
              <button onClick={() => setIsFleetModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {/* Card 1: Bucket Elevator */}
              <div style={{ background: '#fff', border: activeMachine === 'bucket_elevator' ? '2px solid #005A36' : '1px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <img src="/assets/machines/bucket_elevator/diagrams/preview_render.png" alt="Bucket Elevator" style={{ height: '140px', objectFit: 'cover' }} />
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 6px', borderRadius: '10px', width: 'fit-content' }}>WebGL Live (13 Nodes)</span>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Diagram 69(b) Bucket Elevator</h4>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Module 2: Continuous Elevation</p>
                  <button
                    onClick={() => handleSelectMachine('bucket_elevator')}
                    style={{ marginTop: 'auto', background: '#005A36', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Launch 3D Simulator
                  </button>
                </div>
              </div>

              {/* Card 2: Satake VBF Maize Degermer */}
              <div style={{ background: '#fff', border: activeMachine === 'satake_vbf' ? '2px solid #005A36' : '1px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <img src="/assets/machines/satake_degermer/diagrams/diagram_4a_isometric.png" alt="Satake VBF Degermer" style={{ height: '140px', objectFit: 'cover' }} />
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 6px', borderRadius: '10px', width: 'fit-content' }}>WebGL Live (12 Nodes)</span>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Satake VBF Maize Degermer</h4>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Module 4: Mechanical Degermination</p>
                  <button
                    onClick={() => handleSelectMachine('satake_vbf')}
                    style={{ marginTop: 'auto', background: '#005A36', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Switch Machine Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED COURSEWARE LIBRARY & PARTS SCHEDULE MODAL */}
      {isLibraryModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '920px', maxHeight: '88vh', background: '#fff', borderRadius: '14px', border: '1px solid rgba(0,90,54,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            
            {/* Modal Head with Machine Selector Toggle */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,90,54,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ background: '#005A36', color: '#fff', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>S</span>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', margin: 0 }}>SAGMA Courseware Library &amp; Parts Schedule</h3>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0' }}>
                    {libraryActiveMachine === 'satake_vbf'
                      ? 'Official Reference Drawings - Module 4: Mechanical Degermination - Diagram 4(a) / Diagram 3'
                      : 'Official Reference Drawings - Module 2 Section 1.1.1 - Diagram 69(b) / 19(a)'}
                  </p>
                </div>
              </div>

              {/* Machine Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
                <button
                  onClick={() => { setLibraryActiveMachine('bucket_elevator'); setLibraryActiveTab('schematic'); }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: libraryActiveMachine === 'bucket_elevator' ? '#005A36' : 'transparent',
                    color: libraryActiveMachine === 'bucket_elevator' ? '#fff' : '#64748B'
                  }}
                >
                  Bucket Elevator
                </button>
                <button
                  onClick={() => { setLibraryActiveMachine('satake_vbf'); setLibraryActiveTab('diagram4a'); }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: libraryActiveMachine === 'satake_vbf' ? '#005A36' : 'transparent',
                    color: libraryActiveMachine === 'satake_vbf' ? '#fff' : '#64748B'
                  }}
                >
                  Satake VBF Degermer
                </button>
              </div>

              <button onClick={() => setIsLibraryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>

            {/* Modal Tabs Row */}
            <div style={{ display: 'flex', gap: '8px', padding: '10px 24px', borderBottom: '1px solid rgba(0,90,54,0.1)', background: '#F8FAFC' }}>
              {libraryActiveMachine === 'bucket_elevator' ? (
                <>
                  <button
                    onClick={() => setLibraryActiveTab('schematic')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: libraryActiveTab === 'schematic' ? '#005A36' : '#CBD5E1', background: libraryActiveTab === 'schematic' ? '#ecfdf5' : '#fff', color: libraryActiveTab === 'schematic' ? '#005A36' : '#64748B' }}
                  >
                    Diagram 69(b) Schematics
                  </button>
                  <button
                    onClick={() => setLibraryActiveTab('diagram19b')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: libraryActiveTab === 'diagram19b' ? '#005A36' : '#CBD5E1', background: libraryActiveTab === 'diagram19b' ? '#ecfdf5' : '#fff', color: libraryActiveTab === 'diagram19b' ? '#005A36' : '#64748B' }}
                  >
                    Manual Drawing 19(b)
                  </button>
                  <button
                    onClick={() => setLibraryActiveTab('schedule')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: libraryActiveTab === 'schedule' ? '#005A36' : '#CBD5E1', background: libraryActiveTab === 'schedule' ? '#ecfdf5' : '#fff', color: libraryActiveTab === 'schedule' ? '#005A36' : '#64748B' }}
                  >
                    Official Parts Register
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setLibraryActiveTab('diagram4a')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: libraryActiveTab === 'diagram4a' ? '#005A36' : '#CBD5E1', background: libraryActiveTab === 'diagram4a' ? '#ecfdf5' : '#fff', color: libraryActiveTab === 'diagram4a' ? '#005A36' : '#64748B' }}
                  >
                    Diagram 4(a) Isometric
                  </button>
                  <button
                    onClick={() => setLibraryActiveTab('exploded')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: libraryActiveTab === 'exploded' ? '#005A36' : '#CBD5E1', background: libraryActiveTab === 'exploded' ? '#ecfdf5' : '#fff', color: libraryActiveTab === 'exploded' ? '#005A36' : '#64748B' }}
                  >
                    Drawing 4(a) Exploded
                  </button>
                  <button
                    onClick={() => setLibraryActiveTab('diagram3')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: libraryActiveTab === 'diagram3' ? '#005A36' : '#CBD5E1', background: libraryActiveTab === 'diagram3' ? '#ecfdf5' : '#fff', color: libraryActiveTab === 'diagram3' ? '#005A36' : '#64748B' }}
                  >
                    Process Diagram 3
                  </button>
                  <button
                    onClick={() => setLibraryActiveTab('schedule')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: libraryActiveTab === 'schedule' ? '#005A36' : '#CBD5E1', background: libraryActiveTab === 'schedule' ? '#ecfdf5' : '#fff', color: libraryActiveTab === 'schedule' ? '#005A36' : '#64748B' }}
                  >
                    Official Parts Register
                  </button>
                </>
              )}
            </div>

            {/* Modal Body / Tab Panes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {libraryActiveMachine === 'bucket_elevator' ? (
                <>
                  {libraryActiveTab === 'schematic' && (
                    <div>
                      <img src="/assets/images/diagram19a.png" alt="Diagram 19(a)" style={{ maxHeight: '480px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                      <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748B', marginTop: '10px' }}>SAGMA Diagram 19(a) / 69(b): Authoritative general arrangement schematic of industrial vertical bucket elevator assembly.</p>
                    </div>
                  )}
                  {libraryActiveTab === 'diagram19b' && (
                    <div>
                      <img src="/assets/images/diagram19b.png" alt="Diagram 19(b)" style={{ maxHeight: '480px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                      <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748B', marginTop: '10px' }}>SAGMA Diagram 19(b): Sectional engineering detail of crowned drive head assembly, centrifugal discharge saddle, and twin-screw take-up boot.</p>
                    </div>
                  )}
                  {libraryActiveTab === 'schedule' && (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>PART #</th>
                            <th style={{ padding: '8px 12px' }}>COMPONENT NAME</th>
                            <th style={{ padding: '8px 12px' }}>SECTION</th>
                            <th style={{ padding: '8px 12px' }}>FEED FLOW AXIS</th>
                            <th style={{ padding: '8px 12px' }}>CLEARANCE / TOLERANCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {elevatorAnatomy.parts.map((p) => (
                            <tr
                              key={p.partNumber}
                              onClick={() => {
                                handleSelectMachine('bucket_elevator');
                                setActivePartId(p.partNumber);
                                setIsLibraryModalOpen(false);
                              }}
                              style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                            >
                              <td style={{ padding: '8px 12px' }}><span style={{ background: '#005A36', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{p.partNumber}</span></td>
                              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.officialName}</td>
                              <td style={{ padding: '8px 12px' }}>{p.section}</td>
                              <td style={{ padding: '8px 12px' }}>{p.feedFlowDirection}</td>
                              <td style={{ padding: '8px 12px' }}>{p.engineeringTolerance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {libraryActiveTab === 'diagram4a' && (
                    <div>
                      <img src="/assets/machines/satake_degermer/diagrams/diagram_4a_isometric.png" alt="Diagram 4(a)" style={{ maxHeight: '480px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                      <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748B', marginTop: '10px' }}>SAGMA Diagram 4(a): Isometric engineering view of Satake VBF Vertical Maize Degermer showing feed inlet with permanent magnet trap, top discharge flap, and aspiration hood.</p>
                    </div>
                  )}
                  {libraryActiveTab === 'exploded' && (
                    <div>
                      <img src="/assets/machines/satake_degermer/diagrams/M4 DIAGRAM 4 (a) - ISOMATRIC EXPLODED VIEW.png" alt="Diagram 4(a) Exploded" style={{ maxHeight: '480px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                      <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748B', marginTop: '10px' }}>SAGMA Diagram 4(a) Sectional &amp; Exploded View: Detailed arrangement of slotted screen cage, dual-opposed beater bars, vertical rotor shaft, and bottom distribution spiral.</p>
                    </div>
                  )}
                  {libraryActiveTab === 'diagram3' && (
                    <div>
                      <img src="/assets/machines/satake_degermer/diagrams/diagram_3_schematic.png" alt="Diagram 3" style={{ maxHeight: '480px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                      <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748B', marginTop: '10px' }}>SAGMA Diagram 3: Schematic process flow and mechanical degermination principle of the Satake VBF vertical friction-type decorticator.</p>
                    </div>
                  )}
                  {libraryActiveTab === 'schedule' && (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>PART #</th>
                            <th style={{ padding: '8px 12px' }}>COMPONENT NAME</th>
                            <th style={{ padding: '8px 12px' }}>SECTION</th>
                            <th style={{ padding: '8px 12px' }}>FEED FLOW AXIS</th>
                            <th style={{ padding: '8px 12px' }}>CLEARANCE / TOLERANCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {satakeAnatomy.parts.map((p) => (
                            <tr
                              key={p.id}
                              onClick={() => {
                                handleSelectMachine('satake_vbf');
                                setActivePartId(p.id);
                                setIsLibraryModalOpen(false);
                              }}
                              style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                            >
                              <td style={{ padding: '8px 12px' }}><span style={{ background: '#005A36', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{p.id}</span></td>
                              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.name}</td>
                              <td style={{ padding: '8px 12px' }}>{p.category}</td>
                              <td style={{ padding: '8px 12px' }}>{p.feed}</td>
                              <td style={{ padding: '8px 12px' }}>{p.tolerance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#fff', color: '#005A36', border: '1px solid #a7f3d0', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,90,54,0.18)', fontSize: '13px', fontWeight: 600, zIndex: 9999 }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
