export const PLAYER_CONFIG = {
  speed: 400,
  radius: 28,
};

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.rotation = 0;
    this.flipV = false;
    this.canMove = false;
    this.mouseX = x;
    this.mouseY = y;
  }

  setMouse(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  }

  update(dt) {
    if (!this.canMove) return;

    const dx = this.mouseX - this.x;
    const dy = this.mouseY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * PLAYER_CONFIG.speed * dt;
      this.y += ny * PLAYER_CONFIG.speed * dt;

      const targetAngle = Math.atan2(ny, nx);
      this.rotation = lerpAngle(this.rotation, targetAngle, 0.75);
      this.flipV = this.mouseX > this.x;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    if (this.flipV) ctx.scale(1, -1);

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#e83030";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#8b1515";
    ctx.stroke();

    // Tail fin
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-38, -14);
    ctx.lineTo(-34, 0);
    ctx.lineTo(-38, 14);
    ctx.closePath();
    ctx.fillStyle = "#c42020";
    ctx.fill();
    ctx.strokeStyle = "#8b1515";
    ctx.stroke();

    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(4, -14);
    ctx.lineTo(-4, -26);
    ctx.lineTo(-10, -12);
    ctx.closePath();
    ctx.fillStyle = "#c42020";
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.beginPath();
    ctx.arc(12, -4, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(13, -4, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();

    ctx.restore();
  }
}

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
