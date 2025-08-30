// --- Elementos ---
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

// --- Config ---
const LEVEL_WIDTH = 12000;     // mundo lateral para la cueva
const GROUND_Y = 0;            // suelo = fondo del recuadro
const GRAVITY = 2000;
const RUN_SPEED = 100;
const JUMP_VELOCITY = 650;
const ROCK_SPEED = 140;        // rocas "runner" algo más lentas que el original

// Estado jugador
const player = {
  x: 120, y: GROUND_Y, vx: 0, vy: 0,
  width: 60, height: 60,
  onGround: true, big: false, facing: 1
};

// Utilidades
function elem(tag, className, style = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.assign(el.style, style);
  return el;
}

// --- Mundo: bloques + cueva ---
const blocks = [];
const items = [];
function placeBlock(x) {
  const el = elem('div', 'block', { left: x + 'px' });
  blocksEl.appendChild(el);
  blocks.push({ x, y: 120, width: 60, height: 60, el, broken: false });
}
function placeHoney(x, y) {
  const el = elem('div', 'honey', { left: x + 'px', bottom: y + 'px' });
  itemsEl.appendChild(el);
  const item = { x, y, width: 48, height: 48, el, vy: 0, onGround: false, taken: false };
  items.push(item);
  return item;
}

// Generación de bloques espaciados
for (let x = 500; x < LEVEL_WIDTH - 800; x += 900) placeBlock(x);

// Cueva al final
const caveX = LEVEL_WIDTH - 260;
caveEl.style.left = caveX + 'px';

// --- Rocas "runner": capa independiente que cruza el viewport ---
const runnerRocks = [];
function spawnRunnerRock(x) {
  const el = elem('div', 'runner-rock', { left: x + 'px' });
  runnerRocksEl.appendChild(el);
  const r = { x, y: 0, width: 60, height: 60, el };
  runnerRocks.push(r);
  return r;
}
// Crear 3 rocas con offsets distintos
spawnRunnerRock(viewport.clientWidth + 100);
spawnRunnerRock(viewport.clientWidth + 500);
spawnRunnerRock(viewport.clientWidth + 900);

// --- Cámara + Parallax del fondo ---
function updateCamera() {
  // Seguimos al jugador sólo para el mundo (bloques/cueva)
  const center = Math.min(Math.max(player.x, viewport.clientWidth/2), LEVEL_WIDTH - viewport.clientWidth/2);
  const offset = -center + viewport.clientWidth/2;
  world.style.transform = `translateX(${offset}px)`;
  // Parallax del fondo
  const parallaxX = -player.x * 0.3;
  viewport.style.backgroundPosition = `${parallaxX}px 0px`;
}

// --- Entradas ---
const keys = { left: false, right: false, jump: false };
document.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space') keys.jump = true;
  if ((e.code === 'Enter' || e.code === 'Space') && startOverlay?.classList.contains('visible')) {
    e.preventDefault(); startGame();
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
});

startBtn?.addEventListener('click', (e) => { e.stopPropagation(); startGame(); });
startOverlay?.addEventListener('click', (e) => { if (e.target === startOverlay) startGame(); });
retryBtn?.addEventListener('click', () => location.reload());

let running = false;
function startGame() {
  hideOverlay(startOverlay);
  hideOverlay(gameOverOverlay);
  running = true;
  world.removeAttribute('aria-hidden');
}

// helpers overlays
function showOverlay(el) { el?.classList.add('visible'); }
function hideOverlay(el) { el?.classList.remove('visible'); }

// AABB
function aabb(a, b) { return !(a.x + a.width < b.x || a.x > b.x + b.width || a.y + a.height < b.y || a.y > b.y + b.height); }
function playerRect(pad = 8) {
  const w = player.width * (player.big ? 1.25 : 1);
  const h = player.height * (player.big ? 1.25 : 1);
  return { x: player.x + pad, y: player.y + pad, width: w - pad*2, height: h - pad*2 };
}

// Bucle
let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min((ts - last) / 1000, 0.033);
  last = ts;

  if (running) {
    // Movimiento jugador
    let vx = 0;
    if (keys.left) vx -= RUN_SPEED;
    if (keys.right) vx += RUN_SPEED;
    player.vx = vx;
    if (vx !== 0) player.facing = (vx > 0 ? 1 : -1);

    if (keys.jump && player.onGround) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
    }

    // Física vertical
    player.vy -= GRAVITY * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Límites del mundo
    if (player.x < 0) player.x = 0;
    if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;

    // Suelo (y=0)
    if (player.y < GROUND_Y) {
      player.y = GROUND_Y;
      player.vy = 0;
      player.onGround = true;
    }

    // Bloques: romper desde abajo y soltar panal
    const pRect = playerRect();
    for (const bl of blocks) {
      const bRect = { x: bl.x, y: bl.y, width: bl.width, height: bl.height };
      if (!bl.broken && aabb(pRect, bRect)) {
        const playerTop = player.y + (player.big ? player.height*1.25 : player.height);
        if (player.vy > 0 && playerTop >= bl.y && (playerTop - bl.y) < 30) {
          bl.broken = true; bl.el.classList.add('broken');
          placeHoney(bl.x + 6, bl.y + bl.height + 4);
        } else {
          if (player.x + player.width/2 < bl.x + bl.width/2) player.x = bl.x - player.width;
          else player.x = bl.x + bl.width;
          player.vx = 0;
        }
      }
    }

    // Items (panales): caen hasta el suelo y se recogen
    for (const it of items) {
      if (it.taken) continue;
      if (!it.onGround) {
        it.vy -= GRAVITY * 0.6 * dt;
        it.y += it.vy * dt;
        if (it.y < GROUND_Y) { it.y = GROUND_Y; it.vy = 0; it.onGround = true; }
      }
      const iRect = { x: it.x, y: it.y, width: it.width, height: it.height };
      if (aabb(playerRect(), iRect)) {
        it.taken = true; it.el.remove();
        player.big = true; playerEl.classList.add('big');
      }
      if (it.el) { it.el.style.left = it.x + 'px'; it.el.style.bottom = it.y + 'px'; }
    }

    // Rocas runner: mover de derecha a izquierda a velocidad fija (no dependen de la cámara)
    for (const r of runnerRocks) {
      r.x -= ROCK_SPEED * dt;
      // cuando salen por la izquierda, reaparecen a la derecha con offset aleatorio
      if (r.x < -100) {
        r.x = viewport.clientWidth + Math.random()*600 + 200;
      }
      // Colisión roca vs jugador (usar coordenadas de pantalla vs mundo => ajustamos con cámara)
      // Convertimos player.x (en mundo) a coordenada de pantalla
      const center = Math.min(Math.max(player.x, viewport.clientWidth/2), LEVEL_WIDTH - viewport.clientWidth/2);
      const worldOffset = -center + viewport.clientWidth/2;
      const playerScreenX = player.x + worldOffset;
      const pRectScreen = { x: playerScreenX, y: player.y, width: player.width*(player.big?1.25:1), height: player.height*(player.big?1.25:1) };
      const rRect = { x: r.x, y: 0, width: r.width, height: r.height };

      if (!(pRectScreen.x + pRectScreen.width < rRect.x ||
            pRectScreen.x > rRect.x + rRect.width ||
            pRectScreen.y + pRectScreen.height < rRect.y ||
            pRectScreen.y > rRect.y + rRect.height)) {
        if (player.big) { player.big = false; playerEl.classList.remove('big'); }
        else {
          running = false; gameOverTitle.textContent = '¡Ay! Te golpeó una roca'; showOverlay(gameOverOverlay);
        }
      }
      // Render roca en pantalla
      r.el.style.left = r.x + 'px';
    }
  }

  // Render jugador y bloques/cueva (en mundo)
  playerEl.style.left = player.x + 'px';
  playerEl.style.bottom = player.y + 'px';
  playerEl.classList.toggle('facing-left', player.facing < 0);
  for (const b of blocks) b.el.style.bottom = b.y + 'px';

  // Llegada a la cueva (AABB en mundo)
  const caveRect = { x: caveX, y: 0, width: 160, height: 140 };
  if (aabb(playerRect(), caveRect)) {
    running = false;
    gameOverTitle.textContent = '¡Llegaste a tu cueva! 🥳';
    showOverlay(gameOverOverlay);
  }

  updateCamera();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
