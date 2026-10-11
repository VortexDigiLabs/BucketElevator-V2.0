/**
 * Bucket Elevator Master - Calculation Engine
 * Segregated into:
 * 1. Official SAGMA Courseware Engine (Module 8, Section 3)
 * 2. Supplementary Classroom Physics Engine (Carlos III University)
 */

export class SagmaCalculationEngine {
  /**
   * Official SAGMA Module 8 Section 3 Calculations
   * @param {Object} inputs
   * @param {number} inputs.beltSpeed_m_per_min - Belt speed in m/min (e.g. 110)
   * @param {number} inputs.bucketPitch_m - Spacing between buckets in meters (e.g. 0.3)
   * @param {number} inputs.materialMassPerBucket_kg - Mass in kg per bucket (e.g. 3.5)
   * @param {number} inputs.liftHeight_m - Elevating vertical height in meters (e.g. 20)
   * @param {number} inputs.efficiency - Mechanical efficiency factor 0.0 - 1.0 (e.g. 0.70)
   */
  static compute(inputs) {
    const {
      beltSpeed_m_per_min,
      bucketPitch_m,
      materialMassPerBucket_kg,
      liftHeight_m,
      efficiency = 0.70
    } = inputs;

    if (bucketPitch_m <= 0) throw new Error("Bucket pitch must be greater than zero");
    if (beltSpeed_m_per_min < 0) throw new Error("Belt speed cannot be negative");
    if (efficiency <= 0 || efficiency > 1.0) throw new Error("Efficiency must be between 0 and 1.0");

    // 1. Buckets per minute = belt speed (m/min) / bucket pitch (m)
    const bucketsPerMin = beltSpeed_m_per_min / bucketPitch_m;

    // 2. Capacity (kg/min) = buckets/min * material mass per bucket (kg)
    const capacity_kg_per_min = bucketsPerMin * materialMassPerBucket_kg;

    // 3. Capacity (t/h) = capacity (kg/min) * 60 / 1000
    const capacity_t_per_h = (capacity_kg_per_min * 60) / 1000;

    // Mass flow in kg/s
    const massFlow_kg_per_s = capacity_kg_per_min / 60;

    // 4. Theoretical lifting power (kW) = mass flow (kg/s) * lift height (m) * 9.81 / 1000
    const theoreticalLiftingPower_kW = (massFlow_kg_per_s * liftHeight_m * 9.81) / 1000;

    // 5. Motor power required with efficiency allowance (kW)
    const estimatedMotorPower_kW = theoreticalLiftingPower_kW / efficiency;

    return {
      bucketsPerMin: Number(bucketsPerMin.toFixed(2)),
      capacity_kg_per_min: Number(capacity_kg_per_min.toFixed(2)),
      capacity_t_per_h: Number(capacity_t_per_h.toFixed(2)),
      massFlow_kg_per_s: Number(massFlow_kg_per_s.toFixed(2)),
      theoreticalLiftingPower_kW: Number(theoreticalLiftingPower_kW.toFixed(2)),
      estimatedMotorPower_kW: Number(estimatedMotorPower_kW.toFixed(2)),
      source: "SAGMA Maize & Wheat Module 8 Section 3"
    };
  }
}

export class CarlosThirdPhysicsEngine {
  /**
   * Supplementary Carlos III University Demonstration
   * @param {Object} inputs
   * @param {number} inputs.bucketVolume_L - Bucket volume in Litres (e.g. 0.74)
   * @param {number} inputs.bulkDensity_kg_per_L - Density in kg/L (e.g. 1.7 for dry clay)
   * @param {number} inputs.fillCoefficient - Fill factor (e.g. 2/3 = ~0.667)
   * @param {number} inputs.targetThroughput_t_per_h - Target capacity in t/h (e.g. 15)
   * @param {number} inputs.bucketPitch_m - Pitch in meters (e.g. 0.3)
   */
  static compute(inputs) {
    const {
      bucketVolume_L,
      bulkDensity_kg_per_L,
      fillCoefficient = 2 / 3,
      targetThroughput_t_per_h = 15,
      bucketPitch_m = 0.3
    } = inputs;

    // Mass per bucket (kg) = volume (L) * density (kg/L) * fill coefficient
    const massPerBucket_kg = bucketVolume_L * bulkDensity_kg_per_L * fillCoefficient;

    // Required bucket rate (buckets/s)
    const bucketsPerHour = (targetThroughput_t_per_h * 1000) / massPerBucket_kg;
    const bucketsPerSecond = bucketsPerHour / 3600;

    // Required belt speed (m/s) = buckets/s * pitch (m)
    const requiredSpeed_m_per_s = bucketsPerSecond * bucketPitch_m;

    // Centrifugal pulley diameter condition: D = 2 * R = 2 * (v^2 / g)
    const g = 9.81;
    const theoreticalPulleyDiameter_m = 2 * (Math.pow(requiredSpeed_m_per_s, 2) / g);

    return {
      massPerBucket_kg: Number(massPerBucket_kg.toFixed(3)),
      bucketsPerHour: Number(bucketsPerHour.toFixed(0)),
      bucketsPerSecond: Number(bucketsPerSecond.toFixed(2)),
      requiredSpeed_m_per_s: Number(requiredSpeed_m_per_s.toFixed(2)),
      theoreticalPulleyDiameter_m: Number(theoreticalPulleyDiameter_m.toFixed(3)),
      theoreticalPulleyDiameter_mm: Number((theoreticalPulleyDiameter_m * 1000).toFixed(0)),
      source: "Carlos III University Transportation Slide Deck"
    };
  }
}
