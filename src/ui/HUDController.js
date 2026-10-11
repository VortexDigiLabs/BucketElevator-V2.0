/**
 * Bucket Elevator Master - Student-Friendly HUD Controller
 * Features:
 * - Mode 1 (Easy / Guided Practice) vs Mode 2 (Challenge / Millwright Exam without answers)
 * - 3D Numbered Part Labels toggle (Show/Hide)
 * - Show/Hide HUD text elements toggle
 * - Clean Web Audio feedback (zero motor hum drone)
 * - Auto-focusing & 3D Beacon guidance for Mode 1
 * - Tolerant multi-hit click evaluation with background penetration fix
 * - Floating animated XP toast notifications
 * - Achievement Badges Ribbon
 * - Silo Sizing Challenge integration (+400 XP)
 * - Emergency Choke LOTO Zero-Harm integration (+500 XP)
 */

import { ELEVATOR_CONFIG } from '../config.js';
import { SagmaCalculationEngine, CarlosThirdPhysicsEngine } from '../engine/CalculationEngine.js';
import { SafetyStateMachine, MachineState, ScenarioType } from '../engine/SafetyStateMachine.js';
import { AudioEngine } from '../engine/AudioEngine.js';
import { GameEngine } from '../engine/GameEngine.js';

export class HUDController {
  constructor(sceneManager, webxrManager) {
    this.sceneManager = sceneManager;
    this.webxrManager = webxrManager;

    this.audio = new AudioEngine();
    this.game = new GameEngine(this.audio, (state) => this.onGameStateChanged(state));
    this.safetyMachine = new SafetyStateMachine(ScenarioType.BOOT_CHOKE);

    this.activeTab = 'game';
    this.safetyViolationsCount = 0;

    this.calcInputs = {
      beltSpeed_m_per_min: 110,
      bucketPitch_m: 0.30,
      materialMassPerBucket_kg: 3.5,
      liftHeight_m: 20.0,
      efficiency: 0.70
    };

    this.init();
  }

  init() {
    this.bindTabNavigation();
    this.bindModeSelector();
    this.bind3DLabelsToggle();
    this.bindHudDetailsToggle();
    this.renderGameQuestPanel();
    this.renderTourList();
    this.bindCalculationSliders();
    this.renderSafetyScenario();
    this.bindQuickControls();
    this.bindAccessibility();
    this.bindKeyboardShortcuts();
    this.updateCalculations();
    this.updatePlayerStatsHUD();
    this.renderAchievements();

    // Bind 3D raycast click handler with multi-intersects awareness
    this.sceneManager.onSelect = (mesh, allIntersects) => this.handle3DMeshClick(mesh, allIntersects);
  }

  bindModeSelector() {
    const easyBtn = document.getElementById('btn-mode-easy');
    const challengeBtn = document.getElementById('btn-mode-challenge');

    if (easyBtn && challengeBtn) {
      easyBtn.onclick = () => {
        this.audio.playClick();
        easyBtn.classList.add('active');
        challengeBtn.classList.remove('active');
        this.game.setDifficulty('easy');
        this.renderGameQuestPanel();
      };
      challengeBtn.onclick = () => {
        this.audio.playClick();
        challengeBtn.classList.add('active');
        easyBtn.classList.remove('active');
        this.game.setDifficulty('challenge');
        this.renderGameQuestPanel();
      };
    }
  }

  bind3DLabelsToggle() {
    const toggleBtn = document.getElementById('btn-toggle-3d-labels');
    const questToggleBtn = document.getElementById('btn-quest-toggle-labels');

    const updateBtns = (mode) => {
      let txt = "🏷️ Labels: ALL (Staggered)";
      if (mode === 'focused') txt = "🎯 Labels: FOCUSED (Selected Part)";
      if (mode === 'off') txt = "❌ Labels: OFF";

      if (toggleBtn) {
        toggleBtn.innerText = txt;
        toggleBtn.classList.toggle('active', mode !== 'off');
      }
      if (questToggleBtn) {
        questToggleBtn.innerText = txt;
        questToggleBtn.classList.toggle('active', mode !== 'off');
      }
    };

    if (toggleBtn) {
      toggleBtn.onclick = () => {
        this.audio.playClick();
        const mode = this.sceneManager.toggleLabels();
        updateBtns(mode);
      };
    }

    if (questToggleBtn) {
      questToggleBtn.onclick = () => {
        this.audio.playClick();
        const mode = this.sceneManager.toggleLabels();
        updateBtns(mode);
      };
    }
  }

  bindHudDetailsToggle() {
    const btn = document.getElementById('btn-toggle-hud-text');
    const hudContainer = document.querySelector('.tab-container');
    if (btn && hudContainer) {
      btn.onclick = () => {
        this.audio.playClick();
        const isHidden = (hudContainer.style.display === 'none');
        hudContainer.style.display = isHidden ? 'block' : 'none';
        btn.innerText = isHidden ? "👁️ Hide Details" : "👁️ Show Details";
        btn.classList.toggle('active', !isHidden);
      };
    }
  }

  handle3DMeshClick(mesh, allIntersects = []) {
    this.audio.playSelect();

    if (this.activeTab === 'game') {
      const result = this.game.evaluate3DClick(mesh.name, allIntersects);
      if (result) {
        this.displayQuestFeedback(result);
        if (result.success) {
          const partLabel = result.matchedMesh ? result.matchedMesh.replace(/_/g, ' ') : mesh.name.replace(/_/g, ' ');
          this.triggerFloatingXP(result.xpAwarded, `Validated: ${partLabel}`);
          this.sceneManager.hideMissionBeacon();
        }
      }
    }

    const callout = ELEVATOR_CONFIG.diagram69bCallouts.find(
      (c) => c.meshTarget === mesh.name || mesh.name.includes(c.meshTarget)
    );
    if (callout) {
      document.querySelectorAll('.tour-card').forEach((c) => c.classList.remove('active'));
      const card = document.getElementById(`tour-card-${callout.id}`);
      if (card) {
        card.classList.add('active');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (this.webxrManager) {
        this.webxrManager.updateSpatialHUD(`[${callout.tag}] ${callout.title}`, callout.desc);
      }
    }
  }

  triggerFloatingXP(xpAmount, label = "") {
    const toast = document.createElement('div');
    toast.className = 'xp-floating-toast';
    toast.innerHTML = `
      <div class="xp-val">+${xpAmount} XP</div>
      <div class="xp-lbl">${label}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2000);
  }

  bindTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.audio.playClick();
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

        const target = e.currentTarget;
        target.classList.add('active');
        const tabKey = target.dataset.tab;
        this.activeTab = tabKey;
        const panel = document.getElementById(`panel-${tabKey}`);
        if (panel) panel.classList.add('active');

        // Tab contextual camera framing
        if (tabKey === 'game') {
          const quest = this.game.getCurrentQuest();
          if (quest) {
            this.sceneManager.activeQuestKeywords = quest.targetKeywords;
            if (quest.isEasy) {
              this.sceneManager.showMissionBeacon(quest.primaryMesh, quest.targetKeywords, true);
              if (quest.areaPreset) this.sceneManager.focusPreset(quest.areaPreset);
            } else {
              this.sceneManager.showMissionBeacon(quest.primaryMesh, quest.targetKeywords, false);
            }
          }
        } else if (tabKey === 'safety') {
          this.sceneManager.hideMissionBeacon();
          this.sceneManager.focusPreset('boot');
        } else if (tabKey === 'calc') {
          this.sceneManager.hideMissionBeacon();
          this.sceneManager.focusPreset('full');
        } else {
          this.sceneManager.hideMissionBeacon();
        }
      });
    });
  }

  renderGameQuestPanel() {
    const quest = this.game.getCurrentQuest();
    const titleEl = document.getElementById('quest-mission-title');
    const promptEl = document.getElementById('quest-mission-prompt');
    const sourceEl = document.getElementById('quest-mission-source');
    const hintBox = document.getElementById('quest-hint-box');
    const actionBtns = document.getElementById('quest-action-buttons');
    const missionCounterEl = document.getElementById('quest-mission-counter');
    const modeBadgeEl = document.getElementById('quest-mode-badge');

    if (modeBadgeEl) {
      modeBadgeEl.innerText = quest && quest.isEasy ? "MODE 1: GUIDED PRACTICE" : "MODE 2: TECHNICAL EXAM";
      modeBadgeEl.style.background = quest && quest.isEasy ? "var(--sagma-green)" : "#b91c1c";
    }

    if (missionCounterEl) {
      missionCounterEl.innerText = quest ? `Step ${this.game.currentQuestIndex + 1} of ${this.game.componentQuests.length}` : 'Completed';
    }

    if (quest) {
      if (titleEl) titleEl.innerText = quest.title;
      if (promptEl) promptEl.innerText = quest.prompt;
      if (sourceEl) sourceEl.innerText = `Reference: ${quest.source} (+${quest.rewardXP} XP)`;
      if (hintBox) hintBox.style.display = 'none';

      if (quest.isEasy) {
        // Mode 1: Easy - show 3D arrow beacon and swoop camera to area
        this.sceneManager.activeQuestKeywords = quest.targetKeywords;
        this.sceneManager.showMissionBeacon(quest.primaryMesh, quest.targetKeywords, true);
        if (quest.areaPreset) {
          this.sceneManager.focusPreset(quest.areaPreset);
        }

        // Action buttons: Focus Area, Show Beacon, Hint, Guide Me, and Labels Toggle
        if (actionBtns) {
          actionBtns.innerHTML = `
            <button class="btn btn-sm" id="btn-quest-area" style="background:#ffffff; border-color:var(--sagma-green); color:var(--sagma-green-dark); font-weight:700;">
              🔍 Focus Camera
            </button>
            <button class="btn btn-sm" id="btn-quest-beacon" style="background:#ffffff; border-color:var(--sagma-gold); color:var(--sagma-brown); font-weight:700;">
              🎯 Show Beacon
            </button>
            <button class="btn btn-sm" id="btn-quest-hint" style="background:#ffffff; border-color:var(--sagma-gold); color:var(--sagma-brown); font-weight:700;">
              💡 Hint
            </button>
            <button class="btn btn-sm" id="btn-quest-guide" style="background:var(--sagma-gold-light); border-color:var(--sagma-gold); color:var(--sagma-brown); font-weight:800;">
              ✨ Guide Me (+100 XP)
            </button>
            <button class="btn btn-sm" id="btn-quest-toggle-labels" style="background:#ffffff; border-color:var(--sagma-green); color:var(--sagma-green-dark); font-weight:700;">
              ${this.sceneManager.areLabelsVisible ? "🏷️ 3D Labels: ON" : "🏷️ 3D Labels: OFF"}
            </button>
          `;

          document.getElementById('btn-quest-area').onclick = () => {
            this.audio.playClick();
            this.sceneManager.focusPreset(quest.areaPreset);
          };

          document.getElementById('btn-quest-beacon').onclick = () => {
            this.audio.playClick();
            this.sceneManager.showMissionBeacon(quest.primaryMesh, quest.targetKeywords, true);
            this.sceneManager.focusPreset(quest.areaPreset);
          };

          document.getElementById('btn-quest-hint').onclick = () => {
            this.audio.playClick();
            if (hintBox) {
              hintBox.style.display = 'block';
              hintBox.innerHTML = `<strong>💡 Student Hint:</strong> ${quest.hint}`;
            }
          };

          document.getElementById('btn-quest-guide').onclick = () => {
            const res = this.game.guideMe();
            if (res) {
              this.sceneManager.focusAndHighlight(res.targetMesh, true);
              this.triggerFloatingXP(100, `Guided: ${res.targetMesh.replace(/_/g, ' ')}`);
              this.sceneManager.hideMissionBeacon();
              this.displayQuestFeedback({
                success: true,
                questTitle: quest.title,
                message: `GUIDED DISCOVERY! Target identified: ${res.targetMesh.replace(/_/g, ' ')}. +100 XP Awarded!`,
                isGuided: true
              });
            }
          };

          this.bind3DLabelsToggle();
        }
      } else {
        // Mode 2: Challenge / Exam - NO beacon, NO cheats, NO answer in prompt!
        this.sceneManager.activeQuestKeywords = quest.targetKeywords;
        this.sceneManager.showMissionBeacon(quest.primaryMesh, quest.targetKeywords, false);

        if (actionBtns) {
          actionBtns.innerHTML = `
            <button class="btn btn-sm" id="btn-quest-full" style="background:#ffffff; border-color:var(--sagma-green); color:var(--sagma-green-dark); font-weight:700;">
              🌐 Full 9.6m View
            </button>
            <button class="btn btn-sm" id="btn-quest-toggle-labels" style="background:#ffffff; border-color:var(--sagma-green); color:var(--sagma-green-dark); font-weight:700;">
              ${this.sceneManager.areLabelsVisible ? "🏷️ 3D Labels: ON" : "🏷️ 3D Labels: OFF"}
            </button>
          `;

          document.getElementById('btn-quest-full').onclick = () => {
            this.audio.playClick();
            this.sceneManager.focusPreset('full');
          };

          this.bind3DLabelsToggle();
        }
      }
    } else {
      if (titleEl) titleEl.innerText = "🏆 All Challenges Complete!";
      if (promptEl) promptEl.innerText = this.game.difficulty === "easy"
        ? "Outstanding work! You have successfully mastered all Diagram 69(b) component identification challenges."
        : "EXEMPLARY ACHIEVEMENT! You conquered the Millwright Technical Exam in Challenge Mode without hints!";
      if (sourceEl) sourceEl.innerText = "Status: Master Millwright Level Achieved";
      if (actionBtns) {
        actionBtns.innerHTML = `
          <button class="btn btn-full" id="btn-restart-quests" style="background:var(--sagma-green); color:#fff; font-weight:700;">
            🔄 Play Again (+More XP)
          </button>
        `;
        document.getElementById('btn-restart-quests').onclick = () => {
          this.game.currentQuestIndex = 0;
          this.renderGameQuestPanel();
        };
      }
    }

    this.renderAchievements();
  }

  displayQuestFeedback(result) {
    const fbBox = document.getElementById('quest-feedback-box');
    if (!fbBox) return;

    fbBox.style.display = 'block';
    fbBox.className = `quest-feedback-card ${result.success ? 'feedback-success' : 'feedback-error'}`;
    fbBox.innerHTML = `
      <div style="font-weight:800; font-size:13.5px; margin-bottom:4px;">
        ${result.success ? '🎉 CHALLENGE VALIDATED!' : '⚠️ TRY AGAIN'}
      </div>
      <p style="font-size:12px; line-height:1.45;">${result.message}</p>
      ${result.streak > 1 ? `<div style="font-size:11px; font-weight:800; color:var(--sagma-green); margin-top:4px;">🔥 Streak: ${result.streak}x (+${result.streak * 50} bonus XP)</div>` : ''}
      ${result.hint ? `<div style="font-size:11px; margin-top:5px; color:#b45309;"><strong>Hint:</strong> ${result.hint}</div>` : ''}
    `;

    if (result.success) {
      setTimeout(() => {
        this.renderGameQuestPanel();
        fbBox.style.display = 'none';
      }, 2200);
    }
  }

  renderAchievements() {
    const container = document.getElementById('achievements-ribbon');
    if (!container) return;
    container.innerHTML = '';

    this.game.achievements.forEach((ach) => {
      const badge = document.createElement('div');
      badge.className = `achievement-badge ${ach.unlocked ? 'unlocked' : 'locked'}`;
      badge.title = `${ach.title}: ${ach.desc}`;
      badge.innerHTML = `
        <span class="ach-icon">${ach.unlocked ? ach.icon : '🔒'}</span>
        <span class="ach-title">${ach.title}</span>
      `;
      container.appendChild(badge);
    });
  }

  onGameStateChanged(state) {
    this.updatePlayerStatsHUD();
    this.renderAchievements();
  }

  updatePlayerStatsHUD() {
    const xpEl = document.getElementById('player-xp-val');
    const levelEl = document.getElementById('player-level-badge');
    const progressEl = document.getElementById('player-xp-progress');

    if (xpEl) xpEl.innerText = `${this.game.xp} XP`;
    if (levelEl) levelEl.innerText = `Lv.${this.game.level}: ${this.game.levelTitle}`;
    if (progressEl) {
      const pct = Math.min(100, (this.game.xp / 1800) * 100);
      progressEl.style.width = `${pct}%`;
    }
  }

  renderTourList() {
    const list = document.getElementById('tour-item-list');
    if (!list) return;
    list.innerHTML = '';

    ELEVATOR_CONFIG.diagram69bCallouts.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'tour-card';
      card.id = `tour-card-${item.id}`;
      card.innerHTML = `
        <div class="tour-header">
          <span class="tour-tag">[${item.tag}]</span>
          <span class="tour-title">${item.title}</span>
        </div>
        <div style="font-size:10px; font-weight:700; color:var(--sagma-green); text-transform:uppercase; margin-bottom:2px;">
          ${item.section || 'SPECIFICATION'}
        </div>
        <div class="tour-source">${item.source}</div>
        <p class="tour-desc">${item.desc}</p>
      `;

      card.addEventListener('click', () => {
        this.audio.playSelect();
        document.querySelectorAll('.tour-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');

        if (this.sceneManager.model) {
          const mesh = this.sceneManager.model.getObjectByName(item.meshTarget);
          if (mesh) {
            this.sceneManager.highlightObject(mesh, true);
          } else {
            if (item.id.includes('boot') || item.id.includes('cleanout')) this.sceneManager.focusPreset('boot');
            else if (item.id.includes('trunking') || item.id.includes('frame')) this.sceneManager.focusPreset('legs');
            else this.sceneManager.focusPreset('head');
          }
        }

        if (this.webxrManager) {
          this.webxrManager.updateSpatialHUD(`[${item.tag}] ${item.title}`, item.desc);
        }
      });

      list.appendChild(card);
    });
  }

  bindCalculationSliders() {
    const sliders = [
      { id: 'calc-speed', key: 'beltSpeed_m_per_min', disp: 'calc-speed-val', unit: 'm/min' },
      { id: 'calc-pitch', key: 'bucketPitch_m', disp: 'calc-pitch-val', unit: 'm' },
      { id: 'calc-mass', key: 'materialMassPerBucket_kg', disp: 'calc-mass-val', unit: 'kg' },
      { id: 'calc-height', key: 'liftHeight_m', disp: 'calc-height-val', unit: 'm' },
      { id: 'calc-eff', key: 'efficiency', disp: 'calc-eff-val', unit: '' }
    ];

    sliders.forEach(({ id, key, disp, unit }) => {
      const input = document.getElementById(id);
      const output = document.getElementById(disp);
      if (input && output) {
        input.addEventListener('input', (e) => {
          this.calcInputs[key] = parseFloat(e.target.value);
          output.innerText = `${this.calcInputs[key]}${unit ? ' ' + unit : ''}`;
          this.updateCalculations();
        });
      }
    });

    const compareBtn = document.getElementById('btn-toggle-carlos-comparison');
    if (compareBtn) {
      compareBtn.addEventListener('click', () => {
        this.audio.playClick();
        const compPanel = document.getElementById('carlos-comparison-box');
        if (compPanel) {
          const isHidden = compPanel.style.display === 'none';
          compPanel.style.display = isHidden ? 'block' : 'none';
          compareBtn.innerText = isHidden ? "Hide Carlos III Comparison" : "Compare with Carlos III Dry Clay Demo";
        }
      });
    }
  }

  updateCalculations() {
    const res = SagmaCalculationEngine.compute(this.calcInputs);

    const setElem = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setElem('res-bpm', `${res.bucketsPerMin} bpm`);
    setElem('res-kgm', `${res.capacity_kg_per_min.toLocaleString()} kg/min`);
    setElem('res-th', `${res.capacity_t_per_h.toFixed(1)} t/h`);
    setElem('res-theor-kw', `${res.theoreticalLiftingPower_kW.toFixed(2)} kW`);
    setElem('res-motor-kw', `${res.estimatedMotorPower_kW.toFixed(2)} kW`);

    const speed_m_s = this.calcInputs.beltSpeed_m_per_min / 60.0;
    this.sceneManager.setSpeed(speed_m_s);

    const speedDisp = document.getElementById('speed-slider-disp');
    const speedSlider = document.getElementById('speed-slider-runtime');
    if (speedDisp) speedDisp.innerText = `${speed_m_s.toFixed(2)} m/s`;
    if (speedSlider) speedSlider.value = speed_m_s.toFixed(2);

    // Evaluate Silo Sizing Challenge
    const sizingResult = this.game.evaluateSizing(res);
    if (sizingResult) {
      this.triggerFloatingXP(sizingResult.xpAwarded, "Silo Throughput Optimized!");
      const challengeCard = document.getElementById('sizing-challenge-card');
      if (challengeCard) {
        challengeCard.className = "challenge-card-success";
        challengeCard.innerHTML = `<strong>🎉 CHALLENGE COMPLETE!</strong><br>${sizingResult.message}`;
      }
    }

    const carlosRes = CarlosThirdPhysicsEngine.compute({
      bucketVolume_L: 0.74,
      bulkDensity_kg_per_L: 1.7,
      targetThroughput_t_per_h: 15.0,
      bucketPitch_m: 0.30
    });

    setElem('carlos-mass', `${carlosRes.massPerBucket_kg} kg`);
    setElem('carlos-bph', `${carlosRes.bucketsPerHour.toLocaleString()} b/h`);
    setElem('carlos-speed', `${carlosRes.requiredSpeed_m_per_s} m/s`);
    setElem('carlos-pulley', `${carlosRes.theoreticalPulleyDiameter_mm} mm`);
  }

  renderSafetyScenario() {
    const container = document.getElementById('safety-actions-grid');
    if (!container) return;
    container.innerHTML = '';

    const actions = [
      { label: "1. Stop Motor Pushbutton", fn: () => this.safetyMachine.actionPressStop() },
      { label: "2. Isolate Upstream Infeed Slide", fn: () => this.safetyMachine.actionCloseIntakeSlide() },
      { label: "3. Apply Electrical LOTO (Padlock + Tag)", fn: () => this.safetyMachine.actionApplyElectricalLOTO() },
      { label: "4. Test Start Button (Verify Zero Energy)", fn: () => this.safetyMachine.actionVerifyZeroEnergy() },
      { label: "5. Secure Mechanical Anti-Runback", fn: () => this.safetyMachine.actionSecureMechanicalBackstop() },
      { label: "6. Open Boot Cleanout Door", fn: () => {
          this.sceneManager.focusPreset('boot');
          return this.safetyMachine.actionOpenBootCleanout();
        }
      },
      { label: "⚠️ Clear Boot Using Hands (Unsafe)", fn: () => {
          this.safetyViolationsCount++;
          return this.safetyMachine.actionClearChokeWithHands();
        }, isDanger: true 
      },
      { label: "7. Clear Choke via Timber Rod/Cane", fn: () => this.safetyMachine.actionClearChokeWithWoodenRod(), isApproved: true },
      { label: "8. Rebolt Cleanout Doors & Guards", fn: () => this.safetyMachine.actionCloseGuardsAndPanels() },
      { label: "9. Release Mechanical Belt Clamp", fn: () => this.safetyMachine.actionReleaseMechanicalBackstop() },
      { label: "10. Remove Electrical LOTO", fn: () => this.safetyMachine.actionRemoveElectricalLOTO() },
      { label: "11. Controlled Restart & Infeed Open", fn: () => {
          this.sceneManager.focusPreset('full');
          const res = this.safetyMachine.actionPerformRestart();
          if (res.success && this.safetyViolationsCount === 0) {
            this.game.unlockAchievement("loto_hero");
            this.game.xp += 500;
            this.game.checkLevelUp();
            this.triggerFloatingXP(500, "Zero Harm Hero Certified!");
            this.updatePlayerStatsHUD();
          }
          return res;
        }
      }
    ];

    actions.forEach((act) => {
      const btn = document.createElement('button');
      btn.className = `btn btn-safety ${act.isDanger ? 'btn-danger' : act.isApproved ? 'btn-success' : ''}`;
      btn.innerText = act.label;
      btn.addEventListener('click', () => {
        const feedback = act.fn();
        if (feedback.success) {
          this.audio.playClick();
        } else {
          this.audio.playViolation();
        }
        this.displaySafetyFeedback(feedback);
      });
      container.appendChild(btn);
    });

    const resetBtn = document.getElementById('btn-reset-safety');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.audio.playClick();
        this.safetyViolationsCount = 0;
        this.safetyMachine.reset();
        this.sceneManager.focusPreset('boot');
        this.displaySafetyFeedback({
          success: true,
          title: "Scenario Reset",
          message: "Bucket elevator stalled under boot choke condition. Breaker is live. Proceed with OSHA/ISO isolation."
        });
      });
    }
  }

  displaySafetyFeedback(feedback) {
    const titleEl = document.getElementById('safety-feedback-title');
    const msgEl = document.getElementById('safety-feedback-msg');
    const badgeEl = document.getElementById('safety-state-badge');
    const cardEl = document.getElementById('safety-feedback-card');

    if (badgeEl) badgeEl.innerText = this.safetyMachine.state;
    if (titleEl) titleEl.innerText = feedback.title;
    if (msgEl) {
      msgEl.innerHTML = `
        <p>${feedback.message}</p>
        ${feedback.oshaRef ? `<div class="citation">Regulatory Source: ${feedback.oshaRef}</div>` : ''}
      `;
    }

    if (cardEl) {
      cardEl.className = `safety-card ${feedback.success ? 'card-success' : 'card-violation'}`;
    }

    if (this.webxrManager && this.webxrManager.isXRPresenting) {
      this.webxrManager.updateSpatialHUD(feedback.title, feedback.message);
    }
  }

  bindQuickControls() {
    // Environment Studio Theme Switcher
    const envDark = document.getElementById('btn-env-dark');
    const envCad = document.getElementById('btn-env-cad');
    const envLight = document.getElementById('btn-env-light');

    const setEnvActive = (activeBtn) => {
      [envDark, envCad, envLight].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
    };

    if (envDark) {
      envDark.addEventListener('click', () => {
        this.audio.playClick();
        this.sceneManager.setEnvironmentTheme('dark');
        setEnvActive(envDark);
      });
    }
    if (envCad) {
      envCad.addEventListener('click', () => {
        this.audio.playClick();
        this.sceneManager.setEnvironmentTheme('cad');
        setEnvActive(envCad);
      });
    }
    if (envLight) {
      envLight.addEventListener('click', () => {
        this.audio.playClick();
        this.sceneManager.setEnvironmentTheme('light');
        setEnvActive(envLight);
      });
    }

    const toggleModelBtn = document.getElementById('btn-toggle-model');
    if (toggleModelBtn) {
      toggleModelBtn.addEventListener('click', () => {
        this.audio.playClick();
        const mode = this.sceneManager.toggleModelMode();
        toggleModelBtn.innerText = (mode === 'full')
          ? "Viewing: Full 9.63m Elevator"
          : "Viewing: Head Vertical Slice";
      });
    }

    const cutBtn = document.getElementById('btn-cutaway');
    if (cutBtn) {
      cutBtn.addEventListener('click', () => {
        this.audio.playClick();
        const active = this.sceneManager.toggleCutaway();
        cutBtn.classList.toggle('active', active);
        cutBtn.innerText = active ? "Opaque Outer Casing" : "X-Ray / Cutaway Casing";
      });
    }

    const orbitBtn = document.getElementById('btn-orbit');
    if (orbitBtn) {
      orbitBtn.addEventListener('click', () => {
        this.audio.playClick();
        const active = this.sceneManager.toggleAutoRotate();
        orbitBtn.classList.toggle('active', active);
        orbitBtn.innerText = active ? "Pause Orbit" : "Resume Orbit";
      });
    }

    document.querySelectorAll('.btn-cam').forEach((b) => {
      b.addEventListener('click', (e) => {
        this.audio.playClick();
        const preset = e.currentTarget.dataset.preset;
        this.sceneManager.focusPreset(preset);
      });
    });

    const speedSlider = document.getElementById('speed-slider-runtime');
    const speedDisp = document.getElementById('speed-slider-disp');
    if (speedSlider && speedDisp) {
      speedSlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        this.sceneManager.setSpeed(v);
        speedDisp.innerText = `${v.toFixed(1)} m/s`;
      });
    }

    const muteBtn = document.getElementById('btn-audio-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        muteBtn.innerText = isMuted ? "🔇 Audio Muted" : "🔊 Audio On";
        muteBtn.classList.toggle('active', !isMuted);
      });
    }

    // AI Video Frame Snapshot Capturer
    const snapshotBtn = document.getElementById('btn-snapshot-frame');
    const snapshotStatus = document.getElementById('snapshot-status');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', () => {
        this.audio.playClick();
        if (this.sceneManager && this.sceneManager.captureFrame) {
          const dataUrl = this.sceneManager.captureFrame();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `sagma_frame_${timestamp}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          if (snapshotStatus) {
            snapshotStatus.style.display = 'block';
            snapshotStatus.innerText = '📸 Captured! Move file to ai_video_engine/inputs/ and run generator.';
            setTimeout(() => {
              snapshotStatus.style.display = 'none';
            }, 6000);
          }
        }
      });
    }
  }

  bindAccessibility() {
    const contrastBtn = document.getElementById('btn-high-contrast');
    if (contrastBtn) {
      contrastBtn.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        contrastBtn.classList.toggle('active');
      });
    }

    const fontBtn = document.getElementById('btn-large-text');
    if (fontBtn) {
      fontBtn.addEventListener('click', () => {
        document.body.classList.toggle('large-text');
        fontBtn.classList.toggle('active');
      });
    }

    const motionBtn = document.getElementById('btn-reduced-motion');
    if (motionBtn) {
      motionBtn.addEventListener('click', () => {
        const active = document.body.classList.toggle('reduced-motion');
        motionBtn.classList.toggle('active');
        if (active) {
          if (this.sceneManager.isAutoRotate) this.sceneManager.toggleAutoRotate();
          this.sceneManager.setSpeed(0);
        } else {
          this.sceneManager.setSpeed(ELEVATOR_CONFIG.machine.nominalSpeed_m_s);
        }
      });
    }
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case '1': this.sceneManager.focusPreset('full'); break;
        case '2': this.sceneManager.focusPreset('head'); break;
        case '3': this.sceneManager.focusPreset('boot'); break;
        case '4': this.sceneManager.focusPreset('legs'); break;
        case '5': this.sceneManager.focusPreset('inspection'); break;
        case 'c':
        case 'C':
          this.sceneManager.toggleCutaway();
          break;
        case ' ':
          e.preventDefault();
          this.sceneManager.toggleAutoRotate();
          break;
        case 'm':
        case 'M':
          this.audio.toggleMute();
          break;
        case 'l':
        case 'L':
          const lbls = this.sceneManager.toggleLabels();
          const toggleBtn = document.getElementById('btn-toggle-3d-labels');
          if (toggleBtn) toggleBtn.innerText = lbls ? "🏷️ 3D Part Labels: ON" : "🏷️ 3D Part Labels: OFF";
          break;
      }
    });
  }
}
