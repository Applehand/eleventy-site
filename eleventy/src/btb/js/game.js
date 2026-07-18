import { Boid, BOID_CONFIG } from "./boid.js";
import { Player, PLAYER_CONFIG } from "./player.js";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
const NUM_BOIDS = 35;
const START_COUNTDOWN = 4;
const PLAY_DURATION = 20;
const END_COUNTDOWN_THRESHOLD = 5;
const RESULTS_DURATION = 3;
const FIXED_DT = 1 / 60;

export const GameState = {
  IDLE: "idle",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  RESULTS: "results",
};

export class Game {
  constructor({ onScoreChange, onCountdownChange, onStateChange, playClick, playPop }) {
    this.onScoreChange = onScoreChange;
    this.onCountdownChange = onCountdownChange;
    this.onStateChange = onStateChange;
    this.playClick = playClick;
    this.playPop = playPop;

    this.state = GameState.IDLE;
    this.score = 0;
    this.boids = [];
    this.player = new Player(GAME_WIDTH / 2, GAME_HEIGHT / 3);
    this.accumulator = 0;
    this.countdownTimer = 0;
    this.playTimer = 0;
    this.resultsTimer = 0;
    this.showEndCountdown = false;
    this.time = 0;
  }

  start() {
    this.resetRound();
    this.state = GameState.COUNTDOWN;
    this.countdownTimer = START_COUNTDOWN;
    this.spawnBoids();
    this.onStateChange(this.state);
    this.onCountdownChange(Math.ceil(this.countdownTimer));
    this.playClick?.();
  }

  resetRound() {
    this.score = 0;
    this.boids = [];
    this.player = new Player(GAME_WIDTH / 2, GAME_HEIGHT / 3);
    this.player.canMove = false;
    this.playTimer = 0;
    this.resultsTimer = 0;
    this.showEndCountdown = false;
    this.onScoreChange(0);
  }

  spawnBoids() {
    for (let i = 0; i < NUM_BOIDS; i++) {
      const x = Math.random() * (GAME_WIDTH - 10);
      const y = GAME_HEIGHT / 2 + Math.random() * (GAME_HEIGHT / 2);
      this.boids.push(new Boid(x, y));
    }
  }

  update(dt) {
    this.time += dt;

    if (this.state === GameState.COUNTDOWN) {
      this.countdownTimer -= dt;
      this.onCountdownChange(Math.max(1, Math.ceil(this.countdownTimer)));
      if (this.countdownTimer <= 0) {
        this.state = GameState.PLAYING;
        this.player.canMove = true;
        this.playTimer = PLAY_DURATION;
        this.showEndCountdown = false;
        this.onStateChange(this.state);
      }
      this.stepSimulation(dt);
      return;
    }

    if (this.state === GameState.PLAYING) {
      this.playTimer -= dt;
      if (this.playTimer <= END_COUNTDOWN_THRESHOLD) {
        this.showEndCountdown = true;
        this.onCountdownChange(Math.max(1, Math.ceil(this.playTimer)));
      }
      if (this.playTimer <= 0) {
        this.state = GameState.RESULTS;
        this.player.canMove = false;
        this.resultsTimer = RESULTS_DURATION;
        this.onCountdownChange(`You bopped ${this.score} boids!`);
        this.onStateChange(this.state);
        return;
      }
      this.stepSimulation(dt);
      this.checkCollisions();
      return;
    }

    if (this.state === GameState.RESULTS) {
      this.resultsTimer -= dt;
      this.updatePops(dt);
      if (this.resultsTimer <= 0) {
        this.state = GameState.IDLE;
        this.resetRound();
        this.onStateChange(this.state);
      }
    }
  }

  stepSimulation(dt) {
    this.accumulator += dt;
    const maxSteps = 5;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < maxSteps) {
      this.fixedUpdate();
      this.accumulator -= FIXED_DT;
      steps++;
    }
  }

  fixedUpdate() {
    const aliveBoids = this.boids.filter((b) => !b.popping);
    for (const boid of aliveBoids) {
      boid.updateFlocking(aliveBoids, this.player, GAME_WIDTH, GAME_HEIGHT);
    }
    this.player.update(FIXED_DT);
  }

  checkCollisions() {
    for (const boid of this.boids) {
      if (boid.popping || boid.hasBeenEaten) continue;
      const dx = boid.x - this.player.x;
      const dy = boid.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      const hitDist = BOID_CONFIG.bodyRadius + PLAYER_CONFIG.radius * 0.7;
      if (dist < hitDist && boid.startPop()) {
        this.score += 1;
        this.onScoreChange(this.score);
        this.playPop?.();
      }
    }
    this.updatePops(FIXED_DT);
  }

  updatePops(dt) {
    this.boids = this.boids.filter((boid) => {
      if (!boid.popping) return true;
      return boid.updatePop(dt);
    });
  }

  draw(ctx) {
    ctx.fillStyle = "#2e95ff";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (const boid of this.boids) {
      boid.draw(ctx, this.time);
    }
    this.player.draw(ctx);
  }

  isShowingEndCountdown() {
    return this.state === GameState.PLAYING && this.showEndCountdown;
  }

  isShowingCountdown() {
    return this.state === GameState.COUNTDOWN || this.isShowingEndCountdown();
  }
}
