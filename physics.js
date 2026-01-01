/**
 * Silnik Fizyki 2D - Zoptymalizowany
 */

class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  subtract(v) {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  multiply(scalar) {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  divide(scalar) {
    if (scalar === 0) return new Vector2D(0, 0);
    return new Vector2D(this.x / scalar, this.y / scalar);
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const mag = this.magnitude();
    if (mag === 0) return new Vector2D(0, 0);
    return this.divide(mag);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  static distance(v1, v2) {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

class PhysicsBody {
  constructor(x, y, mass = 1) {
    this.position = new Vector2D(x, y);
    this.velocity = new Vector2D(0, 0);
    this.acceleration = new Vector2D(0, 0);
    this.mass = mass;
    this.restitution = 0.7;
    this.friction = 0.01;
    this.isStatic = false;
  }

  applyForce(force) {
    const acc = force.divide(this.mass);
    this.acceleration = this.acceleration.add(acc);
  }

  update(dt) {
    if (this.isStatic) return;
    this.velocity = this.velocity.add(this.acceleration.multiply(dt));
    this.velocity = this.velocity.multiply(1 - this.friction);
    this.position = this.position.add(this.velocity.multiply(dt));
    this.acceleration = new Vector2D(0, 0);
  }
}

class Circle extends PhysicsBody {
  constructor(x, y, radius, mass = 1) {
    super(x, y, mass);
    this.radius = radius;
    this.type = "circle";
    this.color = "#000";
    this.image = null; // Avatar image
    this.angle = 0; // Rotation angle for avatar
    this.angularVelocity = 0;
  }

  update(dt) {
    if (this.isStatic) return;
    super.update(dt);
    // Update rotation based on horizontal velocity (rolling motion)
    // Angular velocity = linear velocity / radius
    this.angularVelocity = this.velocity.x / this.radius;
    this.angle += this.angularVelocity * dt * 0.1;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // If using HTML div for avatar, skip canvas drawing of image
    if (this.avatarDiv) {
      // Just draw colored circle outline (image rendered by HTML)
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.image) {
      // High quality image rendering (fallback if no HTML div)
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // White background for images with transparency
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();

      // Clip to circle
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.clip();

      // Apply rotation
      ctx.rotate(this.angle);

      // Draw pre-scaled high-quality image (already square from createImageBitmap)
      const diameter = this.radius * 2;
      ctx.drawImage(this.image, -this.radius, -this.radius, diameter, diameter);

      ctx.restore();

      // Draw thick border for visibility
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    } else {
      // Draw simple circle outline
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

class Rectangle extends PhysicsBody {
  constructor(x, y, width, height) {
    super(x, y, Infinity);
    this.width = width;
    this.height = height;
    this.type = "rectangle";
    this.isStatic = true;
    this.angle = 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(
      this.position.x + this.width / 2,
      this.position.y + this.height / 2
    );
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}

class Windmill extends PhysicsBody {
  constructor(x, y, armLength = 60, armCount = 4) {
    super(x, y, Infinity);
    this.type = "windmill";
    this.isStatic = true;
    this.armLength = armLength;
    this.armWidth = 10;
    this.armCount = armCount;
    this.angle = 0;
    this.rotationSpeed = 0.03; // Radians per frame
    this.direction = 1; // 1 = clockwise, -1 = counter-clockwise
  }

  update(dt) {
    this.angle += this.rotationSpeed * this.direction;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.angle);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;

    // Draw arms
    for (let i = 0; i < this.armCount; i++) {
      const armAngle = (i * Math.PI * 2) / this.armCount;
      ctx.save();
      ctx.rotate(armAngle);
      ctx.strokeRect(
        -this.armWidth / 2,
        -this.armLength,
        this.armWidth,
        this.armLength
      );
      ctx.restore();
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // Get arm rectangles for collision detection
  getArms() {
    const arms = [];
    for (let i = 0; i < this.armCount; i++) {
      const armAngle = this.angle + (i * Math.PI * 2) / this.armCount;
      arms.push({
        cx: this.position.x,
        cy: this.position.y,
        width: this.armWidth,
        height: this.armLength,
        angle: armAngle,
      });
    }
    return arms;
  }
}

class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.gravity = new Vector2D(0, 0.5);
    this.bounds = { left: 0, right: 800, top: 0, bottom: 600 };
    this.angleRandomness = 0.35;
    this.speedRandomness = 0.25;
  }

  addBody(body) {
    this.bodies.push(body);
  }

  removeBody(body) {
    const index = this.bodies.indexOf(body);
    if (index > -1) this.bodies.splice(index, 1);
  }

  clear() {
    this.bodies = [];
  }

  setGravity(x, y) {
    this.gravity = new Vector2D(x, y);
  }

  setBounds(left, right, top, bottom) {
    this.bounds = { left, right, top, bottom };
  }

  addRandomness(vx, vy, speed) {
    if (speed < 0.5) return { vx, vy };

    const randomAngle = (Math.random() - 0.5) * this.angleRandomness;
    const cos = Math.cos(randomAngle);
    const sin = Math.sin(randomAngle);

    let newVx = vx * cos - vy * sin;
    let newVy = vx * sin + vy * cos;

    // Speed multiplier capped to prevent extreme acceleration
    const speedMultiplier =
      1 + (Math.random() - 0.5) * this.speedRandomness * 0.5;
    newVx *= speedMultiplier;
    newVy *= speedMultiplier;

    return { vx: newVx, vy: newVy };
  }

  // Clamp velocity to prevent tunneling
  clampVelocity(body) {
    if (body.type !== "circle" || body.isStatic) return;

    // Max speed allows good rolling on inclines while preventing tunneling
    const maxSpeed = Math.min(body.radius * 2, 35);
    const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      body.velocity.x *= scale;
      body.velocity.y *= scale;
    }
  }

  update(dt) {
    for (const body of this.bodies) {
      if (!body.isStatic) {
        body.applyForce(this.gravity.multiply(body.mass));
      }
      body.update(dt);

      // Limit velocity before collision detection
      this.clampVelocity(body);
    }
    // Multiple collision iterations to ensure no penetration
    this.checkCollisions();
    this.checkBounds();

    // Final velocity clamp after all collisions resolved
    for (const body of this.bodies) {
      this.clampVelocity(body);
    }
  }

  checkCollisions() {
    // Run multiple iterations to resolve all penetrations
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < this.bodies.length; i++) {
        for (let j = i + 1; j < this.bodies.length; j++) {
          const bodyA = this.bodies[i];
          const bodyB = this.bodies[j];

          if (bodyA.type === "circle" && bodyB.type === "circle") {
            this.resolveCircleCircle(bodyA, bodyB);
          } else if (bodyA.type === "circle" && bodyB.type === "rectangle") {
            this.resolveCircleRectangle(bodyA, bodyB);
          } else if (bodyA.type === "rectangle" && bodyB.type === "circle") {
            this.resolveCircleRectangle(bodyB, bodyA);
          } else if (bodyA.type === "circle" && bodyB.type === "windmill") {
            this.resolveCircleWindmill(bodyA, bodyB);
          } else if (bodyA.type === "windmill" && bodyB.type === "circle") {
            this.resolveCircleWindmill(bodyB, bodyA);
          }
        }
      }
    }
  }

  resolveCircleCircle(circleA, circleB) {
    const dx = circleB.position.x - circleA.position.x;
    const dy = circleB.position.y - circleA.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = circleA.radius + circleB.radius;

    if (distance < minDistance && distance > 0) {
      const nx = dx / distance;
      const ny = dy / distance;
      const penetration = minDistance - distance;

      // Separate balls with small buffer
      const separationBuffer = 1.02;
      if (!circleA.isStatic && !circleB.isStatic) {
        circleA.position.x -= (nx * penetration * separationBuffer) / 2;
        circleA.position.y -= (ny * penetration * separationBuffer) / 2;
        circleB.position.x += (nx * penetration * separationBuffer) / 2;
        circleB.position.y += (ny * penetration * separationBuffer) / 2;
      } else if (!circleA.isStatic) {
        circleA.position.x -= nx * penetration * separationBuffer;
        circleA.position.y -= ny * penetration * separationBuffer;
      } else if (!circleB.isStatic) {
        circleB.position.x += nx * penetration * separationBuffer;
        circleB.position.y += ny * penetration * separationBuffer;
      }

      const relVelX = circleA.velocity.x - circleB.velocity.x;
      const relVelY = circleA.velocity.y - circleB.velocity.y;
      const velAlongNormal = relVelX * nx + relVelY * ny;

      // Only apply impulse if balls are approaching (velAlongNormal > 0)
      // Skip if already separating (velAlongNormal <= 0)
      if (velAlongNormal <= 0) return;

      // Tennis ball-like restitution (bouncy but controlled)
      const restitution =
        Math.min(circleA.restitution, circleB.restitution) * 0.85;

      // Impulse magnitude (positive when approaching)
      let impulseMagnitude = (1 + restitution) * velAlongNormal;

      if (!circleA.isStatic && !circleB.isStatic) {
        impulseMagnitude /= 1 / circleA.mass + 1 / circleB.mass;
      }

      // Cap the impulse magnitude to prevent extreme bounces
      const maxImpulse = 25;
      impulseMagnitude = Math.min(impulseMagnitude, maxImpulse);

      const impulseX = impulseMagnitude * nx;
      const impulseY = impulseMagnitude * ny;

      if (!circleA.isStatic) {
        circleA.velocity.x -= impulseX / circleA.mass;
        circleA.velocity.y -= impulseY / circleA.mass;
        // No randomness for ball-to-ball - clamp immediately
        this.clampVelocity(circleA);
      }
      if (!circleB.isStatic) {
        circleB.velocity.x += impulseX / circleB.mass;
        circleB.velocity.y += impulseY / circleB.mass;
        // No randomness for ball-to-ball - clamp immediately
        this.clampVelocity(circleB);
      }
    }
  }

  resolveCircleRectangle(circle, rect) {
    const cx = rect.position.x + rect.width / 2;
    const cy = rect.position.y + rect.height / 2;

    const cos = Math.cos(-rect.angle);
    const sin = Math.sin(-rect.angle);

    const localX =
      cos * (circle.position.x - cx) - sin * (circle.position.y - cy);
    const localY =
      sin * (circle.position.x - cx) + cos * (circle.position.y - cy);

    const hw = rect.width / 2;
    const hh = rect.height / 2;

    const clampedX = Math.max(-hw, Math.min(hw, localX));
    const clampedY = Math.max(-hh, Math.min(hh, localY));

    const cosBack = Math.cos(rect.angle);
    const sinBack = Math.sin(rect.angle);

    const closestX = cx + cosBack * clampedX - sinBack * clampedY;
    const closestY = cy + sinBack * clampedX + cosBack * clampedY;

    const dx = circle.position.x - closestX;
    const dy = circle.position.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Safety margin to prevent edge penetration
    const safetyMargin = 0.5;
    const effectiveRadius = circle.radius + safetyMargin;

    if (distance < effectiveRadius) {
      let nx, ny;
      if (distance === 0) {
        // Circle center is inside rectangle - push in the direction perpendicular to closest edge
        // Determine which edge is closest based on local position
        const distToLeft = localX + hw;
        const distToRight = hw - localX;
        const distToTop = localY + hh;
        const distToBottom = hh - localY;
        const minDist = Math.min(
          distToLeft,
          distToRight,
          distToTop,
          distToBottom
        );

        if (minDist === distToLeft) {
          nx = -Math.cos(rect.angle);
          ny = -Math.sin(rect.angle);
        } else if (minDist === distToRight) {
          nx = Math.cos(rect.angle);
          ny = Math.sin(rect.angle);
        } else if (minDist === distToTop) {
          nx = Math.sin(rect.angle);
          ny = -Math.cos(rect.angle);
        } else {
          nx = -Math.sin(rect.angle);
          ny = Math.cos(rect.angle);
        }
      } else {
        nx = dx / distance;
        ny = dy / distance;
      }

      // Push out with safety margin
      const penetration = effectiveRadius - distance;
      circle.position.x += nx * penetration * 1.01; // Extra 1% to ensure separation
      circle.position.y += ny * penetration * 1.01;

      const velAlongNormal = circle.velocity.x * nx + circle.velocity.y * ny;

      if (velAlongNormal < 0) {
        const restitution = circle.restitution;
        circle.velocity.x -= (1 + restitution) * velAlongNormal * nx;
        circle.velocity.y -= (1 + restitution) * velAlongNormal * ny;

        const tx = -ny;
        const ty = nx;
        const velAlongTangent = circle.velocity.x * tx + circle.velocity.y * ty;
        // Reduced friction for faster rolling on inclines
        circle.velocity.x -= velAlongTangent * circle.friction * 0.8 * tx;
        circle.velocity.y -= velAlongTangent * circle.friction * 0.8 * ty;

        const speed = Math.sqrt(
          circle.velocity.x ** 2 + circle.velocity.y ** 2
        );
        const rand = this.addRandomness(
          circle.velocity.x,
          circle.velocity.y,
          speed
        );
        circle.velocity.x = rand.vx;
        circle.velocity.y = rand.vy;

        // Clamp velocity after collision
        this.clampVelocity(circle);
      }
    }
  }

  resolveCircleWindmill(circle, windmill) {
    // Check collision with center hub (soft collision - just prevents passing through)
    const hubRadius = 8; // Match visual size
    const dx = circle.position.x - windmill.position.x;
    const dy = circle.position.y - windmill.position.y;
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
    const minDist = circle.radius + hubRadius;

    if (distToCenter < minDist && distToCenter > 0) {
      // Soft collision with center hub - just push out gently, no bounce
      const nx = dx / distToCenter;
      const ny = dy / distToCenter;
      const penetration = minDist - distToCenter;

      // Gently push circle out (no multiplier)
      circle.position.x += nx * penetration;
      circle.position.y += ny * penetration;

      // Add gentle rotational push from spinning hub (carries the ball)
      const tangentX = -ny;
      const tangentY = nx;
      const hubSpeed = hubRadius * windmill.rotationSpeed * windmill.direction;
      circle.velocity.x += tangentX * hubSpeed * 0.3;
      circle.velocity.y += tangentY * hubSpeed * 0.3;

      // Don't return - still check arms so ball can be carried between them
    }

    const arms = windmill.getArms();

    // Safety margin to prevent edge penetration
    const safetyMargin = 0.5;

    for (const arm of arms) {
      // Transform circle position to arm's local space
      const cos = Math.cos(-arm.angle);
      const sin = Math.sin(-arm.angle);

      const localX =
        cos * (circle.position.x - arm.cx) - sin * (circle.position.y - arm.cy);
      const localY =
        sin * (circle.position.x - arm.cx) + cos * (circle.position.y - arm.cy);

      const hw = arm.width / 2;
      const hh = arm.height;

      // Arm extends from center (0,0) to (0, -armLength)
      const clampedX = Math.max(-hw, Math.min(hw, localX));
      const clampedY = Math.max(-hh, Math.min(0, localY));

      const cosBack = Math.cos(arm.angle);
      const sinBack = Math.sin(arm.angle);

      const closestX = arm.cx + cosBack * clampedX - sinBack * clampedY;
      const closestY = arm.cy + sinBack * clampedX + cosBack * clampedY;

      const dx = circle.position.x - closestX;
      const dy = circle.position.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const effectiveRadius = circle.radius + safetyMargin;

      if (distance < effectiveRadius) {
        let nx, ny;
        if (distance === 0) {
          // Circle center is on the arm - push perpendicular to arm
          nx = Math.cos(arm.angle + Math.PI / 2);
          ny = Math.sin(arm.angle + Math.PI / 2);
        } else {
          nx = dx / distance;
          ny = dy / distance;
        }

        // Push out with safety margin and extra buffer
        const penetration = effectiveRadius - distance;
        circle.position.x += nx * penetration * 1.02;
        circle.position.y += ny * penetration * 1.02;

        // Calculate arm velocity at contact point relative to windmill center
        const contactFromCenterX = closestX - windmill.position.x;
        const contactFromCenterY = closestY - windmill.position.y;
        const contactDist = Math.sqrt(
          contactFromCenterX ** 2 + contactFromCenterY ** 2
        );

        // Tangent direction for rotation (perpendicular to radius from center)
        // For clockwise (direction=1): tangent = (-y, x) normalized
        // For counter-clockwise (direction=-1): tangent = (y, -x) normalized
        let tangentX, tangentY;
        if (contactDist > 0) {
          tangentX = (-contactFromCenterY / contactDist) * windmill.direction;
          tangentY = (contactFromCenterX / contactDist) * windmill.direction;
        } else {
          tangentX = 0;
          tangentY = 0;
        }

        // Arm velocity at contact point (v = omega * r)
        const armSpeed = contactDist * windmill.rotationSpeed;
        const armVelX = tangentX * armSpeed;
        const armVelY = tangentY * armSpeed;

        // Calculate relative velocity (ball velocity minus arm velocity)
        const relVelX = circle.velocity.x - armVelX;
        const relVelY = circle.velocity.y - armVelY;

        // Standard collision response using relative velocity
        const velAlongNormal = relVelX * nx + relVelY * ny;
        if (velAlongNormal < 0) {
          const restitution = Math.min(circle.restitution, 0.5); // Limit bounce
          circle.velocity.x -= (1 + restitution) * velAlongNormal * nx;
          circle.velocity.y -= (1 + restitution) * velAlongNormal * ny;
        }

        // Transfer some arm velocity to ball (push effect)
        const pushFactor = 0.8;
        circle.velocity.x += armVelX * pushFactor;
        circle.velocity.y += armVelY * pushFactor;

        // Add randomness
        const speed = Math.sqrt(
          circle.velocity.x ** 2 + circle.velocity.y ** 2
        );
        const rand = this.addRandomness(
          circle.velocity.x,
          circle.velocity.y,
          speed
        );
        circle.velocity.x = rand.vx;
        circle.velocity.y = rand.vy;

        // Clamp velocity after collision
        this.clampVelocity(circle);

        break; // Only handle one arm collision per frame
      }
    }
  }

  checkBounds() {
    // Small safety margin for wall collisions
    const margin = 0.5;

    for (const body of this.bodies) {
      if (body.isStatic || body.type !== "circle") continue;

      let bounced = false;
      const effectiveRadius = body.radius + margin;

      if (body.position.x - effectiveRadius < this.bounds.left) {
        body.position.x = this.bounds.left + effectiveRadius;
        body.velocity.x *= -body.restitution;
        bounced = true;
      }
      if (body.position.x + effectiveRadius > this.bounds.right) {
        body.position.x = this.bounds.right - effectiveRadius;
        body.velocity.x *= -body.restitution;
        bounced = true;
      }
      if (body.position.y - effectiveRadius < this.bounds.top) {
        body.position.y = this.bounds.top + effectiveRadius;
        body.velocity.y *= -body.restitution;
        bounced = true;
      }

      if (bounced) {
        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
        const rand = this.addRandomness(
          body.velocity.x,
          body.velocity.y,
          speed
        );
        body.velocity.x = rand.vx;
        body.velocity.y = rand.vy;
      }
    }
  }

  draw(ctx) {
    for (const body of this.bodies) {
      body.draw(ctx);
    }
  }
}
