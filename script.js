const player = document.getElementById("player");
const obstacle = document.getElementById("obstacle");
const scoreText = document.getElementById("score");
const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScore = document.getElementById("finalScore");
const bestScoreEl = document.getElementById("bestScore");
const retryBtn = document.getElementById("retryBtn");
const sfxJump = document.getElementById("sfxJump");
const sfxHit = document.getElementById("sfxHit");

let isJumping = false;
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore") || 0);
let isRunning = false;

// Mostrar mejor puntuación en UI (si ya existe)
if (bestScoreEl) bestScoreEl.textContent = "Mejor: " + bestScore;

// Iniciar juego
function startGame() {
  score = 0;
  isRunning = true;
  updateScore(0);
  hideOverlay(startOverlay);
  hideOverlay(gameOverOverlay);
  restartObstacle();
}

function updateScore(delta = 1) {
  score += delta;
  if (scoreText) scoreText.textContent = "Puntuación: " + score;
}

// Controles de teclado
document.addEventListener("keydown", (event) => {
  if (event.code === "Enter" && !isRunning) {
    startGame();
    return;
  }
  if (event.code === "Space") {
    if (!isRunning) startGame();
    if (!isJumping) jump();
  }
});

if (startBtn) startBtn.addEventListener("click", startGame);
if (retryBtn) retryBtn.addEventListener("click", startGame);

// Salto
function jump() {
  isJumping = true;
  player.classList.add("jump");
  playSfx(sfxJump);
  setTimeout(() => {
    player.classList.remove("jump");
    isJumping = false;
  }, 550);
}

// Reiniciar animación del obstáculo para volver a lanzarlo desde la derecha
function restartObstacle() {
  obstacle.style.animation = "none";
  // Forzar reflujo
  void obstacle.offsetWidth;
  obstacle.style.animation = "";
}

// Overlays helpers
function showOverlay(el) { el && el.classList.add("visible"); }
function hideOverlay(el) { el && el.classList.remove("visible"); }

// Colisión AABB con "colchón" para hacer el juego más permisivo
function isColliding(a, b) {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();

  const padA = 10; // reduce el tamaño efectivo del oso
  const padB = 10; // reduce el tamaño efectivo de la roca

  const aLeft = ra.left + padA;
  const aRight = ra.right - padA;
  const aTop = ra.top + padA;
  const aBottom = ra.bottom - padA;

  const bLeft = rb.left + padB;
  const bRight = rb.right - padB;
  const bTop = rb.top + padB;
  const bBottom = rb.bottom - padB;

  return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom);
}

// Bucle de juego con puntuación y fin de partida
let lastTick = 0;
function loop(ts) {
  if (isRunning) {
    if (isColliding(player, obstacle)) {
      isRunning = false;
      playSfx(sfxHit);
      // Mostrar overlay de Game Over
      if (finalScore) finalScore.textContent = "Puntuación: " + score;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", String(bestScore));
      }
      if (bestScoreEl) bestScoreEl.textContent = "Mejor: " + bestScore;
      showOverlay(gameOverOverlay);
    } else {
      if (!lastTick || ts - lastTick > 120) {
        updateScore(1);
        lastTick = ts;
      }
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- GAMEPAD SUPPORT ---------- */
let hasGamepad = false;
window.addEventListener("gamepadconnected", () => { hasGamepad = true; });
window.addEventListener("gamepaddisconnected", () => { hasGamepad = false; });

let prevButtons = [];
function pollGamepad() {
  if (hasGamepad) {
    const gp = navigator.getGamepads()[0];
    if (gp) {
      // Botón A suele ser index 0 en la mayoría de mandos
      const pressedA = gp.buttons[0]?.pressed;
      const prevA = prevButtons[0] || false;
      if (pressedA && !prevA) {
        if (!isRunning) startGame();
        if (!isJumping) jump();
      }
      prevButtons[0] = pressedA;
    }
  }
  requestAnimationFrame(pollGamepad);
}
requestAnimationFrame(pollGamepad);

/* ---------- AUDIO HELPERS ---------- */
function playSfx(audioEl) {
  if (!audioEl) return;
  const p = audioEl.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      // Algunos navegadores bloquean audio sin interacción; se activará tras el primer clic/tecla
    });
  }
}
