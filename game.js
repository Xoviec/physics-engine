/**
 * Wyścig Grawitacyjny - z edytorem toru
 */

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvasWrapper = document.getElementById("canvasWrapper");

    this.width = 600;
    this.height = 800;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.physics = new PhysicsEngine();
    this.physics.setBounds(0, this.width, 0, this.height);

    this.player1 = null;
    this.player2 = null;

    this.gameState = "waiting";
    this.editMode = false;
    this.gameMode = "stages"; // "stages" or "serpentine"
    this.wins = { player1: 0, player2: 0 };
    this.obstacles = [];
    this.windmills = [];
    this.stages = [];

    this.finishLine = this.height - 40;

    // Mouse position for preview
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseOnCanvas = false;

    // Smooth scroll
    this.currentScrollY = 0;
    this.targetScrollY = 0;

    // Start spinner
    this.spinnerAngle = 0;
    this.spinnerSpeed = 0.05;
    this.spinnerRadius = 70;
    this.countdownTime = 0;
    this.countdownDuration = 3000; // 3 seconds

    // Current obstacle type and edit mode
    this.obstacleType = "rectangle";
    this.editorMode = "add"; // "add", "move", "delete"

    // Drag state for moving elements
    this.draggedElement = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.hoveredElement = null;

    // UI elements
    this.startBtn = document.getElementById("startBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.editBtn = document.getElementById("editBtn");
    this.clearTrackBtn = document.getElementById("clearTrackBtn");
    this.randomTrackBtn = document.getElementById("randomTrackBtn");
    this.winnerOverlay = document.getElementById("winnerOverlay");
    this.winnerText = document.getElementById("winnerText");
    this.wins1El = document.getElementById("wins1");
    this.wins2El = document.getElementById("wins2");
    this.editHint = document.getElementById("editHint");
    this.mirrorModeCheckbox = document.getElementById("mirrorMode");
    this.modeButtons = document.querySelectorAll(".mode-btn");

    // Obstacle type buttons
    this.typeButtons = document.querySelectorAll(".type-btn");
    this.rectangleSettings = document.getElementById("rectangleSettings");
    this.windmillSettings = document.getElementById("windmillSettings");

    // Sliders
    this.gravitySlider = document.getElementById("gravity");
    this.bounceSlider = document.getElementById("bounce");
    this.frictionSlider = document.getElementById("friction");
    this.trackLengthSlider = document.getElementById("trackLength");
    this.obstacleAngleSlider = document.getElementById("obstacleAngle");
    this.obstacleWidthSlider = document.getElementById("obstacleWidth");
    this.windmillSizeSlider = document.getElementById("windmillSize");
    this.windmillSpeedSlider = document.getElementById("windmillSpeed");
    this.windmillDirSelect = document.getElementById("windmillDir");

    // Avatar elements
    this.avatar1Input = document.getElementById("avatar1Input");
    this.avatar2Input = document.getElementById("avatar2Input");
    this.avatar1Preview = document.getElementById("avatar1Preview");
    this.avatar2Preview = document.getElementById("avatar2Preview");
    this.clearAvatar1Btn = document.getElementById("clearAvatar1");
    this.clearAvatar2Btn = document.getElementById("clearAvatar2");
    this.avatar1Image = null;
    this.avatar2Image = null;

    // Value displays
    this.gravityValue = document.getElementById("gravityValue");
    this.bounceValue = document.getElementById("bounceValue");
    this.frictionValue = document.getElementById("frictionValue");
    this.trackLengthValue = document.getElementById("trackLengthValue");
    this.obstacleAngleValue = document.getElementById("obstacleAngleValue");
    this.obstacleWidthValue = document.getElementById("obstacleWidthValue");
    this.windmillSizeValue = document.getElementById("windmillSizeValue");
    this.windmillSpeedValue = document.getElementById("windmillSpeedValue");

    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDt = 1000 / 60;

    this.init();
  }

  init() {
    this.bindEvents();
    this.generateTrack();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startRace());
    this.resetBtn.addEventListener("click", () => this.reset());
    this.editBtn.addEventListener("click", () => this.toggleEditMode());
    this.clearTrackBtn.addEventListener("click", () => this.clearTrack());
    this.randomTrackBtn.addEventListener("click", () => this.generateTrack());

    // Game mode selection
    this.modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.modeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.gameMode = btn.dataset.mode;
        this.generateTrack();
      });
    });

    // Obstacle type selection
    this.typeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.typeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.obstacleType = btn.dataset.type;

        this.rectangleSettings.style.display =
          this.obstacleType === "rectangle" ? "block" : "none";
        this.windmillSettings.style.display =
          this.obstacleType === "windmill" ? "block" : "none";
      });
    });

    // Editor mode selection
    this.editModeButtons = document.querySelectorAll(".edit-mode-btn");
    this.addModeSettings = document.getElementById("addModeSettings");

    this.editModeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.editModeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.editorMode = btn.dataset.mode;

        // Show/hide add mode settings
        if (this.addModeSettings) {
          this.addModeSettings.style.display =
            this.editorMode === "add" ? "block" : "none";
        }
        this.rectangleSettings.style.display =
          this.editorMode === "add" && this.obstacleType === "rectangle"
            ? "block"
            : "none";
        this.windmillSettings.style.display =
          this.editorMode === "add" && this.obstacleType === "windmill"
            ? "block"
            : "none";

        // Update hint text and cursor
        this.updateEditHint();
        this.updateEditorCursor();
      });
    });

    // Canvas events
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    this.canvas.addEventListener(
      "mouseenter",
      () => (this.mouseOnCanvas = true)
    );
    this.canvas.addEventListener("mouseleave", () => {
      this.mouseOnCanvas = false;
      this.hoveredElement = null;
      if (this.draggedElement) {
        this.draggedElement = null;
      }
    });

    // Physics sliders
    this.gravitySlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      if (this.gameState === "racing") {
        this.physics.setGravity(0, value);
      }
      this.gravityValue.textContent = value.toFixed(1);
    });

    this.bounceSlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      if (this.player1) this.player1.restitution = value;
      if (this.player2) this.player2.restitution = value;
      this.bounceValue.textContent = value.toFixed(1);
    });

    this.frictionSlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      if (this.player1) this.player1.friction = value;
      if (this.player2) this.player2.friction = value;
      this.frictionValue.textContent = value.toFixed(2);
    });

    // Avatar upload handlers
    this.avatar1Input.addEventListener("change", (e) => {
      this.loadAvatar(e.target.files[0], 1);
    });
    this.avatar2Input.addEventListener("change", (e) => {
      this.loadAvatar(e.target.files[0], 2);
    });
    this.clearAvatar1Btn.addEventListener("click", () => this.clearAvatar(1));
    this.clearAvatar2Btn.addEventListener("click", () => this.clearAvatar(2));

    // Track length slider
    this.trackLengthSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.trackLengthValue.textContent = value;
      this.setTrackLength(value);
    });

    // Obstacle sliders
    this.obstacleAngleSlider.addEventListener("input", (e) => {
      this.obstacleAngleValue.textContent = e.target.value + "°";
    });

    this.obstacleWidthSlider.addEventListener("input", (e) => {
      this.obstacleWidthValue.textContent = e.target.value;
    });

    // Windmill sliders
    this.windmillSizeSlider.addEventListener("input", (e) => {
      this.windmillSizeValue.textContent = e.target.value;
    });

    this.windmillSpeedSlider.addEventListener("input", (e) => {
      this.windmillSpeedValue.textContent = parseFloat(e.target.value).toFixed(
        2
      );
    });
  }

  handleMouseMove(e) {
    const wrapperRect = this.canvasWrapper.getBoundingClientRect();
    const scaleX = this.canvas.width / wrapperRect.width;

    this.mouseX = (e.clientX - wrapperRect.left) * scaleX;
    this.mouseY = e.clientY - wrapperRect.top + this.canvasWrapper.scrollTop;

    // Handle dragging
    if (this.draggedElement && this.editorMode === "move") {
      this.draggedElement.position.x = this.mouseX - this.dragOffsetX;
      this.draggedElement.position.y = this.mouseY - this.dragOffsetY;
    }

    // Find hovered element for move/delete modes
    if (this.editMode && this.editorMode !== "add") {
      this.hoveredElement = this.findElementAt(this.mouseX, this.mouseY);
    } else {
      this.hoveredElement = null;
    }
  }

  handleMouseDown(e) {
    if (!this.editMode || this.gameState === "racing") return;

    const wrapperRect = this.canvasWrapper.getBoundingClientRect();
    const scaleX = this.canvas.width / wrapperRect.width;
    const x = (e.clientX - wrapperRect.left) * scaleX;
    const y = e.clientY - wrapperRect.top + this.canvasWrapper.scrollTop;

    if (this.editorMode === "add") {
      // Add new element
      if (y < 90 || y > this.finishLine - 20) return;
      this.addElementAt(x, y);
    } else if (this.editorMode === "move") {
      // Start dragging
      const element = this.findElementAt(x, y);
      if (element) {
        this.draggedElement = element;
        this.dragOffsetX = x - element.position.x;
        this.dragOffsetY = y - element.position.y;
      }
    } else if (this.editorMode === "delete") {
      // Delete element
      this.deleteElementAt(x, y);
    }
  }

  handleMouseUp(e) {
    this.draggedElement = null;
  }

  findElementAt(x, y) {
    // Check windmills first (they're on top)
    for (const wm of this.windmills) {
      const dx = x - wm.position.x;
      const dy = y - wm.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < wm.armLength + 10) {
        return wm;
      }
    }

    // Check obstacles (rectangles)
    for (const obs of this.obstacles) {
      // Simple AABB check (ignoring rotation for simplicity)
      const cx = obs.position.x + obs.width / 2;
      const cy = obs.position.y + obs.height / 2;
      const hw = obs.width / 2 + 15;
      const hh = obs.height / 2 + 15;

      if (x >= cx - hw && x <= cx + hw && y >= cy - hh && y <= cy + hh) {
        return obs;
      }
    }

    return null;
  }

  deleteElementAt(x, y) {
    const element = this.findElementAt(x, y);
    if (!element) return;

    // Check if it's a windmill
    const wmIndex = this.windmills.indexOf(element);
    if (wmIndex !== -1) {
      this.windmills.splice(wmIndex, 1);
      this.physics.removeBody(element);
      return;
    }

    // Check if it's an obstacle
    const obsIndex = this.obstacles.indexOf(element);
    if (obsIndex !== -1) {
      this.obstacles.splice(obsIndex, 1);
      this.physics.removeBody(element);
    }
  }

  addElementAt(x, y) {
    if (this.obstacleType === "rectangle") {
      let angle = parseInt(this.obstacleAngleSlider.value);
      // Enforce minimum 10 degrees angle (no horizontal beams)
      if (angle > -10 && angle < 10) {
        angle = angle >= 0 ? 10 : -10;
      }
      const width = parseInt(this.obstacleWidthSlider.value);
      const height = 12;
      const angleRad = (angle * Math.PI) / 180;

      this.addObstacle(x - width / 2, y - height / 2, width, height, angleRad);

      if (this.mirrorModeCheckbox.checked) {
        const mirrorX = this.width - x;
        this.addObstacle(
          mirrorX - width / 2,
          y - height / 2,
          width,
          height,
          -angleRad
        );
      }
    } else if (this.obstacleType === "windmill") {
      const size = parseInt(this.windmillSizeSlider.value);
      const speed = parseFloat(this.windmillSpeedSlider.value);
      const direction = parseInt(this.windmillDirSelect.value);

      this.addWindmill(x, y, size, speed, direction);

      if (this.mirrorModeCheckbox.checked) {
        const mirrorX = this.width - x;
        this.addWindmill(mirrorX, y, size, speed, -direction);
      }
    }
  }

  setTrackLength(length) {
    this.height = length;
    this.canvas.height = this.height;
    this.physics.setBounds(0, this.width, 0, this.height);
    this.finishLine = this.height - 40;
    this.generateTrack();
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.editBtn.classList.toggle("active", this.editMode);
    this.editHint.classList.toggle("visible", this.editMode);

    if (this.editMode) {
      this.resetPlayers();
      this.startBtn.disabled = true;
      this.updateEditHint();
      this.updateEditorCursor();
    } else {
      this.startBtn.disabled = false;
      this.draggedElement = null;
      this.hoveredElement = null;
      this.canvasWrapper.className = "canvas-wrapper";
    }
  }

  updateEditHint() {
    if (!this.editHint) return;

    switch (this.editorMode) {
      case "add":
        this.editHint.textContent = "Kliknij aby dodać przeszkodę";
        break;
      case "move":
        this.editHint.textContent = "Przeciągnij element aby go przesunąć";
        break;
      case "delete":
        this.editHint.textContent = "Kliknij element aby go usunąć";
        break;
    }
  }

  updateEditorCursor() {
    this.canvasWrapper.className = "canvas-wrapper";
    if (this.editMode) {
      this.canvasWrapper.classList.add(`edit-mode-${this.editorMode}`);
    }
  }

  createPlayers() {
    const bounce = parseFloat(this.bounceSlider.value);
    const friction = parseFloat(this.frictionSlider.value);

    if (this.gameMode === "serpentine") {
      // In serpentine mode, players start at top left of corridor
      this.player1 = new Circle(80, 70, 15, 1);
      this.player2 = new Circle(120, 70, 15, 1);
    } else {
      // Standard symmetric positions
      this.player1 = new Circle(this.width * 0.35, 50, 18, 1);
      this.player2 = new Circle(this.width * 0.65, 50, 18, 1);
    }

    this.player1.restitution = bounce;
    this.player1.friction = friction;
    this.player2.restitution = bounce;
    this.player2.friction = friction;

    // Apply avatars if loaded
    if (this.avatar1Image) {
      this.player1.image = this.avatar1Image;
    }
    if (this.avatar2Image) {
      this.player2.image = this.avatar2Image;
    }

    this.physics.addBody(this.player1);
    this.physics.addBody(this.player2);
  }

  loadAvatar(file, playerNum) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (playerNum === 1) {
          this.avatar1Image = img;
          this.avatar1Preview.innerHTML = `<img src="${e.target.result}" alt="Avatar 1">`;
          if (this.player1) {
            this.player1.image = img;
          }
        } else {
          this.avatar2Image = img;
          this.avatar2Preview.innerHTML = `<img src="${e.target.result}" alt="Avatar 2">`;
          if (this.player2) {
            this.player2.image = img;
          }
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  clearAvatar(playerNum) {
    if (playerNum === 1) {
      this.avatar1Image = null;
      this.avatar1Preview.innerHTML = "";
      this.avatar1Input.value = "";
      if (this.player1) {
        this.player1.image = null;
      }
    } else {
      this.avatar2Image = null;
      this.avatar2Preview.innerHTML = "";
      this.avatar2Input.value = "";
      if (this.player2) {
        this.player2.image = null;
      }
    }
  }

  removePlayers() {
    if (this.player1) {
      this.physics.removeBody(this.player1);
      this.player1 = null;
    }
    if (this.player2) {
      this.physics.removeBody(this.player2);
      this.player2 = null;
    }
  }

  resetPlayers() {
    this.removePlayers();
    this.createPlayers();
    this.gameState = "waiting";
    this.physics.setGravity(0, 0);
    this.currentScrollY = 0;
    this.targetScrollY = 0;
    this.canvasWrapper.scrollTop = 0;
  }

  clearTrack() {
    for (const obs of this.obstacles) {
      this.physics.removeBody(obs);
    }
    for (const wm of this.windmills) {
      this.physics.removeBody(wm);
    }
    this.obstacles = [];
    this.windmills = [];
    this.stages = [];
    this.resetPlayers();
  }

  generateTrack() {
    if (this.gameMode === "serpentine") {
      this.generateSerpentineTrack();
    } else {
      this.generateBalancedTrack();
    }
  }

  /**
   * Generate a serpentine track - narrow zigzag corridor from left to right
   */
  generateSerpentineTrack() {
    // Clear everything
    for (const obs of this.obstacles) {
      this.physics.removeBody(obs);
    }
    for (const wm of this.windmills) {
      this.physics.removeBody(wm);
    }
    this.obstacles = [];
    this.windmills = [];
    this.stages = [];
    this.removePlayers();

    const startY = 100;
    const endY = this.finishLine - 40;
    const trackLength = endY - startY;

    // Serpentine parameters
    const corridorWidth = 60; // Narrow corridor for balls
    const margin = 30; // Distance from canvas edge
    const turnHeight = 100; // Height of each turn section
    const numTurns = Math.floor(trackLength / turnHeight);
    const wallThickness = 10;

    let goingRight = true;

    for (let i = 0; i < numTurns; i++) {
      const y = startY + i * turnHeight;
      const isLastTurn = i === numTurns - 1;

      if (goingRight) {
        // Horizontal corridor going right
        // Top wall
        this.addObstacle(
          margin,
          y,
          this.width - margin * 2 - corridorWidth,
          wallThickness,
          0
        );
        // Bottom wall
        this.addObstacle(
          margin,
          y + corridorWidth,
          this.width - margin * 2,
          wallThickness,
          0
        );

        if (!isLastTurn) {
          // Right side vertical turn
          // Outer wall (right edge)
          this.addObstacle(
            this.width - margin - wallThickness,
            y + corridorWidth,
            turnHeight - corridorWidth,
            wallThickness,
            Math.PI / 2
          );
          // Inner wall
          this.addObstacle(
            this.width - margin - corridorWidth - wallThickness,
            y + corridorWidth,
            turnHeight - corridorWidth,
            wallThickness,
            Math.PI / 2
          );
        }
      } else {
        // Horizontal corridor going left
        // Top wall
        this.addObstacle(
          margin + corridorWidth,
          y,
          this.width - margin * 2 - corridorWidth,
          wallThickness,
          0
        );
        // Bottom wall
        this.addObstacle(
          margin,
          y + corridorWidth,
          this.width - margin * 2,
          wallThickness,
          0
        );

        if (!isLastTurn) {
          // Left side vertical turn
          // Outer wall (left edge)
          this.addObstacle(
            margin,
            y + corridorWidth,
            turnHeight - corridorWidth,
            wallThickness,
            Math.PI / 2
          );
          // Inner wall
          this.addObstacle(
            margin + corridorWidth,
            y + corridorWidth,
            turnHeight - corridorWidth,
            wallThickness,
            Math.PI / 2
          );
        }
      }

      // Add windmill in middle of horizontal sections
      if (i % 2 === 1) {
        const windmillX = this.width / 2;
        const windmillY = y + corridorWidth / 2;
        this.addWindmill(windmillX, windmillY, 25, 0.03, goingRight ? 1 : -1);
      }

      goingRight = !goingRight;
    }

    this.createPlayers();
    this.gameState = "waiting";
    this.physics.setGravity(0, 0);
    this.currentScrollY = 0;
    this.targetScrollY = 0;
    this.canvasWrapper.scrollTop = 0;
  }

  /**
   * Generate a balanced track with alternating stages (original mode)
   */
  generateBalancedTrack() {
    for (const obs of this.obstacles) {
      this.physics.removeBody(obs);
    }
    for (const wm of this.windmills) {
      this.physics.removeBody(wm);
    }
    this.obstacles = [];
    this.windmills = [];
    this.stages = [];
    this.removePlayers();

    const startY = 100;
    const endY = this.finishLine - 40;
    const trackLength = endY - startY;

    const stageHeight = 150;
    const numStages = Math.max(3, Math.floor(trackLength / stageHeight));

    for (let i = 0; i < numStages; i++) {
      const stageStartY = startY + (i * trackLength) / numStages;
      const stageEndY = startY + ((i + 1) * trackLength) / numStages;

      const isWindmillStage = i % 2 === 1;

      this.stages.push({
        startY: stageStartY,
        endY: stageEndY,
        type: isWindmillStage ? "windmill" : "beam",
      });

      if (isWindmillStage) {
        this.generateWindmillStage(stageStartY, stageEndY);
      } else {
        this.generateBeamStage(stageStartY, stageEndY);
      }
    }

    this.createPlayers();
    this.gameState = "waiting";
    this.physics.setGravity(0, 0);
    this.currentScrollY = 0;
    this.targetScrollY = 0;
    this.canvasWrapper.scrollTop = 0;
  }

  generateBeamStage(startY, endY) {
    const stageHeight = endY - startY;
    const numRows = Math.max(1, Math.floor(stageHeight / 70));
    const rowHeight = stageHeight / (numRows + 1);

    const centerX = this.width / 2;
    const minGap = 50;
    const wallMargin = 45;
    const maxBeamWidth = 120;

    for (let row = 0; row < numRows; row++) {
      const y = startY + rowHeight * (row + 1);
      const pattern = Math.floor(Math.random() * 5);

      // Minimum angle: 10 degrees = 0.175 radians
      const minAngle = 0.18;

      switch (pattern) {
        case 0:
          // Center beam with random tilt (no horizontal beams)
          const centerWidth = Math.min(
            maxBeamWidth,
            this.width - 2 * minGap - 2 * wallMargin
          );
          const centerAngle =
            (Math.random() > 0.5 ? 1 : -1) * (minAngle + Math.random() * 0.1);
          this.addObstacle(
            centerX - centerWidth / 2,
            y,
            centerWidth,
            12,
            centerAngle
          );
          break;

        case 1:
          const angle1 = minAngle + Math.random() * 0.15;
          const sideOffset1 = wallMargin + Math.random() * 20;
          const sideWidth1 = 80 + Math.random() * 20;
          const gapCheck1 = this.width - 2 * (sideOffset1 + sideWidth1);
          if (gapCheck1 >= minGap) {
            this.addObstacle(sideOffset1, y, sideWidth1, 12, angle1);
            this.addObstacle(
              this.width - sideOffset1 - sideWidth1,
              y,
              sideWidth1,
              12,
              -angle1
            );
          }
          break;

        case 2:
          const funnelAngle = 0.2 + Math.random() * 0.15;
          const funnelWidth = 100;
          const funnelOffset = wallMargin;
          this.addObstacle(funnelOffset, y, funnelWidth, 12, funnelAngle);
          this.addObstacle(
            this.width - funnelOffset - funnelWidth,
            y,
            funnelWidth,
            12,
            -funnelAngle
          );
          break;

        case 3:
          const staggerWidth = 60;
          const staggerGap = minGap + 10;
          const staggerAngle = minAngle + Math.random() * 0.1;
          this.addObstacle(
            centerX - staggerGap / 2 - staggerWidth,
            y,
            staggerWidth,
            12,
            staggerAngle
          );
          this.addObstacle(
            centerX + staggerGap / 2,
            y,
            staggerWidth,
            12,
            -staggerAngle
          );
          break;

        case 4:
          const diagWidth = 70;
          const diagAngle =
            (Math.random() > 0.5 ? 1 : -1) * (minAngle + Math.random() * 0.15);
          const diagX =
            wallMargin +
            minGap +
            Math.random() *
              (this.width - 2 * wallMargin - 2 * minGap - diagWidth);
          this.addObstacle(diagX, y, diagWidth, 12, diagAngle);
          break;
      }

      if (Math.random() > 0.75 && row < numRows - 1 && rowHeight > 80) {
        const bumperY = y + rowHeight / 2;
        const bumperWidth = 40;
        const bumperAngle =
          (Math.random() > 0.5 ? 1 : -1) * (minAngle + Math.random() * 0.1);
        this.addObstacle(
          centerX - bumperWidth / 2,
          bumperY,
          bumperWidth,
          10,
          bumperAngle
        );
      }
    }
  }

  generateWindmillStage(startY, endY) {
    const stageHeight = endY - startY;
    const centerX = this.width / 2;
    const centerY = (startY + endY) / 2;
    const wallMargin = 50;

    const pattern = Math.floor(Math.random() * 3);

    switch (pattern) {
      case 0:
        this.addWindmill(centerX, centerY, 55, 0.025 + Math.random() * 0.02, 1);
        break;

      case 1:
        const offset1 = 110;
        const speed1 = 0.025 + Math.random() * 0.02;
        this.addWindmill(centerX - offset1, centerY, 45, speed1, 1);
        this.addWindmill(centerX + offset1, centerY, 45, speed1, -1);
        break;

      case 2:
        const offset2 = 130;
        const speed2 = 0.02 + Math.random() * 0.015;
        this.addWindmill(centerX, centerY - 20, 40, speed2, 1);
        this.addWindmill(centerX - offset2, centerY + 25, 40, speed2, 1);
        this.addWindmill(centerX + offset2, centerY + 25, 40, speed2, -1);
        break;
    }

    if (stageHeight > 120) {
      const guideY1 = startY + 30;
      const guideY2 = endY - 30;
      const guideWidth = 60;

      this.addObstacle(wallMargin, guideY1, guideWidth, 10, 0.2);
      this.addObstacle(
        this.width - wallMargin - guideWidth,
        guideY1,
        guideWidth,
        10,
        -0.2
      );
      this.addObstacle(wallMargin, guideY2, guideWidth, 10, 0.2);
      this.addObstacle(
        this.width - wallMargin - guideWidth,
        guideY2,
        guideWidth,
        10,
        -0.2
      );
    }
  }

  addObstacle(x, y, width, height, angle = 0) {
    const obstacle = new Rectangle(x, y, width, height);
    obstacle.angle = angle;
    this.obstacles.push(obstacle);
    this.physics.addBody(obstacle);
  }

  addWindmill(x, y, armLength, speed, direction) {
    const windmill = new Windmill(x, y, armLength, 4);
    windmill.rotationSpeed = speed;
    windmill.direction = direction;
    this.windmills.push(windmill);
    this.physics.addBody(windmill);
  }

  startRace() {
    if (this.gameState !== "waiting" || this.editMode) return;

    // Start countdown with spinner
    this.gameState = "countdown";
    this.countdownTime = 0;
    this.spinnerAngle = 0;
    this.spinnerSpeed = 0.03;
    this.startBtn.disabled = true;
    this.editBtn.disabled = true;
    this.currentScrollY = 0;
    this.targetScrollY = 0;
    this.canvasWrapper.scrollTop = 0;

    // Enable gravity for countdown
    this.physics.setGravity(0, parseFloat(this.gravitySlider.value));

    // Position players on opposite sides inside spinner
    const centerX = this.gameMode === "serpentine" ? 100 : this.width / 2;
    const centerY = 90;
    const ballOffset = 30;

    if (this.player1 && this.player2) {
      this.player1.position.x = centerX - ballOffset;
      this.player1.position.y = centerY;
      this.player1.velocity.x = 0;
      this.player1.velocity.y = 0;

      this.player2.position.x = centerX + ballOffset;
      this.player2.position.y = centerY;
      this.player2.velocity.x = 0;
      this.player2.velocity.y = 0;
    }
  }

  updateCountdown(dt) {
    if (this.gameState !== "countdown") return;

    this.countdownTime += dt;

    // Speed up spinner over time
    this.spinnerSpeed =
      0.02 + (this.countdownTime / this.countdownDuration) * 0.05;
    this.spinnerAngle += this.spinnerSpeed;

    const centerX = this.gameMode === "serpentine" ? 100 : this.width / 2;
    const centerY = 90;
    const radius = this.spinnerRadius;

    // Constrain balls to spinner circle (physics engine handles the rest)
    if (this.player1 && this.player2) {
      const balls = [this.player1, this.player2];

      for (const ball of balls) {
        const dx = ball.position.x - centerX;
        const dy = ball.position.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = radius - ball.radius - 2;

        // Keep ball inside spinner circle
        if (dist > maxDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;

          // Push back inside
          ball.position.x = centerX + nx * maxDist;
          ball.position.y = centerY + ny * maxDist;

          // Reflect velocity off circular wall
          const dot = ball.velocity.x * nx + ball.velocity.y * ny;
          if (dot > 0) {
            ball.velocity.x -= 2 * dot * nx * ball.restitution;
            ball.velocity.y -= 2 * dot * ny * ball.restitution;
          }

          // Add spin from rotating wall
          const tangentX = -ny;
          const tangentY = nx;
          ball.velocity.x += tangentX * this.spinnerSpeed * 6;
          ball.velocity.y += tangentY * this.spinnerSpeed * 6;
        }
      }
    }

    // Launch after countdown
    if (this.countdownTime >= this.countdownDuration) {
      this.launchRace();
    }
  }

  launchRace() {
    this.gameState = "racing";
    // Balls already have velocity from bouncing in spinner
  }

  reset() {
    this.gameState = "waiting";
    this.startBtn.disabled = this.editMode;
    this.editBtn.disabled = false;
    this.winnerOverlay.classList.remove("active");
    this.spinnerSpeed = 0.08;
    this.countdownTime = 0;
    this.resetPlayers();
  }

  autoScroll() {
    if (this.gameState !== "racing") return;
    if (!this.player1 || !this.player2) return;

    const lowestY = Math.max(this.player1.position.y, this.player2.position.y);

    const wrapperHeight = this.canvasWrapper.clientHeight;
    const maxScroll = this.canvas.height - wrapperHeight;

    this.targetScrollY = lowestY - wrapperHeight * 0.35;
    this.targetScrollY = Math.max(0, Math.min(maxScroll, this.targetScrollY));

    const diff = this.targetScrollY - this.currentScrollY;
    this.currentScrollY += diff * 0.05;

    this.canvasWrapper.scrollTop = this.currentScrollY;
  }

  checkWinner() {
    if (this.gameState !== "racing") return;
    if (!this.player1 || !this.player2) return;

    const p1Finished =
      this.player1.position.y + this.player1.radius >= this.finishLine;
    const p2Finished =
      this.player2.position.y + this.player2.radius >= this.finishLine;

    if (p1Finished || p2Finished) {
      this.gameState = "finished";
      this.physics.setGravity(0, 0);

      let winner;
      if (p1Finished && p2Finished) {
        winner = this.player1.position.y > this.player2.position.y ? 1 : 2;
      } else {
        winner = p1Finished ? 1 : 2;
      }

      this.wins[`player${winner}`]++;
      this.wins1El.textContent = this.wins.player1;
      this.wins2El.textContent = this.wins.player2;

      this.winnerText.textContent = `GRACZ ${winner} WYGRYWA!`;
      this.winnerText.className = `winner-text player${winner}`;
      this.winnerOverlay.classList.add("active");
      this.startBtn.disabled = false;
      this.editBtn.disabled = false;
    }
  }

  drawObstaclePreview() {
    if (!this.editMode || !this.mouseOnCanvas || this.editorMode !== "add")
      return;

    const y = this.mouseY;
    if (y < 90 || y > this.finishLine - 20) return;

    const x = this.mouseX;

    if (this.obstacleType === "rectangle") {
      const angle = parseInt(this.obstacleAngleSlider.value);
      const width = parseInt(this.obstacleWidthSlider.value);
      const height = 12;
      const angleRad = (angle * Math.PI) / 180;

      this.drawSinglePreview(x, y, width, height, angleRad);

      if (this.mirrorModeCheckbox.checked) {
        const mirrorX = this.width - x;
        this.drawSinglePreview(mirrorX, y, width, height, -angleRad);
      }
    } else if (this.obstacleType === "windmill") {
      const size = parseInt(this.windmillSizeSlider.value);

      this.drawWindmillPreview(x, y, size);

      if (this.mirrorModeCheckbox.checked) {
        const mirrorX = this.width - x;
        this.drawWindmillPreview(mirrorX, y, size);
      }
    }
  }

  drawSinglePreview(x, y, width, height, angleRad) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angleRad);

    this.ctx.strokeStyle = "#999";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeRect(-width / 2, -height / 2, width, height);

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    this.ctx.fillRect(-width / 2, -height / 2, width, height);

    this.ctx.restore();
    this.ctx.setLineDash([]);
  }

  drawWindmillPreview(x, y, size) {
    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.strokeStyle = "#999";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);

    for (let i = 0; i < 4; i++) {
      const armAngle = (i * Math.PI * 2) / 4;
      this.ctx.save();
      this.ctx.rotate(armAngle);
      this.ctx.strokeRect(-5, -size, 10, size);
      this.ctx.restore();
    }

    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
    this.ctx.setLineDash([]);
  }

  drawStageIndicators() {
    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];

      let color;
      if (stage.type === "windmill") {
        color = "#e0e0ff";
      } else if (stage.type === "turn") {
        color = "#ffe0e0";
      } else {
        color = "#e0ffe0";
      }

      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([10, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, stage.startY);
      this.ctx.lineTo(this.width, stage.startY);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = "#ccc";
      this.ctx.font = "10px sans-serif";
      this.ctx.textAlign = "left";
      let label;
      if (stage.type === "windmill") {
        label = "WIATRAKI";
      } else if (stage.type === "turn") {
        label = "ZAKRĘT";
      } else {
        label = "BELKI";
      }
      this.ctx.fillText(label, 5, stage.startY + 12);
    }
  }

  draw() {
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Only show stage indicators in stages mode
    if (this.gameMode !== "serpentine") {
      this.drawStageIndicators();
    }

    if (this.editMode && this.mirrorModeCheckbox.checked) {
      this.ctx.strokeStyle = "#ddd";
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([8, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.width / 2, 0);
      this.ctx.lineTo(this.width / 2, this.height);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Only show center line and start line in stages mode
    if (this.gameMode !== "serpentine") {
      this.ctx.strokeStyle = "#f0f0f0";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(this.width / 2, 80);
      this.ctx.lineTo(this.width / 2, this.finishLine);
      this.ctx.stroke();

      this.ctx.strokeStyle = "#ccc";
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 80);
      this.ctx.lineTo(this.width, 80);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    const y = this.finishLine;
    const squareSize = 15;
    for (let x = 0; x < this.width; x += squareSize) {
      const isBlack = Math.floor(x / squareSize) % 2 === 0;
      this.ctx.fillStyle = isBlack ? "#000" : "#fff";
      this.ctx.fillRect(x, y, squareSize, squareSize);
    }
    for (let x = 0; x < this.width; x += squareSize) {
      const isBlack = Math.floor(x / squareSize) % 2 === 1;
      this.ctx.fillStyle = isBlack ? "#000" : "#fff";
      this.ctx.fillRect(x, y + squareSize, squareSize, squareSize);
    }

    if (this.editMode) {
      this.ctx.strokeStyle = "#999";
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([3, 3]);

      this.ctx.beginPath();
      this.ctx.moveTo(0, 90);
      this.ctx.lineTo(this.width, 90);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, this.finishLine - 20);
      this.ctx.lineTo(this.width, this.finishLine - 20);
      this.ctx.stroke();

      this.ctx.setLineDash([]);
    }

    this.physics.draw(this.ctx);

    // Draw spinner during countdown
    if (this.gameState === "countdown") {
      this.drawSpinner();
    }

    // Draw highlight for hovered element in move/delete mode
    if (this.editMode && this.hoveredElement && this.editorMode !== "add") {
      this.drawElementHighlight(this.hoveredElement);
    }

    if (this.player1 && this.player2) {
      this.ctx.fillStyle = "#000";
      this.ctx.font = "bold 11px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "1",
        this.player1.position.x,
        this.player1.position.y + 4
      );
      this.ctx.fillText(
        "2",
        this.player2.position.x,
        this.player2.position.y + 4
      );
    }

    this.drawObstaclePreview();
  }

  drawSpinner() {
    const centerX = this.gameMode === "serpentine" ? 100 : this.width / 2;
    const centerY = 90;
    const radius = this.spinnerRadius;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.spinnerAngle);

    // Outer spinning ring
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Small markers on the ring (outside only)
    const numMarkers = 12;
    for (let i = 0; i < numMarkers; i++) {
      const angle = (i / numMarkers) * Math.PI * 2;
      const innerR = radius - 8;
      const outerR = radius;
      this.ctx.beginPath();
      this.ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      this.ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = i % 3 === 0 ? 3 : 1;
      this.ctx.stroke();
    }

    this.ctx.restore();

    // Countdown number
    const secondsLeft = Math.ceil(
      (this.countdownDuration - this.countdownTime) / 1000
    );
    if (secondsLeft > 0 && this.countdownTime < this.countdownDuration - 200) {
      this.ctx.fillStyle = "#000";
      this.ctx.font = "bold 28px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(secondsLeft.toString(), centerX, centerY + radius + 30);
    }

    // "GO!" text when launching
    if (this.countdownTime >= this.countdownDuration - 200) {
      this.ctx.fillStyle = "#000";
      this.ctx.font = "bold 36px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("GO!", centerX, centerY + radius + 30);
    }
  }

  drawElementHighlight(element) {
    this.ctx.save();

    if (element.type === "windmill") {
      // Highlight windmill
      this.ctx.strokeStyle = this.editorMode === "delete" ? "#c00" : "#06c";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(
        element.position.x,
        element.position.y,
        element.armLength + 5,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();
    } else if (element.type === "rectangle") {
      // Highlight rectangle
      const cx = element.position.x + element.width / 2;
      const cy = element.position.y + element.height / 2;

      this.ctx.translate(cx, cy);
      this.ctx.rotate(element.angle || 0);

      this.ctx.strokeStyle = this.editorMode === "delete" ? "#c00" : "#06c";
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(
        -element.width / 2 - 5,
        -element.height / 2 - 5,
        element.width + 10,
        element.height + 10
      );
    }

    this.ctx.restore();
  }

  gameLoop(timestamp) {
    if (this.lastTime === 0) this.lastTime = timestamp;
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.accumulator += deltaTime;

    // Update countdown spinner
    if (this.gameState === "countdown") {
      this.updateCountdown(deltaTime);
    }

    while (this.accumulator >= this.fixedDt) {
      if (this.gameState === "racing" || this.gameState === "countdown") {
        this.physics.update(1);
      }
      this.accumulator -= this.fixedDt;
    }

    this.draw();
    this.autoScroll();
    this.checkWinner();

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
