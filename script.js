/***** ELEMENTOS UI *****/
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const playerEl = document.getElementById('player');
const blocksEl = document.getElementById('blocks');
const itemsEl = document.getElementById('items');
const caveEl = document.getElementById('cave');
const runnerRocksEl = document.getElementById('runnerRocks');

const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');

const gameOverOverlay = document.getElementById('gameOverOverlay');
const gameOverTitle = document.getElementById('gameOverTitle');
const retryBtn = document.getElementById('retryBtn');
const honeyHUD = document.getElementById('honeyHUD');

/***** CONFIG *****/
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

// Ataque
const ATTACK_DURATION  = 180;
const ATTACK_COOLDOWN  = 320;
const ATTACK_RANGE_X   = 110;
const ATTACK_RANGE_Y   = 90;

// Rocas (espaciado)
const ROCK_MIN_GAP       = 480;
const ROCK_RESPAWN_BASE  = 220;
const ROCK_RESPAWN_RAND  = 520;

// Ajuste fino de baseline (alineación exacta con rocas)
const BEAR_BASELINE_OFFSET = -8; // ajusta -6/-10 si lo ves 1–2 px distinto

/***** ESTADO *****/
const player = { x:120, y:GROUND_Y, vx:0, vy:0, width:90, height:90, onGround:true, big:false, facing:1 };
let jumpBoostUntil = 0;
let isAttacking = false;
let attackUntil = 0;
let nextAttackTime = 0;

let last = 0;
let running = false;

/***** ESPADA (fallback PNG si no hay GIF) *****/
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
const caveX = LEVEL_WIDTH - 300;
caveEl.style.left = caveX + 'px';

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
function buildLevel() {
  blocksEl.innerHTML = '';
  itemsEl.innerHTML = '';
  blocks = [];
  items = [];
  for (let x=500; x<LEVEL_WIDTH-800; x+=900) placeBlock(x);
}

/***** ROCAS *****/
let runnerRocks = [];
function clearRocks() {
  runnerRocksEl.innerHTML = '';
  runnerRocks = [];
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

  if (e.code === 'Space') { e.preventDefault(); keys.jump = true; }
  if (e.code === 'KeyS') keys.attack = true;

  // También permitir empezar con Enter o Space
  if ((e.code === 'Enter' || e.code === 'Space') && startOverlay.classList.contains('visible')) {
    e.preventDefault(); startGame();
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
  if (e.code === 'KeyS') keys.attack = false;
});
startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', () => location.reload());

/***** INICIO / RESET *****/
function startGame(){
  // Mostrar juego (ya visible) y quitar overlay
  startOverlay.classList.remove('visible');

  // Reset estado
  player.x=120; player.y=GROUND_Y; player.vx=0; player.vy=0;
  player.onGround=true; player.big=false; player.facing=1;
  playerEl.className = 'player';
  setHUDActive(false);
  jumpBoostUntil = 0;
  isAttacking = false; attackUntil = 0; nextAttackTime = 0;
  gameOverOverlay.classList.remove('visible');

  // Construir nivel y rocas después de tener ancho real
  buildLevel();
  spawnInitialRocks();

  running = true;
}

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

/***** BUCLE PRINCIPAL *****/
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min((ts-last)/1000, 0.033);
  last = ts;

  if (running) {
    // Movimiento horizontal
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

    // Control en el aire
    if (!player.onGround) {
      if (ts < jumpBoostUntil) {
        const minV = (player.facing > 0) ?  JUMP_FORWARD_SPEED : -JUMP_FORWARD_SPEED;
        if (player.facing > 0) player.vx = Math.max(player.vx, minV);
        else                   player.vx = Math.min(player.vx, minV);
      }
      if (!keys.left && !keys.right) {
        const driftV = (player.facing > 0) ?  AIR_DRIFT_MIN : -AIR_DRIFT_MIN;
        if (player.facing > 0) player.vx = Math.max(player.vx, driftV);
        else                   player.vx = Math.min(player.vx, driftV);
      }
      const desired = (keys.left ? -MAX_AIR_SPEED : 0) + (keys.right ? MAX_AIR_SPEED : 0);
      if (desired !== 0) {
        if (desired > player.vx) player.vx = Math.min(player.vx + AIR_ACCEL*dt, desired);
        if (desired < player.vx) player.vx = Math.max(player.vx - AIR_ACCEL*dt, desired);
      }
      if (player.vx >  MAX_AIR_SPEED) player.vx =  MAX_AIR_SPEED;
      if (player.vx < -MAX_AIR_SPEED) player.vx = -MAX_AIR_SPEED;
    } else {
      // En suelo, seguir input exacto
      player.vx = targetVx;
    }

    // Física
    player.vy -= GRAVITY * dt;
    player.x  += player.vx * dt;
    player.y  += player.vy * dt;

    // Suelo y límites
    if (player.y < GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.onGround = true; }
    if (player.x < 0) player.x = 0;
    if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;

    // Bloques -> panal
    const pR = playerRect();
    for (const bl of blocks) {
      const bR = { x: bl.x, y: bl.y, width: bl.width, height: bl.height };
      if (!bl.broken && aabb(pR, bR)) {
        const playerTop = player.y + (player.big ? player.height*1.45 : player.height);
        if (player.vy > 0 && playerTop >= bl.y && (playerTop - bl.y) < 36) {
          bl.broken = true; bl.el.classList.add('broken');
          placeHoney(bl.x + 6, bl.y + bl.height + 4);
        }
      }
    }

    // Panal: cae y se recoge -> vida extra
    for (const it of items) {
      if (it.taken) continue;
      if (!it.onGround) {
        it.vy -= GRAVITY * 0.6 * dt;
        it.y  += it.vy * dt;
        if (it.y < GROUND_Y) { it.y = GROUND_Y; it.vy = 0; it.onGround = true; }
      }
      const iR = { x: it.x, y: it.y, width: it.width, height: it.height };
      if (aabb(playerRect(), iR)) {
        it.taken = true; it.el.remove();
        player.big = true; playerEl.classList.add('big'); setHUDActive(true);
      }
      if (it.el) { it.el.style.left = it.x + 'px'; it.el.style.bottom = it.y + 'px'; }
    }

    // Rocas: mover, colisiones, respawn
    for (const r of runnerRocks) {
      if (r.dead) continue;
      r.x -= ROCK_SPEED * dt;

      // Coordenadas de pantalla del oso (mundo con cámara)
      const center = Math.min(Math.max(player.x, viewport.clientWidth/2), LEVEL_WIDTH - viewport.clientWidth/2);
      const offset = -center + viewport.clientWidth/2;
      const pScreen = { x: player.x + offset, y: player.y, width: player.width*(player.big?1.45:1), height: player.height*(player.big?1.45:1) };
      const rRect   = { x: r.x, y: 0, width: r.width, height: r.height };

      const overlap = aabb(pScreen, rRect);

      if (overlap) {
        if (isAttacking) {
          const aRect = getAttackRect(pScreen);
          if (aabb(aRect, rRect)) {
            r.dead = true; r.el.style.opacity = '0'; r.x = -999;
            setTimeout(() => {
              r.el.style.opacity = '1'; r.dead = false;
              let lastX = viewport.clientWidth;
              for (const o of runnerRocks) if (o!==r && !o.dead && o.x>lastX) lastX = o.x;
              r.x = Math.max(viewport.clientWidth+ROCK_RESPAWN_BASE+Math.random()*ROCK_RESPAWN_RAND,
                             lastX+ROCK_MIN_GAP+Math.random()*120);
            }, 180);
          }
        } else {
          if (player.big) { player.big = false; playerEl.classList.remove('big'); setHUDActive(false); }
          else { running = false; gameOverTitle.textContent = '¡Ay! Te golpeó una roca'; gameOverOverlay.classList.add('visible'); }
          r.x = -120;
        }
      }

      // Respawn con separación
      if (r.x < -140 && !r.dead) {
        let lastX = viewport.clientWidth;
        for (const o of runnerRocks) if (o!==r && !o.dead && o.x>lastX) lastX = o.x;
        r.x = Math.max(viewport.clientWidth+ROCK_RESPAWN_BASE+Math.random()*ROCK_RESPAWN_RAND,
                       lastX+ROCK_MIN_GAP+Math.random()*120);
      }
      r.el.style.left = r.x + 'px';
    }
  }

  /* Render (alineado exacto con las rocas) */
  playerEl.style.left = player.x + 'px';
  playerEl.style.bottom = (Math.max(player.y, GROUND_Y) + BEAR_BASELINE_OFFSET) + 'px';

  for (const b of blocks) b.el.style.bottom = b.y + 'px';

  // Meta
  const caveRect = { x: caveX, y: 0, width: 180, height: 160 };
  if (aabb(playerRect(), caveRect)) {
    running = false;
    gameOverTitle.textContent = '¡Llegaste a tu cueva! 🥳';
    gameOverOverlay.classList.add('visible');
  }

  updateCamera();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
