const player = document.getElementById("player");
const obstacle = document.getElementById("obstacle");
const scoreText = document.getElementById("score");
const gameArea = document.getElementById("gameArea");

const startScreen = document.getElementById("startScreen");
const playBtn = document.getElementById("playBtn");

const btnLeft  = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
const btnJump  = document.getElementById("btnJump");

let isJumping = false;
let score = 0;
let running = false;     // juego arranca en pausa (overlay)
let gameOverLock = false;

let leftPressed = false;
let rightPressed = false;

// Posición X del oso y límites
let playerX = 50;         // posición inicial (coincide con CSS)
const PLAYER_WIDTH = 80;  // coincide con CSS
const PLAYER_SPEED = 260; // px/s (ligeramente más rápido para compensar tamaño)

/* ---- Impulso hacia delante en el salto ---- */
const JUMP_FORWARD_VX = 260;   // velocidad horizontal añadida durante el salto
const JUMP_BOOST_TIME = 360;   // ms de impulso
let jumpBoostVX = 0;
let jumpBoostUntil = 0;
let lastMoveDir = 1;           // 1 derecha, -1 izquierda

/* ---------- Inicio ---------- */
playBtn.addEventListener("click", () => {
  startScreen.classList.remove("visible");
  startGame();
});

function startGame() {
  score = 0;
  scoreText.innerText = "Puntuación: " + score;
  gameOverLock = false;
  isJumping = false;
  leftPressed = rightPressed = false;
  playerX = 50;
  player.style.left = playerX + "px";
  restartObstacle();
  running = true;
}

/* ---------- Input teclado ---------- */
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (running && !isJumping) jump();
  }
  if (event.code === "ArrowLeft")  { leftPressed  = true; lastMoveDir = -1; }
  if (event.code === "ArrowRight") { rightPressed = true; lastMoveDir =  1; }

  // Arrancar también con Enter/Espacio desde overlay
  if ((event.code === "Enter" || event.code === "Space") && startScreen.classList.contains("visible")) {
    event.preventDefault();
    playBtn.click();
  }
});
document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft")  leftPressed  = false;
  if (event.code === "ArrowRight") rightPressed = false;
});

/* ---------- Controles táctiles (móvil) ---------- */
function bindHold(btn, on, off){
  const start = (e)=>{ e.preventDefault(); on(); };
  const end   = (e)=>{ e.preventDefault(); off(); };
  btn.addEventListener("touchstart", start, {passive:false});
  btn.addEventListener("mousedown",  start);
  btn.addEventListener("touchend",   end);
  btn.addEventListener("touchcancel",end);
  btn.addEventListener("mouseup",    end);
  btn.addEventListener("mouseleave", end);
}
bindHold(btnLeft,  ()=>{ leftPressed  = true; lastMoveDir = -1; }, ()=> leftPressed = false);
bindHold(btnRight, ()=>{ rightPressed = true; lastMoveDir =  1; }, ()=> rightPressed = false);
bindHold(btnJump,  ()=>{ if (running && !isJumping) jump(); }, ()=>{});

/* ---------- Movimiento del oso ---------- */
let lastTime = 0;
function moveLoop(t){
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime)/1000, 0.033);
  lastTime = t;

  if (running){
    const gameRect = gameArea.getBoundingClientRect();
    const maxX = gameRect.width - PLAYER_WIDTH;
    let vx = 0;
    if (leftPressed)  vx -= PLAYER_SPEED;
    if (rightPressed) vx += PLAYER_SPEED;

    // Impulso del salto si sigue activo
    if (performance.now() < jumpBoostUntil) {
      vx += jumpBoostVX;
    }

    playerX = Math.max(0, Math.min(maxX, playerX + vx * dt));
    player.style.left = playerX + "px";
  }
  requestAnimationFrame(moveLoop);
}
requestAnimationFrame(moveLoop);

/* ---------- Salto (alto + impulso horizontal) ---------- */
function jump() {
  isJumping = true;

  // Determinar dirección del impulso
  const dir = rightPressed ? 1 : (leftPressed ? -1 : lastMoveDir);
  jumpBoostVX = JUMP_FORWARD_VX * dir;
  jumpBoostUntil = performance.now() + JUMP_BOOST_TIME;

  // Animación vertical (CSS)
  player.classList.add("jump");
  setTimeout(() => {
    player.classList.remove("jump");
    isJumping = false;
  }, 550); // acorde a .jump 0.55s
}

/* Reinicia animación del obstáculo (desde la derecha) */
function restartObstacle() {
  obstacle.style.animation = "none";
  void obstacle.offsetWidth; // reflow
  obstacle.style.animation = "moveObstacle 2s linear infinite";
}

/* Detección de colisión por AABB */
function isColliding(a, b) {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  return !(
    ra.right < rb.left ||
    ra.left > rb.right ||
    ra.bottom < rb.top ||
    ra.top > rb.bottom
  );
}

/* ¿Salto encima (derrotar) o choque lateral (muerte)? */
function isStomp(playerEl, obstEl) {
  const rp = playerEl.getBoundingClientRect();
  const ro = obstEl.getBoundingClientRect();
  const verticalOK = rp.bottom <= ro.top + 18;
  const horizontalOverlap = !(rp.right < ro.left || rp.left > ro.right);
  return isJumping && verticalOK && horizontalOverlap;
}

/* ---------- Bucle de juego (puntuación + colisiones) ---------- */
setInterval(() => {
  if (!running) return;

  if (isColliding(player, obstacle)) {
    if (isStomp(player, obstacle)) {
      score += 50;
      scoreText.innerText = "Puntuación: " + score;

      obstacle.style.transition = "opacity .12s";
      obstacle.style.opacity = "0";
      setTimeout(() => {
        obstacle.style.transition = "";
        obstacle.style.opacity = "1";
        restartObstacle();
      }, 140);
    } else if (!gameOverLock) {
      gameOverLock = true;
      running = false;
      alert("¡Game Over! Puntuación final: " + score);
      score = 0;
      scoreText.innerText = "Puntuación: " + score;
      setTimeout(() => {
        gameOverLock = false;
        startScreen.classList.add("visible"); // volver a inicio
      }, 250);
    }
  } else {
    score += 1;
    scoreText.innerText = "Puntuación: " + score;
  }
}, 100);