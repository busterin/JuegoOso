const gameWrapper = document.getElementById("gameWrapper");
const gameArea    = document.getElementById("gameArea");
const hud         = document.getElementById("hud");
const player      = document.getElementById("player");
const swordEl     = document.getElementById("sword");
const sparkEl     = document.getElementById("spark");
const obstacle    = document.getElementById("obstacle");
const cave        = document.getElementById("cave");

const startScreen    = document.getElementById("startScreen");
const playBtn        = document.getElementById("playBtn");
const victoryOverlay = document.getElementById("victoryOverlay");
const gameOverOverlay= document.getElementById("gameOverOverlay");
const rotateOverlay  = document.getElementById("rotateOverlay");

const retryWinBtn  = document.getElementById("retryWinBtn");
const homeWinBtn   = document.getElementById("homeWinBtn");
const retryLoseBtn = document.getElementById("retryLoseBtn");
const homeLoseBtn  = document.getElementById("homeLoseBtn");

const btnLeft   = document.getElementById("btnLeft");
const btnRight  = document.getElementById("btnRight");
const btnJump   = document.getElementById("btnJump");
const btnAttack = document.getElementById("btnAttack");

/* Parallax opcional */
const parallaxBack   = document.querySelector(".layer-back");
const parallaxMid    = document.querySelector(".layer-mid");
const parallaxFront  = document.querySelector(".layer-front");
const parallaxGround = document.querySelector(".layer-ground");

/* ===== Escenario lógico 600×200 ===== */
const BASE_W = 600, BASE_H = 200;
let currentScale = 1;

function getControlsHeight(){
  const c=document.querySelector(".controls");
  if(!c || window.getComputedStyle(c).display==="none") return 0;
  return c.getBoundingClientRect().height + 18;
}
function fitStage(){
  const maxW = Math.min(window.innerWidth, 1100);
  const scaleW = maxW / BASE_W;
  const freeH = window.innerHeight - getControlsHeight() - 16;
  const scaleH = freeH / BASE_H;
  const scale  = Math.max(0.6, Math.min(scaleW, scaleH));
  currentScale = scale;
  document.documentElement.style.setProperty("--scale", String(scale));
  if(gameWrapper) gameWrapper.style.height = (BASE_H*scale + 4) + "px";
}

/* ===== Estado ===== */
let running=false,isJumping=false,gameOverLock=false,hasWon=false;
let leftPressed=false,rightPressed=false;
let playerX=50,lastMoveDir=1,worldX=0;

const PLAYER_WIDTH=80,PLAYER_SPEED=260;
const JUMP_FORWARD_VX=260,JUMP_BOOST_TIME=360;
let jumpBoostVX=0,jumpBoostUntil=0;

const TARGET_SECONDS=60;
const TRACK_LENGTH=PLAYER_SPEED*TARGET_SECONDS;
const RIGHT_FRACTION_WHEN_TRAVELING=0.65;

/* ===== Vidas (panales) ===== */
const MAX_LIVES=3;
let lives=MAX_LIVES;
let invulnerableUntil=0;

function renderLives(){
  if(!hud) return;
  hud.innerHTML="";
  for(let i=0;i<lives;i++){
    const el=document.createElement("div");
    el.className="honey";
    hud.appendChild(el);
  }
}

/* ===== Overlay orientación ===== */
function isPortrait(){ return window.matchMedia("(orientation: portrait)").matches; }
function isStartVisible(){ return startScreen.classList.contains("visible"); }
function updateOrientationOverlay(){
  const shouldShow = isPortrait() && (running || isStartVisible());
  if(shouldShow){
    rotateOverlay.style.display = "flex";
    rotateOverlay.style.pointerEvents = running ? "auto" : "none";
  } else {
    rotateOverlay.style.display = "none";
  }
}

/* ===== Obstáculos (incluye enemigos saltadores 1/3) ===== */
const OB_MIN_DURATION=2.8,OB_MAX_DURATION=3.6,OB_MIN_DELAY=900,OB_MAX_DELAY=1700;
let obstacleTimer=null;
function rand(a,b){return Math.random()*(b-a)+a;}
function randi(a,b){return Math.floor(rand(a,b));}

function spawnObstacle(){
  if(!running || hasWon) return;

  obstacle.classList.remove("disintegrate");
  obstacle.style.opacity="1";
  obstacle.style.right="-50px";
  obstacle.style.bottom="0";

  const dur = rand(OB_MIN_DURATION, OB_MAX_DURATION).toFixed(2);

  // 1/3 aprox serán "saltadores" (salto vertical alto)
  const isJumper = Math.random() < 0.33;
  if (isJumper) {
    const jumpDur = rand(0.85, 1.25).toFixed(2); // aleatorio para variedad
    obstacle.style.animation = `moveObstacle ${dur}s linear 1, jumpEnemy ${jumpDur}s ease-in-out infinite`;
  } else {
    obstacle.style.animation = `moveObstacle ${dur}s linear 1`;
  }
}

/* Solo reagendamos cuando termina moveObstacle (ignora jumpEnemy) */
obstacle.addEventListener("animationend", (ev)=>{
  if (ev.animationName !== "moveObstacle") return;
  obstacle.style.animation="none";
  if(!hasWon) scheduleNextObstacle(randi(OB_MIN_DELAY,OB_MAX_DELAY));
});
function scheduleNextObstacle(ms){ clearTimeout(obstacleTimer); obstacleTimer=setTimeout(spawnObstacle, ms); }

/* ===== Inicio / reinicio ===== */
playBtn.onclick=async ()=>{
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch(_){}
  startScreen.classList.remove("visible");
  startGame();
};
retryWinBtn.onclick =()=>{ victoryOverlay.classList.remove("visible"); startGame(); };
homeWinBtn.onclick  =()=>{ victoryOverlay.classList.remove("visible"); startScreen.classList.add("visible"); };
retryLoseBtn.onclick=()=>{ gameOverOverlay.classList.remove("visible"); startGame(); };
homeLoseBtn.onclick =()=>{ gameOverOverlay.classList.remove("visible"); startScreen.classList.add("visible"); };

function startGame(){
  running=true; isJumping=false; gameOverLock=false; hasWon=false;
  leftPressed=rightPressed=false; playerX=50; worldX=0; lastMoveDir=1;

  lives=MAX_LIVES; invulnerableUntil=0; renderLives();

  player.style.left=playerX+"px"; cave.style.display="none";
  player.classList.remove("flip","hurt");

  document.documentElement.style.setProperty("--dayCycle", `${TARGET_SECONDS}s`);
  victoryOverlay.classList.remove("visible");
  gameOverOverlay.classList.remove("visible");

  swordEl.style.opacity="0"; swordEl.style.left="-9999px"; swordEl.classList.remove("swing-right","swing-left");
  sparkEl.style.left="-9999px"; sparkEl.classList.remove("burst");

  scheduleNextObstacle(700);
  fitStage();
  updateOrientationOverlay();
}

/* ===== Inputs ===== */
document.onkeydown=e=>{
  if(e.code==="Space"){ e.preventDefault(); if(running&&!isJumping) jump(); }
  if(e.code==="ArrowLeft"){  leftPressed=true;  lastMoveDir=-1; player.classList.add("flip"); }
  if(e.code==="ArrowRight"){ rightPressed=true; lastMoveDir= 1; player.classList.remove("flip"); }
  if(e.code==="KeyS"){ doAttack(); }
  if((e.code==="Enter"||e.code==="Space") && startScreen.classList.contains("visible")){
    e.preventDefault(); playBtn.click();
  }
};
document.onkeyup=e=>{
  if(e.code==="ArrowLeft")  leftPressed=false;
  if(e.code==="ArrowRight") rightPressed=false;
};
function bindHold(btn,on,off){
  if(!btn) return;
  btn.onmousedown  = ev=>{ ev.preventDefault(); on(); };
  btn.ontouchstart = ev=>{ ev.preventDefault(); on(); };
  btn.onmouseup    = ev=>{ ev.preventDefault(); off(); };
  btn.onmouseleave = ev=>{ ev.preventDefault(); off(); };
  btn.ontouchend   = ev=>{ ev.preventDefault(); off(); };
  btn.ontouchcancel= ev=>{ ev.preventDefault(); off(); };
}
bindHold(btnLeft,  ()=>{ leftPressed=true;  lastMoveDir=-1; player.classList.add("flip"); }, ()=>{ leftPressed=false; });
bindHold(btnRight, ()=>{ rightPressed=true; lastMoveDir= 1; player.classList.remove("flip"); }, ()=>{ rightPressed=false; });
bindHold(btnJump,  ()=>{ if(running&&!isJumping) jump(); }, ()=>{});
bindHold(btnAttack,()=>{ doAttack(); }, ()=>{});

/* ===== Movimiento + fondo ===== */
let lastTime=0;
function moveLoop(t){
  if(!lastTime) lastTime=t;
  const dt=Math.min((t-lastTime)/1000,0.033);
  lastTime=t;

  if(running){
    const visibleW = BASE_W;

    let vx=0;
    if(leftPressed)  vx-=PLAYER_SPEED;
    if(rightPressed) vx+=PLAYER_SPEED;
    if(performance.now()<jumpBoostUntil) vx+=jumpBoostVX;

    const nearEnd   = worldX > TRACK_LENGTH - visibleW * 1.2;
    const rightLimit= nearEnd
      ? (visibleW - PLAYER_WIDTH)
      : (visibleW * RIGHT_FRACTION_WHEN_TRAVELING - PLAYER_WIDTH);

    playerX=Math.max(0,Math.min(rightLimit,playerX+vx*dt));
    player.style.left=playerX+"px";

    const boost  = (performance.now()<jumpBoostUntil)? (JUMP_FORWARD_VX*lastMoveDir) : 0;
    const worldVX= (rightPressed?PLAYER_SPEED:0) + boost - (leftPressed?PLAYER_SPEED:0);
    worldX=Math.max(0,Math.min(TRACK_LENGTH,worldX+worldVX*dt));

    const moveBG = (el, factor) => { if(el) el.style.backgroundPositionX = `${-(worldX*factor)}px`; };
    moveBG(parallaxBack,   0.08);
    moveBG(parallaxMid,    0.18);
    moveBG(parallaxFront,  0.28);
    moveBG(parallaxGround, 0.38);
    if(!parallaxBack && !parallaxMid && !parallaxFront && !parallaxGround){
      moveBG(gameArea, 0.25);
    }

    // Recta final: mostrar cueva y dejar de generar rocas
    if(worldX > TRACK_LENGTH - visibleW * 2){
      cave.style.display="block";
      clearTimeout(obstacleTimer);
    } else {
      cave.style.display="none";
    }

    if(worldX>=TRACK_LENGTH) onVictory();
  }
  requestAnimationFrame(moveLoop);
}
requestAnimationFrame(moveLoop);

/* ===== Salto del oso ===== */
function jump(){
  isJumping=true;
  const dir = rightPressed ? 1 : (leftPressed ? -1 : lastMoveDir);
  lastMoveDir=dir;
  jumpBoostVX=JUMP_FORWARD_VX*dir;
  jumpBoostUntil=performance.now()+JUMP_BOOST_TIME;

  player.classList.add("jump");
  setTimeout(()=>{ player.classList.remove("jump"); isJumping=false; }, 550);
}

/* ===== Ataque (corregido para escala) ===== */
let attackCooldownUntil=0;
function doAttack(){
  if(!running || hasWon) return;
  const now=performance.now();
  if(now<attackCooldownUntil) return;
  attackCooldownUntil=now+220;

  const pLeft  = player.offsetLeft;
  const pRight = pLeft + player.offsetWidth;

  const x = lastMoveDir>0 ? (pRight-12) : (pLeft-58);
  swordEl.style.left   = `${x}px`;
  swordEl.style.bottom = "18px";
  swordEl.style.opacity= "1";
  swordEl.classList.remove("swing-right","swing-left");
  void swordEl.offsetWidth;
  swordEl.classList.add(lastMoveDir>0 ? "swing-right" : "swing-left");

  const pr = player.getBoundingClientRect();
  const or = obstacle.getBoundingClientRect();
  const hitbox = (lastMoveDir>0)
    ? {left:pr.right,     right:pr.right+60, top:pr.bottom-70, bottom:pr.bottom-20}
    : {left:pr.left-60,   right:pr.left,     top:pr.bottom-70, bottom:pr.bottom-20};
  const hit = !(hitbox.right<or.left || hitbox.left>or.right || hitbox.bottom<or.top || hitbox.top>or.bottom);

  const sparkX = lastMoveDir>0 ? (pRight+(hit?20:14)) : (pLeft-(hit?20:14)-34);
  sparkEl.style.left   = `${sparkX}px`;
  sparkEl.style.bottom = hit ? "42px" : "38px";
  sparkEl.classList.remove("burst"); void sparkEl.offsetWidth; sparkEl.classList.add("burst");

  if(hit) destroyRock();

  setTimeout(()=>{ swordEl.style.opacity="0"; }, 240);
}

/* ===== Victoria / Game Over ===== */
function onVictory(){
  if(hasWon) return;
  hasWon = true;
  running=false;
  clearTimeout(obstacleTimer);
  obstacle.style.animation="none";
  obstacle.style.opacity="0";
  victoryOverlay.classList.add("visible");
  updateOrientationOverlay();
}
function onGameOver(){
  if(hasWon) return;
  running=false; clearTimeout(obstacleTimer); obstacle.style.animation="none";
  gameOverOverlay.classList.add("visible");
  updateOrientationOverlay();
}

/* ===== Roca ===== */
function destroyRock(){
  obstacle.style.animation="none";
  obstacle.classList.add("disintegrate");
  setTimeout(()=>{
    obstacle.classList.remove("disintegrate");
    if(!hasWon) scheduleNextObstacle(randi(OB_MIN_DELAY,OB_MAX_DELAY));
  }, 280);
}
function resetRockAfterHit(){
  obstacle.style.animation="none";
  obstacle.classList.remove("disintegrate");
  obstacle.style.opacity="1";
  obstacle.style.right="-50px";
  if(!hasWon) scheduleNextObstacle(900);
}

/* ===== Colisiones ===== */
function isColliding(a,b){
  const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
  return !(ra.right<rb.left || ra.left>rb.right || ra.bottom<rb.top || ra.top>rb.bottom);
}
function isStomp(p,o){
  const rp=p.getBoundingClientRect(), ro=o.getBoundingClientRect();
  const verticalOK = rp.bottom <= ro.top + 18;
  const horizontalOverlap = !(rp.right<ro.left || rp.left>ro.right);
  return isJumping && verticalOK && horizontalOverlap;
}

/* ===== Listeners globales y colisiones ===== */
window.addEventListener("resize", ()=>{ fitStage(); updateOrientationOverlay(); });
window.addEventListener("orientationchange", ()=>{ fitStage(); updateOrientationOverlay(); });
document.addEventListener("DOMContentLoaded", ()=>{
  fitStage();
  updateOrientationOverlay();
});

setInterval(()=>{
  if(!running || hasWon) return;

  if(isColliding(player, obstacle)){
    if(isStomp(player, obstacle)){
      destroyRock();
      return;
    }

    const now=performance.now();
    if(now < invulnerableUntil) return;

    lives = Math.max(0, lives - 1);
    renderLives();

    player.classList.add("hurt");
    invulnerableUntil = now + 800;
    setTimeout(()=> player.classList.remove("hurt"), 650);

    if(lives <= 0){
      running=false;
      clearTimeout(obstacleTimer);
      obstacle.style.animation="none";
      onGameOver();
    } else {
      resetRockAfterHit();
    }
  }
}, 90);