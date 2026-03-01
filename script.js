// Basic state
let camera = null;
let hands = null;
let latestGesture = "none";
let playerScore = 0;
let aiScore = 0;
let countdownActive = false;
let countdownEndTime = 0;
let countdownFrameId = null;

// Two-player state
let gameMode = "single"; // "single" | "two"
let roomRef = null;
let myRole = null; // "p1" | "p2"
let roomId = null;
let twoPlayerScores = { p1: 0, p2: 0 };
let lastRoundStartTime = 0;

// DOM (set when DOM is ready)
let currentGestureEl, playerMoveEl, aiMoveEl, playerScoreEl, aiScoreEl;
let roundResultEl, startCameraBtn, startRoundBtn, resetGameBtn, countdownOverlayEl;
let singlePlayerUi, twoPlayerUi, twoPlayerSetup, twoPlayerLobby, twoPlayerGame;
let createRoomBtn, joinRoomBtn, roomCodeInput, lobbyStatusEl, roomCodeDisplayEl;
let copyLinkBtn, startRound2pBtn, p2YouMoveEl, p2OppMoveEl, p2YourScoreEl, p2OppScoreEl;
let videoElement, canvasElement, canvasCtx;

function initDom() {
  currentGestureEl = document.getElementById("current-gesture");
  playerMoveEl = document.getElementById("player-move");
  aiMoveEl = document.getElementById("ai-move");
  playerScoreEl = document.getElementById("player-score");
  aiScoreEl = document.getElementById("ai-score");
  roundResultEl = document.getElementById("round-result");
  startCameraBtn = document.getElementById("start-camera");
  startRoundBtn = document.getElementById("start-round");
  resetGameBtn = document.getElementById("reset-game");
  countdownOverlayEl = document.getElementById("countdown-overlay");
  singlePlayerUi = document.getElementById("single-player-ui");
  twoPlayerUi = document.getElementById("two-player-ui");
  twoPlayerSetup = document.getElementById("two-player-setup");
  twoPlayerLobby = document.getElementById("two-player-lobby");
  twoPlayerGame = document.getElementById("two-player-game");
  createRoomBtn = document.getElementById("create-room");
  joinRoomBtn = document.getElementById("join-room");
  roomCodeInput = document.getElementById("room-code-input");
  lobbyStatusEl = document.getElementById("lobby-status");
  roomCodeDisplayEl = document.getElementById("room-code-display");
  copyLinkBtn = document.getElementById("copy-link");
  startRound2pBtn = document.getElementById("start-round-2p");
  p2YouMoveEl = document.getElementById("p2-you-move");
  p2OppMoveEl = document.getElementById("p2-opp-move");
  p2YourScoreEl = document.getElementById("p2-your-score");
  p2OppScoreEl = document.getElementById("p2-opp-score");
  videoElement = document.querySelector(".input_video");
  canvasElement = document.querySelector(".output_canvas");
  if (!videoElement || !canvasElement || !roundResultEl) {
    document.body.innerHTML = "<p style='padding:2rem;color:red;'>Page structure is broken. Make sure index.html is complete and you open the site via a local server (e.g. <strong>http://localhost:8080</strong> or <strong>http://YOUR_IP:8080</strong>).</p>";
    return false;
  }
  canvasCtx = canvasElement.getContext("2d");
  return true;
}

// ---------- Gesture classification ----------
function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length !== 21) return "unknown";

  const fingerTips = [8, 12, 16, 20];
  const fingerBases = [5, 9, 13, 17];

  function isFingerExtended(tipIndex, baseIndex) {
    const tip = landmarks[tipIndex];
    const base = landmarks[baseIndex];
    return tip.y < base.y - 0.02;
  }

  const extended = fingerTips.map((tip, i) =>
    isFingerExtended(tip, fingerBases[i])
  );
  const [indexExt, middleExt, ringExt, pinkyExt] = extended;

  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];
  const thumbExtended =
    thumbTip.x < thumbBase.x - 0.03 || thumbTip.x > thumbBase.x + 0.03;

  const extendedCount =
    (indexExt ? 1 : 0) +
    (middleExt ? 1 : 0) +
    (ringExt ? 1 : 0) +
    (pinkyExt ? 1 : 0) +
    (thumbExtended ? 1 : 0);

  if (extendedCount <= 1) return "rock";
  if (extendedCount >= 4) return "paper";
  if (indexExt && middleExt && !ringExt && !pinkyExt) return "scissors";
  return "unknown";
}

function chooseAiMove() {
  const moves = ["rock", "paper", "scissors"];
  return moves[Math.floor(Math.random() * moves.length)];
}

function decideWinner(player, ai) {
  if (player === ai) return "tie";
  if (
    (player === "rock" && ai === "scissors") ||
    (player === "paper" && ai === "rock") ||
    (player === "scissors" && ai === "paper")
  )
    return "win";
  return "lose";
}

function updateScores(result) {
  if (result === "win") playerScore += 1;
  else if (result === "lose") aiScore += 1;
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
    roundResultEl.textContent = "Make a clear gesture before the countdown ends.";
  }
}

function resetGame() {
  playerScore = 0;
  aiScore = 0;
  playerScoreEl.textContent = "0";
  aiScoreEl.textContent = "0";
  playerMoveEl.textContent = "–";
  aiMoveEl.textContent = "–";
  roundResultEl.textContent = "Game reset. Show a gesture and start a round.";
  roundResultEl.classList.remove("win", "lose", "tie");
}

// ---------- Countdown (single-player) ----------
function showCountdownNumber(n) {
  countdownOverlayEl.textContent = "";
  countdownOverlayEl.classList.add("visible");
  const span = document.createElement("span");
  span.className = "countdown-number";
  span.textContent = n;
  countdownOverlayEl.appendChild(span);
}

function showCountdownGo() {
  countdownOverlayEl.textContent = "";
  const span = document.createElement("span");
  span.className = "countdown-go";
  span.textContent = "GO!";
  countdownOverlayEl.appendChild(span);
}

function runCountdownSinglePlayer() {
  if (countdownActive) return;
  countdownActive = true;
  startRoundBtn.disabled = true;

  const start = performance.now();
  const totalMs = 3000;
  const showAt = [0, 1000, 2000, 3000];

  function tick(now) {
    const elapsed = now - start;
    if (elapsed < showAt[1]) {
      showCountdownNumber(3);
    } else if (elapsed < showAt[2]) {
      showCountdownNumber(2);
    } else if (elapsed < showAt[3]) {
      showCountdownNumber(1);
    } else {
      showCountdownGo();
      const playerMove =
        ["rock", "paper", "scissors"].includes(latestGesture)
          ? latestGesture
          : "rock";
      const aiMove = chooseAiMove();
      const result = decideWinner(playerMove, aiMove);

      playerMoveEl.textContent = playerMove.toUpperCase();
      aiMoveEl.textContent = aiMove.toUpperCase();
      updateScores(result);
      setRoundResultText(result, playerMove, aiMove);

      setTimeout(() => {
        countdownOverlayEl.classList.remove("visible");
        countdownOverlayEl.textContent = "";
        countdownActive = false;
        startRoundBtn.disabled = false;
      }, 600);
      return;
    }
    countdownFrameId = requestAnimationFrame(tick);
  }

  countdownFrameId = requestAnimationFrame(tick);
}

// ---------- Two-player (Firebase) ----------
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getFirebaseDb() {
  if (
    typeof window.FIREBASE_CONFIG !== "undefined" &&
    window.FIREBASE_CONFIG &&
    typeof window.firebase !== "undefined"
  ) {
    if (!window.firebase.apps.length) window.firebase.initializeApp(window.FIREBASE_CONFIG);
    return window.firebase.database();
  }
  return null;
}

function showTwoPlayerMessage(msg) {
  twoPlayerSetup.classList.add("hidden");
  twoPlayerLobby.classList.remove("hidden");
  twoPlayerGame.classList.add("hidden");
  lobbyStatusEl.textContent = msg;
  roomCodeDisplayEl.textContent = "–";
}

function createRoom() {
  const db = getFirebaseDb();
  if (!db) {
    showTwoPlayerMessage(
      "Two-player mode needs Firebase. Add your config in firebase-config.js (see README)."
    );
    return;
  }

  const code = generateRoomCode();
  roomId = code;
  myRole = "p1";

  const ref = db.ref("rooms/" + code);
  ref.set({
    player1: true,
    player2: false,
    roundStartTime: null,
    moves: { p1: null, p2: null },
    scores: { p1: 0, p2: 0 },
    lastResult: null,
  });

  roomRef = ref;
  twoPlayerSetup.classList.add("hidden");
  twoPlayerLobby.classList.remove("hidden");
  twoPlayerGame.classList.add("hidden");
  lobbyStatusEl.textContent = "Waiting for opponent…";
  roomCodeDisplayEl.textContent = code;
  copyLinkBtn.classList.remove("hidden");

  ref.on("value", (snap) => onRoomUpdate(snap));
}

function joinRoom() {
  const db = getFirebaseDb();
  if (!db) {
    showTwoPlayerMessage(
      "Two-player mode needs Firebase. Add your config in firebase-config.js (see README)."
    );
    return;
  }

  const code = (roomCodeInput.value || "").trim().toUpperCase();
  if (code.length < 4) {
    roundResultEl.textContent = "Enter a valid room code.";
    return;
  }

  roomId = code;
  myRole = "p2";
  const ref = db.ref("rooms/" + code);

  ref.once("value").then((snap) => {
    const data = snap.val();
    if (!data) {
      roundResultEl.textContent = "Room not found.";
      return;
    }
    if (data.player2 === true) {
      roundResultEl.textContent = "Room is full.";
      return;
    }
    ref.update({ player2: true });
    roomRef = ref;
    twoPlayerSetup.classList.add("hidden");
    twoPlayerLobby.classList.remove("hidden");
    twoPlayerGame.classList.add("hidden");
    lobbyStatusEl.textContent = "Joined. Waiting for opponent to start…";
    roomCodeDisplayEl.textContent = code;

    ref.on("value", (snap) => onRoomUpdate(snap));
  });
}

function onRoomUpdate(snap) {
  const data = snap.val();
  if (!data) return;

  const p1 = data.player1 === true;
  const p2 = data.player2 === true;

  if (p1 && p2) {
    twoPlayerLobby.classList.add("hidden");
    twoPlayerGame.classList.remove("hidden");
    lobbyStatusEl.textContent = "Opponent connected!";
  }

  twoPlayerScores = data.scores || { p1: 0, p2: 0 };
  p2YourScoreEl.textContent = String(twoPlayerScores[myRole] || 0);
  p2OppScoreEl.textContent = String(
    twoPlayerScores[myRole === "p1" ? "p2" : "p1"] || 0
  );

  const lastResult = data.lastResult;
  if (lastResult) {
    p2YouMoveEl.textContent = (lastResult[myRole + "Move"] || "–").toUpperCase();
    p2OppMoveEl.textContent = (
      lastResult[myRole === "p1" ? "p2Move" : "p1Move"] || "–"
    ).toUpperCase();
    const winner = lastResult.winner;
    if (winner === myRole) roundResultEl.textContent = "You won this round!";
    else if (winner === "tie")
      roundResultEl.textContent = "Tie!";
    else roundResultEl.textContent = "Opponent won this round.";
  }

  const roundStartTime = data.roundStartTime;
  if (
    roundStartTime &&
    typeof roundStartTime === "number" &&
    roundStartTime !== lastRoundStartTime
  ) {
    lastRoundStartTime = roundStartTime;
    countdownEndTime = roundStartTime + 3000;
    runCountdownTwoPlayer(roundStartTime);
  }
}

function runCountdownTwoPlayer(roundStartTimeMs) {
  if (countdownActive) return;
  countdownActive = true;
  startRound2pBtn.disabled = true;

  function tick() {
    const elapsed = Date.now() - roundStartTimeMs;
    if (elapsed < 1000) showCountdownNumber(3);
    else if (elapsed < 2000) showCountdownNumber(2);
    else if (elapsed < 3000) showCountdownNumber(1);
    else {
      showCountdownGo();
      const move = ["rock", "paper", "scissors"].includes(latestGesture)
        ? latestGesture
        : "rock";
      if (roomRef) roomRef.child("moves").child(myRole).set(move);

      setTimeout(() => {
        countdownOverlayEl.classList.remove("visible");
        countdownOverlayEl.textContent = "";
        countdownActive = false;
        startRound2pBtn.disabled = false;
      }, 600);
      return;
    }
    countdownFrameId = requestAnimationFrame(tick);
  }
  countdownFrameId = requestAnimationFrame(tick);
}

function resolveTwoPlayerRound(data) {
  const moves = data.moves || {};
  const p1Move = moves.p1;
  const p2Move = moves.p2;
  if (!p1Move || !p2Move) return;

  const winner = decideWinner(p1Move, p2Move);
  const scores = { ...(data.scores || { p1: 0, p2: 0 }) };
  if (winner === "win") scores.p1 += 1;
  else if (winner === "lose") scores.p2 += 1;

  const lastResult = {
    winner: winner === "tie" ? "tie" : winner === "win" ? "p1" : "p2",
    p1Move,
    p2Move,
  };

  roomRef.update({
    scores: { p1: scores.p1 || 0, p2: scores.p2 || 0 },
    lastResult,
    moves: { p1: null, p2: null },
    roundStartTime: null,
  });
}

function startRoundTwoPlayer() {
  const db = getFirebaseDb();
  if (!db || !roomRef) return;

  roomRef.update({
    roundStartTime: window.firebase.database.ServerValue.TIMESTAMP,
  });
}

// Check URL for ?room=CODE to auto-join
function checkRoomInUrl() {
  const params = new URLSearchParams(window.location.search);
  const r = params.get("room");
  if (r && roomCodeInput) {
    roomCodeInput.value = r.trim().toUpperCase().slice(0, 6);
  }
}

// ---------- MediaPipe ----------
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
      if (typeof window.drawConnectors === "function" && window.HAND_CONNECTIONS) {
        window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
          color: "#22c55e",
          lineWidth: 3,
        });
        window.drawLandmarks(canvasCtx, landmarks, {
          color: "#bef264",
          radius: 3,
        });
      }
    }
    const gesture = classifyGesture(results.multiHandLandmarks[0]);
    latestGesture = gesture;
    currentGestureEl.textContent =
      gesture === "unknown" ? "Uncertain" : gesture.toUpperCase();
    if (gameMode === "single") startRoundBtn.disabled = countdownActive;
    else if (startRound2pBtn) startRound2pBtn.disabled = countdownActive;
  } else {
    latestGesture = "none";
    currentGestureEl.textContent = "None";
    if (gameMode === "single") startRoundBtn.disabled = true;
    else if (startRound2pBtn) startRound2pBtn.disabled = true;
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

function startFrameLoop() {
  if (!hands || !videoElement) return;
  function tick() {
    if (!hands || !videoElement || !videoElement.srcObject) return;
    hands.send({ image: videoElement }).then(function () {
      requestAnimationFrame(tick);
    }).catch(function () {
      requestAnimationFrame(tick);
    });
  }
  requestAnimationFrame(tick);
}

function initCamera() {
  function onStream(stream) {
    if (!videoElement) return;
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = function () {
      videoElement.play().then(function () {
        initHands();
        if (window.Camera) {
          camera = new window.Camera(videoElement, {
            onFrame: async function () {
              if (!hands) return;
              await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480,
          });
          camera.start();
        } else {
          startFrameLoop();
        }
      }).catch(function (err) {
        if (roundResultEl) roundResultEl.textContent = "Camera error: " + (err.message || "play failed");
        if (startCameraBtn) startCameraBtn.disabled = false;
      });
    };
  }

  function onError(err) {
    const isLocalhost = /localhost|127\.0\.0\.1/.test(window.location.hostname);
    let msg = "Camera error: " + (err.message || "Could not access webcam. Allow access and try again.");
    if (!isLocalhost && window.location.protocol === "http:") {
      msg += " Browsers often require HTTPS for camera when using an IP. Try: npx ngrok http 8080 (then open the https URL).";
    }
    if (roundResultEl) roundResultEl.textContent = msg;
    if (startCameraBtn) startCameraBtn.disabled = false;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (roundResultEl) roundResultEl.textContent = "Webcam not supported. Open from a server (localhost or your IP), not file://. If using your IP, try HTTPS (e.g. ngrok) for camera access.";
    if (startCameraBtn) startCameraBtn.disabled = false;
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    .then(onStream)
    .catch(onError);
}

// Run init after DOM is ready so all buttons and refs exist
function initApp() {
  try {
    if (!initDom()) return;

    // ---------- Mode switching ----------
    const modeSingleEl = document.getElementById("mode-single");
    const modeTwoEl = document.getElementById("mode-two");

    if (modeSingleEl) {
      modeSingleEl.addEventListener("click", () => {
        gameMode = "single";
        modeSingleEl.classList.add("active");
        if (modeTwoEl) modeTwoEl.classList.remove("active");
        if (singlePlayerUi) singlePlayerUi.classList.remove("hidden");
        if (twoPlayerUi) twoPlayerUi.classList.add("hidden");
        if (roomRef) {
          roomRef.off();
          roomRef = null;
        }
        if (roundResultEl) roundResultEl.textContent =
          "Start the camera and show a gesture. Click \"Start round\" for a 3-2-1 countdown.";
      });
    }

    if (modeTwoEl) {
      modeTwoEl.addEventListener("click", () => {
        gameMode = "two";
        modeTwoEl.classList.add("active");
        if (modeSingleEl) modeSingleEl.classList.remove("active");
        if (singlePlayerUi) singlePlayerUi.classList.add("hidden");
        if (twoPlayerUi) twoPlayerUi.classList.remove("hidden");
        if (twoPlayerSetup) twoPlayerSetup.classList.remove("hidden");
        if (twoPlayerLobby) twoPlayerLobby.classList.add("hidden");
        if (twoPlayerGame) twoPlayerGame.classList.add("hidden");
        if (roundResultEl) roundResultEl.textContent =
          "Create a room and share the link/code, or join with a code.";
      });
    }

    // ---------- Start camera ----------
    if (startCameraBtn) {
      startCameraBtn.addEventListener("click", function () {
        try {
          if (roundResultEl) roundResultEl.textContent = "Starting camera… Allow webcam access in the browser.";
          startCameraBtn.disabled = true;

          if (!window.Hands) {
            if (roundResultEl) roundResultEl.textContent = "MediaPipe Hands not loaded. Check network and open from this page's URL (localhost or your IP), not file://.";
            if (startCameraBtn) startCameraBtn.disabled = false;
            return;
          }

          initCamera();
        } catch (e) {
          if (roundResultEl) roundResultEl.textContent = "Error: " + (e.message || String(e));
          if (startCameraBtn) startCameraBtn.disabled = false;
        }
      });
    }

    if (startRoundBtn) startRoundBtn.addEventListener("click", runCountdownSinglePlayer);
    if (resetGameBtn) resetGameBtn.addEventListener("click", resetGame);
    if (createRoomBtn) createRoomBtn.addEventListener("click", createRoom);
    if (joinRoomBtn) joinRoomBtn.addEventListener("click", joinRoom);
    if (startRound2pBtn) startRound2pBtn.addEventListener("click", startRoundTwoPlayer);

    if (copyLinkBtn) {
      copyLinkBtn.addEventListener("click", () => {
        const url = window.location.href.split("?")[0] + "?room=" + roomId;
        navigator.clipboard.writeText(url).then(() => {
          if (roundResultEl) roundResultEl.textContent = "Link copied! Share it with your friend.";
        });
      });
    }

    checkRoomInUrl();
  } catch (e) {
    console.error("Init error:", e);
    const msg = document.getElementById("round-result");
    if (msg) msg.textContent = "Setup error: " + (e.message || String(e));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}