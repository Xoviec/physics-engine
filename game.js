/**
 * Wyścig Grawitacyjny - z edytorem toru
 */

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvasWrapper = document.getElementById("canvasWrapper");

    // Resolution presets
    this.resolutions = {
      tiktok: { width: 450, height: 800 }, // 9:16 TikTok/Reels
      wide: { width: 854, height: 480 }, // 16:9 widescreen
    };
    this.currentResolution = "tiktok";

    this.width = this.resolutions.tiktok.width;
    this.height = this.resolutions.tiktok.height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.physics = new PhysicsEngine();
    this.physics.setBounds(0, this.width, 0, this.height);

    // Multiple players support
    this.players = [];
    this.numBalls = 2; // Default number of balls
    this.playerColors = [
      "#e74c3c", // red
      "#3498db", // blue
      "#2ecc71", // green
      "#f39c12", // orange
      "#9b59b6", // purple
      "#1abc9c", // teal
      "#e91e63", // pink
      "#00bcd4", // cyan
      "#ff5722", // deep orange
      "#607d8b", // blue grey
      "#795548", // brown
      "#cddc39", // lime
      "#673ab7", // deep purple
      "#009688", // teal dark
      "#ff9800", // amber
      "#4caf50", // green dark
    ];
    this.avatarImages = []; // Array of avatar images

    this.gameState = "waiting";
    this.editMode = false;
    this.gameMode = "stages"; // "stages" or "serpentine"
    this.wins = []; // Array of wins per player
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
    this.spinnerRadius = Math.min(100, this.width * 0.22); // Scale with width
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
    this.spinnerStartCheckbox = document.getElementById("spinnerStart");
    this.showIntroCheckbox = document.getElementById("showIntro");
    this.introOverlay = document.getElementById("introOverlay");
    this.introContent = document.getElementById("introContent");
    this.modeButtons = document.querySelectorAll(".mode-btn");

    // Track management elements
    this.trackNameInput = document.getElementById("trackName");
    this.saveTrackBtn = document.getElementById("saveTrackBtn");
    this.refreshTracksBtn = document.getElementById("refreshTracksBtn");
    this.trackList = document.getElementById("trackList");
    this.mergeTrackCheckbox = document.getElementById("mergeTrack");
    this.avatarOverlay = document.getElementById("avatarOverlay");
    this.avatarDivs = []; // HTML divs for high-quality avatar rendering
    this.avatarDataUrls = []; // Store original data URLs for high-quality rendering
    this.playerSounds = []; // Audio objects for each player
    this.currentLeader = -1; // Index of current leader (for sound switching)
    this.introPlaying = false; // Track if intro is playing

    // Obstacle type buttons
    this.typeButtons = document.querySelectorAll(".type-btn");
    this.rectangleSettings = document.getElementById("rectangleSettings");
    this.windmillSettings = document.getElementById("windmillSettings");

    // Sliders
    this.numBallsSlider = document.getElementById("numBalls");
    this.gravitySlider = document.getElementById("gravity");
    this.bounceSlider = document.getElementById("bounce");
    this.frictionSlider = document.getElementById("friction");
    this.trackLengthSlider = document.getElementById("trackLength");
    this.obstacleAngleSlider = document.getElementById("obstacleAngle");
    this.obstacleWidthSlider = document.getElementById("obstacleWidth");
    this.windmillSizeSlider = document.getElementById("windmillSize");
    this.windmillSpeedSlider = document.getElementById("windmillSpeed");
    this.windmillDirSelect = document.getElementById("windmillDir");

    // Avatar elements - dynamic container
    this.avatarUploadContainer = document.getElementById(
      "avatarUploadContainer"
    );

    // Value displays
    this.numBallsValue = document.getElementById("numBallsValue");
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
    // Set avatar overlay height to match canvas
    this.avatarOverlay.style.height = `${this.height}px`;
    // Set canvas wrapper max height
    this.canvasWrapper.style.maxHeight = `${Math.min(this.height, 700)}px`;
    // Generate avatar input fields for current number of balls
    this.generateAvatarInputs();
    // Start with empty track - user can click "Losowy tor" or load from DB
    this.createPlayers();
    // Initialize Supabase for track storage
    this.initSupabase();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startRace());
    this.resetBtn.addEventListener("click", () => this.reset());
    this.editBtn.addEventListener("click", () => this.toggleEditMode());
    this.clearTrackBtn.addEventListener("click", () => this.clearTrack());
    this.randomTrackBtn.addEventListener("click", () => this.generateTrack());

    // Track management
    this.saveTrackBtn.addEventListener("click", () => this.saveTrack());
    this.refreshTracksBtn.addEventListener("click", () => this.loadTrackList());

    // Game mode selection
    this.modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.modeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.gameMode = btn.dataset.mode;
        this.generateTrack();
      });
    });

    // Resolution selection
    this.resolutionButtons = document.querySelectorAll(".resolution-btn");
    this.resolutionButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.resolutionButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.setResolution(btn.dataset.resolution);
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

    // Number of balls slider
    this.numBallsSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.numBalls = value;
      this.numBallsValue.textContent = value;
      this.generateAvatarInputs();
      if (this.gameState === "waiting") {
        this.resetPlayers();
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
      for (const player of this.players) {
        player.restitution = value;
      }
      this.bounceValue.textContent = value.toFixed(1);
    });

    this.frictionSlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      for (const player of this.players) {
        player.friction = value;
      }
      this.frictionValue.textContent = value.toFixed(2);
    });

    // Avatar upload handlers are set up dynamically in generateAvatarInputs()

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
    this.avatarOverlay.style.height = `${this.height}px`;
    this.physics.setBounds(0, this.width, 0, this.height);
    this.finishLine = this.height - 40;
    // Don't auto-generate track - user decides when to generate
    this.resetPlayers();
  }

  setResolution(resolutionKey) {
    if (!this.resolutions[resolutionKey]) return;

    this.currentResolution = resolutionKey;
    const res = this.resolutions[resolutionKey];

    this.width = res.width;
    this.height = res.height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.avatarOverlay.style.height = `${this.height}px`;
    this.physics.setBounds(0, this.width, 0, this.height);
    this.finishLine = this.height - 40;

    // Scale spinner radius with width
    this.spinnerRadius = Math.min(100, this.width * 0.22);

    // Update track length slider to match new height
    if (this.trackLengthSlider) {
      this.trackLengthSlider.value = this.height;
      this.trackLengthValue.textContent = this.height;
    }

    // Update canvas wrapper max-height based on resolution
    this.canvasWrapper.style.maxHeight = `${Math.min(res.height, 700)}px`;

    // Don't auto-generate track - user decides when to generate
    this.resetPlayers();
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
    const radius = this.gameMode === "serpentine" ? 15 : 18;

    this.players = [];

    // Clear old avatar divs
    this.clearAvatarDivs();

    // Initialize wins array if needed
    while (this.wins.length < this.numBalls) {
      this.wins.push(0);
    }

    for (let i = 0; i < this.numBalls; i++) {
      let x, y;

      if (this.gameMode === "serpentine") {
        // In serpentine mode, stack players vertically at start
        x = 80 + (i % 2) * 40;
        y = 70 + Math.floor(i / 2) * 30;
      } else {
        // Spread players across the width
        const spacing = this.width / (this.numBalls + 1);
        x = spacing * (i + 1);
        y = 50;
      }

      const player = new Circle(x, y, radius, 1);
      player.restitution = bounce;
      player.friction = friction;
      player.color = this.playerColors[i % this.playerColors.length];
      player.avatarDiv = null; // Reference to HTML div

      // Apply avatar if loaded and create div
      if (this.avatarImages[i]) {
        player.image = this.avatarImages[i];
        this.createAvatarDiv(player, i, radius);
      }

      this.players.push(player);
      this.physics.addBody(player);
    }

    // Keep backwards compatibility
    this.player1 = this.players[0] || null;
    this.player2 = this.players[1] || null;
  }

  createAvatarDiv(player, index, radius) {
    // Create HTML div for high-quality avatar rendering
    const div = document.createElement("div");
    div.className = "avatar-ball";
    div.style.width = `${radius * 2}px`;
    div.style.height = `${radius * 2}px`;
    div.style.borderColor = player.color;

    // Use original file URL for best quality
    const img = document.createElement("img");
    if (this.avatarDataUrls && this.avatarDataUrls[index]) {
      img.src = this.avatarDataUrls[index];
    }
    div.appendChild(img);

    this.avatarOverlay.appendChild(div);
    this.avatarDivs.push(div);
    player.avatarDiv = div;
  }

  clearAvatarDivs() {
    for (const div of this.avatarDivs) {
      div.remove();
    }
    this.avatarDivs = [];
  }

  updateAvatarDivPositions() {
    for (const player of this.players) {
      if (player.avatarDiv) {
        // Position relative to canvas, accounting for scroll
        const x = player.position.x;
        const y = player.position.y;
        player.avatarDiv.style.left = `${x}px`;
        player.avatarDiv.style.top = `${y}px`;
        player.avatarDiv.style.transform = `translate(-50%, -50%) rotate(${player.angle}rad)`;
      }
    }
  }

  generateAvatarInputs() {
    // Clear existing inputs
    this.avatarUploadContainer.innerHTML = "";

    // Create input for each ball
    for (let i = 0; i < this.numBalls; i++) {
      const playerNum = i + 1;
      const color = this.playerColors[i % this.playerColors.length];

      const item = document.createElement("div");
      item.className = "avatar-item";

      const label = document.createElement("label");
      label.textContent = `${playerNum}:`;
      label.style.color = color;
      label.style.fontWeight = "bold";

      const preview = document.createElement("div");
      preview.className = "avatar-preview";
      preview.id = `avatarPreview${playerNum}`;
      preview.style.borderColor = color;

      // Show existing avatar if loaded
      if (this.avatarDataUrls[i]) {
        preview.innerHTML = `<img src="${this.avatarDataUrls[i]}" alt="Avatar ${playerNum}">`;
      }

      // Avatar image input
      const imgInput = document.createElement("input");
      imgInput.type = "file";
      imgInput.accept = "image/*";
      imgInput.title = "Avatar";
      imgInput.addEventListener("change", (e) => {
        this.loadAvatar(e.target.files[0], playerNum);
      });

      // Sound input
      const soundInput = document.createElement("input");
      soundInput.type = "file";
      soundInput.accept = "audio/*";
      soundInput.title = "Dźwięk";
      soundInput.className = "sound-input";
      soundInput.addEventListener("change", (e) => {
        this.loadSound(e.target.files[0], playerNum);
      });

      // Sound indicator
      const soundIndicator = document.createElement("span");
      soundIndicator.className = "sound-indicator";
      soundIndicator.id = `soundIndicator${playerNum}`;
      soundIndicator.textContent = this.playerSounds[i] ? "🔊" : "";

      const clearBtn = document.createElement("button");
      clearBtn.className = "btn-small";
      clearBtn.textContent = "✕";
      clearBtn.addEventListener("click", () => {
        this.clearAvatar(playerNum);
        this.clearSound(playerNum);
        imgInput.value = "";
        soundInput.value = "";
      });

      item.appendChild(label);
      item.appendChild(preview);
      item.appendChild(imgInput);
      item.appendChild(soundInput);
      item.appendChild(soundIndicator);
      item.appendChild(clearBtn);

      this.avatarUploadContainer.appendChild(item);
    }
  }

  async loadAvatar(file, playerNum) {
    if (!file) return;

    // Target size for avatar (accounting for device pixel ratio for crisp rendering)
    const dpr = window.devicePixelRatio || 1;
    const targetSize = Math.round(100 * dpr); // 100px base size * pixel ratio

    try {
      // First load the image to get dimensions
      const imgBitmap = await createImageBitmap(file);
      const { width, height } = imgBitmap;

      // Calculate "cover" crop - square from center
      let sx, sy, sSize;
      if (width > height) {
        // Landscape - crop sides
        sSize = height;
        sx = (width - height) / 2;
        sy = 0;
      } else {
        // Portrait or square - crop top/bottom
        sSize = width;
        sx = 0;
        sy = (height - width) / 2;
      }

      // Create cropped and scaled bitmap with high quality
      const bitmap = await createImageBitmap(imgBitmap, sx, sy, sSize, sSize, {
        resizeWidth: targetSize,
        resizeHeight: targetSize,
        resizeQuality: "high",
      });

      // Store in avatarImages array (0-indexed)
      const idx = playerNum - 1;
      this.avatarImages[idx] = bitmap;

      // Also load original for preview and high-quality div
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        this.avatarDataUrls[idx] = dataUrl;

        // Update preview (dynamic element)
        const preview = document.getElementById(`avatarPreview${playerNum}`);
        if (preview) {
          preview.innerHTML = `<img src="${dataUrl}" alt="Avatar ${playerNum}">`;
        }

        // Update or create avatar div for existing player
        if (this.players[idx]) {
          const player = this.players[idx];
          player.image = bitmap;

          // Remove old div if exists
          if (player.avatarDiv) {
            player.avatarDiv.remove();
            const divIdx = this.avatarDivs.indexOf(player.avatarDiv);
            if (divIdx > -1) this.avatarDivs.splice(divIdx, 1);
          }

          // Create new div with high-quality image
          const radius = this.gameMode === "serpentine" ? 15 : 18;
          this.createAvatarDiv(player, idx, radius);

          // Update img src
          if (player.avatarDiv) {
            const img = player.avatarDiv.querySelector("img");
            if (img) img.src = dataUrl;
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error loading avatar:", err);
    }
  }

  clearAvatar(playerNum) {
    const idx = playerNum - 1;
    this.avatarImages[idx] = null;
    this.avatarDataUrls[idx] = null;

    if (this.players[idx]) {
      const player = this.players[idx];
      player.image = null;

      // Remove avatar div
      if (player.avatarDiv) {
        player.avatarDiv.remove();
        const divIdx = this.avatarDivs.indexOf(player.avatarDiv);
        if (divIdx > -1) this.avatarDivs.splice(divIdx, 1);
        player.avatarDiv = null;
      }
    }

    // Clear preview (dynamic element)
    const preview = document.getElementById(`avatarPreview${playerNum}`);
    if (preview) {
      preview.innerHTML = "";
    }
  }

  loadSound(file, playerNum) {
    if (!file) return;

    const idx = playerNum - 1;
    const reader = new FileReader();

    reader.onload = (e) => {
      // Stop and remove old sound if exists
      if (this.playerSounds[idx]) {
        this.playerSounds[idx].pause();
        this.playerSounds[idx] = null;
      }

      // Create new Audio object
      const audio = new Audio(e.target.result);
      audio.loop = true;
      this.playerSounds[idx] = audio;

      // Update indicator
      const indicator = document.getElementById(`soundIndicator${playerNum}`);
      if (indicator) {
        indicator.textContent = "🔊";
      }
    };

    reader.readAsDataURL(file);
  }

  clearSound(playerNum) {
    const idx = playerNum - 1;

    // Stop and remove sound
    if (this.playerSounds[idx]) {
      this.playerSounds[idx].pause();
      this.playerSounds[idx] = null;
    }

    // Update indicator
    const indicator = document.getElementById(`soundIndicator${playerNum}`);
    if (indicator) {
      indicator.textContent = "";
    }

    // Reset leader if this was the leader
    if (this.currentLeader === idx) {
      this.currentLeader = -1;
    }
  }

  updateLeaderSound() {
    if (this.gameState !== "racing" || this.players.length === 0) {
      // Stop all sounds when not racing
      if (this.currentLeader !== -1 && this.playerSounds[this.currentLeader]) {
        this.playerSounds[this.currentLeader].pause();
      }
      this.currentLeader = -1;
      return;
    }

    // Find the leader (player closest to finish line = highest Y position)
    let leaderIdx = 0;
    let maxY = this.players[0].position.y;

    for (let i = 1; i < this.players.length; i++) {
      if (this.players[i].position.y > maxY) {
        maxY = this.players[i].position.y;
        leaderIdx = i;
      }
    }

    // If leader changed, switch sounds
    if (leaderIdx !== this.currentLeader) {
      // Stop previous leader's sound
      if (this.currentLeader !== -1 && this.playerSounds[this.currentLeader]) {
        this.playerSounds[this.currentLeader].pause();
      }

      // Play new leader's sound
      if (this.playerSounds[leaderIdx]) {
        this.playerSounds[leaderIdx].currentTime = 0;
        this.playerSounds[leaderIdx].play().catch(() => {});
      }

      this.currentLeader = leaderIdx;
    }
  }

  stopAllSounds() {
    for (const sound of this.playerSounds) {
      if (sound) {
        sound.pause();
        sound.currentTime = 0;
      }
    }
    this.currentLeader = -1;
  }

  removePlayers() {
    for (const player of this.players) {
      this.physics.removeBody(player);
    }
    this.players = [];
    this.player1 = null;
    this.player2 = null;
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

  addWindmill(x, y, armLength, speed, direction, numArms = 4) {
    const windmill = new Windmill(x, y, armLength, numArms);
    windmill.rotationSpeed = speed;
    windmill.direction = direction;
    this.windmills.push(windmill);
    this.physics.addBody(windmill);
  }

  startRace() {
    if (this.gameState !== "waiting" || this.editMode || this.introPlaying)
      return;

    this.startBtn.disabled = true;
    this.editBtn.disabled = true;

    // Check if intro should be shown
    const showIntro = this.showIntroCheckbox && this.showIntroCheckbox.checked;

    if (showIntro) {
      this.playIntro(() => {
        this.beginRace();
      });
    } else {
      this.beginRace();
    }
  }

  playIntro(callback) {
    this.introPlaying = true;
    this.gameState = "intro";
    this.stopAllSounds();

    // Check if spinner should be used
    const useSpinner =
      this.spinnerStartCheckbox && this.spinnerStartCheckbox.checked;

    if (useSpinner) {
      // Start spinner during intro
      this.spinnerAngle = 0;
      this.spinnerSpeed = 0.015;

      // Position players inside spinner
      const centerX = this.gameMode === "serpentine" ? 100 : this.width / 2;
      const centerY = 90;
      const numPlayers = this.players.length;
      const arrangeRadius = Math.min(40, this.spinnerRadius * 0.4);

      for (let i = 0; i < numPlayers; i++) {
        const angle = (i / numPlayers) * Math.PI * 2 - Math.PI / 2;
        this.players[i].position.x = centerX + Math.cos(angle) * arrangeRadius;
        this.players[i].position.y = centerY + Math.sin(angle) * arrangeRadius;
        this.players[i].velocity.x = 0;
        this.players[i].velocity.y = 0;
      }
    }

    // Build intro content
    this.introContent.innerHTML = "";
    this.introOverlay.classList.add("active");

    const elements = [];

    // Create elements for each player
    for (let i = 0; i < this.numBalls; i++) {
      // Add VS before player (except first)
      if (i > 0) {
        const vs = document.createElement("div");
        vs.className = "intro-vs";
        vs.textContent = "VS";
        this.introContent.appendChild(vs);
        elements.push({ type: "vs", element: vs });
      }

      // Add player avatar
      const playerDiv = document.createElement("div");
      playerDiv.className = "intro-player";
      playerDiv.style.color = this.playerColors[i % this.playerColors.length];

      const avatarDiv = document.createElement("div");
      avatarDiv.className = "intro-avatar";
      avatarDiv.style.borderColor =
        this.playerColors[i % this.playerColors.length];

      if (this.avatarDataUrls[i]) {
        const img = document.createElement("img");
        img.src = this.avatarDataUrls[i];
        avatarDiv.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "placeholder";
        avatarDiv.appendChild(placeholder);
      }

      playerDiv.appendChild(avatarDiv);
      this.introContent.appendChild(playerDiv);
      elements.push({ type: "player", element: playerDiv, index: i });
    }

    // Animate elements sequentially
    let currentIndex = 0;
    const showDelay = 1100; // 1.1 seconds per reveal

    const showNext = () => {
      if (currentIndex >= elements.length) {
        // All shown, wait a moment then finish
        setTimeout(() => {
          this.hideIntro();
          callback();
        }, 1000);
        return;
      }

      const item = elements[currentIndex];

      if (item.type === "vs") {
        // Show VS
        item.element.classList.add("visible");
        currentIndex++;
        setTimeout(showNext, 300); // Short delay before next player
      } else {
        // Show player and play sound
        item.element.classList.add("visible");

        // Play player's sound if available
        if (this.playerSounds[item.index]) {
          this.stopAllSounds();
          this.playerSounds[item.index].currentTime = 0;
          this.playerSounds[item.index].play().catch(() => {});
        }

        currentIndex++;
        setTimeout(showNext, showDelay);
      }
    };

    // Start showing elements after brief delay
    setTimeout(showNext, 500);
  }

  updateIntroSpinner() {
    // Update spinner animation during intro
    if (this.gameState !== "intro") return;

    const useSpinner =
      this.spinnerStartCheckbox && this.spinnerStartCheckbox.checked;
    if (!useSpinner) return;

    // Gradually speed up spinner
    this.spinnerSpeed = Math.min(0.06, this.spinnerSpeed + 0.0001);
    this.spinnerAngle += this.spinnerSpeed;

    // Apply spinner physics to balls (tumbling effect)
    const centerX = this.gameMode === "serpentine" ? 100 : this.width / 2;
    const centerY = 90;
    const radius = this.spinnerRadius;
    const gravity = parseFloat(this.gravitySlider.value);
    const spinnerFriction = 0.03;

    for (const ball of this.players) {
      // Apply gravity
      ball.velocity.y += gravity;

      // Apply friction
      ball.velocity.x *= 1 - spinnerFriction;
      ball.velocity.y *= 1 - spinnerFriction;

      // Constrain to spinner circle
      const dx = ball.position.x - centerX;
      const dy = ball.position.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = radius - ball.radius - 1;

      // Calculate tangent direction (rotation direction)
      const tangentX = -dy / (dist || 1);
      const tangentY = dx / (dist || 1);

      // Apply continuous rotational drag from spinning drum
      const dragStrength = (dist / radius) * this.spinnerSpeed * 8;
      ball.velocity.x += tangentX * dragStrength;
      ball.velocity.y += tangentY * dragStrength;

      if (dist > maxDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        ball.position.x = centerX + nx * maxDist;
        ball.position.y = centerY + ny * maxDist;

        const dot = ball.velocity.x * nx + ball.velocity.y * ny;
        if (dot > 0) {
          ball.velocity.x -= (1 + ball.restitution * 0.4) * dot * nx;
          ball.velocity.y -= (1 + ball.restitution * 0.4) * dot * ny;
        }

        const wallPush = this.spinnerSpeed * 12;
        ball.velocity.x += tangentX * wallPush;
        ball.velocity.y += tangentY * wallPush;
      }

      ball.position.x += ball.velocity.x;
      ball.position.y += ball.velocity.y;
    }

    // Ball-to-ball collisions inside spinner
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i];
        const b = this.players[j];

        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) / 2;

          a.position.x -= nx * overlap;
          a.position.y -= ny * overlap;
          b.position.x += nx * overlap;
          b.position.y += ny * overlap;

          const relVel =
            (a.velocity.x - b.velocity.x) * nx +
            (a.velocity.y - b.velocity.y) * ny;
          if (relVel > 0) {
            const restitution = 0.75;
            a.velocity.x -= relVel * nx * restitution;
            a.velocity.y -= relVel * ny * restitution;
            b.velocity.x += relVel * nx * restitution;
            b.velocity.y += relVel * ny * restitution;
          }
        }
      }
    }

    // Clamp velocities
    const maxSpeed = 30;
    for (const ball of this.players) {
      const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        ball.velocity.x *= scale;
        ball.velocity.y *= scale;
      }
    }
  }

  hideIntro() {
    this.introPlaying = false;
    this.introOverlay.classList.remove("active");
    // Reset overlay position
    this.introOverlay.style.top = "0";
    this.introOverlay.style.height = "100%";
    this.stopAllSounds();
    // Clear confetti
    const confetti = this.introOverlay.querySelectorAll(".confetti");
    confetti.forEach((c) => c.remove());
  }

  beginRace() {
    this.currentScrollY = 0;
    this.targetScrollY = 0;
    this.canvasWrapper.scrollTop = 0;

    // Enable gravity
    this.physics.setGravity(0, parseFloat(this.gravitySlider.value));

    // Check if spinner was used during intro
    const useSpinner =
      this.spinnerStartCheckbox && this.spinnerStartCheckbox.checked;
    const hadIntro = this.showIntroCheckbox && this.showIntroCheckbox.checked;

    if (useSpinner && hadIntro) {
      // Spinner was already running during intro - release balls immediately
      this.gameState = "racing";
      // Balls already have velocity from spinner tumbling
      return;
    }

    if (useSpinner) {
      // Start countdown with spinner
      this.gameState = "countdown";
      this.countdownTime = 0;
      this.spinnerAngle = 0;
      this.spinnerSpeed = 0.015;

      // Position players inside spinner
      const centerX = this.gameMode === "serpentine" ? 100 : this.width / 2;
      const centerY = 90;

      // Arrange players in a circle inside spinner
      const numPlayers = this.players.length;
      const arrangeRadius = Math.min(40, this.spinnerRadius * 0.4);

      for (let i = 0; i < numPlayers; i++) {
        const angle = (i / numPlayers) * Math.PI * 2 - Math.PI / 2;
        this.players[i].position.x = centerX + Math.cos(angle) * arrangeRadius;
        this.players[i].position.y = centerY + Math.sin(angle) * arrangeRadius;
        this.players[i].velocity.x = 0;
        this.players[i].velocity.y = 0;
      }
    } else {
      // Start immediately without spinner - just go to racing
      this.gameState = "racing";

      // Reset velocities to ensure clean start
      for (const player of this.players) {
        player.velocity.x = 0;
        player.velocity.y = 0;
      }
    }
  }

  updateCountdown(dt) {
    if (this.gameState !== "countdown") return;

    this.countdownTime += dt;

    // Speed up spinner over time (but keep it reasonable)
    this.spinnerSpeed =
      0.015 + (this.countdownTime / this.countdownDuration) * 0.03;
    this.spinnerAngle += this.spinnerSpeed;

    const centerX = this.gameMode === "serpentine" ? 100 : this.width / 2;
    const centerY = 90;
    const radius = this.spinnerRadius;
    const gravity = parseFloat(this.gravitySlider.value);

    // Simple physics for balls inside spinner (separate from main physics)
    // Moderate friction for tumbling
    const spinnerFriction = 0.03;

    for (const ball of this.players) {
      // Apply gravity
      ball.velocity.y += gravity;

      // Apply friction
      ball.velocity.x *= 1 - spinnerFriction;
      ball.velocity.y *= 1 - spinnerFriction;

      // Constrain to spinner circle
      const dx = ball.position.x - centerX;
      const dy = ball.position.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = radius - ball.radius - 1;

      // Calculate tangent direction (rotation direction)
      const tangentX = -dy / (dist || 1);
      const tangentY = dx / (dist || 1);

      // Apply continuous rotational drag from spinning drum
      // Balls closer to the wall get more drag
      const dragStrength = (dist / radius) * this.spinnerSpeed * 8;
      ball.velocity.x += tangentX * dragStrength;
      ball.velocity.y += tangentY * dragStrength;

      if (dist > maxDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Push back inside
        ball.position.x = centerX + nx * maxDist;
        ball.position.y = centerY + ny * maxDist;

        // Reflect velocity off circular wall
        const dot = ball.velocity.x * nx + ball.velocity.y * ny;
        if (dot > 0) {
          ball.velocity.x -= (1 + ball.restitution * 0.4) * dot * nx;
          ball.velocity.y -= (1 + ball.restitution * 0.4) * dot * ny;
        }

        // Strong push from wall contact
        const wallPush = this.spinnerSpeed * 12;
        ball.velocity.x += tangentX * wallPush;
        ball.velocity.y += tangentY * wallPush;
      }

      // Update position
      ball.position.x += ball.velocity.x;
      ball.position.y += ball.velocity.y;
    }

    // Ball-to-ball collisions inside spinner
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i];
        const b = this.players[j];

        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) / 2;

          // Separate balls
          a.position.x -= nx * overlap;
          a.position.y -= ny * overlap;
          b.position.x += nx * overlap;
          b.position.y += ny * overlap;

          // Exchange velocities along collision normal (tennis ball bounce)
          const relVel =
            (a.velocity.x - b.velocity.x) * nx +
            (a.velocity.y - b.velocity.y) * ny;
          if (relVel > 0) {
            const restitution = 0.75; // Tennis ball-like bounce
            a.velocity.x -= relVel * nx * restitution;
            a.velocity.y -= relVel * ny * restitution;
            b.velocity.x += relVel * nx * restitution;
            b.velocity.y += relVel * ny * restitution;
          }
        }
      }
    }

    // Clamp all ball velocities to prevent extreme speeds
    const maxSpeed = 30;
    for (const ball of this.players) {
      const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        ball.velocity.x *= scale;
        ball.velocity.y *= scale;
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
    this.introOverlay.classList.remove("active");
    // Reset overlay position
    this.introOverlay.style.top = "0";
    this.introOverlay.style.height = "100%";
    this.introPlaying = false;
    this.spinnerSpeed = 0.08;
    this.countdownTime = 0;
    this.stopAllSounds();
    // Clear confetti
    const confetti = this.introOverlay.querySelectorAll(".confetti");
    confetti.forEach((c) => c.remove());
    this.resetPlayers();
  }

  autoScroll() {
    if (this.gameState !== "racing") return;
    if (this.players.length === 0) return;

    // Find lowest player
    const lowestY = Math.max(...this.players.map((p) => p.position.y));

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
    if (this.players.length === 0) return;

    // Check which players finished
    const finishedPlayers = this.players
      .map((p, i) => ({
        player: p,
        index: i,
        finished: p.position.y + p.radius >= this.finishLine,
      }))
      .filter((p) => p.finished);

    if (finishedPlayers.length > 0) {
      this.gameState = "finished";
      this.physics.setGravity(0, 0);
      this.stopAllSounds();

      // Winner is the one lowest (furthest ahead)
      let winner = finishedPlayers.reduce((a, b) =>
        a.player.position.y > b.player.position.y ? a : b
      );

      const winnerNum = winner.index + 1;
      this.wins[winner.index]++;

      // Update scoreboard for first two players
      if (this.wins[0] !== undefined) this.wins1El.textContent = this.wins[0];
      if (this.wins[1] !== undefined) this.wins2El.textContent = this.wins[1];

      // Show winner celebration on intro overlay
      this.showWinnerCelebration(winner.index, winnerNum);
    }
  }

  showWinnerCelebration(winnerIndex, winnerNum) {
    // Build winner celebration content
    this.introContent.innerHTML = "";

    // Clear any existing confetti
    const existingConfetti = this.introOverlay.querySelectorAll(".confetti");
    existingConfetti.forEach((c) => c.remove());

    // Add confetti
    this.createConfetti();

    // Winner avatar
    const playerDiv = document.createElement("div");
    playerDiv.className = "intro-player visible";
    playerDiv.style.color =
      this.playerColors[winnerIndex % this.playerColors.length];

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "intro-avatar winner-avatar";
    avatarDiv.style.borderColor =
      this.playerColors[winnerIndex % this.playerColors.length];
    avatarDiv.style.width = "120px";
    avatarDiv.style.height = "120px";

    if (this.avatarDataUrls[winnerIndex]) {
      const img = document.createElement("img");
      img.src = this.avatarDataUrls[winnerIndex];
      avatarDiv.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.style.width = "90px";
      placeholder.style.height = "90px";
      avatarDiv.appendChild(placeholder);
    }

    playerDiv.appendChild(avatarDiv);

    // Winner text
    const winnerText = document.createElement("div");
    winnerText.className = "intro-winner-text";
    winnerText.textContent = "WINNER";
    winnerText.style.color =
      this.playerColors[winnerIndex % this.playerColors.length];
    playerDiv.appendChild(winnerText);

    this.introContent.appendChild(playerDiv);

    // Position overlay at current scroll position
    const scrollTop = this.canvasWrapper.scrollTop;
    const viewHeight = this.canvasWrapper.clientHeight;
    this.introOverlay.style.top = scrollTop + "px";
    this.introOverlay.style.height = viewHeight + "px";
    this.introOverlay.classList.add("active");

    // Play winner's sound
    if (this.playerSounds[winnerIndex]) {
      this.playerSounds[winnerIndex].currentTime = 0;
      this.playerSounds[winnerIndex].play().catch(() => {});
    }

    this.startBtn.disabled = false;
    this.editBtn.disabled = false;
  }

  createConfetti() {
    const colors = [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#ffff00",
      "#ff00ff",
      "#00ffff",
      "#ffa500",
      "#ff69b4",
      "#gold",
      "#silver",
    ];
    const confettiCount = 60;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.left = Math.random() * 100 + "%";
      confetti.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 3 + "s";
      confetti.style.animationDuration = 2.5 + Math.random() * 2 + "s";
      confetti.style.setProperty("--drift", (Math.random() - 0.5) * 200 + "px");
      this.introOverlay.appendChild(confetti);
    }
  }

  // ==================== SUPABASE / TRACK MANAGEMENT ====================

  initSupabase() {
    // KONFIGURACJA - uzupełnij swoimi danymi z Supabase
    const SUPABASE_URL = "https://dxobcisdnaletsqxbvum.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4b2JjaXNkbmFsZXRzcXhidnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE1MzEsImV4cCI6MjA4Mjg2NzUzMX0.3Asyno_0bVQcgM7oo0weBzwTNUecbxW0dEgdp6Gs6Fk";

    if (SUPABASE_URL === "YOUR_SUPABASE_URL") {
      console.warn(
        "Supabase nie skonfigurowany - uzupełnij SUPABASE_URL i SUPABASE_ANON_KEY w game.js"
      );
      this.supabase = null;
      return;
    }

    this.supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
    this.loadTrackList();
  }

  exportTrack() {
    const trackData = {
      version: 1,
      trackLength: this.height,
      gameMode: this.gameMode,
      resolution: this.currentResolution,
      obstacles: [],
    };

    // Export beams
    for (const obs of this.obstacles) {
      trackData.obstacles.push({
        type: "rectangle",
        x: obs.position.x,
        y: obs.position.y,
        width: obs.width,
        height: obs.height,
        angle: obs.angle,
      });
    }

    // Export windmills
    for (const wm of this.windmills) {
      trackData.obstacles.push({
        type: "windmill",
        x: wm.position.x,
        y: wm.position.y,
        size: wm.armLength,
        speed: wm.rotationSpeed,
        direction: wm.direction,
        numArms: wm.armCount,
      });
    }

    return trackData;
  }

  importTrack(trackData, merge = false) {
    if (!merge) {
      // Clear current track properly (removes from physics engine)
      this.clearTrack();

      // Set resolution first
      if (trackData.resolution && this.resolutions[trackData.resolution]) {
        this.setResolution(trackData.resolution);
        // Update UI button
        this.resolutionButtons.forEach((btn) => {
          btn.classList.toggle(
            "active",
            btn.dataset.resolution === trackData.resolution
          );
        });
      }

      // Set track length
      if (trackData.trackLength) {
        this.setTrackLength(trackData.trackLength);
        // Update UI slider
        if (this.trackLengthSlider) {
          this.trackLengthSlider.value = trackData.trackLength;
          this.trackLengthValue.textContent = trackData.trackLength;
        }
      }

      // Set game mode
      if (trackData.gameMode) {
        this.gameMode = trackData.gameMode;
        // Update UI buttons
        this.modeButtons.forEach((btn) => {
          btn.classList.toggle(
            "active",
            btn.dataset.mode === trackData.gameMode
          );
        });
      }
    }

    // Import obstacles (always - either replace or merge)
    for (const obs of trackData.obstacles) {
      if (obs.type === "rectangle") {
        this.addObstacle(obs.x, obs.y, obs.width, obs.height, obs.angle);
      } else if (obs.type === "windmill") {
        this.addWindmill(
          obs.x,
          obs.y,
          obs.size,
          obs.speed,
          obs.direction,
          obs.numArms || 4
        );
      }
    }

    this.resetPlayers();
  }

  async saveTrack() {
    if (!this.supabase) {
      alert(
        "Supabase nie jest skonfigurowany.\nUzupełnij SUPABASE_URL i SUPABASE_ANON_KEY w game.js"
      );
      return;
    }

    const name = this.trackNameInput.value.trim();
    if (!name) {
      alert("Podaj nazwę trasy");
      return;
    }

    this.saveTrackBtn.disabled = true;
    this.saveTrackBtn.textContent = "⏳ Zapisuję...";

    try {
      const { data, error } = await this.supabase
        .from("tracks")
        .insert({
          name: name,
          track_data: this.exportTrack(),
          game_mode: this.gameMode,
          resolution: this.currentResolution,
        })
        .select()
        .single();

      if (error) throw error;

      this.trackNameInput.value = "";
      await this.loadTrackList();
      alert("Trasa zapisana!");
    } catch (err) {
      console.error("Błąd zapisu:", err);
      alert("Błąd zapisu: " + err.message);
    } finally {
      this.saveTrackBtn.disabled = false;
      this.saveTrackBtn.textContent = "💾 Zapisz";
    }
  }

  async loadTrackList() {
    if (!this.supabase) {
      this.trackList.innerHTML =
        '<div class="track-list-empty">Supabase nie skonfigurowany</div>';
      return;
    }

    this.trackList.innerHTML = '<div class="track-loading">Ładowanie...</div>';

    try {
      const { data, error } = await this.supabase
        .from("tracks")
        .select("id, name, game_mode, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) {
        this.trackList.innerHTML =
          '<div class="track-list-empty">Brak zapisanych tras</div>';
        return;
      }

      this.trackList.innerHTML = "";
      for (const track of data) {
        const item = document.createElement("div");
        item.className = "track-item";
        item.innerHTML = `
          <div class="track-item-info">
            <div class="track-item-name">${this.escapeHtml(track.name)}</div>
            <div class="track-item-meta">${
              track.game_mode || "stages"
            } • ${this.formatDate(track.created_at)}</div>
          </div>
          <div class="track-item-actions">
            <button class="track-item-btn load" data-id="${track.id}">▶</button>
            <button class="track-item-btn delete" data-id="${
              track.id
            }">✕</button>
          </div>
        `;

        item.querySelector(".load").addEventListener("click", (e) => {
          e.stopPropagation();
          this.loadTrack(track.id);
        });

        item.querySelector(".delete").addEventListener("click", (e) => {
          e.stopPropagation();
          this.deleteTrack(track.id, track.name);
        });

        this.trackList.appendChild(item);
      }
    } catch (err) {
      console.error("Błąd ładowania listy:", err);
      this.trackList.innerHTML =
        '<div class="track-error">Błąd ładowania tras</div>';
    }
  }

  async loadTrack(trackId) {
    if (!this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from("tracks")
        .select("*")
        .eq("id", trackId)
        .single();

      if (error) throw error;

      const merge = this.mergeTrackCheckbox.checked;
      this.importTrack(data.track_data, merge);

      if (merge) {
        alert(`Dodano trasę: ${data.name}`);
      } else {
        alert(`Wczytano trasę: ${data.name}`);
      }
    } catch (err) {
      console.error("Błąd wczytywania:", err);
      alert("Błąd wczytywania: " + err.message);
    }
  }

  async deleteTrack(trackId, trackName) {
    if (!this.supabase) return;

    if (!confirm(`Usunąć trasę "${trackName}"?`)) return;

    try {
      const { error } = await this.supabase
        .from("tracks")
        .delete()
        .eq("id", trackId);

      if (error) throw error;

      await this.loadTrackList();
    } catch (err) {
      console.error("Błąd usuwania:", err);
      alert("Błąd usuwania: " + err.message);
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  // ==================== END SUPABASE ====================

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

    // Draw spinner during intro or countdown
    if (this.gameState === "countdown" || this.gameState === "intro") {
      const useSpinner =
        this.spinnerStartCheckbox && this.spinnerStartCheckbox.checked;
      if (useSpinner) {
        this.drawSpinner();
      }
    }

    // Draw highlight for hovered element in move/delete mode
    if (this.editMode && this.hoveredElement && this.editorMode !== "add") {
      this.drawElementHighlight(this.hoveredElement);
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

    // Only show countdown text during countdown state (not intro)
    if (this.gameState === "countdown") {
      // Countdown number
      const secondsLeft = Math.ceil(
        (this.countdownDuration - this.countdownTime) / 1000
      );
      if (
        secondsLeft > 0 &&
        this.countdownTime < this.countdownDuration - 200
      ) {
        this.ctx.fillStyle = "#000";
        this.ctx.font = "bold 28px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(
          secondsLeft.toString(),
          centerX,
          centerY + radius + 30
        );
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

    // Update intro spinner (during VS intro)
    if (this.gameState === "intro") {
      this.updateIntroSpinner();
      // Update windmills during intro for visual effect
      for (const wm of this.windmills) {
        wm.update(1);
      }
    }

    // Update countdown spinner (has its own physics)
    if (this.gameState === "countdown") {
      this.updateCountdown(deltaTime);
      // Update windmills during countdown for visual effect
      for (const wm of this.windmills) {
        wm.update(1);
      }
    }

    while (this.accumulator >= this.fixedDt) {
      // Only run full physics during racing (not during countdown)
      if (this.gameState === "racing") {
        this.physics.update(1);
      }
      this.accumulator -= this.fixedDt;
    }

    this.draw();
    this.updateAvatarDivPositions();
    this.autoScroll();
    this.updateLeaderSound();
    this.checkWinner();

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
