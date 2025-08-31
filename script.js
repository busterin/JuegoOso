// ... (tu script actual tal cual) ...

// Dentro de tu archivo, localiza moveLoop y añade el “hard-lock”:
let lastTime = 0;
function moveLoop(t){
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime)/1000, 0.033);
  lastTime = t;

  if (running){
    const rect = gameArea.getBoundingClientRect();

    // Volteo visual
    player.classList.toggle("facing-left", lastMoveDir < 0);

    // 1) Velocidad en pantalla
    let vx = 0;
    if (leftPressed)  vx -= PLAYER_SPEED;
    if (rightPressed) vx += PLAYER_SPEED;
    if (performance.now() < jumpBoostUntil) vx += jumpBoostVX;

    // 2) Límite derecho dinámico
    const nearEnd = worldX > TRACK_LENGTH - rect.width * 1.2;
    const rightLimit = nearEnd ? rect.width - PLAYER_WIDTH
                               : rect.width * RIGHT_FRACTION_WHEN_TRAVELING - PLAYER_WIDTH;

    playerX = Math.max(0, Math.min(rightLimit, playerX + vx * dt));
    player.style.left = playerX + "px";

    // 🔒 HARD-LOCK AL SUELO cuando no está saltando
    if (!isJumping) {
      // cancela cualquier resto de animación/transform vertical
      player.style.removeProperty('transform');        // dejamos solo el volteo via clase
      player.classList.toggle("facing-left", lastMoveDir < 0); // reaplica espejo si tocaba
      player.style.bottom = '-8px';
    }

    // 3) Avance del mundo
    const boost = (performance.now() < jumpBoostUntil) ? (JUMP_FORWARD_VX * lastMoveDir) : 0;
    const worldVX = (rightPressed ? PLAYER_SPEED : 0) + boost - (leftPressed ? PLAYER_SPEED : 0);
    worldX = Math.max(0, Math.min(TRACK_LENGTH, worldX + worldVX * dt));

    // 4) Fondo
    gameArea.style.backgroundPositionX = `${-worldX * 0.25}px`;

    // 5) Cueva
    if (worldX > TRACK_LENGTH - rect.width * 2) cave.style.display = "block";
    else cave.style.display = "none";
    if (worldX >= TRACK_LENGTH) { running = false; alert("¡Llegaste a la cueva! 🥳"); startScreen.classList.add("visible"); }

    // 6) Espada vs roca
    if (attacking) {
      const sRect = getSwordRect();
      const oRect = obstacle.getBoundingClientRect();
      if (!(sRect.right < oRect.left || sRect.left > oRect.right || sRect.bottom < oRect.top || sRect.top > oRect.bottom)) {
        disintegrateRock();
      }
    }
  }
  requestAnimationFrame(moveLoop);
}
requestAnimationFrame(moveLoop);

// ... (el resto de tu script igual) ...