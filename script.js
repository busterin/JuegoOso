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
let running = false;     // el juego arranca en pausa (pantalla de inicio)
let gameOverLock = false;

let leftPressed = false;
let rightPressed = false;

let playerX = 50; // debe coincidir con el CSS inicial
const PLAYER_SPEED = 240; // px/seg

/* --------- PRE-CARGA DE IMÁGENES + AVISOS --------- */
function preloadImg(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve({ src, ok: true });
    im.onerror = () => resolve({ src, ok: false });
    im.src = src;
  });
}
async function checkAssets() {
  const assets = ["img/Fondo.jpg","img/Oso.png","img/Roca.png"];
  const results = await Promise.all(assets.map(preloadImg));
  const failed = results.filter(r => !r.ok).map(r => r.src);

  // Si falta el fondo, aplica una clase para un color de respaldo
  if (!results.find(r => r.src.includes("Fondo.jpg") && r.ok)) {
    gameArea.classList.add("noimg-bg");
  }

  if (failed.length) {
    const warn = document.createElement("div");
    warn.className = "img-warning";
    warn.textContent = "⚠️ Faltan imágenes: " + failed.join(", ");
    document.body.appendChild(warn);
    // auto-ocultar a los 6s
    setTimeout(() => warn.remove(), 6000);
  }
}
// Lanza la verificación (no bloquea el juego)
checkAssets();

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
  if (event.code === "ArrowLeft")  leftPressed  = true;
  if (event.code === "ArrowRight") rightPressed = true;

  // Arrancar con Enter/Espacio desde el overlay
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
bindHold(btnLeft,  ()=> leftPressed = true,  ()=> leftPressed = false);
bindHold(btnRight, ()=> rightPressed = true, ()=> rightPressed = false);
bindHold(btnJump,  ()=>{ if (running && !isJumping) jump(); }, ()=>{});

/* ---------- Movimiento del oso ---------- */
let lastTime = 0;
function moveLoop(t){
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime)/1000, 0.033);
  lastTime = t;

  if (running){
    const gameRect = gameArea.getBoundingClientRect();
    const maxX = gameRect.width - 60; // 60px ancho del oso
    let vx = 0;
    if (leftPressed)  vx -= PLAYER_SPEED;
    if (rightPressed) vx += PLAYER_SPEED;
    playerX = Math.max(0, Math.min(maxX, playerX + vx * dt));
    player.style.left = playerX + "px";
  }
  requestAnimationFrame(moveLoop);
}
requestAnimationFrame(moveLoop);

/* ---------- Salto ---------- */
function jump() {
  isJumping = true;
  player.classList.add("jump");
  setTimeout(() => {
    player.classList.remove("jump");
    isJumping = false;
  }, 500);
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

/* ---------- Bucle del juego ---------- */
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
        startScreen.classList.add("visible");
      }, 250);
    }
  } else {
    score += 1;
    scoreText.innerText = "Puntuación: " + score;
  }
}, 100);