const gameArea = document.getElementById("gameArea");
const player   = document.getElementById("player");
const swordEl  = document.getElementById("sword");
const sparkEl  = document.getElementById("spark");
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

let playerX = 50;
const PLAYER_WIDTH = 80;
const PLAYER_SPEED = 260;

const JUMP_FORWARD_VX = 260;
const JUMP_BOOST_TIME = 360;
let jumpBoostVX = 0;
let jumpBoostUntil = 0;

let lastMoveDir = 1;

const TRACK_LENGTH = PLAYER_SPEED * 120; // ~120 s
let worldX = 0;

const RIGHT_FRACTION_WHEN_TRAVELING = 0.65;

/* --- Spawner de obstáculos (más fácil) --- */
const OB_MIN_DURATION = 2.8;  // s  (más lento)
const OB_MAX_DURATION = 3.6;  // s
const OB_MIN_DELAY    = 900;  // ms (pausa entre rocas)
const OB_MAX_DELAY    = 1700; // ms
let obstacleTimer = null;

function rand(min, max){ return Math.random() * (max - min) + min; }
function randi(min, max){ return Math.floor(rand(min, max)); }

function spawnObstacle(){
  if (!running) return;
  obstacle.classList.remove("disintegrate");
  obstacle.style.opacity = "1";
  obstacle.style.transform = "";
  obstacle.style.right = "-50px";
  const dur = rand(OB_MIN_DURATION, OB_MAX_DURATION).toFixed(2);
  obstacle.style.animation = `moveObstacle ${dur}s linear 1`;
}
function scheduleNextObstacle(delayMs){
  clearTimeout(obstacleTimer);
  obstacleTimer = setTimeout(spawnObstacle, delayMs);
}
obstacle.addEventListener("animationend", () => {
  obstacle.style.animation = "none";
  scheduleNextObstacle(randi(OB_MIN_DELAY, OB_MAX_DELAY));
});

/* ---------- Inicio ---------- */
playBtn.addEventListener("click", () => {
  startScreen.classList.remove("visible");
  startGame();
});

function startGame() {
  running = true;
  isJumping = false;
  leftPressed = rightPressed = false;
  playerX = 50; worldX = 0; lastMoveDir = 1;
  player.style.left = playerX + "px";
  cave.style.display = "none";
  gameOverLock = false;

  // Sincroniza duración del ciclo día-noche con la “pista”
  document.documentElement.style.setProperty('--dayCycle', '120s');

  // Reset espada/destello
  swordEl.style.opacity = "0";
  swordEl.style.left = "-9999px";
  swordEl.classList.remove("swing-right","swing-left");
  sparkEl.style.left = "-9999px";
  sparkEl.classList.remove("burst");

  // Comenzar con una pequeña espera
  scheduleNextObstacle(700);
}

/* ---------- Input teclado ---------- */
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); if (running && !isJumping) jump(); }
  if (e.code === "ArrowLeft")  { leftPressed  = true; lastMoveDir = -1; }
  if (e.code === "ArrowRight") { rightPressed = true; lastMoveDir =  1; }
  if (e.code === "KeyS")       { doAttack(); }

  if ((e.code === "Enter" || e.code === "Space") && startScreen.classList.contains("visible")) {
    e.preventDefault(); playBtn.click();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft")  leftPressed  = false;
  if (e.code === "ArrowRight") rightPressed = false;
});

/* ---------- Controles táctiles ---------- */
function bindHold(btn, on, off){
  if (!btn) return;
  const start = (ev)=>{ ev.preventDefault(); on(); };
  const end   = (ev)=>{ ev.preventDefault(); off(); };
  btn.addEventListener("touchstart", start, {passive:false});
  btn.addEventListener("mousedown",  start);
  btn.addEventListener("touchend",   end);
  btn.addEventListener("touchcancel",end);
  btn.addEventListener("mouseup",    end);
  btn.addEventListener("mouseleave", end);
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

    let vx = 0;
    if (leftPressed)  vx -= PLAYER_SPEED;
    if (rightPressed) vx += PLAYER_SPEED;

    if (performance.now() < jumpBoostUntil) { vx += jumpBoostVX; }

    const nearEnd = worldX > TRACK_LENGTH - rect.width * 1.2;
    const rightLimit = nearEnd ? rect.width - PLAYER_WIDTH
                               : rect.width * RIGHT_FRACTION_WHEN_TRAVELING - PLAYER_WIDTH;

    playerX = Math.max(0, Math.min(rightLimit, playerX + vx * dt));
    player.style.left = playerX + "px";

    const boost = (performance.now() < jumpBoostUntil) ? (JUMP_FORWARD_VX * lastMoveDir) : 0;
    const worldVX = (rightPressed ? PLAYER_SPEED : 0) + boost - (leftPressed ? PLAYER_SPEED : 0);
    worldX = Math.max(0, Math.min(TRACK_LENGTH, worldX + worldVX * dt));

    // Scroll del tile de fondo (se repite infinito)
    gameArea.style.backgroundPositionX = `${-worldX * 0.25}px`;

    if (worldX > TRACK_LENGTH - rect.width * 2) cave.style.display = "block";
    else cave.style.display = "none";

    if (worldX >= TRACK_LENGTH) {
      running = false;
      clearTimeout(obstacleTimer);
      obstacle.style.animation = "none";
      alert("¡Llegaste a la cueva! 🥳");
      startScreen.classList.add("visible");
    }
  }
  requestAnimationFrame(moveLoop);
}
requestAnimationFrame(moveLoop);

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

/* ---------- Ataque (visual + hitbox virtual) ---------- */
let attackCooldownUntil = 0;
const ATTACK_COOLDOWN = 220;

function doAttack(){
  if (!running) return;
  const now = performance.now();
  if (now < attackCooldownUntil) return;
  attackCooldownUntil = now + ATTACK_COOLDOWN;

  const gameRect = gameArea.getBoundingClientRect();
  const pr = player.getBoundingClientRect();
  const playerLeftInGame  = pr.left  - gameRect.left;
  const playerRightInGame = pr.right - gameRect.left;

  // Posicionar espada visual
  const x = lastMoveDir > 0 ? (playerRightInGame - 12) : (playerLeftInGame - 58);
  swordEl.style.left = `${x}px`;
  swordEl.style.bottom = "18px";
  swordEl.style.opacity = "1";
  swordEl.classList.remove("swing-right","swing-left");
  void swordEl.offsetWidth;
  swordEl.classList.add(lastMoveDir > 0 ? "swing-right" : "swing-left");

  // Hitbox virtual
  const hitbox = (lastMoveDir > 0)
    ? { left: pr.right, right: pr.right + 60, top: pr.bottom - 70, bottom: pr.bottom - 20 }
    : { left: pr.left - 60, right: pr.left, top: pr.bottom - 70, bottom: pr.bottom - 20 };

  const or = obstacle.getBoundingClientRect();
  const hit = !(hitbox.right < or.left || hitbox.left > or.right || hitbox.bottom < or.top || hitbox.top > or.bottom);

  // Spark para feedback
  const sparkX = lastMoveDir > 0 ? (playerRightInGame + (hit ? 20 : 14))
                                 : (playerLeftInGame  - (hit ? 20 : 14) - 34);
  sparkEl.style.left = `${sparkX}px`;
  sparkEl.style.bottom = hit ? "42px" : "38px";
  sparkEl.classList.remove("burst");
  void sparkEl.offsetWidth;
  sparkEl.classList.add("burst");

  if (hit) destroyRock();

  // Ocultar espada tras el swing
  setTimeout(() => { swordEl.style.opacity = "0"; }, 240);
}

/* ---------- Obstáculo ---------- */
function destroyRock(){
  obstacle.style.animation = "none";
  obstacle.classList.add("disintegrate");
  setTimeout(() => {
    obstacle.classList.remove("disintegrate");
    scheduleNextObstacle(randi(OB_MIN_DELAY, OB_MAX_DELAY));
  }, 280);
}

/* Colisiones normales (pisar) */
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
      clearTimeout(obstacleTimer);
      obstacle.style.animation = "none";
      alert("¡Te golpeó el enemigo!");
      setTimeout(() => {
        gameOverLock = false;
        startScreen.classList.add("visible");
      }, 250);
    }
  }
}, 100);