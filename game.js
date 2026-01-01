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
    this.generateTrack();
    this.createPlayers();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startRace());
    this.resetBtn.addEventListener("click", () => this.reset());
    this.editBtn.addEventListener("click", () => this.toggleEditMode());
    this.clearTrackBtn.addEventListener("click", () => this.clearTrack());
    this.randomTrackBtn.addEventListener("click", () => this.generateTrack());

    // Obstacle type selection
    this.typeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.typeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.obstacleType = btn.dataset.type;

        // Show/hide settings
        this.rectangleSettings.style.display =
          this.obstacleType === "rectangle" ? "block" : "none";
        this.windmillSettings.style.display =
          this.obstacleType === "windmill" ? "block" : "none";
      });
    });

    // Canvas events for adding obstacles
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
      const value = parseInt(e.target.value);
      this.obstacleAngleValue.textContent = value + "°";
    });

    this.obstacleWidthSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.obstacleWidthValue.textContent = value;
    });

    // Windmill sliders
    this.windmillSizeSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.windmillSizeValue.textContent = value;
    });

    this.windmillSpeedSlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      this.windmillSpeedValue.textContent = value.toFixed(2);
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
    this.reset();
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.editBtn.classList.toggle("active", this.editMode);
    this.editHint.classList.toggle("visible", this.editMode);

    if (this.editMode) {
      this.reset();
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

    // Don't add obstacles in start/finish zones
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

    this.player1 = new Circle(this.width * 0.35, 50, 18, 1);
    this.player1.restitution = bounce;
    this.player1.friction = friction;

    this.player2 = new Circle(this.width * 0.65, 50, 18, 1);
    this.player2.restitution = bounce;
    this.player2.friction = friction;

    this.physics.addBody(this.player1);
    this.physics.addBody(this.player2);
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
    this.reset();
  }

  generateTrack() {
    this.clearTrack();

    const numRows = Math.floor((this.height - 160) / 70);
    const rowHeight = (this.height - 160) / numRows;
    const startY = 100;

    for (let row = 0; row < numRows; row++) {
      const y = startY + row * rowHeight;
      const config = Math.floor(Math.random() * 6);

      switch (config) {
        case 0:
          this.addObstacle(20, y, 160, 12, (Math.random() - 0.5) * 0.3);
          break;
        case 1:
          this.addObstacle(
            this.width - 180,
            y,
            160,
            12,
            (Math.random() - 0.5) * 0.3
          );
          break;
        case 2:
          this.addObstacle(
            this.width / 2 - 70,
            y,
            140,
            12,
            (Math.random() - 0.5) * 0.4
          );
          break;
        case 3:
          this.addObstacle(15, y, 100, 12, 0.2);
          this.addObstacle(this.width - 115, y, 100, 12, -0.2);
          break;
        case 4:
          const offsetX = row % 2 === 0 ? 40 : this.width - 170;
          this.addObstacle(offsetX, y, 130, 10, row % 2 === 0 ? 0.25 : -0.25);
          break;
        case 5:
          // Add windmill
          const wmX = 100 + Math.random() * (this.width - 200);
          const wmDir = Math.random() > 0.5 ? 1 : -1;
          this.addWindmill(wmX, y + 20, 50, 0.03, wmDir);
          break;
      }

      if (Math.random() > 0.7) {
        const smallX = 60 + Math.random() * (this.width - 150);
        this.addObstacle(
          smallX,
          y + rowHeight / 2,
          50,
          10,
          (Math.random() - 0.5) * 0.5
        );
      }
    }

    this.createPlayers();
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
    this.physics.setGravity(0, 0);
    this.currentScrollY = 0;
    this.targetScrollY = 0;
    this.canvasWrapper.scrollTop = 0;

    this.physics.removeBody(this.player1);
    this.physics.removeBody(this.player2);
    this.createPlayers();
  }

  autoScroll() {
    if (this.gameState !== "racing") return;

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

    // Draw arms preview
    for (let i = 0; i < 4; i++) {
      const armAngle = (i * Math.PI * 2) / 4;
      this.ctx.save();
      this.ctx.rotate(armAngle);
      this.ctx.strokeRect(-5, -size, 10, size);
      this.ctx.restore();
    }

    // Draw center
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
    this.ctx.setLineDash([]);
  }

  draw() {
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.width, this.height);

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
