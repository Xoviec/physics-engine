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
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
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

class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.gravity = new Vector2D(0, 0.5);
    this.bounds = { left: 0, right: 800, top: 0, bottom: 600 };
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

  update(dt) {
    for (const body of this.bodies) {
      if (!body.isStatic) {
        body.applyForce(this.gravity.multiply(body.mass));
      }
      body.update(dt);
    }
    this.checkCollisions();
    this.checkBounds();
  }

  checkCollisions() {
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

      if (!circleA.isStatic && !circleB.isStatic) {
        circleA.position.x -= (nx * penetration) / 2;
        circleA.position.y -= (ny * penetration) / 2;
        circleB.position.x += (nx * penetration) / 2;
        circleB.position.y += (ny * penetration) / 2;
      } else if (!circleA.isStatic) {
        circleA.position.x -= nx * penetration;
        circleA.position.y -= ny * penetration;
      } else if (!circleB.isStatic) {
        circleB.position.x += nx * penetration;
        circleB.position.y += ny * penetration;
      }

      const relVelX = circleA.velocity.x - circleB.velocity.x;
      const relVelY = circleA.velocity.y - circleB.velocity.y;
      const velAlongNormal = relVelX * nx + relVelY * ny;

      if (velAlongNormal > 0) return;

      const restitution = Math.min(circleA.restitution, circleB.restitution);
      let impulseMagnitude = -(1 + restitution) * velAlongNormal;

      if (!circleA.isStatic && !circleB.isStatic) {
        impulseMagnitude /= 1 / circleA.mass + 1 / circleB.mass;
      }

      const impulseX = impulseMagnitude * nx;
      const impulseY = impulseMagnitude * ny;

      if (!circleA.isStatic) {
        circleA.velocity.x -= impulseX / circleA.mass;
        circleA.velocity.y -= impulseY / circleA.mass;
      }
      if (!circleB.isStatic) {
        circleB.velocity.x += impulseX / circleB.mass;
        circleB.velocity.y += impulseY / circleB.mass;
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

    if (distance < circle.radius) {
      let nx, ny;
      if (distance === 0) {
        nx = 0;
        ny = -1;
      } else {
        nx = dx / distance;
        ny = dy / distance;
      }

      const penetration = circle.radius - distance;
      circle.position.x += nx * penetration;
      circle.position.y += ny * penetration;

      const velAlongNormal = circle.velocity.x * nx + circle.velocity.y * ny;

      if (velAlongNormal < 0) {
        const restitution = circle.restitution;
        circle.velocity.x -= (1 + restitution) * velAlongNormal * nx;
        circle.velocity.y -= (1 + restitution) * velAlongNormal * ny;

        // Tarcie
        const tx = -ny;
        const ty = nx;
        const velAlongTangent = circle.velocity.x * tx + circle.velocity.y * ty;
        circle.velocity.x -= velAlongTangent * circle.friction * 2 * tx;
        circle.velocity.y -= velAlongTangent * circle.friction * 2 * ty;
      }
    }
  }

  checkBounds() {
    for (const body of this.bodies) {
      if (body.isStatic || body.type !== "circle") continue;

      if (body.position.x - body.radius < this.bounds.left) {
        body.position.x = this.bounds.left + body.radius;
        body.velocity.x *= -body.restitution;
      }
      if (body.position.x + body.radius > this.bounds.right) {
        body.position.x = this.bounds.right - body.radius;
        body.velocity.x *= -body.restitution;
      }
      if (body.position.y - body.radius < this.bounds.top) {
        body.position.y = this.bounds.top + body.radius;
        body.velocity.y *= -body.restitution;
      }
    }
  }

  draw(ctx) {
    for (const body of this.bodies) {
      body.draw(ctx);
    }
  }
}
