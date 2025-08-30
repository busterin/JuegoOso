// Elements
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const playerEl = document.getElementById('player');
const blocksEl = document.getElementById('blocks');
const itemsEl = document.getElementById('items');
const caveEl = document.getElementById('cave');
const runnerRocksEl = document.getElementById('runnerRocks');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const gameOverTitle = document.getElementById('gameOverTitle');
const retryBtn = document.getElementById('retryBtn');
const honeyHUD = document.getElementById('honeyHUD');

// Config (más fácil)
const LEVEL_WIDTH = 12000;
const GROUND_Y = 0;
const GRAVITY = 1850;     // caída más suave
const RUN_SPEED = 100;
const JUMP_VELOCITY = 800; // salto más alto = más margen
const ROCK_SPEED = 90;     // rocas más lentas
const PARALLAX_FACTOR = 0.3;

// Player
const player = { 
  x:120, y:GROUND_Y, vx:0, vy:0,
  width:90, height:90,
  onGround:true, big:false, facing:1
};

// Utils
function elem(tag, className, style={}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.assign(el.style, style);
  return el;
}

// Level: blocks + cave
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

// Bloques a lo largo del nivel
for (let x=500; x<LEVEL_WIDTH-800; x+=900) placeBlock(x);

// Cueva (meta)
const caveX = LEVEL_WIDTH - 300;
caveEl.style.left = caveX + 'px';

// Rocas "runner": capa de pantalla (70x70)
const runnerRocks = [];
function spawnRock(x) {
  const el = elem('div','runner-rock',{ left:x+'px' });
  runnerRocksEl.appendChild(el);
  const r = { x, y:0, width:70, height:70, el };
  runnerRocks.push(r);
}
spawnRock(viewport.clientWidth + 150);
spawnRock(viewport.clientWidth + 600);
spawnRock(viewport.clientWidth + 1000);

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
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
});

retryBtn.addEventListener('click', () => location.reload());

// Helpers
function aabb(a,b){ return !(a.x+a.width<b.x||a.x>b.x+b.width||a.y+a.height<b.y||a.y>b.y+b.height); }
function playerRect(){ 
  const w = player.width * (player.big?1.45:1); 
  const h = player.height * (player.big?1.45:1); 
  return { x:player.x, y:player.y, width:w, height:h }; 
}
function setHUDActive(active){ honeyHUD.classList.toggle('active', !!active); }

// Game loop
let last = 0, running = true;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min((ts-last)/1000, 0.033);
  last = ts;

  if (running) {
    // Movimiento
    let vx = 0;
    if (keys.left) vx -= RUN_SPEED;
    if (keys.right) vx += RUN_SPEED;
    player.vx = vx;
    if (vx !== 0) player.facing = (vx > 0 ? 1 : -1);
    playerEl.classList.toggle('facing-left', player.facing < 0);

    // Salto
    if (keys.jump && player.onGround) { player.vy = JUMP_VELOCITY; player.onGround = false; }

    // Física
    player.vy -= GRAVITY * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (player.x < 0) player.x = 0;
    if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;
    if (player.y < GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.onGround = true; }

    // Bloques
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

    // Items
    for (const it of items) {
      if (it.taken) continue;
      if (!it.onGround) {
        it.vy -= GRAVITY * 0.6 * dt;
        it.y += it.vy * dt;
        if (it.y < GROUND_Y) { it.y = GROUND_Y; it.vy = 0; it.onGround = true; }
      }
      const iR = { x: it.x, y: it.y, width: it.width, height: it.height };
      if (aabb(playerRect(), iR)) {
        it.taken = true; it.el.remove();
        player.big = true; playerEl.classList.add('big'); setHUDActive(true);
      }
      if (it.el) { it.el.style.left = it.x + 'px'; it.el.style.bottom = it.y + 'px'; }
    }

    // Rocas
    for (const r of runnerRocks) {
      r.x -= ROCK_SPEED * dt;
      if (r.x < -100) r.x = viewport.clientWidth + Math.random()*600 + 200;
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
        r.x = -120;
      }
      r.el.style.left = r.x + 'px';
    }
  }

  // Render
  playerEl.style.left = player.x + 'px';
  playerEl.style.bottom = player.y + 'px';
  for (const b of blocks) b.el.style.bottom = b.y + 'px';

  // Win
  const caveRect = { x: caveX, y: 0, width: 180, height: 160 };
  if (aabb(playerRect(), caveRect)) { running = false; gameOverTitle.textContent = '¡Llegaste a tu cueva! 🥳'; gameOverOverlay.classList.add('visible'); }

  updateCamera();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
