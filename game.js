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

    // Current obstacle type
    this.obstacleType = "rectangle";

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
    this.generateBalancedTrack();
    // Don't call createPlayers() here - generateBalancedTrack() already does it
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startRace());
    this.resetBtn.addEventListener("click", () => this.reset());
    this.editBtn.addEventListener("click", () => this.toggleEditMode());
    this.clearTrackBtn.addEventListener("click", () => this.clearTrack());
    this.randomTrackBtn.addEventListener("click", () =>
      this.generateBalancedTrack()
    );

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

    // Canvas events
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener(
      "mouseenter",
      () => (this.mouseOnCanvas = true)
    );
    this.canvas.addEventListener(
      "mouseleave",
      () => (this.mouseOnCanvas = false)
    );

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
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY =
      (e.clientY - rect.top) * scaleY + this.canvasWrapper.scrollTop;
  }

  setTrackLength(length) {
    this.height = length;
    this.canvas.height = this.height;
    this.physics.setBounds(0, this.width, 0, this.height);
    this.finishLine = this.height - 40;
    this.generateBalancedTrack();
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.editBtn.classList.toggle("active", this.editMode);
    this.editHint.classList.toggle("visible", this.editMode);

    if (this.editMode) {
      this.resetPlayers();
      this.startBtn.disabled = true;
    } else {
      this.startBtn.disabled = false;
    }
  }

  handleCanvasClick(e) {
    if (!this.editMode || this.gameState === "racing") return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY + this.canvasWrapper.scrollTop;

    if (y < 90 || y > this.finishLine - 20) return;

    if (this.obstacleType === "rectangle") {
      const angle = parseInt(this.obstacleAngleSlider.value);
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

  createPlayers() {
    const bounce = parseFloat(this.bounceSlider.value);
    const friction = parseFloat(this.frictionSlider.value);

    // Symmetric starting positions
    this.player1 = new Circle(this.width * 0.35, 50, 18, 1);
    this.player1.restitution = bounce;
    this.player1.friction = friction;

    this.player2 = new Circle(this.width * 0.65, 50, 18, 1);
    this.player2.restitution = bounce;
    this.player2.friction = friction;

    this.physics.addBody(this.player1);
    this.physics.addBody(this.player2);
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
    // Remove obstacles
    for (const obs of this.obstacles) {
      this.physics.removeBody(obs);
    }
    for (const wm of this.windmills) {
      this.physics.removeBody(wm);
    }
    this.obstacles = [];
    this.windmills = [];
    this.stages = [];

    // Reset players
    this.resetPlayers();
  }

  /**
   * Generate a balanced track with alternating stages
   * All obstacles are symmetric to ensure equal chances
   */
  generateBalancedTrack() {
    // Clear everything first
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

    // Calculate number of stages based on track length
    const stageHeight = 150;
    const numStages = Math.max(3, Math.floor(trackLength / stageHeight));

    for (let i = 0; i < numStages; i++) {
      const stageStartY = startY + (i * trackLength) / numStages;
      const stageEndY = startY + ((i + 1) * trackLength) / numStages;

      // Alternate between beam stages and windmill stages
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

    // Create players at the end
    this.createPlayers();

    // Reset state
    this.gameState = "waiting";
    this.physics.setGravity(0, 0);
    this.currentScrollY = 0;
    this.targetScrollY = 0;
    this.canvasWrapper.scrollTop = 0;
  }

  /**
   * Generate a symmetric beam stage
   * Rules to prevent ball blocking:
   * - Beams near walls must angle AWAY from wall (push balls toward center)
   * - Minimum gap between beams: 50px (ball diameter ~36px + margin)
   * - Minimum distance from wall: 45px
   * - Never create angles that trap balls against walls
   */
  generateBeamStage(startY, endY) {
    const stageHeight = endY - startY;
    const numRows = Math.max(1, Math.floor(stageHeight / 70));
    const rowHeight = stageHeight / (numRows + 1);

    const centerX = this.width / 2;
    const ballDiameter = 36; // Ball radius is 18
    const minGap = 50; // Minimum gap for ball to pass
    const wallMargin = 45; // Minimum distance from wall
    const maxBeamWidth = 120; // Max beam width to ensure gaps

    for (let row = 0; row < numRows; row++) {
      const y = startY + rowHeight * (row + 1);

      // Choose a symmetric pattern
      const pattern = Math.floor(Math.random() * 5);

      switch (pattern) {
        case 0:
          // Center obstacle - leaves gaps on both sides
          // Max width so gaps remain: (width - maxBeamWidth) / 2 > minGap
          const centerWidth = Math.min(
            maxBeamWidth,
            this.width - 2 * minGap - 2 * wallMargin
          );
          this.addObstacle(centerX - centerWidth / 2, y, centerWidth, 12, 0);
          break;

        case 1:
          // Two side obstacles - angled AWAY from walls (positive angle on left pushes right)
          // Left beam: positive angle, Right beam: negative angle
          const angle1 = 0.15 + Math.random() * 0.1; // Always positive (slopes down-right)
          const sideOffset1 = wallMargin + Math.random() * 20;
          const sideWidth1 = 80 + Math.random() * 20;

          // Ensure gap in center
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
          // Funnel - guides balls toward center (away from walls)
          // Left beam angles DOWN-RIGHT (positive), Right beam angles DOWN-LEFT (negative)
          const funnelAngle = 0.2 + Math.random() * 0.1;
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
          // Staggered center obstacles with guaranteed gaps
          const staggerWidth = 60;
          const staggerGap = minGap + 10;

          // Left-center beam
          this.addObstacle(
            centerX - staggerGap / 2 - staggerWidth,
            y,
            staggerWidth,
            12,
            0.1
          );
          // Right-center beam
          this.addObstacle(centerX + staggerGap / 2, y, staggerWidth, 12, -0.1);
          break;

        case 4:
          // Single diagonal with guaranteed passage on both sides
          const diagWidth = 70;
          const diagAngle =
            (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.15);
          // Place in center area, leaving wall gaps
          const diagX =
            wallMargin +
            minGap +
            Math.random() *
              (this.width - 2 * wallMargin - 2 * minGap - diagWidth);
          this.addObstacle(diagX, y, diagWidth, 12, diagAngle);
          break;
      }

      // Small center bumper (only if enough space below)
      if (Math.random() > 0.75 && row < numRows - 1 && rowHeight > 80) {
        const bumperY = y + rowHeight / 2;
        const bumperWidth = 40;
        this.addObstacle(
          centerX - bumperWidth / 2,
          bumperY,
          bumperWidth,
          10,
          0
        );
      }
    }
  }

  /**
   * Generate a symmetric windmill stage
   * Guide beams angle AWAY from walls to prevent trapping
   */
  generateWindmillStage(startY, endY) {
    const stageHeight = endY - startY;
    const centerX = this.width / 2;
    const centerY = (startY + endY) / 2;
    const wallMargin = 50;

    // Choose windmill pattern
    const pattern = Math.floor(Math.random() * 3);

    switch (pattern) {
      case 0:
        // Single center windmill - perfectly fair
        this.addWindmill(centerX, centerY, 55, 0.025 + Math.random() * 0.02, 1);
        break;

      case 1:
        // Two symmetric windmills with opposite rotation
        const offset1 = 110;
        const speed1 = 0.025 + Math.random() * 0.02;
        this.addWindmill(centerX - offset1, centerY, 45, speed1, 1);
        this.addWindmill(centerX + offset1, centerY, 45, speed1, -1);
        break;

      case 2:
        // Three windmills - center + two sides (opposite rotation)
        const offset2 = 130;
        const speed2 = 0.02 + Math.random() * 0.015;
        this.addWindmill(centerX, centerY - 20, 40, speed2, 1);
        this.addWindmill(centerX - offset2, centerY + 25, 40, speed2, 1);
        this.addWindmill(centerX + offset2, centerY + 25, 40, speed2, -1);
        break;
    }

    // Add small guide beams at stage edges
    // IMPORTANT: Angles push balls AWAY from walls (toward center)
    // Left wall: positive angle (slopes down-right)
    // Right wall: negative angle (slopes down-left)
    if (stageHeight > 120) {
      const guideY1 = startY + 30;
      const guideY2 = endY - 30;
      const guideWidth = 60;

      // Entry guides - push toward center
      this.addObstacle(wallMargin, guideY1, guideWidth, 10, 0.2);
      this.addObstacle(
        this.width - wallMargin - guideWidth,
        guideY1,
        guideWidth,
        10,
        -0.2
      );

      // Exit guides - push toward center
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
    this.gameState = "racing";
    this.startBtn.disabled = true;
    this.editBtn.disabled = true;
    this.currentScrollY = 0;
    this.targetScrollY = 0;
    this.canvasWrapper.scrollTop = 0;
    this.physics.setGravity(0, parseFloat(this.gravitySlider.value));
  }

  reset() {
    this.gameState = "waiting";
    this.startBtn.disabled = this.editMode;
    this.editBtn.disabled = false;
    this.winnerOverlay.classList.remove("active");
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
    if (!this.editMode || !this.mouseOnCanvas) return;

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

      this.ctx.strokeStyle = stage.type === "windmill" ? "#e0e0ff" : "#ffe0e0";
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
      const label = stage.type === "windmill" ? "WIATRAKI" : "BELKI";
      this.ctx.fillText(label, 5, stage.startY + 12);
    }
  }

  draw() {
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw stage indicators
    this.drawStageIndicators();

    // Center line (for mirror reference)
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

    // Symmetry axis (always visible, subtle)
    this.ctx.strokeStyle = "#f0f0f0";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 80);
    this.ctx.lineTo(this.width / 2, this.finishLine);
    this.ctx.stroke();

    // Start line
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, 80);
    this.ctx.lineTo(this.width, 80);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Finish line - checkerboard
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

    // Edit mode zone indicators
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

    // Draw obstacles and players
    this.physics.draw(this.ctx);

    // Player labels
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

    // Draw obstacle preview in edit mode
    this.drawObstaclePreview();
  }

  gameLoop(timestamp) {
    if (this.lastTime === 0) this.lastTime = timestamp;
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedDt) {
      if (this.gameState === "racing") {
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
