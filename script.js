// Basic state
let camera = null;
let hands = null;
let latestGesture = "none";
let playerScore = 0;
let aiScore = 0;

const currentGestureEl = document.getElementById("current-gesture");
const playerMoveEl = document.getElementById("player-move");
const aiMoveEl = document.getElementById("ai-move");
const playerScoreEl = document.getElementById("player-score");
const aiScoreEl = document.getElementById("ai-score");
const roundResultEl = document.getElementById("round-result");
const startCameraBtn = document.getElementById("start-camera");
const playRoundBtn = document.getElementById("play-round");
const resetGameBtn = document.getElementById("reset-game");

const videoElement = document.querySelector(".input_video");
const canvasElement = document.querySelector(".output_canvas");
const canvasCtx = canvasElement.getContext("2d");

/**
 * Given MediaPipe hand landmarks, return "rock" | "paper" | "scissors" | "unknown".
 *
 * This is a simple, rules-based classifier:
 * - We look at whether each finger is extended by comparing fingertip vs. base joint y-position.
 * - We then map extended finger patterns into gestures.
 */
function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length !== 21) {
    return "unknown";
  }

  // Finger indices for MediaPipe Hands (landmark indices)
  const fingerTips = [8, 12, 16, 20]; // index, middle, ring, pinky
  const fingerBases = [5, 9, 13, 17];

  // For a standard, upright hand, a smaller y means "higher" / extended.
  function isFingerExtended(tipIndex, baseIndex) {
    const tip = landmarks[tipIndex];
    const base = landmarks[baseIndex];
    return tip.y < base.y - 0.02; // small margin to avoid noise
  }

  const extended = fingerTips.map((tip, i) =>
    isFingerExtended(tip, fingerBases[i])
  );

  const [indexExt, middleExt, ringExt, pinkyExt] = extended;

  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];
  const thumbExtended = thumbTip.x < thumbBase.x - 0.03 || thumbTip.x > thumbBase.x + 0.03;

  const extendedCount =
    (indexExt ? 1 : 0) +
    (middleExt ? 1 : 0) +
    (ringExt ? 1 : 0) +
    (pinkyExt ? 1 : 0) +
    (thumbExtended ? 1 : 0);

  // Rock: basically no fingers extended
  if (extendedCount <= 1) {
    return "rock";
  }

  // Paper: most fingers extended
  if (extendedCount >= 4) {
    return "paper";
  }

  // Scissors: index and middle extended, ring and pinky curled
  if (indexExt && middleExt && !ringExt && !pinkyExt) {
    return "scissors";
  }

  return "unknown";
}

function chooseAiMove() {
  const moves = ["rock", "paper", "scissors"];
  const index = Math.floor(Math.random() * moves.length);
  return moves[index];
}

function decideWinner(player, ai) {
  if (player === ai) return "tie";
  if (
    (player === "rock" && ai === "scissors") ||
    (player === "paper" && ai === "rock") ||
    (player === "scissors" && ai === "paper")
  ) {
    return "win";
  }
  return "lose";
}

function updateScores(result) {
  if (result === "win") {
    playerScore += 1;
  } else if (result === "lose") {
    aiScore += 1;
  }
  playerScoreEl.textContent = String(playerScore);
  aiScoreEl.textContent = String(aiScore);
}

function setRoundResultText(result, playerMove, aiMove) {
  roundResultEl.classList.remove("win", "lose", "tie");

  if (result === "tie") {
    roundResultEl.textContent = `Tie! You both chose ${playerMove}.`;
    roundResultEl.classList.add("tie");
  } else if (result === "win") {
    roundResultEl.textContent = `You win! ${playerMove} beats ${aiMove}.`;
    roundResultEl.classList.add("win");
  } else if (result === "lose") {
    roundResultEl.textContent = `You lose! ${aiMove} beats ${playerMove}.`;
    roundResultEl.classList.add("lose");
  } else {
    roundResultEl.textContent = "Make a clear gesture to play.";
  }
}

function resetGame() {
  playerScore = 0;
  aiScore = 0;
  playerScoreEl.textContent = "0";
  aiScoreEl.textContent = "0";
  playerMoveEl.textContent = "–";
  aiMoveEl.textContent = "–";
  roundResultEl.textContent = "Game reset. Show a gesture and play again.";
  roundResultEl.classList.remove("win", "lose", "tie");
}

function onResults(results) {
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    for (const landmarks of results.multiHandLandmarks) {
      window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
        color: "#22c55e",
        lineWidth: 3,
      });
      window.drawLandmarks(canvasCtx, landmarks, {
        color: "#bef264",
        radius: 3,
      });
    }

    const gesture = classifyGesture(results.multiHandLandmarks[0]);
    latestGesture = gesture;
    currentGestureEl.textContent =
      gesture === "unknown" ? "Uncertain" : gesture.toUpperCase();
    playRoundBtn.disabled = gesture === "unknown";
  } else {
    latestGesture = "none";
    currentGestureEl.textContent = "None";
    playRoundBtn.disabled = true;
  }

  canvasCtx.restore();
}

function initHands() {
  if (hands) return;

  hands = new window.Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults(onResults);
}

function initCamera() {
  if (!window.Camera) {
    roundResultEl.textContent =
      "Camera utils not loaded. Check your network connection.";
    return;
  }

  camera = new window.Camera(videoElement, {
    onFrame: async () => {
      if (!hands) return;
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

startCameraBtn.addEventListener("click", () => {
  startCameraBtn.disabled = true;
  roundResultEl.textContent = "Starting camera… Allow webcam access in the browser.";

  initHands();
  initCamera();
});

playRoundBtn.addEventListener("click", () => {
  if (!["rock", "paper", "scissors"].includes(latestGesture)) {
    setRoundResultText(null, "", "");
    return;
  }

  const playerMove = latestGesture;
  const aiMove = chooseAiMove();
  const result = decideWinner(playerMove, aiMove);

  playerMoveEl.textContent = playerMove.toUpperCase();
  aiMoveEl.textContent = aiMove.toUpperCase();

  updateScores(result);
  setRoundResultText(result, playerMove, aiMove);
});

resetGameBtn.addEventListener("click", resetGame);

