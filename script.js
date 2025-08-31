const gameArea = document.getElementById("gameArea");
const player   = document.getElementById("player");
const sword    = document.getElementById("sword");      // ⚔️ nueva referencia
const obstacle = document.getElementById("obstacle");
const cave     = document.getElementById("cave");

const startScreen = document.getElementById("startScreen");
const playBtn     = document.getElementById("playBtn");

const btnLeft   = document.getElementById("btnLeft");
const btnRight  = document.getElementById("btnRight");
const btnJump   = document.getElementById("btnJump");
const btnAttack = document.getElementById("btnAttack");

/* --- Estado --- */
let running = false;
let isJumping = false;
let gameOverLock = false;

let leftPressed = false;
let rightPressed = false;

let playerX = 50;                  // px
const PLAYER_WIDTH = 80;           // px
const PLAYER_SPEED = 260;          // px/s

// Salto con impulso
const JUMP_FORWARD_VX = 260;       // px/s extra
const JUMP_BOOST_TIME = 360;       // ms
let jumpBoostVX = 0;
let jumpBoostUntil = 0;

// Dirección (1 der, -1 izq) para el salto y la espada
let lastMoveDir = 1;

const TRACK_LENGTH = PLAYER_SPEED * 120; // ~2 min recto
let worldX = 0;

const RIGHT_FRACTION_WHEN_TRAVELING = 0.65;

/* Ataque/espada */
let attacking = false;
let attackCooldownUntil = 0;
const ATTACK_COOLDOWN = 220;       // ms

/* ---------- Inicio ---------- */
playBtn.addEventListener("click", () => {
  startScreen.classList.remove("visible");
  startGame();
});

function startGame() {
  running = true;
  isJumping = false;
  attacking = false;
  leftPressed = rightPressed = false;
  playerX = 50; worldX = 0; lastMoveDir = 1;
  player.style.left = playerX + "px";
  cave.style.display = "none";
  gameOverLock = false;

  // Esconder espada
  sword.style.opacity = "0";
  sword.className = "";
  sword.style.left = "-9999px";

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
  if (e.code === "KeyS")       { doAttack(); }

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
  const start = (ev)=>{ ev.preventDefault(); on(); };
  const end   = (ev)=>{ ev.preventDefault(); off(); };
  btn?.addEventListener("touchstart", start, {passive:false});
  btn?.addEventListener("mousedown",  start);
  btn?.addEventListener("touchend",   end);
  btn?.addEventListener("touchcancel",end);
  btn?.addEventListener("mouseup",    end);
  btn?.addEventListener("mouseleave", end);
}
bindHold(btnLeft,   ()=>{ leftPressed  = true; lastMoveDir = -1; }, ()=> leftPressed = false);
bindHold(btnRight,  ()=>{ rightPressed = true; lastMoveDir =  1; }, ()=> rightPressed = false);
bindHold(btnJump,   ()=>{ if (running && !isJumping) jump(); }, ()=>{});
bindHold(btnAttack, ()=>{ doAttack(); }, ()=>{});

/* ---------- Movimiento + mundo ---------- */
let lastTime = 0;
function moveLoop(t){
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime)/1000, 0.033);
  lastTime = t;

  if (running){
    const rect = gameArea.getBoundingClientRect();

    // Velocidad en pantalla
    let vx = 0;
    if (leftPressed)  vx -= PLAYER_SPEED;
    if (rightPressed) vx += PLAYER_SPEED;

    // Impulso del salto (en la dirección actual/última)
    if (performance.now() < jumpBoostUntil) {
      vx += jumpBoostVX;
    }

    // Límite a la derecha (centrado flexible)
    const nearEnd = worldX > TRACK_LENGTH - rect.width * 1.2;
    const rightLimit = nearEnd
      ? rect.width - PLAYER_WIDTH
      : rect.width * RIGHT_FRACTION_WHEN_TRAVELING - PLAYER_WIDTH;

    // Posición visible
    playerX = Math.max(0, Math.min(rightLimit, playerX + vx * dt));
    player.style.left = playerX + "px";

    // Avance del mundo
    const boost = (performance.now() < jumpBoostUntil) ? (JUMP_FORWARD_VX * lastMoveDir) : 0;
    const worldVX = (rightPressed ? PLAYER_SPEED : 0) + boost - (leftPressed ? PLAYER_SPEED : 0);
    worldX = Math.max(0, Math.min(TRACK_LENGTH, worldX + worldVX * dt));

    // Parallax de fondo
    gameArea.style.backgroundPositionX = `${-worldX * 0.25}px`;

    // Cueva
    if (worldX > TRACK_LENGTH - rect.width * 2) cave.style.display = "block";
    else cave.style.display = "none";

    if (worldX >= TRACK_LENGTH) {
      running = false;
      alert("¡Llegaste a la cueva! 🥳");
      startScreen.classList.add("visible");
    }

    // Posicionar espada junto al oso (sin tocar transform del oso)
    updateSwordPosition();
    // Si estamos atacando, comprobar golpe
    if (attacking) {
      if (rectOverlap(sword.getBoundingClientRect(), obstacle.getBoundingClientRect())) {
        destroyRock();
      }
    }
  }
  requestAnimationFrame(moveLoop);
}
requestAnimationFrame(moveLoop);

/* Posiciona la espada a la derecha o izquierda del oso */
function updateSwordPosition(){
  const offsetRight = 58;   // px desde el borde izquierdo del oso
  const offsetLeft  = -48;  // px cuando mira a la izquierda
  const x = (lastMoveDir > 0) ? (playerX + offsetRight) : (playerX + offsetLeft);
  sword.style.left = `${x}px`;
  // Animación/flip se hace via clases swing-right/left (con scaleX en keyframes)
}

/* ---------- Salto ---------- */
function jump() {
  isJumping = true;
  const dir = rightPressed ? 1 : (leftPressed ? -1 : lastMoveDir);
  lastMoveDir = dir;
  jumpBoostVX = JUMP_FORWARD_VX * dir;
  jumpBoostUntil = performance.now() + JUMP_BOOST_TIME;

  player.classList.add("jump");
  setTimeout(() => { player.classList.remove("jump"); isJumping = false; }, 550);
}

/* ---------- Ataque (espada desacoplada) ---------- */
function doAttack(){
  if (!running) return;
  const now = performance.now();
  if (now < attackCooldownUntil) return;

  attackCooldownUntil = now + ATTACK_COOLDOWN;
  attacking = true;

  // Quita clases previas para reiniciar animación
  sword.classList.remove("swing-right","swing-left");
  // Forzar reflujo para reiniciar anim
  void sword.offsetWidth;

  if (lastMoveDir > 0) sword.classList.add("swing-right");
  else                 sword.classList.add("swing-left");

  // Fin de ataque
  setTimeout(() => { attacking = false; }, 180);
}

/* ---------- Obstáculo ---------- */
function restartObstacle() {
  obstacle.classList.remove("disintegrate");
  obstacle.style.animation = "none";
  void obstacle.offsetWidth;
  obstacle.style.animation = "moveObstacle 2s linear infinite";
}
function destroyRock(){
  // efecto visual y respawn
  obstacle.classList.add("disintegrate");
  obstacle.style.animation = "none";
  setTimeout(() => {
    obstacle.classList.remove("disintegrate");
    restartObstacle();
  }, 280);
}

/* Utilidad solapamiento rects */
function rectOverlap(a, b){
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

/* Colisiones “pisar” además del ataque */
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
setInterval(() => {
  if (!running) return;
  if (isColliding(player, obstacle)) {
    if (isStomp(player, obstacle)) {
      destroyRock();
    } else if (!gameOverLock) {
      gameOverLock = true; running = false;
      alert("¡Te golpeó el enemigo!");
      setTimeout(() => { gameOverLock = false; startScreen.classList.add("visible"); }, 250);
    }
  }
}, 100);