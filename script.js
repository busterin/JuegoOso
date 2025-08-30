/***** PANTALLA INICIO -> JUEGO *****/
const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const playBtn = document.getElementById('playBtn');
const backHomeBtn = document.getElementById('backHomeBtn');
const retryBtn = document.getElementById('retryBtn');

let running = false;   
let started = false;   

function startGame() {
  homeScreen.style.display = 'none';
  gameScreen.style.display = 'block';

  if (!started) {
    initLevel();
    spawnInitialRocks();
    started = true;
  } else {
    resetState();
    spawnInitialRocks(true);
  }
  running = true;
}
playBtn.addEventListener('click', startGame);
backHomeBtn?.addEventListener('click', () => location.reload());
retryBtn?.addEventListener('click', () => location.reload());

/***** ELEMENTOS DEL JUEGO *****/
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const playerEl = document.getElementById('player');
const blocksEl = document.getElementById('blocks');
const itemsEl = document.getElementById('items');
const caveEl = document.getElementById('cave');
const runnerRocksEl = document.getElementById('runnerRocks');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const gameOverTitle = document.getElementById('gameOverTitle');
const honeyHUD = document.getElementById('honeyHUD');

/***** CONFIGURACIÓN *****/
const LEVEL_WIDTH = 12000;
const GROUND_Y = 0;           
const GRAVITY = 1850;
const RUN_SPEED = 100;
const JUMP_VELOCITY = 840;
const ROCK_SPEED = 90;
const PARALLAX_FACTOR = 0.3;

// Salto hacia delante
const JUMP_FORWARD_SPEED = 210;
const JUMP_BOOST_TIME   = 380;
const AIR_ACCEL         = 650;
const MAX_AIR_SPEED     = 220;
const AIR_DRIFT_MIN     = 130;

// Espada
const ATTACK_DURATION  = 180;
const ATTACK_COOLDOWN  = 320;
const ATTACK_RANGE_X   = 110;
const ATTACK_RANGE_Y   = 90;

// Rocas
const ROCK_MIN_GAP       = 480;
const ROCK_RESPAWN_BASE  = 220;
const ROCK_RESPAWN_RAND  = 520;

/***** ESTADO *****/
const player = { x:120, y:GROUND_Y, vx:0, vy:0, width:90, height:90, onGround:true, big:false, facing:1 };
let jumpBoostUntil = 0;
let isAttacking = false;
let attackUntil = 0;
let nextAttackTime = 0;
let last = 0;

// Espada
const swordEl = playerEl.querySelector('.sword');
(function ensureSwordImage(){
  const test = new Image();
  test.onerror = () => { swordEl.style.backgroundImage = 'url("img/Espada.png")'; };
  test.src = 'img/Espada.gif';
})();

/***** UTILS *****/
function elem(tag, className, style={}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.assign(el.style, style);
  return el;
}
function aabb(a,b){ return !(a.x+a.width<b.x||a.x>b.x+b.width||a.y+a.height<b.y||a.y>b.y+b.height); }
function playerRect(){
  const w = player.width * (player.big?1.45:1);
  const h = player.height * (player.big?1.45:1);
  return { x:player.x, y:player.y, width:w, height:h };
}
function setHUDActive(active){ honeyHUD?.classList.toggle('active', !!active); }

/***** NIVEL *****/
let blocks = [];
let items  = [];
function initLevel() {
  blocksEl.innerHTML = '';
  itemsEl.innerHTML = '';
  blocks = [];
  items = [];

  for (let x=500; x<LEVEL_WIDTH-800; x+=900) placeBlock(x);

  const caveX = LEVEL_WIDTH - 300;
  caveEl.style.left = caveX + 'px';
  caveEl.dataset.x = caveX;

  resetState();
}
function placeBlock(x) {
  const el = elem('div','block',{ left:x+'px' });
  blocksEl.appendChild(el);
  blocks.push({ x, y:130, width:60, height:60, el, broken:false });
}
function placeHoney(x,y) {
  const el = elem('div','honey',{ left:x+'px', bottom:y+'px' });
  itemsEl.appendChild(el);
  const it = { x, y, width:48, height:48, el, vy:0, onGround:false, taken:false };
  items.push(it);
  return it;
}

/***** ROCAS *****/
let runnerRocks = [];
function clearRocks() {
  runnerRocks = [];
  runnerRocksEl.innerHTML = '';
}
function spawnRock(x) {
  const el = elem('div','runner-rock',{ left:x+'px' });
  runnerRocksEl.appendChild(el);
  const r = { x, y:0, width:70, height:70, el, dead:false };
  runnerRocks.push(r);
}
function spawnInitialRocks(){
  clearRocks();
  const vw = viewport.clientWidth || Math.min(1100, window.innerWidth || 1100);
  const base = vw + 220;
  spawnRock(base);
  spawnRock(base + ROCK_MIN_GAP + 320);
  spawnRock(base + 2*(ROCK_MIN_GAP + 320));
}

/***** CÁMARA + PARALLAX *****/
function updateCamera() {
  const center = Math.min(Math.max(player.x, viewport.clientWidth/2), LEVEL_WIDTH - viewport.clientWidth/2);
  const offset = -center + viewport.clientWidth/2;
  world.style.transform = `translateX(${offset}px)`;
  const parallaxX = -player.x * PARALLAX_FACTOR;
  viewport.style.backgroundPosition = `${parallaxX}px 0px`;
}

/***** INPUT *****/
const keys = { left:false, right:false, jump:false, attack:false };
document.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;

  if (e.code === 'Space') {
    e.preventDefault(); // <- evita scroll
    keys.jump = true;
  }
  if (e.code === 'KeyS') keys.attack = true;
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
  if (e.code === 'KeyS') keys.attack = false;
});

/***** ATAQUE *****/
function tryStartAttack(ts){
  if (isAttacking || ts < nextAttackTime) return;
  isAttacking = true;
  attackUntil = ts + ATTACK_DURATION;
  nextAttackTime = ts + ATTACK_COOLDOWN;
  playerEl.classList.add('attacking');
}
function getAttackRect(pScreen){
  if (player.facing > 0) {
    return { x: pScreen.x + pScreen.width - 6, y: pScreen.y, width: ATTACK_RANGE_X, height: ATTACK_RANGE_Y };
  } else {
    return { x: pScreen.x - ATTACK_RANGE_X + 6, y: pScreen.y, width: ATTACK_RANGE_X, height: ATTACK_RANGE_Y };
  }
}

/***** RESET ESTADO *****/
function resetState(){
  player.x=120; player.y=GROUND_Y; player.vx=0; player.vy=0;
  player.onGround=true; player.big=false; player.facing=1;
  playerEl.className = 'player';
  setHUDActive(false);
  jumpBoostUntil = 0;
  isAttacking = false; attackUntil = 0; nextAttackTime = 0;
  gameOverOverlay.classList.remove('visible');
}

/***** BUCLE *****/
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min((ts-last)/1000, 0.033);
  last = ts;

  if (running) {
    // Movimiento
    let targetVx = 0;
    if (keys.left)  targetVx -= RUN_SPEED;
    if (keys.right) targetVx += RUN_SPEED;
    if (targetVx !== 0) player.facing = (targetVx > 0 ? 1 : -1);
    playerEl.classList.toggle('facing-left', player.facing < 0);

    // Salto
    if (keys.jump && player.onGround) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      player.vx = (player.facing > 0) ? Math.max(player.vx,  JUMP_FORWARD_SPEED)
                                      : Math.min(player.vx, -JUMP_FORWARD_SPEED);
      jumpBoostUntil = ts + JUMP_BOOST_TIME;
    }

    // Ataque
    if (keys.attack) tryStartAttack(ts);
    if (isAttacking && ts > attackUntil) { isAttacking = false; playerEl.classList.remove('attacking'); }

    // Control suelo/
