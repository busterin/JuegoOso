const gameArea = document.getElementById("gameArea");
const player   = document.getElementById("player");
const obstacle = document.getElementById("obstacle");
const cave     = document.getElementById("cave");

const startScreen = document.getElementById("startScreen");
const playBtn     = document.getElementById("playBtn");

const btnLeft    = document.getElementById("btnLeft");
const btnRight   = document.getElementById("btnRight");
const btnJump    = document.getElementById("btnJump");
const btnAttack  = document.getElementById("btnAttack");

/* --- Estado --- */
let running = false;
let isJumping = false;
let gameOverLock = false;

let leftPressed = false;
let rightPressed = false;
let attackPressed = false;

let playerX = 50;                 // empieza a la izquierda
const PLAYER_WIDTH = 80;
const PLAYER_SPEED = 260;

// Salto con impulso horizontal SIEMPRE (según dirección actual/última)
const JUMP_FORWARD_VX = 260;
const JUMP_BOOST_TIME = 360;
let jumpBoostVX = 0;
let jumpBoostUntil = 0;

// Dirección de mirada del oso (1 der, -1 izq) — se usa para voltear y para el impulso
let lastMoveDir = 1;

/* Mundo de 2 minutos caminando recto */
const TRACK_LENGTH = PLAYER_SPEED * 120;
let worldX = 0;

/* No arrinconar al oso hasta el final */
const RIGHT_FRACTION_WHEN_TRAVELING = 0.65;

/* Ataque */
const ATTACK_DURATION = 180;  // ms
const ATTACK_COOLDOWN = 280;  // ms
let attacking = false;
let attackUntil = 0;
let nextAttack  = 0;

/* ---------- Inicio ---------- */
playBtn.addEventListener("click", () => {
  startScreen.classList.remove("visible");
  startGame();
});

function startGame() {
  running = true;
  isJumping = false;
  leftPressed = rightPressed = attackPressed = false;
  playerX = 50; worldX = 0; lastMoveDir = 1;
  player.style.left = playerX + "px";
  player.classList.remove("facing-left","attacking");
  cave.style.display = "none";
  gameOverLock = false;
  restartObstacle();
}

/* ---------- Teclado ---------- */
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (running && !isJumping) jump();
  }
  if (e.code === "ArrowLeft")  { leftPressed  = true; lastMoveDir = -1; }
  if (e.code === "ArrowRight") { rightPressed = true; lastMoveDir =  1; }
  if (e.code === "KeyS")       { attackPressed = true; tryAttack(); }

  if ((e.code === "Enter" || e.code === "Space") && startScreen.classList.contains("visible")) {
    e.preventDefault();
    playBtn.click();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft")  leftPressed  = false;
  if (e.code === "ArrowRight") rightPressed = false;
  if (e.code === "KeyS")       attackPressed = false;
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
bindHold(btnAttack, ()=>{ attackPressed = true; tryAttack(); }, ()=>{ attackPressed = false; });

/* ---------- Ataque ----------- */
function tryAttack(){
  const now = performance.now();
  if (!running) return;
  if (attacking || now < nextAttack) return;
  attacking = true;
  attackUntil = now + ATTACK_DURATION;
  nextAttack  = now + ATTACK_COOLDOWN;
  player.classList.add("attacking");
  setTimeout(() => {
    attacking = false;
    player.classList.remove("attacking");
  }, ATTACK_DURATION);
}

function getSwordRect() {
  const p = player.getBoundingClientRect();
  const swordW = 70, swordH = 70; // hitbox
  if (lastMoveDir > 0) {
    return { left: p.right - 10, right: p.right - 10 + swordW, top: p.top + 10, bottom: p.top + 10 + swordH };
  } else {
    return { left: p.left - swordW + 10, right: p.left + 10, top: p.top + 10, bottom: p.top + 10 + swordH };
  }
}
function rectsOverlap(a,b){
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

/* ---------- Movimiento + “mundo” ---------- */
let lastTime = 0;
function moveLoop(t){
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime)/1000, 0.033);
  lastTime = t;

  if (running){
    const rect = gameArea.getBoundingClientRect();

    /* Volteo (solo espejo horizontal, no afecta al suelo) */
    player.classList.toggle("facing-left", lastMoveDir < 0);

    /* 1) Velocidad en pantalla */
    let vx = 0;
    if (leftPressed)  vx -= PLAYER_SPEED;
    if (rightPressed) vx += PLAYER_SPEED;

    if (performance.now() < jumpBoostUntil) {
      vx += jumpBoostVX;  // impulso con signo ±
    }

    /* 2) Límite a la derecha (no arrinconar hasta el final) */
    const nearEnd = worldX > TRACK_LENGTH - rect.width * 1.2;
    const rightLimit = nearEnd
      ? rect.width - PLAYER_WIDTH
      : rect.width * RIGHT_FRACTION_WHEN_TRAVELING - PLAYER_WIDTH;

    playerX = Math.max(0, Math.min(rightLimit, playerX + vx * dt));
    player.style.left = playerX + "px";    // bottom:0 en CSS → nunca flota

    /* 3) Avance real del mundo (siempre cuenta el impulso en su dirección) */
    const boost = (performance.now() < jumpBoostUntil) ? (JUMP_FORWARD_VX * lastMoveDir) : 0;
    const worldVX =
      (rightPressed ? PLAYER_SPEED : 0) + boost - (leftPressed ? PLAYER_SPEED : 0);
    worldX = Math.max(0, Math.min(TRACK_LENGTH, worldX + worldVX * dt));

    /* 4) Fondo desplazándose y NUNCA blanco (repeat-x en CSS) */
    gameArea.style.backgroundPositionX = `${-worldX * 0.25}px`;

    /* 5) Cueva al final */
    if (worldX > TRACK_LENGTH - rect.width * 2) {
      cave.style.display = "block";
    } else {
      cave.style.display = "none";
    }

    if (worldX >= TRACK_LENGTH) {
      running = false;
      alert("¡Llegaste a la cueva! 🥳");
      startScreen.classList.add("visible");
    }

    /* 6) Ataque vs roca */
    if (attacking) {
      const sRect = getSwordRect();
      const oRect = obstacle.getBoundingClientRect();
      if (rectsOverlap(sRect, {left:oRect.left,right:oRect.right,top:oRect.top,bottom:oRect.bottom})) {
        disintegrateRock();
      }
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
  setTimeout(() => {
    player.classList.remove("jump");
    isJumping = false;
  }, 550);
}

/* ---------- Obstáculo ---------- */
function restartObstacle() {
  obstacle.classList.remove("disintegrate");
  obstacle.style.opacity = "1";
  obstacle.style.filter = "";
  obstacle.style.animation = "none";
  void obstacle.offsetWidth; // reflow
  obstacle.style.animation = "moveObstacle 2.1s linear infinite";
}
function disintegrateRock(){
  obstacle.classList.add("disintegrate");
  obstacle.style.animation = "none";
  setTimeout(() => {
    obstacle.style.opacity = "0";
    setTimeout(() => { restartObstacle(); }, 80);
  }, 350);
}

/* Colisiones AABB para pisar si no atacas */
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
      disintegrateRock();
    } else if (!attacking && !gameOverLock) {
      gameOverLock = true; running = false;
      alert("¡Te golpeó el enemigo!");
      setTimeout(() => {
        gameOverLock = false;
        startScreen.classList.add("visible");
      }, 250);
    }
  }
}, 80);