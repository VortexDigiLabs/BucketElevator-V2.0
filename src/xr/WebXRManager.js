/**
 * Bucket Elevator Master - WebXR Manager
 * Meta Quest & WebXR 6DoF Immersion Pipeline
 * Styled with SAGMA Brand Aesthetics
 */

import * as THREE from 'three';

export class WebXRManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.renderer = sceneManager.renderer;
    this.scene = sceneManager.scene;
    this.camera = sceneManager.camera;

    this.controller1 = null;
    this.controller2 = null;
    this.raycaster = new THREE.Raycaster();
    this.spatialHUD = null;
    this.hudCanvas = null;
    this.hudContext = null;
    this.hudTexture = null;

    this.isXRPresenting = false;
  }

  init() {
    this.setupControllers();
    this.createSpatialHUD();
    this.setupSessionListeners();
  }

  setupSessionListeners() {
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.isXRPresenting = true;
      if (this.spatialHUD) this.spatialHUD.visible = true;
      console.log("WebXR Session Started (Meta Quest Compatible)");
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      this.isXRPresenting = false;
      if (this.spatialHUD) this.spatialHUD.visible = false;
      console.log("WebXR Session Ended");
    });
  }

  setupControllers() {
    this.controller1 = this.renderer.xr.getController(0);
    this.controller1.addEventListener('selectstart', () => this.onSelectStart(this.controller1));
    this.scene.add(this.controller1);

    this.controller2 = this.renderer.xr.getController(1);
    this.controller2.addEventListener('selectstart', () => this.onSelectStart(this.controller2));
    this.scene.add(this.controller2);

    // Laser pointer line for Controller 1 (SAGMA Green)
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -3)
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0x006544, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    line.name = 'rayLine';
    this.controller1.add(line);
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
    this.spatialHUD.position.set(0, 1.6, -1.5);
    this.spatialHUD.visible = false;
    this.scene.add(this.spatialHUD);

    this.updateSpatialHUD("SAGMA BUCKET ELEVATOR", "Meta Quest VR Mode Active. Point and trigger to inspect.");
  }

  updateSpatialHUD(title, subtitle) {
    if (!this.hudContext) return;
    const ctx = this.hudContext;

    // Background: Crisp off-white card with clean shadow
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(0, 0, 1024, 512, 28);
    ctx.fill();

    // Border: SAGMA Forest Green
    ctx.strokeStyle = '#006544';
    ctx.lineWidth = 10;
    ctx.roundRect(0, 0, 1024, 512, 28);
    ctx.stroke();

    // Header banner: SAGMA Forest Green
    ctx.fillStyle = '#006544';
    ctx.roundRect(5, 5, 1014, 90, [24, 24, 0, 0]);
    ctx.fill();

    // Banner Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px -apple-system, sans-serif';
    ctx.fillText("SAGMA DIAGRAM 69(b) • 3D TECHNICAL SIMULATOR", 50, 60);

    // Title: SAGMA Earth Bronze / Brown
    ctx.fillStyle = '#64533F';
    ctx.font = 'bold 42px -apple-system, sans-serif';
    ctx.fillText(title, 50, 160);

    // Subtitle / Content: Dark Slate
    ctx.fillStyle = '#334155';
    ctx.font = '30px -apple-system, sans-serif';
    this.wrapText(ctx, subtitle, 50, 230, 920, 42);

    // Footer
    ctx.fillStyle = '#006544';
    ctx.font = 'bold 24px monospace';
    ctx.fillText("TRIGGER: SELECT COMPONENT | SQUEEZE: RECENTER VIEW", 50, 465);

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

  onSelectStart(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = this.raycaster.intersectObjects(this.sceneManager.selectableObjects, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      this.sceneManager.highlightObject(hit);
      this.triggerHaptic(controller);
      this.updateSpatialHUD(hit.name, "Selected component in VR. Verify alignment and safety clearance.");
      if (this.sceneManager.onSelect) this.sceneManager.onSelect(hit);
    }
  }

  triggerHaptic(controller) {
    if (controller && controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
      controller.gamepad.hapticActuators[0].pulse(0.6, 60);
    }
  }
}
