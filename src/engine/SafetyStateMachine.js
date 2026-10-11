/**
 * Bucket Elevator Master - Safety State Machine
 * Compliant with:
 * - OSHA 1910.272 (Grain Handling Facilities - Bucket Elevators)
 * - OSHA 1910.147 (Control of Hazardous Energy - Lockout/Tagout)
 * - ISO 14118 (Prevention of Unexpected Start-up)
 * - SAGMA Wheat/Maize Module 2 (Sec 1.1.1) & Module 4/5 (Ch 9/8)
 */

export const ScenarioType = {
  BOOT_CHOKE: 'BOOT_CHOKE',
  HEAD_SLIP_OVERHEAT: 'HEAD_SLIP_OVERHEAT',
  INSPECTION_DOOR_ACCESS: 'INSPECTION_DOOR_ACCESS'
};

export const EnergyState = {
  LIVE_RUNNING: 'LIVE_RUNNING',
  STOPPED_NOT_ISOLATED: 'STOPPED_NOT_ISOLATED',
  BREAKER_LOCKED_OUT: 'BREAKER_LOCKED_OUT',
  VERIFIED_ZERO_ENERGY: 'VERIFIED_ZERO_ENERGY',
  GRAVITY_RESTRAINED: 'GRAVITY_RESTRAINED' // Anti-runback or belt clamp engaged
};

export const MachineState = {
  NORMAL_RUNNING: 'NORMAL_RUNNING',
  CHOKED_STALLED: 'CHOKED_STALLED',
  SLIPPING_OVERHEATING: 'SLIPPING_OVERHEATING',
  EMERGENCY_STOPPED: 'EMERGENCY_STOPPED',
  ISOLATING: 'ISOLATING',
  SAFE_FOR_MAINTENANCE: 'SAFE_FOR_MAINTENANCE',
  CLEARING_ACTIVE: 'CLEARING_ACTIVE',
  CLEARED_REASSEMBLING: 'CLEARED_REASSEMBLING',
  DEISOLATING: 'DEISOLATING',
  RESTART_COMPLETE: 'RESTART_COMPLETE',
  INCIDENT_HALT: 'INCIDENT_HALT'
};

export class SafetyStateMachine {
  constructor(scenario = ScenarioType.BOOT_CHOKE) {
    this.scenario = scenario;
    this.reset();
  }

  reset() {
    this.state = (this.scenario === ScenarioType.BOOT_CHOKE)
      ? MachineState.CHOKED_STALLED
      : (this.scenario === ScenarioType.HEAD_SLIP_OVERHEAT)
        ? MachineState.SLIPPING_OVERHEATING
        : MachineState.NORMAL_RUNNING;

    this.breakerLocked = false;
    this.breakerTagged = false;
    this.zeroEnergyTested = false;
    this.intakeSlideClosed = false;
    this.mechanicalBackstopSecured = false;
    this.bootAccessPanelOpen = false;
    this.headInspectionDoorOpen = false;
    this.chokeCleared = false;
    this.beltTensionAdjusted = false;
    this.thermalSensorsVerified = false;
    this.guardsClosedAndSecured = true;

    this.auditLog = [];
    this.lastFeedback = null;
    this.log(`Scenario initialized: ${this.scenario} in state ${this.state}`);
  }

  log(msg, level = 'INFO') {
    this.auditLog.push({ timestamp: new Date().toISOString(), level, msg, state: this.state });
  }

  getEnergyState() {
    if (this.state === MachineState.NORMAL_RUNNING || this.state === MachineState.CHOKED_STALLED || this.state === MachineState.SLIPPING_OVERHEATING) {
      return EnergyState.LIVE_RUNNING;
    }
    if (!this.breakerLocked || !this.breakerTagged) {
      return EnergyState.STOPPED_NOT_ISOLATED;
    }
    if (!this.zeroEnergyTested) {
      return EnergyState.BREAKER_LOCKED_OUT;
    }
    if (!this.mechanicalBackstopSecured) {
      return EnergyState.VERIFIED_ZERO_ENERGY;
    }
    return EnergyState.GRAVITY_RESTRAINED;
  }

  /**
   * Action: Stop Pushbutton / Emergency Trip
   */
  actionPressStop() {
    if (this.state === MachineState.NORMAL_RUNNING || this.state === MachineState.CHOKED_STALLED || this.state === MachineState.SLIPPING_OVERHEATING) {
      this.state = MachineState.EMERGENCY_STOPPED;
      this.log("Stop pushbutton activated. Machine power halted, but electrical supply remains live.", 'ACTION');
      this.lastFeedback = {
        success: true,
        title: "Motor Stopped",
        message: "Motor has stopped rotation. WARNING: Control circuit stopped only. Main 400V/525V power supply remains live and hazardous until isolated and locked out.",
        oshaRef: "OSHA 1910.147(d)(2) & SAGMA Mod 2 Sec 1.1.1"
      };
      return this.lastFeedback;
    }
    return this.rejectAction("Machine is already stopped.");
  }

  /**
   * Action: Close Upstream Intake Slide Gate
   */
  actionCloseIntakeSlide() {
    this.intakeSlideClosed = true;
    this.log("Upstream intake hopper slide gate closed. Gravity grain infeed halted.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Intake Infeed Isolated",
      message: "Upstream product flow isolated. Prevents re-flooding the boot casing with additional grain.",
      oshaRef: "OSHA 1910.272(p)(1) & SAGMA Mod 2 Sec 1.1.1"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Apply Electrical Lockout / Tagout (LOTO)
   */
  actionApplyElectricalLOTO() {
    if (this.state !== MachineState.EMERGENCY_STOPPED && this.state !== MachineState.ISOLATING) {
      return this.triggerViolation(
        "Attempting to lock out while equipment is running or in an unverified state. Must execute normal stop sequence before isolating disconnect switch.",
        "OSHA 1910.147(d)(2)"
      );
    }
    this.breakerLocked = true;
    this.breakerTagged = true;
    this.state = MachineState.ISOLATING;
    this.log("Main electrical disconnect opened, padlocked, and tagged by technician.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "LOTO Applied to Main Breaker",
      message: "Padlock and Danger tag affixed to main disconnect switch. Next requirement: verify zero electrical energy by testing start controls.",
      oshaRef: "OSHA 1910.147(d)(4) & ISO 14118 Sec 5.2"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Zero Energy Verification (Push Start / Try Step)
   */
  actionVerifyZeroEnergy() {
    if (!this.breakerLocked || !this.breakerTagged) {
      return this.triggerViolation(
        "Attempted zero-energy test without breaker isolation! Testing controls on a live circuit could restart machinery.",
        "OSHA 1910.147(d)(6)"
      );
    }
    this.zeroEnergyTested = true;
    this.log("Start button depressed. Zero movement detected; voltmeter confirms zero residual energy. Control returned to OFF.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Zero Electrical Energy Verified",
      message: "Start attempt confirmed circuit is dead. Residual electrical energy absent. WARNING: Gravitational stored energy remains in the unequal bucket load.",
      oshaRef: "OSHA 1910.147(d)(6) & ISO 14118 Sec 5.4"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Secure Gravity / Mechanical Anti-Runback
   * Crucial bucket elevator specific requirement!
   */
  actionSecureMechanicalBackstop() {
    if (!this.zeroEnergyTested) {
      return this.triggerViolation(
        "Attempted to engage mechanical backstop / band clamps before verifying electrical zero energy. Risk of sudden startup during clamp application!",
        "OSHA 1910.147(d)(5)"
      );
    }
    this.mechanicalBackstopSecured = true;
    this.state = MachineState.SAFE_FOR_MAINTENANCE;
    this.log("Anti-runback mechanical brake verified / belt travel clamped. Up-leg gravitational reverse spin eliminated.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Gravitational Runback Restrained",
      message: "Elevator band secured against reverse rotation. As choked grain is cleared from the boot, the unequal weight of grain-filled buckets on the up-leg cannot cause the belt to drop backwards.",
      oshaRef: "SAGMA Wheat/Maize Module 2 Sec 1.1.1 & OSHA 1910.272(p)"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Open Boot Cleanout Inspection Panel
   */
  actionOpenBootCleanout() {
    if (this.state !== MachineState.SAFE_FOR_MAINTENANCE && this.getEnergyState() !== EnergyState.GRAVITY_RESTRAINED) {
      return this.triggerViolation(
        "Opened boot inspection/cleanout door on an unisolated or unrestrained elevator! Sudden start or reverse runback hazard present.",
        "OSHA 1910.272(e) & SAGMA Mod 2 Sec 1.1.1"
      );
    }
    this.bootAccessPanelOpen = true;
    this.guardsClosedAndSecured = false;
    this.log("Boot cleanout hatch unbolted and opened. Grain choke mass exposed.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Boot Cleanout Panel Opened",
      message: "Boot chamber accessible under verified zero energy. Ready for clearing.",
      oshaRef: "SAGMA Wheat/Maize Module 2 Sec 1.1.1"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Clear Choke Using Hands (FATAL ERROR IN SAGMA)
   */
  actionClearChokeWithHands() {
    return this.triggerViolation(
      "CRITICAL SAFETY VIOLATION: NEVER use hands to scrape stock from under the boot! Even with isolation, if runback restraint fails, sharp bucket edges will cause severe lacerations or traumatic amputation.",
      "SAGMA Wheat & Maize Module 2 Section 1.1.1 [4]"
    );
  }

  /**
   * Action: Clear Choke Using Wooden / Timber Rod or Cane (SAGMA Approved)
   */
  actionClearChokeWithWoodenRod() {
    if (!this.bootAccessPanelOpen) {
      return this.rejectAction("Boot access panel is still closed. Open the cleanout door first.");
    }
    if (this.getEnergyState() !== EnergyState.GRAVITY_RESTRAINED) {
      return this.triggerViolation(
        "Attempted to insert tool into boot while electrical isolation or gravitational runback restraint is incomplete!",
        "OSHA 1910.147 & SAGMA Mod 2 Sec 1.1.1"
      );
    }
    this.chokeCleared = true;
    this.state = MachineState.CLEARED_REASSEMBLING;
    this.log("Choked grain loosened and extracted from boot using approved timber clearing cane.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Choke Cleared via Timber Rod",
      message: "Approved non-sparking wooden rod used from outside the pinch zone. Packed grain removed from around boot pulley drum and lower buckets. Band is free to rotate without mechanical binding.",
      oshaRef: "SAGMA Wheat/Maize Module 2 Sec 1.1.1 [4]"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Close and Bolt Inspection / Cleanout Panels
   */
  actionCloseGuardsAndPanels() {
    if (!this.chokeCleared && this.scenario === ScenarioType.BOOT_CHOKE) {
      return this.rejectAction("Cannot close panels while boot choke remains unaddressed.");
    }
    this.bootAccessPanelOpen = false;
    this.headInspectionDoorOpen = false;
    this.guardsClosedAndSecured = true;
    this.log("All inspection doors and boot cleanout hatches bolted securely in place.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Enclosure Secured",
      message: "Airtight casing re-established. Dust containment and pinch point guarding restored.",
      oshaRef: "OSHA 1910.212 & ISO 14120"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Release Mechanical Belt Clamp / Anti-Runback Backstop
   */
  actionReleaseMechanicalBackstop() {
    if (!this.guardsClosedAndSecured) {
      return this.triggerViolation(
        "Attempting to release belt mechanical lock while inspection panels remain open! Risk of hands or clothing caught if band shifts.",
        "OSHA 1910.212"
      );
    }
    this.mechanicalBackstopSecured = false;
    this.log("Mechanical belt clamp removed; anti-runback automatic sprag clutch returned to operational state.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Mechanical Lock Released",
      message: "Elevator conveying belt free for normal forward travel.",
      oshaRef: "ISO 14118 Sec 6"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Remove Electrical LOTO (De-isolation)
   */
  actionRemoveElectricalLOTO() {
    if (!this.guardsClosedAndSecured) {
      return this.triggerViolation(
        "Cannot remove LOTO padlocks while guards or inspection doors are open!",
        "OSHA 1910.147(e)(1)"
      );
    }
    if (this.mechanicalBackstopSecured) {
      return this.rejectAction("Remove mechanical belt clamps before restoring electrical power to avoid motor overload on start.");
    }
    this.breakerLocked = false;
    this.breakerTagged = false;
    this.state = MachineState.DEISOLATING;
    this.log("LOTO padlock and tag removed. Breaker re-energized by authorized technician.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Electrical Supply Restored",
      message: "Control panel powered. Area clear of personnel.",
      oshaRef: "OSHA 1910.147(e)(2)"
    };
    return this.lastFeedback;
  }

  /**
   * Action: Controlled Restart & Infeed Open
   */
  actionPerformRestart() {
    if (this.state !== MachineState.DEISOLATING) {
      return this.rejectAction("Cannot start machine until full de-isolation sequence is completed.");
    }
    this.state = MachineState.NORMAL_RUNNING;
    this.log("Elevator started empty. Normal speed verified at 2.80 m/s (136.8 RPM). Intake slide reopened.", 'ACTION');
    this.lastFeedback = {
      success: true,
      title: "Restart Successful",
      message: "Bucket elevator operational. Verified free tracking on crowned head pulley and normal motor load. Grain infeed resumed.",
      oshaRef: "SAGMA Module 2 Sec 1.1.1 & OSHA 1910.272"
    };
    return this.lastFeedback;
  }

  /**
   * Handling Safety Violations
   */
  triggerViolation(reason, citation) {
    this.state = MachineState.INCIDENT_HALT;
    this.log(`SAFETY INCIDENT: ${reason} [${citation}]`, 'ERROR');
    this.lastFeedback = {
      success: false,
      title: "CRITICAL SAFETY VIOLATION",
      message: reason,
      citation: citation,
      oshaRef: citation,
      canRetry: true
    };
    return this.lastFeedback;
  }

  rejectAction(reason) {
    this.log(`Action rejected: ${reason}`, 'WARN');
    this.lastFeedback = {
      success: false,
      title: "Action Not Permitted",
      message: reason,
      canRetry: false
    };
    return this.lastFeedback;
  }
}
