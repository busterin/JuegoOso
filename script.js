const gameArea = document.getElementById("gameArea");
const player   = document.getElementById("player");
const obstacle = document.getElementById("obstacle");
const cave     = document.getElementById("cave");

const startScreen = document.getElementById("startScreen");
const playBtn     = document.getElementById("playBtn");

const btnLeft  = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
const btnJump  = document.getElementById("btnJump");

let running = false;
let isJumping = false;
let gameOverLock = false;

let leftPressed = false;
let rightPressed = false;

// Posición “visual” del oso (la cámara lo centra).
// Mantendremos playerX centrado en cada frame.
let playerX = 50;                // valor inicial (se recoloca al centro al iniciar)
const PLAYER_WIDTH = 80;
const PLAYER_SPEED = 260;        // px/s (avance caminando)
const JUMP_FORWARD_VX = 260;     // px/s extra durante el salto
const JUMP_BOOST_TIME = 360;     // ms de impulso horizontal al saltar
let jumpBoostVX = 0;
let jumpBoostUntil = 0;
let lastMoveDir = 1;             // 1 derecha, -1 izquierda

/* Mundo lineal: 2 minutos caminando recto (120s) */
const TRACK_LENGTH = PLAYER_SPEED * 120; // px de “mundo”
let worldX = 0;                  // progreso real en el mundo (0..TRACK_LENGTH)

/* ---------- Inicio ---------- */
playBtn.addEventListener("click", () => {
  startScreen.classList.remove("visible");
  startGame();
});

function startGame() {
  running = true;
  isJumping = false;
  leftPressed = rightPressed = false;
  worldX = 0; lastMoveDir = 1;
  // centraremos playerX en el primer frame
  gameOverLock = false;
  cave.style.display = "none";
  restartObstacle();
}

/* ---------- Input teclado ---------- */
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (running && !isJumping) jump();
  }
  if (e.code === "ArrowLeft")  { leftPressed  = true; lastMoveDir = -1; }
  if (e.code === "ArrowRight") { rightPressed = true; lastMoveDir =  1; }

  if ((e.code === "Enter" || e.code === "Space") && startScreen.classList.contains("visible")) {
    e.preventDefault();
    playBtn.click();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft")  leftPressed  = false;
  if (e.code === "ArrowRight") rightPressed = false;
});

/* ---------- Controles táctiles ---------- */
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

/* ---------- Cámara centrada + movimiento de mundo ---------- */
let lastTime = 0;
function moveLoop(t){
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime)/1000, 0.033);
  lastTime = t;

  if (running){
    const rect = gameArea.getBoundingClientRect();

    // 1) Avance real en el “mundo” (no movemos al oso en pantalla, movemos la cámara/fondo)
    let worldVX = 0;
    if (rightPressed) worldVX += PLAYER_SPEED;
    if (leftPressed)  worldVX -= PLAYER_SPEED;

    // Impulso horizontal durante el salto (según la última dirección)
    if (performance.now() < jumpBoostUntil) {
      worldVX += JUMP_FORWARD_VX * (lastMoveDir > 0 ? 1 : -1);
    }

    worldX = Math.max(0, Math.min(TRACK_LENGTH, worldX + worldVX * dt));

    // 2) Fondo desplazándose (parallax sencillo)
    gameArea.style.backgroundPositionX = `${-worldX * 0.4}px`;

    // 3) Oso centrado en pantalla (salvo límites si quisieras, pero aquí lo mantenemos centrado todo el tiempo)
    const desiredCenterX = (rect.width - PLAYER_WIDTH) / 2;
    playerX = desiredCenterX;
    player.style.left = playerX + "px";

    // 4) Mostrar cueva al acercarse al final
    if (worldX > TRACK_LENGTH - rect.width * 2) {
      cave.style.display = "block";
    } else {
      cave.style.display = "none";
    }

    // 5) Llegada a la cueva (final del recorrido)
    if (worldX >= TRACK_LENGTH) {
      running = false;
      alert("¡Llegaste a la cueva! 🥳");
      startScreen.classList.add("visible");
    }
  }
  requestAnimationFrame(moveLoop);
}
requestAnimationFrame(moveLoop);

/* ---------- Salto (alto + impulso horizontal) ---------- */
function jump() {
  isJumping = true;
  // Dirección del impulso basada en última dirección de movimiento
  const dir = rightPressed ? 1 : (leftPressed ? -1 : lastMoveDir);
  lastMoveDir = dir; // asegura consistencia
  jumpBoostVX = JUMP_FORWARD_VX * dir;
  jumpBoostUntil = performance.now() + JUMP_BOOST_TIME;

  // Animación vertical (CSS)
  player.classList.add("jump");
  setTimeout(() => {
    player.classList.remove("jump");
    isJumping = false;
  }, 550);
}

/* ---------- Obstáculo “enemigo” ---------- */
function restartObstacle() {
  obstacle.style.animation = "none";
  void obstacle.offsetWidth; // reflow
  obstacle.style.animation = "moveObstacle 2s linear infinite";
}

// Colisiones AABB en pantalla
function isColliding(a, b) {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  return !(ra.right < rb.left || ra.left > rb.right || ra.bottom < rb.top || ra.top > rb.bottom);
}
function isStomp(playerEl, obstEl) {
  const rp = playerEl.getBoundingClientRect();
  const ro = obstEl.getBoundingClientRect();
  const verticalOK = rp.bottom <= ro.top + 18;
  const horizontalOverlap = !(rp.right < ro.left || rp.left > ro.right);
  return isJumping && verticalOK && horizontalOverlap;
}

// Si pisas el obstáculo lo “eliminas”; si te golpea lateral, fin de partida
setInterval(() => {
  if (!running) return;

  if (isColliding(player, obstacle)) {
    if (isStomp(player, obstacle)) {
      obstacle.style.transition = "opacity .12s";
      obstacle.style.opacity = "0";
      setTimeout(() => {
        obstacle.style.transition = "";
        obstacle.style.opacity = "1";
        restartObstacle();
      }, 140);
    } else if (!gameOverLock) {
      gameOverLock = true; running = false;
      alert("¡Te golpeó el enemigo!");
      setTimeout(() => {
        gameOverLock = false;
        startScreen.classList.add("visible");
      }, 250);
    }
  }
}, 100);