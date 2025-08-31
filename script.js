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

let playerX = 50;
const PLAYER_WIDTH = 80;
const PLAYER_SPEED = 260;
const JUMP_FORWARD_VX = 260;
const JUMP_BOOST_TIME = 360;
let jumpBoostVX = 0;
let jumpBoostUntil = 0;
let lastMoveDir = 1;

/* Mundo: 2 minutos caminando recto */
const TRACK_LENGTH = PLAYER_SPEED * 120;
let worldX = 0;

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
  restartObstacle();
}

/* Input teclado */
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

/* Controles táctiles */
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

/* Movimiento */
let lastTime = 0;
function moveLoop(t){
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime)/1000, 0.033);
  lastTime = t;

  if (running){
    const rect = gameArea.getBoundingClientRect();
    const maxX = rect.width - PLAYER_WIDTH;
    let vx = 0;
    if (leftPressed)  vx -= PLAYER_SPEED;
    if (rightPressed) vx += PLAYER_SPEED;
    if (performance.now() < jumpBoostUntil) vx += jumpBoostVX;

    playerX = Math.max(0, Math.min(maxX, playerX + vx * dt));
    player.style.left = playerX + "px";

    const worldVX = (rightPressed ? PLAYER_SPEED : 0) +
      ((performance.now() < jumpBoostUntil && lastMoveDir>0) ? JUMP_FORWARD_VX : 0)
      - (leftPressed ? PLAYER_SPEED : 0);
    worldX = Math.max(0, Math.min(TRACK_LENGTH, worldX + worldVX * dt));

    gameArea.style.backgroundPositionX = `${-worldX * 0.15}px`;

    if (worldX > TRACK_LENGTH - rect.width * 2) cave.style.display = "block";
    if (worldX >= TRACK_LENGTH) {
      running = false;
      alert("¡Llegaste a la cueva! 🥳");
      startScreen.classList.add("visible");
    }
  }
  requestAnimationFrame(moveLoop);
}
requestAnimationFrame(moveLoop);

/* Salto */
function jump() {
  isJumping = true;
  const dir = rightPressed ? 1 : (leftPressed ? -1 : lastMoveDir);
  jumpBoostVX = JUMP_FORWARD_VX * dir;
  jumpBoostUntil = performance.now() + JUMP_BOOST_TIME;
  player.classList.add("jump");
  setTimeout(() => {
    player.classList.remove("jump");
    isJumping = false;
  }, 550);
}

/* Obstáculo */
function restartObstacle() {
  obstacle.style.animation = "none";
  void obstacle.offsetWidth;
  obstacle.style.animation = "moveObstacle 2s linear infinite";
}
function isColliding(a, b) {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  return !(ra.right < rb.left || ra.left > rb.right || ra.bottom < rb.top || ra.top > rb.bottom);
}
function isStomp(playerEl, obstEl) {
  const rp = playerEl.getBoundingClientRect();
  const ro = obstEl.getBoundingClientRect();
  return isJumping && rp.bottom <= ro.top + 18 && !(rp.right < ro.left || rp.left > ro.right);
}
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