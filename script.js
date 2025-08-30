// Elements
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

// Config
const LEVEL_WIDTH = 12000;
const GROUND_Y = 0;
const GRAVITY = 1850;
const RUN_SPEED = 100;
const JUMP_VELOCITY = 840;   // ↑ un poco más de salto vertical
const ROCK_SPEED = 90;
const PARALLAX_FACTOR = 0.3;

// Salto hacia delante (consistente y más largo)
const JUMP_FORWARD_SPEED = 210; // velocidad horizontal objetivo al despegar
const JUMP_BOOST_TIME   = 380;  // ms de avance garantizado tras despegar
const AIR_ACCEL         = 650;  // aceleración en el aire con A/D o ←/→
const MAX_AIR_SPEED     = 220;  // límite de velocidad horizontal en el aire
const AIR_DRIFT_MIN     = 130;  // avance mínimo continuo en el aire si no pulsas nada

// Spawning de rocas (nunca juntas)
const ROCK_MIN_GAP       = 480; // separación mínima entre rocas (px)
const ROCK_RESPAWN_BASE  = 220; // base desde el borde derecho
const ROCK_RESPAWN_RAND  = 520; // aleatorio extra para variar

// Player
const player = {
  x:120, y:GROUND_Y, vx:0, vy:0,
  width:90, height:90,
  onGround:true, big:false, facing:1
};

// Estado boost
let jumpBoostUntil = 0; // timestamp (ms) hasta el que se asegura el avance

// Utils
function elem(tag, className, style={}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.assign(el.style, style);
  return el;
}

// Level
const blocks = [];
const items  = [];
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
// Bloques repartidos
for (let x=500; x<LEVEL_WIDTH-800; x+=900) placeBlock(x);

// Cueva
const caveX = LEVEL_WIDTH - 300;
caveEl.style.left = caveX + 'px';

// Rocas runner (70x70 en CSS)
const runnerRocks = [];
function spawnRock(x) {
  const el = elem('div','runner-rock',{ left:x+'px' });
  runnerRocksEl.appendChild(el);
  const r = { x, y:0, width:70, height:70, el };
  runnerRocks.push(r);
}
// Spawning inicial espaciado
(function initialSpawn(){
  const base = viewport.clientWidth + 200;
  spawnRock(base);
  spawnRock(base + ROCK_MIN_GAP + 320);
  spawnRock(base + 2*(ROCK_MIN_GAP + 320));
})();

// Cámara + Parallax
function updateCamera() {
  const center = Math.min(Math.max(player.x, viewport.clientWidth/2), LEVEL_WIDTH - viewport.clientWidth/2);
  const offset = -center + viewport.clientWidth/2;
  world.style.transform = `translateX(${offset}px)`;
  const parallaxX = -player.x * PARALLAX_FACTOR;
  viewport.style.backgroundPosition = `${parallaxX}px 0px`;
}

// Input
const keys = { left:false, right:false, jump:false };
document.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space') keys.jump = true;
  if ((e.code === 'Enter' || e.code === 'Space') && startOverlay?.classList.contains('visible')) {
    e.preventDefault(); startGame();
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
});
startBtn?.addEventListener('click', startGame);
retryBtn.addEventListener('click', () => location.reload());

// Helpers
function aabb(a,b){ return !(a.x+a.width<b.x||a.x>b.x+b.width||a.y+a.height<b.y||a.y>b.y+b.height); }
function playerRect(){
  const w = player.width * (player.big?1.45:1);
  const h = player.height * (player.big?1.45:1);
  return { x:player.x, y:player.y, width:w, height:h };
}
function setHUDActive(active){ honeyHUD?.classList.toggle('active', !!active); }

// Estado
let last = 0;
let running = false; // empieza en pausa (overlay visible)

// Juego: iniciar
function startGame(){
  startOverlay?.classList.remove('visible');
  gameOverOverlay?.classList.remove('visible');
  running = true;
}

// Loop
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min((ts-last)/1000, 0.033);
  last = ts;

  if (running) {
    // Entrada horizontal deseada
    let targetVx = 0;
    if (keys.left)  targetVx -= RUN_SPEED;
    if (keys.right) targetVx += RUN_SPEED;

    // Facing visual
    if (targetVx !== 0) player.facing = (targetVx > 0 ? 1 : -1);
    playerEl.classList.toggle('facing-left', player.facing < 0);

    // Salto con impulso garantizado
    if (keys.jump && player.onGround) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      // velocidad inicial hacia el frente según facing
      player.vx = (player.facing > 0)
        ? Math.max(player.vx,  JUMP_FORWARD_SPEED)
        : Math.min(player.vx, -JUMP_FORWARD_SPEED);
      // ventana de avance garantizado
      jumpBoostUntil = ts + JUMP_BOOST_TIME;
    }

    // Control suelo/aire
    if (player.onGround) {
      player.vx = targetVx;
    } else {
      // 1) Mantener avance mínimo durante la ventana de boost
      if (ts < jumpBoostUntil) {
        const minV = (player.facing > 0) ?  JUMP_FORWARD_SPEED : -JUMP_FORWARD_SPEED;
        if (player.facing > 0) player.vx = Math.max(player.vx, minV);
        else                   player.vx = Math.min(player.vx, minV);
      }
      // 2) Si no hay input, mantener un drift suave constante
      if (!keys.left && !keys.right) {
        const driftV = (player.facing > 0) ?  AIR_DRIFT_MIN : -AIR_DRIFT_MIN;
        if (player.facing > 0) player.vx = Math.max(player.vx, driftV);
        else                   player.vx = Math.min(player.vx, driftV);
      }
      // 3) Permitir ajustar con input en el aire
      const desired = (keys.left ? -MAX_AIR_SPEED : 0) + (keys.right ? MAX_AIR_SPEED : 0);
      if (desired !== 0) {
        if (desired > player.vx) player.vx = Math.min(player.vx + AIR_ACCEL*dt, desired);
        if (desired < player.vx) player.vx = Math.max(player.vx - AIR_ACCEL*dt, desired);
      }
      // clamp
      if (player.vx >  MAX_AIR_SPEED) player.vx =  MAX_AIR_SPEED;
      if (player.vx < -MAX_AIR_SPEED) player.vx = -MAX_AIR_SPEED;
    }

    // Física
    player.vy -= GRAVITY * dt;
    player.x  += player.vx * dt;
    player.y  += player.vy * dt;

    // Límites
    if (player.x < 0) player.x = 0;
    if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;
    if (player.y < GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.onGround = true; }

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

    // Panal: cae y al recoger -> power-up
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

    // Rocas: mover y respawnear con distancia mínima
    for (const r of runnerRocks) {
      r.x -= ROCK_SPEED * dt;

      if (r.x < -100) {
        // calcular la roca más a la derecha (excluyendo esta)
        let lastX = viewport.clientWidth;
        for (const o of runnerRocks) {
          if (o !== r && o.x > lastX) lastX = o.x;
        }
        // nuevo spawn garantizando separación
        const rightEdge = viewport.clientWidth + ROCK_RESPAWN_BASE + Math.random()*ROCK_RESPAWN_RAND;
        r.x = Math.max(rightEdge, lastX + ROCK_MIN_GAP + Math.random()*120);
      }

      // Colisión en coords de pantalla
      const center = Math.min(Math.max(player.x, viewport.clientWidth/2), LEVEL_WIDTH - viewport.clientWidth/2);
      const offset = -center + viewport.clientWidth/2;
      const pScreen = { x: player.x + offset, y: player.y, width: player.width*(player.big?1.45:1), height: player.height*(player.big?1.45:1) };
      const rRect   = { x: r.x, y: 0, width: r.width, height: r.height };
      const coll = !((pScreen.x + pScreen.width - 10) < (rRect.x + 10) ||
                     (pScreen.x + 10) > (rRect.x + rRect.width - 10) ||
                     (pScreen.y + pScreen.height - 10) < (rRect.y + 10) ||
                     (pScreen.y + 10) > (rRect.y + rRect.height - 10));
      if (coll) {
        if (player.big) { player.big = false; playerEl.classList.remove('big'); setHUDActive(false); }
        else { running = false; gameOverTitle.textContent = '¡Ay! Te golpeó una roca'; gameOverOverlay.classList.add('visible'); }
        r.x = -120; // evitar doble golpe
      }
      r.el.style.left = r.x + 'px';
    }
  }

  // Render
  playerEl.style.left = player.x + 'px';
  playerEl.style.bottom = player.y + 'px';
  for (const b of blocks) b.el.style.bottom = b.y + 'px';

  // Meta
  const caveRect = { x: caveX, y: 0, width: 180, height: 160 };
  if (aabb(playerRect(), caveRect)) { running = false; gameOverTitle.textContent = '¡Llegaste a tu cueva! 🥳'; gameOverOverlay.classList.add('visible'); }

  updateCamera();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
