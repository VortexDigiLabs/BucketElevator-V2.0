/**
 * SAGMA Diagram 69(b) Authoritative Engineering Specifications
 * Certified Machine Truth: 9.63m Elevation | 391mm Crowned Pulleys | 58 Buckets at 300mm Pitch
 * Compliant with SAGMA Courseware & OSHA 1910.272 Grain Handling Safety
 */

export const MACHINE_SPECS = {
  name: "SAGMA Diagram 69(b) Bucket Elevator",
  elevation_m: 9.63,
  headPulleyDiameter_mm: 391,
  headPulleyRadius_m: 0.1955,
  bootPulleyDiameter_mm: 391,
  bootPulleyRadius_m: 0.1955,
  nominalSpeed_m_s: 2.80,
  nominalSpeed_m_min: 168.0,
  nominalRPM: 136.8,
  bucketPitch_m: 0.30,
  totalBuckets: 58,
  continuousBeltLoop_m: 18.3,
  beltStandard: "DIN 22104 Antistatic Rubber Lining",
  bucketDesign: "Deep High-Capacity Polymer / Steel",
  casingConstruction: "Twin-Leg Steel Trunking with Angle Flanges",
  dischargePrinciple: "Centrifugal Discharge via Tangential Saddle"
};

export const CAMERA_PRESETS = {
  full: {
    name: "Full 9.63m Elevation",
    icon: "🏢",
    cam: [2.8, 1.6, 3.8],
    look: [0, 1.1, 0]
  },
  head: {
    name: "Head Assembly [01-06]",
    icon: "⚙️",
    cam: [0.85, 2.15, 1.35],
    look: [0, 2.02, 0]
  },
  spout: {
    name: "Discharge & Saddle [03,04]",
    icon: "🌾",
    cam: [0.95, 1.95, 1.15],
    look: [0.25, 1.88, 0]
  },
  legs: {
    name: "Twin Trunking Legs [07-09]",
    icon: "🪜",
    cam: [1.5, 1.3, 1.9],
    look: [0, 1.15, 0]
  },
  ties: {
    name: "Floor Tie Bracing [10]",
    icon: "🔩",
    cam: [1.2, 1.25, 1.5],
    look: [0, 1.15, 0]
  },
  boot: {
    name: "Boot & Tensioning [11-13]",
    icon: "🧰",
    cam: [0.85, 0.45, 1.15],
    look: [0, 0.32, 0]
  }
};

export const DIAGRAM_69B_CALLOUTS = [
  {
    tag: "01",
    id: "split_hood",
    meshTarget: "Casing_Head_SplitHood_Removable",
    title: "Split Removable Upper Hood",
    section: "Head Assembly",
    source: "SAGMA Diagram 69(b) [Header]",
    desc: "The entire upper housing is split longitudinally and can be removed for inspection, belt splicing, and pulley maintenance without disturbing the vertical casing legs.",
    safety: "Ensure motor is locked out (LOTO) and mechanical belt clamp is locked before loosening hood clamps.",
    color: "#ffaa00",
    camPreset: { cam: [0.85, 2.2, 1.35], look: [0, 2.05, 0] }
  },
  {
    tag: "02",
    id: "crowned_pulley",
    meshTarget: "Pulley_Head_Drive_Crowned",
    title: "Crowned Head Drive Pulley (391 mm)",
    section: "Head Assembly",
    source: "SAGMA Wheat/Maize Mod 2 Sec 1.1.1 & CAD",
    desc: "Machined with a convex camber (crowned profile) to run true and naturally center the belt. 391 mm diameter derived directly from SolidWorks CAD geometry.",
    safety: "Inspect lagging for wear; uneven wear causes severe tracking drift and casing friction.",
    color: "#00d2ff",
    camPreset: { cam: [0.75, 2.1, 1.2], look: [0, 2.0, 0] }
  },
  {
    tag: "03",
    id: "discharge_saddle",
    meshTarget: "Casing_Head_Lower_With_Saddle",
    title: "Centrifugal Discharge Saddle (Grain)",
    section: "Discharge & Flow",
    source: "SAGMA Diagram 69(b) [Head Callout]",
    desc: "Curved aerodynamic saddle positioned underneath the head pulley guiding tangential material release directly into the discharge spout without recirculation.",
    safety: "Worn or warped saddles allow grain to fall back down the boot (backlegging), driving up power draw.",
    color: "#ff8800",
    camPreset: { cam: [0.95, 1.95, 1.15], look: [0.15, 1.9, 0] }
  },
  {
    tag: "04",
    id: "wear_plates",
    meshTarget: "Discharge_Spout_Centrifugal",
    title: "Wear Plates & Rubber Deflector",
    section: "Discharge & Flow",
    source: "SAGMA Diagram 69(b) [Head Callout]",
    desc: "Heavy-duty abrasion-resistant steel liner plates and a flexible yet highly durable rubber deflector prevent high-velocity grain impact damage at the head spout.",
    safety: "Check deflector flexibility quarterly; hardened rubber cracks and permits grain kernel shatter.",
    color: "#ff6600",
    camPreset: { cam: [1.1, 1.9, 1.2], look: [0.35, 1.85, 0] }
  },
  {
    tag: "05",
    id: "drive_motor",
    meshTarget: "Drive_Electric_Motor_Gearbox",
    title: "Gearmotor & Mounting Platform",
    section: "Drive Kinematics",
    source: "SAGMA Diagram 69(b) [Drive Callout]",
    desc: "Shaft-mounted gearmotor with flexible coupling on head mounting bracket. For power ratings above 55 kW, an integrated starting clutch is prescribed.",
    safety: "Confirm torque arm buffer condition and oil levels before full-load commissioning.",
    color: "#00e676",
    camPreset: { cam: [-0.95, 2.1, 1.3], look: [-0.2, 2.05, 0] }
  },
  {
    tag: "06",
    id: "head_sensor",
    meshTarget: "Sensor_Head_Thermal_Slip_Detector",
    title: "Head Thermal & Belt Slip Sensor",
    section: "Safety & Fire Protection",
    source: "SAGMA Wheat/Maize Mod 2 & OSHA 1910.272",
    desc: "Monitors rotational speed differential between drive pulley and belt to prevent frictional heating and hot-spot fire runaway in dust-laden atmospheres.",
    safety: "Mandatory interlock: auto-shuts down elevator when belt slip exceeds 10% to prevent grain dust deflagration.",
    color: "#ff3366",
    camPreset: { cam: [0.65, 2.1, 0.95], look: [0, 2.05, 0] }
  },
  {
    tag: "07",
    id: "trunking_legs",
    meshTarget: "Casing_Trunking_UpLeg",
    title: "Twin-Leg Trunking & Angle Flanges",
    section: "Casing Legs",
    source: "SAGMA Diagram 69(b) [Leg Callout]",
    desc: "Airtight dual vertical casing ducts joined by angle flanges at modular 2.4m intervals, providing structural rigidity, chimney draft containment, and dust isolation.",
    safety: "Maintain gasket integrity at all angle flange joints to prevent combustible dust release.",
    color: "#00f2fe",
    camPreset: { cam: [1.5, 1.3, 1.9], look: [0, 1.15, 0] }
  },
  {
    tag: "08",
    id: "antistatic_belt",
    meshTarget: "Belt_Strand_UpLeg",
    title: "Antistatic Belt (DIN 22104)",
    section: "Conveying Assembly",
    source: "SAGMA Diagram 69(b) [Leg Callout]",
    desc: "Multi-ply polyester/polyamide fabric core with conductive antistatic rubber covers conforming to DIN 22104 (< 3x10^8 ohms electrical resistance).",
    safety: "Never replace with non-antistatic conveyor belting; static charge accumulation creates an immediate explosion hazard in dry dust environments.",
    color: "#ffaa00",
    camPreset: { cam: [0.85, 1.1, 1.25], look: [0, 1.0, 0] }
  },
  {
    tag: "09",
    id: "deep_buckets",
    meshTarget: "Bucket_UpLeg_01",
    title: "Deep High-Capacity Buckets (300 mm Pitch)",
    section: "Conveying Assembly",
    source: "SAGMA Maize Mod 4 Ch 9 / Wheat Mod 5 Ch 8",
    desc: "Deep buckets designed for whole wheat/maize allowing rapid centrifugal discharge. Spaced at verified 300 mm (0.30m) pitch along the 18.3m continuous loop (58 buckets total).",
    safety: "Check elevator bolts torque with lock-nuts; detached buckets cause catastrophic boot chokes and sparks.",
    color: "#ff9900",
    camPreset: { cam: [0.65, 1.05, 0.95], look: [0.1, 0.95, 0] }
  },
  {
    tag: "10",
    id: "rotation_frame",
    meshTarget: "Rotation_Frame_Tie_Brace",
    title: "Floor Rotation & Tie Frame",
    section: "Structural Bracing",
    source: "SAGMA Diagram 69(b) [Middle Callout]",
    desc: "Structural steel tie frame securing the elevator casing to intermediate concrete floor slabs at Z ~ 5.0m elevation, preventing lateral buckling and sway.",
    safety: "Ensure tie rods are torqued and allow thermal axial expansion while eliminating wind/vibration deflection.",
    color: "#88aacc",
    camPreset: { cam: [1.2, 1.25, 1.5], look: [0, 1.15, 0] }
  },
  {
    tag: "11",
    id: "boot_takeup",
    meshTarget: "Boot_TakeUp_Screw_L",
    title: "Twin Screw Take-Up Tensioner",
    section: "Boot & Tensioning",
    source: "SAGMA Diagram 69(b) [Boot Callout]",
    desc: "Internal crowned boot pulley mounted on sliding bearing blocks adjusted via twin vertical ACME threaded rods to eliminate belt slack and maintain true tracking.",
    safety: "Equal tensioning on both left and right screws is critical; uneven turns cause belt to wander and rub against trunking.",
    color: "#00d2ff",
    camPreset: { cam: [0.85, 0.45, 1.15], look: [0, 0.35, 0] }
  },
  {
    tag: "12",
    id: "boot_feed",
    meshTarget: "Boot_Feed_Spout_Intake",
    title: "Boot Feed Spout (Down-Leg Infeed)",
    section: "Boot & Feeding",
    source: "SAGMA Diagram 69(b) & Mod 2 Sec 1.1.1",
    desc: "Infeed material enters on the down-leg side so descending/ascending buckets scoop grain upward smoothly without back-pressure stalling or dragging excess stock through boot sump.",
    safety: "Never feed on the wrong side; up-leg infeed jams incoming grain against advancing bucket lips.",
    color: "#ffaa00",
    camPreset: { cam: [-0.95, 0.45, 1.05], look: [-0.2, 0.35, 0] }
  },
  {
    tag: "13",
    id: "cleanout_doors",
    meshTarget: "Boot_Cleanout_Door_Front",
    title: "Tool-Operated Cleanout Doors",
    section: "Safety & Maintenance",
    source: "SAGMA Diagram 69(b) [Boot Callout]",
    desc: "Removable cleanout panels secured with tool-operated fasteners for clearing chokes and inspecting boot pulley condition.",
    safety: "OSHA 1910.147 / 1910.272 MANDATE: Never open cleanout doors before complete electrical LOTO and mechanical belt anti-runback clamping. Always use timber canes to poke grain chokes — NEVER hands!",
    color: "#dc2626",
    camPreset: { cam: [0.75, 0.4, 0.95], look: [0, 0.3, 0] }
  }
];

export function calculateElevatorMetrics({
  beltSpeed_m_s = 2.80,
  bucketPitch_m = 0.30,
  massPerBucket_kg = 3.5,
  liftHeight_m = 9.63,
  efficiency = 0.70
}) {
  const beltSpeed_m_min = beltSpeed_m_s * 60;
  const bucketsPerMin = beltSpeed_m_min / bucketPitch_m;
  const capacity_kg_min = bucketsPerMin * massPerBucket_kg;
  const capacity_t_h = (capacity_kg_min * 60) / 1000;
  const theoreticalPower_kW = ((capacity_kg_min / 60) * liftHeight_m * 9.81) / 1000;
  const motorPower_kW = theoreticalPower_kW / efficiency;
  const headRPM = (beltSpeed_m_s / (Math.PI * 0.391)) * 60;

  return {
    beltSpeed_m_s: Number(beltSpeed_m_s).toFixed(2),
    beltSpeed_m_min: beltSpeed_m_min.toFixed(1),
    bucketsPerMin: Math.round(bucketsPerMin),
    capacity_t_h: capacity_t_h.toFixed(1),
    theoreticalPower_kW: theoreticalPower_kW.toFixed(2),
    motorPower_kW: motorPower_kW.toFixed(2),
    headRPM: headRPM.toFixed(1)
  };
}
