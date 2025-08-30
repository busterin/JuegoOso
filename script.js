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
const GRAVITY = 1850;     // caída un pelín más suave
const RUN_SPEED = 100;
const JUMP_VELOCITY = 800; // más salto = más margen
const ROCK_SPEED = 90;     // rocas más lentas = más tiempo
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

// Rocas "runner": capa de pantalla (70x70) más fáciles de saltar
const runnerRocks = [];
function spawnRock(x) {
  const el = elem('div','runner-rock',{ left:x+'px' });
  runnerRocksEl.appendChild(el);
  const r = { x, y:0, width:70, height:70, el
