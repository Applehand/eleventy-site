import { Game, GAME_WIDTH, GAME_HEIGHT } from "./game.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const scoreLabel = document.getElementById("score-label");
const startButton = document.getElementById("start-button");
const startContainer = document.getElementById("start-button-container");
const countdownContainer = document.getElementById("countdown-container");
const countdownLabel = document.getElementById("countdown-label");

const audio = createAudio();

const game = new Game({
  onScoreChange(score) {
    scoreLabel.textContent = `Boids Bopped: ${score}`;
  },
  onCountdownChange(text) {
    countdownLabel.textContent = String(text);
  },
  onStateChange(state) {
    if (state === "idle") {
      startContainer.classList.remove("hidden");
      countdownContainer.classList.add("hidden");
      countdownLabel.textContent = "";
    } else if (state === "countdown") {
      startContainer.classList.add("hidden");
      countdownContainer.classList.remove("hidden");
    } else if (state === "playing") {
      if (!game.isShowingEndCountdown()) {
        countdownContainer.classList.add("hidden");
      }
    } else if (state === "results") {
      countdownContainer.classList.remove("hidden");
    }
  },
  playClick: () => audio.playClick(),
  playPop: () => audio.playPop(),
});

let lastTime = 0;

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
}

function screenToGame(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = GAME_WIDTH / rect.width;
  const scaleY = GAME_HEIGHT / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function onPointerMove(e) {
  const pos = screenToGame(e.clientX, e.clientY);
  game.player.setMouse(pos.x, pos.y);
}

startButton.addEventListener("click", () => game.start());
canvas.addEventListener("pointermove", onPointerMove);
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  game.update(dt);

  if (game.isShowingEndCountdown()) {
    countdownContainer.classList.remove("hidden");
  } else if (game.state === "playing") {
    countdownContainer.classList.add("hidden");
  }

  game.draw(ctx);
  requestAnimationFrame(loop);
}

requestAnimationFrame((now) => {
  lastTime = now;
  requestAnimationFrame(loop);
});

function createAudio() {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep({ freq, duration, type = "sine", gain = 0.08 }) {
    try {
      const ac = getCtx();
      if (ac.state === "suspended") ac.resume();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(ac.destination);
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.stop(ac.currentTime + duration);
    } catch {
      // Audio optional
    }
  }

  return {
    playClick: () => beep({ freq: 520, duration: 0.08, type: "square", gain: 0.05 }),
    playPop: () => beep({ freq: 280, duration: 0.12, type: "triangle", gain: 0.07 }),
  };
}
