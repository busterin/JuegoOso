const gameArea = document.getElementById("gameArea");
const player   = document.getElementById("player");
const sword    = player.querySelector(".sword");
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
let attacking = false;

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

const TRACK_LENGTH = PLAYER_SPEED * 120;
let worldX = 0;

const RIGHT_FRACTION_WHEN_TRAVELING = 0.65;

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
  if (e.code === "KeyS")       { attack(); }

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
bindHold(btnLeft,  ()=>{ leftPressed  = true; lastMoveDir = -1; }, ()=> leftPressed = false);
bindHold(btnRight, ()=>{ rightPressed = true; lastMoveDir =  1; }, ()=> rightPressed = false);
bindHold(btnJump,  ()=>{ if (running && !isJumping) jump(); }, ()=>{});
bindHold(btnAttack,()=>{ attack(); }, ()=>{});

/* ---------- Movimiento + “mundo” ---------- */
let lastTime = 0;
function moveLoop(t){
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime)/1000, 0.033);
  lastTime = t;

  if (running){
    const rect = gameArea.getBoundingClientRect();

    // Velocidad local del oso
    let vx = 0;
    if (leftPressed)  vx -= PLAYER_SPEED;
    if (rightPressed) vx += PLAYER_SPEED;

    if (performance.now() < jumpBoostUntil) {
      vx += jumpBoostVX;
    }

    const nearEnd = worldX > TRACK_LENGTH - rect.width * 1.2;
    const rightLimit = nearEnd
      ? rect.width - PLAYER_WIDTH
      : rect.width * RIGHT_FRACTION_WHEN_TRAVELING - PLAYER_WIDTH;

    playerX = Math.max(0, Math.min(rightLimit, playerX + vx * dt));
    player.style.left = playerX + "px";

    const boost = (performance.now() < jumpBoostUntil) ? (JUMP_FORWARD_VX * lastMoveDir) : 0;
    const worldVX = (rightPressed ? PLAYER_SPEED : 0) + boost - (leftPressed ? PLAYER_SPEED : 0);
    worldX = Math.max(0, Math.min(TRACK_LENGTH, worldX + worldVX * dt));

    gameArea.style.backgroundPositionX = `${-worldX * 0.25}px`;

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

    // Si estamos atacando, comprobar colisión espada-roca
    if (attacking) {
      const sRect = sword.getBoundingClientRect();
      const oRect = obstacle.getBoundingClientRect();
      if (!(sRect.right < oRect.left || sRect.left > oRect.right ||
            sRect.bottom < oRect.top || sRect.top > oRect.bottom)) {
        obstacle.style.opacity = "0";
        setTimeout(() => {
          obstacle.style.opacity = "1";
          restartObstacle();
        }, 200);
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
  setTimeout(() => { player.classList.remove("jump"); isJumping = false; }, 550);
}

/* ---------- Obstáculo ---------- */
function restartObstacle() {
  obstacle.style.animation = "none";
  void obstacle.offsetWidth;
  obstacle.style.animation = "moveObstacle 2s linear infinite";
}

/* ---------- Ataque ---------- */
function attack(){
  if (!running) return;
  if (attacking) return;
  attacking = true;
  player.classList.add("attacking");
  setTimeout(()=>{
    player.classList.remove("attacking");
    attacking = false;
  },200);
}