/**
 * SAGMA Milling Equipment Registry & Fleet Metadata
 * Contains curated digital twins and syllabus references across milling modules.
 */

export const FLEET_MACHINES = [
  {
    id: 'elevator_69b',
    name: 'Diagram 69(b) Bucket Elevator',
    subtitle: 'Continuous Grain Elevation Assembly',
    syllabus: 'SAGMA Wheat & Maize Processing Module 2',
    modelUrl: '/assets/machines/bucket_elevator/models/elevator_full_diagram69b.glb',
    thumbnail: '/assets/machines/bucket_elevator/diagrams/preview_render.png',
    fallbackImg: '/assets/machines/bucket_elevator/diagrams/diagram19a.png',
    status: 'live',
    statusLabel: 'WebGL Live (13 Nodes)',
    assetSummary: {
      totalFiles: 20,
      totalSize: '34.8 MB',
      cad: ['elevator_full_diagram69b.glb', 'BUCKET ELEVATOR.STEP'],
      diagrams: ['preview_render.png', 'diagram19a.png', 'diagram19b.png'],
      manuals: ['Screw-Conveyor-Corporation-Bucket-Elevators-597A.pdf'],
      manifests: ['bucket_elevator.json', 'elevator_anatomy.json']
    },
    specs: {
      capacity: '78.5 t/h',
      velocity: '2.80 m/s',
      shaftRpm: '136.8 RPM',
      elevation: '9.63 m'
    }
  },
  {
    id: 'satake_vbf',
    name: 'Satake VBF Vertical Maize Degermer',
    subtitle: 'Mechanical Degermination & Decortication System',
    syllabus: 'SAGMA Maize Milling Module 4: Mechanical Degermination & Flaking',
    modelUrl: '/assets/machines/satake_degermer/models/satake_vbf.glb',
    thumbnail: '/assets/machines/satake_degermer/diagrams/diagram_4a_isometric.png',
    fallbackImg: '/assets/machines/satake_degermer/diagrams/remaster_preview.png',
    status: 'live',
    statusLabel: 'WebGL Live (12 Nodes)',
    assetSummary: {
      totalFiles: 14,
      totalSize: '32.1 MB',
      cad: ['satake_vbf.glb'],
      diagrams: ['diagram_4a_isometric.png', 'diagram_3_schematic.png', 'remaster_preview.png'],
      manuals: ['satake_vbf_manual.pdf', '550164150-Instruction-Manual-Degerminador.pdf'],
      manifests: ['satake_degermer.json']
    },
    specs: {
      capacity: '4.5 t/h Maize',
      velocity: '465 RPM Rotor',
      shaftRpm: '465 RPM (75 kW Motor)',
      elevation: '1.85 m'
    }
  }
];
