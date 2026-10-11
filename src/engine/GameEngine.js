/**
 * Bucket Elevator Master - Student-Friendly Gamification & Learning Engine
 * 
 * Game Modes:
 * - Mode 1: Easy Mode (Guided Practice) -> Gives part names, hints, beacon arrow, and guide button.
 * - Mode 2: Challenge Mode (Millwright Exam) -> No part names in prompt, no beacon arrow, no cheats!
 * 
 * Features:
 * - Generous XP rewards (+250 XP in Easy, +400 XP in Challenge)
 * - Streak multipliers (+50 XP per streak)
 * - 5 Unlockable Achievement Badges
 * - Silo Sizing Challenge (+400 XP)
 * - OSHA/ISO Zero-Harm LOTO Resolution (+500 XP)
 */

export class GameEngine {
  constructor(audioEngine, onStateChangeCallback) {
    this.audio = audioEngine;
    this.onStateChange = onStateChangeCallback;

    this.xp = 0;
    this.level = 1;
    this.levelTitle = "Apprentice Operator";
    this.currentQuestIndex = 0;
    this.score = 0;
    this.streak = 0;

    this.difficulty = "easy"; // "easy" (Mode 1) | "challenge" (Mode 2)
    this.activeMode = "hunt";

    // 8 Core Component Quests with Dual (Easy vs Challenge) Prompts
    this.componentQuests = [
      {
        id: "hunt_pulley",
        // Easy Mode: Gives the part name directly
        easyTitle: "Mission 1: Head Drive Pulley",
        easyPrompt: "Find and click the Crowned Head Drive Pulley (391 mm) at the top of the elevator.",
        // Challenge Mode: Describes mechanical function WITHOUT giving away the name
        challengeTitle: "Challenge 1: Pulley Self-Centering Mechanics",
        challengePrompt: "Identify the upper rotating cylinder machined with a convex crown (camber) to generate self-centering forces on the belt.",
        areaPreset: "head",
        targetKeywords: ["Pulley_Head", "Pulley", "Head_Drive", "Shaft_Drive", "Head_PillowBlock"],
        primaryMesh: "Pulley_Head_Drive_Crowned",
        source: "SAGMA Wheat/Maize Module 2 Section 1.1.1",
        rewardEasyXP: 250,
        rewardChallengeXP: 400,
        hint: "Look for the large cylindrical drum inside the head housing that drives the belt."
      },
      {
        id: "hunt_belt",
        easyTitle: "Mission 2: Antistatic Conveyor Belt",
        easyPrompt: "Click on the Antistatic Rubber Belt (DIN 22104) that carries the buckets vertically.",
        challengeTitle: "Challenge 2: Conveyor Belt Safety Standard",
        challengePrompt: "Click on the continuous vertical conveying element compliant with DIN 22104 required to dissipate electrostatic charge in grain dust atmospheres.",
        areaPreset: "legs",
        targetKeywords: ["Belt_Strand", "Belt_Arc", "Belt"],
        primaryMesh: "Belt_Strand_UpLeg",
        source: "SAGMA Diagram 69(b) [Leg Callout]",
        rewardEasyXP: 250,
        rewardChallengeXP: 400,
        hint: "The wide continuous black rubber band running through both casing trunking legs."
      },
      {
        id: "hunt_tensioner",
        easyTitle: "Mission 3: Boot Take-Up Tensioner",
        easyPrompt: "Locate the Twin Screw Take-Up Tensioner at the bottom boot casing used to adjust belt tracking.",
        challengeTitle: "Challenge 3: Slack & Belt Tracking Adjustment",
        challengePrompt: "Locate the mechanical adjustment mechanism at the elevator base used to align the boot shaft and eliminate belt slack.",
        areaPreset: "boot",
        targetKeywords: ["Boot_TakeUp_Screw", "Boot_TakeUp", "Screw", "Tension", "Shaft_Boot", "SlidingBlock"],
        primaryMesh: "Boot_TakeUp_Screw_L",
        source: "SAGMA Wheat/Maize Module 2 Section 1.1.1 & Diagram 69b",
        rewardEasyXP: 250,
        rewardChallengeXP: 400,
        hint: "Look near the lower boot casing for the vertical golden threaded tension rods and bearing slides."
      },
      {
        id: "hunt_saddle",
        easyTitle: "Mission 4: Centrifugal Discharge Saddle",
        easyPrompt: "Click on the Centrifugal Discharge Spout & Saddle that directs grain into the outlet pipe.",
        challengeTitle: "Challenge 4: Tangential Material Trajectory",
        challengePrompt: "Find the curved aerodynamic guide located beneath the head pulley specifically installed for centrifugal grain discharge.",
        areaPreset: "spout",
        targetKeywords: ["Casing_Head_Lower_With_Saddle", "Saddle", "Discharge_Spout", "Spout", "Deflector"],
        primaryMesh: "Discharge_Spout_Centrifugal",
        source: "SAGMA Diagram 69(b) [Head Callout]",
        rewardEasyXP: 250,
        rewardChallengeXP: 400,
        hint: "The angled chute protruding from the head section where grain discharges centrifugally."
      },
      {
        id: "hunt_cleanout",
        easyTitle: "Mission 5: Tool-Operated Cleanout Door",
        easyPrompt: "Find the Cleanout Door at the base of the boot used for clearing chokes with a wooden rod.",
        challengeTitle: "Challenge 5: Confined Sump Access & LOTO",
        challengePrompt: "Identify the bolted access panel at the boot that must strictly be opened only under zero-energy isolation to clear chokes.",
        areaPreset: "boot",
        targetKeywords: ["Boot_Cleanout_Door", "Cleanout", "Inspection_Door", "Door"],
        primaryMesh: "Boot_Cleanout_Door_Front",
        source: "SAGMA Diagram 69(b) [Safety Note]",
        rewardEasyXP: 250,
        rewardChallengeXP: 400,
        hint: "The dark rectangular access hatch near the base of the boot chamber, secured with tool-operated bolts."
      },
      {
        id: "hunt_motor",
        easyTitle: "Mission 6: Drive Motor & Platform",
        easyPrompt: "Identify the Electric Motor and Gearbox that powers the elevator drive shaft.",
        challengeTitle: "Challenge 6: Primary Mechanical Power Unit",
        challengePrompt: "Locate the primary mechanical drive unit mounted on the elevated upper platform that provides rotational torque to the head shaft.",
        areaPreset: "head",
        targetKeywords: ["Drive_Electric_Motor", "Motor", "Gearbox", "Drive_Motor_Mounting_Platform"],
        primaryMesh: "Drive_Electric_Motor_Gearbox",
        source: "SAGMA Diagram 69(b) [Head Drive]",
        rewardEasyXP: 250,
        rewardChallengeXP: 400,
        hint: "The green cylindrical motor and gear reduction unit mounted on the elevated head bracket."
      },
      {
        id: "hunt_sensor",
        easyTitle: "Mission 7: Thermal & Belt Slip Sensor",
        easyPrompt: "Click on the OSHA-required Electronic Thermal/Speed Sensor mounted at the head bearing.",
        challengeTitle: "Challenge 7: Frictional Ignition Hazard Protection",
        challengePrompt: "Identify the OSHA 1910.272 mandated monitoring device designed to detect belt slippage and prevent frictional heating fires.",
        areaPreset: "head",
        targetKeywords: ["Sensor_Head_Thermal", "Sensor", "Slip_Detector"],
        primaryMesh: "Sensor_Head_Thermal_Slip_Detector",
        source: "OSHA 1910.272 / SAGMA Wheat Mod 2 Sec 1.1.1",
        rewardEasyXP: 250,
        rewardChallengeXP: 400,
        hint: "The small gold sensor boss located right beside the head bearing pillow block."
      },
      {
        id: "hunt_viewport",
        easyTitle: "Mission 8: Up-Leg Inspection Viewport",
        easyPrompt: "Find the Eye-Level Inspection Port on the Up-Leg trunking used for visual grain monitoring.",
        challengeTitle: "Challenge 8: In-Flight Stock Monitoring",
        challengePrompt: "Locate the observation viewport positioned on the ascending leg casing at human eye-level (1.8m) used to monitor bucket filling.",
        areaPreset: "inspection",
        targetKeywords: ["Inspection_Door_UpLeg", "Inspection_Viewport", "Viewport", "Hatch"],
        primaryMesh: "Inspection_Door_UpLeg_EyeLevel",
        source: "SAGMA Diagram 69(b) [Leg Callout]",
        rewardEasyXP: 250,
        rewardChallengeXP: 400,
        hint: "The inspection opening on the ascending leg trunking, positioned approximately 1.8m above ground."
      }
    ];

    // Achievement Badges System
    this.achievements = [
      { id: "first_find", title: "Apprentice Scout", desc: "Successfully identify your first 3D component", icon: "🎓", unlocked: false },
      { id: "eagle_eye", title: "Eagle Eye Millwright", desc: "Identify 5 components in the 3D elevator", icon: "👁️", unlocked: false },
      { id: "all_parts", title: "Diagram 69(b) Master", desc: "Identify all 8 components across boot, leg, and head", icon: "👑", unlocked: false },
      { id: "challenge_hero", title: "Exam Champion", desc: "Complete all challenges in Mode 2 without hints", icon: "⭐", unlocked: false },
      { id: "loto_hero", title: "Zero Harm Hero", desc: "Safely isolate and clear a boot choke with 0 safety violations", icon: "🛡️", unlocked: false },
      { id: "sizing_pro", title: "Process Engineer", desc: "Successfully balance the 75 t/h silo intake throughput challenge", icon: "⚙️", unlocked: false }
    ];

    // Sizing Challenge Target Criteria (SAGMA Module 8)
    this.sizingChallenge = {
      targetCapacityMin_th: 75.0,
      targetCapacityMax_th: 80.0,
      maxMotorPower_kW: 7.0,
      completed: false,
      rewardXP: 400
    };
  }

  setDifficulty(diff) {
    if (diff === "easy" || diff === "challenge") {
      this.difficulty = diff;
      this.currentQuestIndex = 0;
      this.streak = 0;
      this.notifyState();
    }
  }

  getCurrentQuest() {
    const raw = this.componentQuests[this.currentQuestIndex];
    if (!raw) return null;

    const isEasy = (this.difficulty === "easy");
    return {
      id: raw.id,
      title: isEasy ? raw.easyTitle : raw.challengeTitle,
      prompt: isEasy ? raw.easyPrompt : raw.challengePrompt,
      source: raw.source,
      areaPreset: raw.areaPreset,
      targetKeywords: raw.targetKeywords,
      primaryMesh: raw.primaryMesh,
      rewardXP: isEasy ? raw.rewardEasyXP : raw.rewardChallengeXP,
      hint: raw.hint,
      isEasy: isEasy,
      allowBeacon: isEasy,
      allowGuide: isEasy
    };
  }

  evaluate3DClick(meshName, allIntersects = []) {
    if (this.activeMode !== "hunt") return null;

    const quest = this.getCurrentQuest();
    if (!quest) return null;

    let isMatch = false;
    let matchedName = meshName;

    // 1. Check primary mesh name
    const nameLower = meshName.toLowerCase();
    if (quest.targetKeywords.some((kw) => nameLower.includes(kw.toLowerCase()))) {
      isMatch = true;
      matchedName = meshName;
    }

    // 2. Tolerant check: check all intersected objects in ray
    if (!isMatch && allIntersects && allIntersects.length > 0) {
      for (const hit of allIntersects) {
        const hitName = (hit.object && hit.object.name) ? hit.object.name.toLowerCase() : "";
        if (quest.targetKeywords.some((kw) => hitName.includes(kw.toLowerCase()))) {
          isMatch = true;
          matchedName = hit.object.name;
          break;
        }
      }
    }

    if (isMatch) {
      const streakBonus = this.streak * 50;
      const totalEarned = quest.rewardXP + streakBonus;
      this.xp += totalEarned;
      this.score += 200 + streakBonus;
      this.streak++;
      this.checkLevelUp();
      this.checkAchievements();
      this.audio.playSuccess();

      const result = {
        success: true,
        questTitle: quest.title,
        message: quest.isEasy
          ? `PERFECT! Identified: ${matchedName.replace(/_/g, ' ')}. +${totalEarned} XP Awarded!`
          : `CORRECT ANSWER! Technical component validated: ${matchedName.replace(/_/g, ' ')}. +${totalEarned} XP!`,
        source: quest.source,
        xpAwarded: totalEarned,
        streak: this.streak,
        matchedMesh: matchedName,
        isEasy: quest.isEasy
      };

      this.currentQuestIndex++;
      this.notifyState();
      return result;
    } else {
      this.streak = 0;
      this.audio.playViolation();
      const result = {
        success: false,
        questTitle: quest.title,
        message: quest.isEasy
          ? `That's the ${meshName.replace(/_/g, ' ')}. Look for: ${quest.hint}`
          : `Incorrect component selected. Re-read the technical function and try again.`,
        hint: quest.isEasy ? quest.hint : null,
        isEasy: quest.isEasy
      };
      this.notifyState();
      return result;
    }
  }

  // Student-friendly "Guide Me" helper (Only available in Mode 1: Easy)
  guideMe() {
    const quest = this.getCurrentQuest();
    if (!quest || !quest.allowGuide) return null;

    const xpEarned = 100;
    this.xp += xpEarned;
    this.checkLevelUp();
    this.checkAchievements();
    this.audio.playSuccess();

    const result = {
      success: true,
      isGuided: true,
      targetMesh: quest.primaryMesh,
      areaPreset: quest.areaPreset,
      message: `Guided Discovery: Target located! +${xpEarned} XP Awarded.`,
      xpAwarded: xpEarned
    };

    this.currentQuestIndex++;
    this.notifyState();
    return result;
  }

  // Evaluate Silo Sizing Challenge
  evaluateSizing(calcResults) {
    if (this.sizingChallenge.completed) return null;

    const cap = calcResults.capacity_t_per_h;
    const motor = calcResults.estimatedMotorPower_kW;

    if (cap >= this.sizingChallenge.targetCapacityMin_th && 
        cap <= this.sizingChallenge.targetCapacityMax_th && 
        motor <= this.sizingChallenge.maxMotorPower_kW) {
      
      this.sizingChallenge.completed = true;
      this.xp += this.sizingChallenge.rewardXP;
      this.checkLevelUp();
      this.unlockAchievement("sizing_pro");
      this.audio.playSuccess();

      this.notifyState();
      return {
        success: true,
        message: `CHALLENGE SOLVED! Throughput: ${cap.toFixed(1)} t/h with ${motor.toFixed(2)} kW motor. +${this.sizingChallenge.rewardXP} XP!`,
        xpAwarded: this.sizingChallenge.rewardXP
      };
    }
    return null;
  }

  checkAchievements() {
    if (this.currentQuestIndex >= 1) this.unlockAchievement("first_find");
    if (this.currentQuestIndex >= 5) this.unlockAchievement("eagle_eye");
    if (this.currentQuestIndex >= this.componentQuests.length) {
      this.unlockAchievement("all_parts");
      if (this.difficulty === "challenge") {
        this.unlockAchievement("challenge_hero");
      }
    }
  }

  unlockAchievement(achId) {
    const ach = this.achievements.find(a => a.id === achId);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      this.xp += 150;
      this.audio.playSuccess();
      return ach;
    }
    return null;
  }

  checkLevelUp() {
    const oldLevel = this.level;
    if (this.xp >= 1800) {
      this.level = 5;
      this.levelTitle = "Master Millwright";
    } else if (this.xp >= 1200) {
      this.level = 4;
      this.levelTitle = "Process Engineer";
    } else if (this.xp >= 700) {
      this.level = 3;
      this.levelTitle = "Maintenance Specialist";
    } else if (this.xp >= 300) {
      this.level = 2;
      this.levelTitle = "Silo Technician";
    } else {
      this.level = 1;
      this.levelTitle = "Apprentice Operator";
    }

    if (this.level > oldLevel) {
      this.audio.playSuccess();
      return { levelUp: true, level: this.level, title: this.levelTitle };
    }
    return null;
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        xp: this.xp,
        level: this.level,
        levelTitle: this.levelTitle,
        difficulty: this.difficulty,
        currentQuest: this.getCurrentQuest(),
        currentQuestIndex: this.currentQuestIndex,
        totalQuests: this.componentQuests.length,
        achievements: this.achievements,
        sizingChallenge: this.sizingChallenge,
        isComplete: this.currentQuestIndex >= this.componentQuests.length
      });
    }
  }
}
