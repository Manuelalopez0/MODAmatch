(() => {
  const ROUND_TIME = 45;
  const FLIP_BACK_DELAY = 800;
  const ICONS = ["👠", "👗", "🧥", "👜", "💄", "🕶️"];

  const screens = {
    splash: document.getElementById("splash-screen"),
    howto: document.getElementById("howto-screen"),
    game: document.getElementById("game-screen"),
    result: document.getElementById("result-screen"),
  };

  const continueButton = document.getElementById("continue-btn");
  const startButton = document.getElementById("start-btn");
  const nextPlayerButton = document.getElementById("next-player-btn");
  const cardGrid = document.getElementById("card-grid");
  const timerDisplay = document.getElementById("timer");
  const pairsDisplay = document.getElementById("pairs-counter");
  const resultTitle = document.getElementById("result-title");
  const resultMessage = document.getElementById("result-message");

  let firstCard = null;
  let secondCard = null;
  let matchedPairs = 0;
  let timeLeft = ROUND_TIME;
  let countdownId = null;
  let flipBackTimeout = null;
  let boardLocked = false;
  let roundActive = false;
  let currentDeck = [];
  let buttonDebounce = false;

  continueButton.addEventListener(
    "click",
    debounceButton(() => showScreen("howto"))
  );
  startButton.addEventListener("click", debounceButton(startGame));
  nextPlayerButton.addEventListener("click", debounceButton(handleNextPlayer));

  function debounceButton(fn) {
    return function (...args) {
      if (buttonDebounce) return;
      buttonDebounce = true;
      fn.apply(this, args);
      setTimeout(() => {
        buttonDebounce = false;
      }, 150);
    };
  }

  function startGame() {
    resetRoundState();
    buildDeck();
    renderCards();
    updateHUD();
    showScreen("game");
    roundActive = true;
    setCardInteractivity(true);
    startTimer();
  }

  function handleNextPlayer() {
    resetRoundState();
    showScreen("splash");
    continueButton.focus({ preventScroll: true });
  }

  function resetRoundState() {
    clearInterval(countdownId);
    countdownId = null;
    if (flipBackTimeout) {
      clearTimeout(flipBackTimeout);
      flipBackTimeout = null;
    }
    firstCard = null;
    secondCard = null;
    matchedPairs = 0;
    timeLeft = ROUND_TIME;
    boardLocked = false;
    roundActive = false;
    cardGrid.innerHTML = "";
    cardGrid.classList.remove("inactive", "is-busy");
    currentDeck = [];
    timerDisplay.textContent = `Tiempo: ${formatTime(ROUND_TIME)}`;
    pairsDisplay.textContent = `Parejas: 0/${ICONS.length}`;
    resultTitle.textContent = "Resultado";
    resultMessage.textContent = "";
  }

  function showScreen(screenKey) {
    // Hide all screens
    Object.values(screens).forEach((screen) => {
      screen.classList.remove("active");
      screen.classList.add("is-hidden");
    });
    // Show target screen
    const targetScreen = screens[screenKey];
    if (targetScreen) {
      targetScreen.classList.remove("is-hidden");
      // Use setTimeout to ensure screen is visible before focusing
      setTimeout(() => {
        targetScreen.classList.add("active");
        // Focus management
        const firstFocusable = targetScreen.querySelector(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (firstFocusable) {
          firstFocusable.focus({ preventScroll: true });
        }
      }, 0);
    }
  }

  function buildDeck() {
    currentDeck = [...ICONS, ...ICONS];
    shuffle(currentDeck);
  }

  function renderCards() {
    currentDeck.forEach((icon, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "play-card";
      card.dataset.icon = icon;
      card.dataset.index = index.toString();
      card.setAttribute("aria-label", "Carta oculta");
      card.innerHTML = `
        <div class="card-inner">
          <span class="card-face card-front"></span>
          <span class="card-face card-back">${icon}</span>
        </div>
      `;
      card.addEventListener("click", handleCardFlip);
      cardGrid.appendChild(card);
    });
  }

  function handleCardFlip(event) {
    if (!roundActive || boardLocked) {
      return;
    }

    const card = event.currentTarget;
    if (card === firstCard || card.classList.contains("matched")) {
      return;
    }

    card.classList.add("flipped");
    card.setAttribute("aria-label", `Ícono revelado: ${card.dataset.icon}`);

    if (!firstCard) {
      firstCard = card;
      return;
    }

    secondCard = card;
    boardLocked = true;
    cardGrid.classList.add("is-busy");
    evaluateMatch();
  }

  function evaluateMatch() {
    const isMatch = firstCard.dataset.icon === secondCard.dataset.icon;
    if (isMatch) {
      handleMatch();
    } else {
      handleMismatch();
    }
  }

  function handleMatch() {
    [firstCard, secondCard].forEach((card) => {
      card.classList.add("matched");
      card.disabled = true;
      card.setAttribute(
        "aria-label",
        `Pareja encontrada: ${card.dataset.icon}`
      );
    });

    matchedPairs += 1;
    updateHUD();
    resetSelection();
    cardGrid.classList.remove("is-busy");

    if (matchedPairs === ICONS.length) {
      finishRound(true);
    } else {
      boardLocked = false;
    }
  }

  function handleMismatch() {
    flipBackTimeout = window.setTimeout(() => {
      [firstCard, secondCard].forEach((card) => {
        card.classList.remove("flipped");
        card.setAttribute("aria-label", "Carta oculta");
      });
      resetSelection();
      boardLocked = false;
      cardGrid.classList.remove("is-busy");
    }, FLIP_BACK_DELAY);
  }

  function resetSelection() {
    firstCard = null;
    secondCard = null;
  }

  function updateHUD() {
    const previousPairs = pairsDisplay.textContent;

    timerDisplay.textContent = `Tiempo: ${formatTime(timeLeft)}`;
    pairsDisplay.textContent = `Parejas: ${matchedPairs}/${ICONS.length}`;

    // Add highlight animation only for pairs counter if value changed
    if (previousPairs !== pairsDisplay.textContent) {
      pairsDisplay.classList.add("highlight");
      setTimeout(() => pairsDisplay.classList.remove("highlight"), 200);
    }
  }

  function startTimer() {
    updateHUD();
    countdownId = window.setInterval(() => {
      if (!roundActive) {
        clearInterval(countdownId);
        countdownId = null;
        return;
      }

      timeLeft -= 1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        updateHUD();
        finishRound(false);
        return;
      }
      updateHUD();
    }, 1000);
  }

  function finishRound(didWin) {
    if (!roundActive) {
      return;
    }

    roundActive = false;
    boardLocked = true;
    clearInterval(countdownId);
    countdownId = null;
    if (flipBackTimeout) {
      clearTimeout(flipBackTimeout);
      flipBackTimeout = null;
    }
    setCardInteractivity(false);
    resultTitle.textContent = didWin
      ? "¡Completaste el desafío!"
      : "El tiempo se terminó.";
    resultMessage.textContent = didWin
      ? "Completaste las 6 parejas a tiempo."
      : "Se acabó el tiempo. Probá en la próxima.";
    showScreen("result");
  }

  function setCardInteractivity(enabled) {
    cardGrid.classList.toggle("inactive", !enabled);
    cardGrid.querySelectorAll(".play-card").forEach((card) => {
      card.disabled = !enabled || card.classList.contains("matched");
    });
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function formatTime(seconds) {
    const clamped = Math.max(0, seconds);
    const mins = Math.floor(clamped / 60)
      .toString()
      .padStart(2, "0");
    const secs = (clamped % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }
})();
