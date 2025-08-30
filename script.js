const player = document.getElementById("player");
const obstacle = document.getElementById("obstacle");
const scoreText = document.getElementById("score");

let isJumping = false;
let score = 0;

// Manejar salto con la tecla espacio
document.addEventListener("keydown", function (event) {
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

// Detección de colisiones y puntuación
let gameLoop = setInterval(() => {
  let playerBottom = parseInt(window.getComputedStyle(player).getPropertyValue("bottom"));
  let obstacleRight = parseInt(window.getComputedStyle(obstacle).getPropertyValue("right"));

  // El obstáculo está cerca del jugador
  if (obstacleRight > 510 && obstacleRight < 590 && playerBottom < 40) {
    alert("¡Game Over! Puntuación final: " + score);
    score = 0;
    scoreText.innerText = "Puntuación: " + score;
  } else {
    score++;
    scoreText.innerText = "Puntuación: " + score;
  }
}, 100);