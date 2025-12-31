/**
 * Wyścig Grawitacyjny - Minimalistyczna wersja
 */

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.width = 600;
    this.height = 800;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.physics = new PhysicsEngine();
    this.physics.setBounds(0, this.width, 0, this.height);

    this.player1 = null;
    this.player2 = null;

    this.gameState = "waiting";
    this.wins = { player1: 0, player2: 0 };

    this.finishLine = this.height - 40;

    this.startBtn = document.getElementById("startBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.newTrackBtn = document.getElementById("newTrackBtn");
    this.winnerOverlay = document.getElementById("winnerOverlay");
    this.winnerText = document.getElementById("winnerText");
    this.wins1El = document.getElementById("wins1");
    this.wins2El = document.getElementById("wins2");

    this.gravitySlider = document.getElementById("gravity");
    this.bounceSlider = document.getElementById("bounce");
    this.frictionSlider = document.getElementById("friction");
    this.gravityValue = document.getElementById("gravityValue");
    this.bounceValue = document.getElementById("bounceValue");
    this.frictionValue = document.getElementById("frictionValue");

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
    this.newTrackBtn.addEventListener("click", () => this.newTrack());

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

  generateTrack() {
    this.physics.clear();

    const numRows = 9;
    const rowHeight = (this.height - 160) / numRows;
    const startY = 100;

    for (let row = 0; row < numRows; row++) {
      const y = startY + row * rowHeight;
      const config = Math.floor(Math.random() * 5);

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
      }

      if (Math.random() > 0.65) {
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
  }

  addObstacle(x, y, width, height, angle = 0) {
    const obstacle = new Rectangle(x, y, width, height);
    obstacle.angle = angle;
    this.physics.addBody(obstacle);
  }

  startRace() {
    if (this.gameState !== "waiting") return;
    this.gameState = "racing";
    this.startBtn.disabled = true;
    this.physics.setGravity(0, parseFloat(this.gravitySlider.value));
  }

  reset() {
    this.gameState = "waiting";
    this.startBtn.disabled = false;
    this.winnerOverlay.classList.remove("active");
    this.physics.setGravity(0, 0);

    this.physics.removeBody(this.player1);
    this.physics.removeBody(this.player2);
    this.createPlayers();
  }

  newTrack() {
    this.reset();
    this.generateTrack();
    this.createPlayers();
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
    }
  }

  draw() {
    // Białe tło
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Linia startu
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, 80);
    this.ctx.lineTo(this.width, 80);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Linia mety - szachownica
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

    // Rysuj przeszkody i graczy
    this.physics.draw(this.ctx);

    // Etykiety graczy
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

  gameLoop(timestamp) {
    if (this.lastTime === 0) this.lastTime = timestamp;
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.accumulator += deltaTime;

    // Fixed timestep dla stabilnej fizyki
    while (this.accumulator >= this.fixedDt) {
      if (this.gameState === "racing") {
        this.physics.update(1);
      }
      this.accumulator -= this.fixedDt;
    }

    this.draw();
    this.checkWinner();

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
