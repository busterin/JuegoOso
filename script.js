const player = document.getElementById("player");
const obstacle = document.getElementById("obstacle");
const scoreText = document.getElementById("score");

let isJumping = false;
let score = 0;
let gameOverLock = false; // evita múltiples alerts en la misma colisión

// Salto con la barra espaciadora
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !isJumping) {
    jump();
  }
});

function jump() {
  isJumping = true;
  player.classList.add("jump");

  setTimeout(() => {
    player.classList.remove("jump");
    isJumping = false;
  }, 500);
}

// Reinicia la animación del obstáculo (desde la derecha)
function restartObstacle() {
  obstacle.style.animation = "none";
  // forzamos reflujo y restauramos
  void obstacle.offsetWidth;
  obstacle.style.animation = "";
}

// Detección de colisión por AABB (rectángulos)
function isColliding(a, b) {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  return !(
    ra.right < rb.left ||
    ra.left > rb.right ||
    ra.bottom < rb.top ||
    ra.top > rb.bottom
  );
}

// Bucle del juego
const gameLoop = setInterval(() => {
  if (isColliding(player, obstacle)) {
    if (!gameOverLock) {
      gameOverLock = true;
      alert("¡Game Over! Puntuación final: " + score);
      score = 0;
      scoreText.innerText = "Puntuación: " + score;
      restartObstacle();

      // liberamos el bloqueo un poquito después de reiniciar
      setTimeout(() => { gameOverLock = false; }, 400);
    }
  } else {
    score++;
    scoreText.innerText = "Puntuación: " + score;
  }
}, 100);