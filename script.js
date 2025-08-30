const viewport=document.getElementById('viewport');
const world=document.getElementById('world');
const playerEl=document.getElementById('player');
const blocksEl=document.getElementById('blocks');
const itemsEl=document.getElementById('items');
const caveEl=document.getElementById('cave');
const runnerRocksEl=document.getElementById('runnerRocks');
const startOverlay=document.getElementById('startOverlay');
const startBtn=document.getElementById('startBtn');
const gameOverOverlay=document.getElementById('gameOverOverlay');
const gameOverTitle=document.getElementById('gameOverTitle');
const retryBtn=document.getElementById('retryBtn');

const LEVEL_WIDTH=12000,GROUND_Y=0,GRAVITY=1900,RUN_SPEED=100,JUMP_VELOCITY=750,ROCK_SPEED=110;

const player={x:120,y:GROUND_Y,vx:0,vy:0,width:60,height:60,onGround:true,big:false,facing:1};

function elem(tag,cls,style={}){const e=document.createElement(tag);if(cls)e.className=cls;Object.assign(e.style,style);return e;}
const blocks=[],items=[],runnerRocks=[];

function placeBlock(x){const el=elem('div','block',{left:x+'px'});blocksEl.appendChild(el);blocks.push({x,y:110,width:60,height:60,el,broken:false});}
function placeHoney(x,y){const el=elem('div','honey',{left:x+'px',bottom:y+'px'});itemsEl.appendChild(el);const i={x,y,width:48,height:48,el,vy:0,onGround:false,taken:false};items.push(i);return i;}
for(let x=500;x<LEVEL_WIDTH-800;x+=900)placeBlock(x);
const caveX=LEVEL_WIDTH-260;caveEl.style.left=caveX+'px';

function spawnRock(x){const el=elem('div','runner-rock',{left:x+'px'});runnerRocksEl.appendChild(el);runnerRocks.push({x,y:0,width:60,height:60,el});}
spawnRock(viewport.clientWidth+150);spawnRock(viewport.clientWidth+600);

function updateCamera(){const c=Math.min(Math.max(player.x,viewport.clientWidth/2),LEVEL_WIDTH-viewport.clientWidth/2);world.style.transform=`translateX(${ -c+viewport.clientWidth/2 }px)`;}

const keys={left:false,right:false,jump:false};
document.addEventListener('keydown',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=true;if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=true;if(e.code==='Space')keys.jump=true;if((e.code==='Enter'||e.code==='Space')&&startOverlay.classList.contains('visible'))startGame();});
document.addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=false;if(e.code==='Space')keys.jump=false;});
startBtn.addEventListener('click',startGame);retryBtn.addEventListener('click',()=>location.reload());

let running=false;function startGame(){startOverlay.classList.remove('visible');gameOverOverlay.classList.remove('visible');running=true;}
function showOverlay(el){el.classList.add('visible');}

function aabb(a,b){return !(a.x+a.width<b.x||a.x>b.x+b.width||a.y+a.height<b.y||a.y>b.y+b.height);}
function playerRect(){const w=player.width*(player.big?1.45:1),h=player.height*(player.big?1.45:1);return{x:player.x,y:player.y,width:w,height:h};}

let last=0;
function loop(t){if(!last)last=t;const dt=Math.min((t-last)/1000,0.033);last=t;
if(running){
  let vx=0;if(keys.left)vx-=RUN_SPEED;if(keys.right)vx+=RUN_SPEED;player.vx=vx;if(vx!==0)player.facing=(vx>0?1:-1);
  if(keys.jump&&player.onGround){player.vy=JUMP_VELOCITY;player.onGround=false;}
  player.vy-=GRAVITY*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;
  if(player.x<0)player.x=0;if(player.x>LEVEL_WIDTH-player.width)player.x=LEVEL_WIDTH-player.width;
  if(player.y<GROUND_Y){player.y=GROUND_Y;player.vy=0;player.onGround=true;}

  const pR=playerRect();
  for(const bl of blocks){if(!bl.broken&&aabb(pR,bl)){const top=player.y+(player.big?player.height*1.45:player.height);if(player.vy>0&&top>=bl.y&&(top-bl.y)<30){bl.broken=true;bl.el.classList.add('broken');placeHoney(bl.x+6,bl.y+bl.height+4);}else{if(player.x+player.width/2<bl.x+bl.width/2)player.x=bl.x-player.width;else player.x=bl.x+bl.width;player.vx=0;}}}

  for(const it of items){if(it.taken)continue;if(!it.onGround){it.vy-=GRAVITY*0.6*dt;it.y+=it.vy*dt;if(it.y<GROUND_Y){it.y=GROUND_Y;it.vy=0;it.onGround=true;}}if(aabb(playerRect(),it)){it.taken=true;it.el.remove();player.big=true;playerEl.classList.add('big');}if(it.el){it.el.style.left=it.x+'px';it.el.style.bottom=it.y+'px';}}

  for(const r of runnerRocks){r.x-=ROCK_SPEED*dt;if(r.x<-100){r.x=viewport.clientWidth+Math.random()*600+200;}const c=Math.min(Math.max(player.x,viewport.clientWidth/2),LEVEL_WIDTH-viewport.clientWidth/2);const offset=-c+viewport.clientWidth/2;const pScr={x:player.x+offset,y:player.y,width:player.width*(player.big?1.45:1),height:player.height*(player.big?1.45:1)};const rRect={x:r.x,y:0,width:r.width,height:r.height};if(aabb(pScr,rRect)){if(player.big){player.big=false;playerEl.classList.remove('big');}else{running=false;gameOverTitle.textContent='¡Ay! Te golpeó una roca';showOverlay(gameOverOverlay);}r.x=-120;}r.el.style.left=r.x+'px';}}
playerEl.style.left=player.x+'px';playerEl.style.bottom=player.y+'px';playerEl.classList.toggle('facing-left',player.facing<0);for(const b of blocks)b.el.style.bottom=b.y+'px';const caveRect={x:caveX,y:0,width:160,height:140};if(aabb(playerRect(),caveRect)){running=false;gameOverTitle.textContent='¡Llegaste a tu cueva! 🥳';showOverlay(gameOverOverlay);}updateCamera();requestAnimationFrame(loop);}requestAnimationFrame(loop);
