export const BOID_CONFIG = {
  minSpeed: 3,
  maxSpeed: 6,
  separationStrength: 0.002,
  alignmentStrength: 0.0025,
  centeringStrength: 0.0006,
  playerSeparationStrength: 0.003,
  visualRadius: 219,
  protectedRadius: 54,
  bodyRadius: 20,
  popDuration: 0.25,
};

export class Boid {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.rotation = Math.atan2(this.vy, this.vx);
    this.hasBeenEaten = false;
    this.popping = false;
    this.popTime = 0;
    this.phase = Math.random() * Math.PI * 2;
  }

  updateFlocking(allBoids, player, width, height) {
    if (this.popping) return;

    const visualNeighbors = [];
    const protectedNeighbors = [];
    const visualR2 = BOID_CONFIG.visualRadius ** 2;
    const protectedR2 = BOID_CONFIG.protectedRadius ** 2;

    for (const other of allBoids) {
      if (other === this || other.popping) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= visualR2) visualNeighbors.push(other);
      if (dist2 <= protectedR2) protectedNeighbors.push(other);
    }

    let sepDistX = 0;
    let sepDistY = 0;
    for (const other of protectedNeighbors) {
      sepDistX += this.x - other.x;
      sepDistY += this.y - other.y;
    }

    let playerSepDistX = 0;
    let playerSepDistY = 0;
    if (player) {
      const pdx = this.x - player.x;
      const pdy = this.y - player.y;
      if (pdx * pdx + pdy * pdy <= visualR2) {
        playerSepDistX = pdx;
        playerSepDistY = pdy;
      }
    }

    let xVelAvg = 0;
    let yVelAvg = 0;
    let xPosAvg = 0;
    let yPosAvg = 0;
    const count = visualNeighbors.length;

    for (const other of visualNeighbors) {
      xVelAvg += other.vx;
      yVelAvg += other.vy;
      xPosAvg += other.x;
      yPosAvg += other.y;
    }

    if (count > 0) {
      xVelAvg /= count;
      yVelAvg /= count;
      xPosAvg /= count;
      yPosAvg /= count;
    }

    this.vx += sepDistX * BOID_CONFIG.separationStrength;
    this.vy += sepDistY * BOID_CONFIG.separationStrength;
    this.vx += playerSepDistX * BOID_CONFIG.playerSeparationStrength;
    this.vy += playerSepDistY * BOID_CONFIG.playerSeparationStrength;

    this.vx += (xVelAvg - this.vx) * BOID_CONFIG.alignmentStrength;
    this.vy += (yVelAvg - this.vy) * BOID_CONFIG.alignmentStrength;

    this.vx += (xPosAvg - this.x) * BOID_CONFIG.centeringStrength;
    this.vy += (yPosAvg - this.y) * BOID_CONFIG.centeringStrength;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > BOID_CONFIG.maxSpeed) {
      this.vx = (this.vx / speed) * BOID_CONFIG.maxSpeed;
      this.vy = (this.vy / speed) * BOID_CONFIG.maxSpeed;
    } else if (speed < BOID_CONFIG.minSpeed && speed > 0) {
      this.vx = (this.vx / speed) * BOID_CONFIG.minSpeed;
      this.vy = (this.vy / speed) * BOID_CONFIG.minSpeed;
    } else if (speed === 0) {
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * BOID_CONFIG.minSpeed;
      this.vy = Math.sin(angle) * BOID_CONFIG.minSpeed;
    }

    const targetRotation = Math.atan2(this.vy, this.vx);
    this.rotation = lerpAngle(this.rotation, targetRotation, 1);

    this.x += this.vx;
    this.y += this.vy;

    applyBorderPush(this, width, height);
  }

  startPop() {
    if (this.hasBeenEaten) return false;
    this.hasBeenEaten = true;
    this.popping = true;
    this.popTime = 0;
    return true;
  }

  updatePop(dt) {
    if (!this.popping) return false;
    this.popTime += dt;
    return this.popTime < BOID_CONFIG.popDuration;
  }

  draw(ctx, time) {
    if (this.popping) {
      drawPop(ctx, this.x, this.y, this.popTime / BOID_CONFIG.popDuration);
      return;
    }

    const pulse = 1 + Math.sin(time * 6 + this.phase) * 0.06;
    const angle = this.rotation;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.scale(pulse, pulse);

    // Bell
    ctx.beginPath();
    ctx.ellipse(0, -4, 18, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f898c8";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1a1a1a";
    ctx.stroke();

    // Tentacles
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8, 6);
      ctx.quadraticCurveTo(i * 12, 22, i * 6, 34);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawPop(ctx, x, y, t) {
  const alpha = 1 - t;
  const radius = 12 + t * 40;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3 + t * 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();
  ctx.restore();
}

function applyBorderPush(boid, width, height) {
  const margin = 8;
  if (boid.x < margin) boid.vx += 5;
  if (boid.x > width - margin) boid.vx -= 5;
  if (boid.y < margin) boid.vy += 10;
  if (boid.y > height - margin) boid.vy -= 5;

  boid.x = clamp(boid.x, margin, width - margin);
  boid.y = clamp(boid.y, margin, height - margin);
}

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
