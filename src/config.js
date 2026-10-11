/**
 * Bucket Elevator Master - Configuration & Source Register
 * Compliant with SAGMA Courseware (Diagram 69b) and Machine CAD Truth
 */

export const ELEVATOR_CONFIG = {
  machine: {
    name: "SAGMA Diagram 69(b) Bucket Elevator",
    elevation_m: 9.63,
    headPulleyDiameter_mm: 391,
    headPulleyRadius_m: 0.1955,
    bootPulleyDiameter_mm: 391,
    bootPulleyRadius_m: 0.1955,
    nominalSpeed_m_s: 2.80,
    nominalRPM: 136.8,
    nominalPitch_m: 0.30, // 300 mm
    beltStandard: "DIN 22104 Antistatic Rubber Lining",
    bucketType: "Deep High-Capacity Polymer / Steel",
    casingConstruction: "Angle Flanges Twin-Leg Steel Trunking",
    dischargeMode: "Centrifugal Discharge via Tangential Saddle"
  },

  cameraPresets: {
    // Tightened framing so the 9.63m machine fills the viewport with high detail
    full: { cam: [3.4, 4.8, 4.8], look: [0, 4.8, 0] },
    head: { cam: [1.1, 9.4, 1.6], look: [0, 9.2, 0] },
    spout: { cam: [1.1, 8.8, 1.4], look: [0.35, 8.6, 0] },
    legs: { cam: [1.8, 5.2, 2.4], look: [0, 5.0, 0] },
    boot: { cam: [1.1, 0.9, 1.5], look: [0, 0.65, 0] },
    inspection: { cam: [-0.9, 2.0, 1.4], look: [-0.2, 1.85, 0] }
  },

  // Authoritative Diagram 69(b) Callouts from Boot to Head
  diagram69bCallouts: [
    {
      id: "split_hood",
      tag: "01",
      section: "HEAD ASSEMBLY",
      title: "Split Removable Upper Hood",
      source: "SAGMA Diagram 69(b) [Header]",
      desc: "The entire housing is split and can be removed for inspection, belt splicing, and pulley maintenance without disturbing the vertical casing legs.",
      meshTarget: "Casing_Head_SplitHood_Removable"
    },
    {
      id: "crowned_pulley",
      tag: "02",
      section: "HEAD ASSEMBLY",
      title: "Crowned Head Drive Pulley (391 mm)",
      source: "SAGMA Wheat/Maize Mod 2 Sec 1.1.1 & CAD",
      desc: "Machined with a convex camber to run true and naturally center the belt. 391 mm diameter derived directly from SolidWorks CAD geometry.",
      meshTarget: "Pulley_Head_Drive_Crowned"
    },
    {
      id: "discharge_saddle",
      tag: "03",
      section: "DISCHARGE SPARK & FLOW",
      title: "Centrifugal Discharge Saddle (Grain)",
      source: "SAGMA Diagram 69(b) [Head callout]",
      desc: "For grains, a curved saddle under the head pulley guides tangential material release into the discharge spout. (For flour, a specialized flour box is used).",
      meshTarget: "Casing_Head_Lower_With_Saddle"
    },
    {
      id: "wear_plates",
      tag: "04",
      section: "DISCHARGE SPARK & FLOW",
      title: "Wear Plates & Flexible Rubber Deflector",
      source: "SAGMA Diagram 69(b) [Head callout]",
      desc: "Heavy-duty wear-resistant steel liner plates and a flexible yet highly wear-resistant rubber deflector prevent grain impact damage at the head spout.",
      meshTarget: "Discharge_Spout_Centrifugal"
    },
    {
      id: "drive_motor",
      tag: "05",
      section: "DRIVE KINEMATICS",
      title: "Gearmotor & Mounting Platform",
      source: "SAGMA Diagram 69(b) [Drive callout]",
      desc: "Drive arrangement featuring gearmotor with flexible coupling. For power ratings above 55 kW, an integrated starting clutch is prescribed.",
      meshTarget: "Drive_Electric_Motor_Gearbox"
    },
    {
      id: "head_sensor",
      tag: "06",
      section: "SAFETY & FIRE PROTECTION",
      title: "Head Thermal & Belt Slip Sensor",
      source: "SAGMA Wheat/Maize Mod 2 Sec 1.1.1 & OSHA 1910.272",
      desc: "Detects speed differential between drive pulley and belt to prevent frictional heating and hot-spot fire runaway in dust-laden atmospheres.",
      meshTarget: "Sensor_Head_Thermal_Slip_Detector"
    },
    {
      id: "trunking_legs",
      tag: "07",
      section: "CASING TRUNKING",
      title: "Independent Twin-Leg Trunking & Angle Flanges",
      source: "SAGMA Diagram 69(b) [Leg callout]",
      desc: "Airtight dual vertical casing ducts joined by angle flanges at modular intervals, providing structural rigidity and dust containment.",
      meshTarget: "Casing_Trunking_UpLeg"
    },
    {
      id: "antistatic_belt",
      tag: "08",
      section: "CONVEYING ASSEMBLY",
      title: "Antistatic Belt (DIN 22104)",
      source: "SAGMA Diagram 69(b) [Leg callout]",
      desc: "Polyester/polyamide fabric plies with antistatic rubber lining meeting DIN 22104 to prevent dangerous electrostatic charge accumulation.",
      meshTarget: "Belt_Strand_UpLeg"
    },
    {
      id: "deep_buckets",
      tag: "09",
      section: "CONVEYING ASSEMBLY",
      title: "Deep High-Capacity Buckets (300 mm Pitch)",
      source: "SAGMA Maize Mod 4 Ch 9 / Wheat Mod 5 Ch 8",
      desc: "Deep buckets designed for whole wheat/maize allowing rapid centrifugal discharge. Spaced at verified 300 mm (0.30m) pitch along the 18.3m loop.",
      meshTarget: "Bucket_UpLeg_01"
    },
    {
      id: "rotation_frame",
      tag: "10",
      section: "STRUCTURAL TIES",
      title: "Floor Rotation & Tie Frame",
      source: "SAGMA Diagram 69(b) [Middle callout]",
      desc: "Structural tie frame securing the elevator casing to intermediate mill concrete floor slabs at Z ~ 5.0m elevation.",
      meshTarget: "Rotation_Frame_Tie_Brace"
    },
    {
      id: "boot_takeup",
      tag: "11",
      section: "BOOT & TENSIONING",
      title: "Twin Screw Take-Up Tensioner",
      source: "SAGMA Diagram 69(b) [Boot callout]",
      desc: "Internal crowned boot pulley mounted on sliding bearing blocks adjusted via twin vertical screws to eliminate belt slack and maintain true tracking.",
      meshTarget: "Boot_TakeUp_Screw_L"
    },
    {
      id: "boot_feed",
      tag: "12",
      section: "BOOT & TENSIONING",
      title: "Boot Feed Spout (Down-Leg Infeed)",
      source: "SAGMA Diagram 69(b) & Mod 2 Sec 1.1.1",
      desc: "Feed inlet directed into the down-leg side so buckets scoop grain upward without stalling or dragging excess stock through the boot sump.",
      meshTarget: "Boot_Feed_Spout_Intake"
    },
    {
      id: "cleanout_doors",
      tag: "13",
      section: "SAFETY & MAINTENANCE",
      title: "Tool-Operated Cleanout Doors",
      source: "SAGMA Diagram 69(b) [Boot callout]",
      desc: "Removable cleanout panels secured with tool-operated fasteners. Must only be opened after electrical LOTO and gravitational runback restraint.",
      meshTarget: "Boot_Cleanout_Door_Front"
    }
  ]
};
