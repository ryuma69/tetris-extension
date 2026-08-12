/**
 * Main Controller
 * Bootstraps the application, updates dashboard clocks/dates, controls animation frames,
 * manages mode toggle events, and keeps UI components updated.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core components
  const game = new TetrisGame();
  const renderer = new TetrisRenderer('tetris-canvas', 'next-canvas');
  const ai = new TetrisAI(game);
  
  // Set default body state to ambient autoplay
  document.body.classList.add('ambient-autoplay');

  // DOM elements
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');
  const greetingEl = document.getElementById('greeting');
  const gameOverlayEl = document.getElementById('game-overlay');
  const scoreValEl = document.getElementById('score-val');
  const highscoreValEl = document.getElementById('highscore-val');
  const levelValEl = document.getElementById('level-val');
  const linesValEl = document.getElementById('lines-val');
  const pauseScreenEl = document.getElementById('pause-screen');
  const gameOverScreenEl = document.getElementById('game-over-screen');
  const finalScoreValEl = document.getElementById('final-score-val');
  const searchInputEl = document.getElementById('search-input');

  // Load initial stats
  updateHUD();

  // Mode state tracker
  let isAmbient = true;
  let lastPlayerFallTime = 0;

  // Toggle mode callback
  const toggleGameMode = (activatePlayerPlay) => {
    if (activatePlayerPlay) {
      isAmbient = false;
      document.body.classList.remove('ambient-autoplay');
      document.body.classList.add('game-active');
      gameOverlayEl.classList.remove('hidden');
      
      // If switching from ambient, reset board to clean state for a fresh game
      if (game.isGameOver) {
        game.reset();
      }
      ai.resetTarget();
      
      // Unfocus search bar to prevent key capture issues
      if (document.activeElement) {
        document.activeElement.blur();
      }
    } else {
      isAmbient = true;
      document.body.classList.add('ambient-autoplay');
      document.body.classList.remove('game-active');
      gameOverlayEl.classList.add('hidden');
      pauseScreenEl.classList.add('hidden');
      gameOverScreenEl.classList.add('hidden');

      // AI takeover on existing board state
      game.isPaused = false;
      if (game.isGameOver) {
        game.reset();
      }
      ai.resetTarget();
    }
    lastPlayerFallTime = performance.now();
  };

  // Set up Keyboard and Mode Switch inputs
  const input = new InputHandler(game, toggleGameMode);

  // Synchronize clock & greeting
  function updateClock() {
    const now = new Date();
    
    // Time formatting
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    minutes = minutes < 10 ? '0' + minutes : minutes;
    clockEl.textContent = `${hours}:${minutes} ${ampm}`;

    // Date formatting
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', dateOptions);

    // Personal Greeting
    const hour24 = now.getHours();
    let greeting = 'Welcome';
    if (hour24 < 12) {
      greeting = 'Good morning';
    } else if (hour24 < 18) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    greetingEl.textContent = greeting;
  }

  // Update Clock immediately and every second
  updateClock();
  setInterval(updateClock, 1000);

  // Sync highscore event
  window.addEventListener('highScoreUpdated', (e) => {
    const formatted = String(e.detail).padStart(6, '0');
    highscoreValEl.textContent = formatted;
  });

  // Simple statistics UI syncing
  function updateHUD() {
    scoreValEl.textContent = String(game.score).padStart(6, '0');
    highscoreValEl.textContent = String(game.highScore).padStart(6, '0');
    levelValEl.textContent = game.level;
    linesValEl.textContent = game.lines;

    // Toggle pause screen modal visibility
    if (game.isPaused && !isAmbient) {
      pauseScreenEl.classList.remove('hidden');
    } else {
      pauseScreenEl.classList.add('hidden');
    }

    // Toggle gameover modal visibility
    if (game.isGameOver && !isAmbient) {
      finalScoreValEl.textContent = game.score;
      gameOverScreenEl.classList.remove('hidden');
    } else {
      gameOverScreenEl.classList.add('hidden');
    }
  }

  // Main Loop
  function loop(timestamp) {
    if (isAmbient) {
      // 1. Ambient AI solver loop
      if (game.isGameOver) {
        // Autoplay automatically resets board when it dies
        game.reset();
        ai.resetTarget();
      }
      ai.update(timestamp);
    } else {
      // 2. Active player play loop
      if (!game.isPaused && !game.isGameOver) {
        const elapsed = timestamp - lastPlayerFallTime;
        if (elapsed > game.getSpeed()) {
          game.moveDown();
          lastPlayerFallTime = timestamp;
        }
      }
    }

    // Always update HUD parameters
    updateHUD();

    // Render Canvas Frame
    renderer.render(game);

    // Continue frame requests
    requestAnimationFrame(loop);
  }

  // Start the engine simulation loop
  game.reset(); // Spawn first pieces
  requestAnimationFrame(loop);
});
