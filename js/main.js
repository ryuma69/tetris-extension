/**
 * Main Controller (Linux Terminal Edition)
 * Bootstraps the application, updates terminal clocks/uptimes, controls animation frames,
 * manages daemon state variables, and updates HUD panels.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core components
  const game = new TetrisGame();
  const renderer = new TetrisRenderer('tetris-canvas', 'next-canvas');
  const ai = new TetrisAI(game);
  
  // Set default body state to ambient autoplay
  document.body.classList.add('ambient-autoplay');

  // DOM elements
  const uptimeValEl = document.getElementById('uptime-val');
  const daemonStatusEl = document.getElementById('daemon-status');
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
  const pageLoadTime = Date.now();

  // Toggle mode callback
  const toggleGameMode = (activatePlayerPlay) => {
    if (activatePlayerPlay) {
      isAmbient = false;
      document.body.classList.remove('ambient-autoplay');
      document.body.classList.add('game-active');
      gameOverlayEl.classList.remove('hidden');
      
      // Update Daemon status spec
      daemonStatusEl.textContent = 'tetris-ai.service (suspended)';
      daemonStatusEl.className = 'status-suspended';
      
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

      // Update Daemon status spec
      daemonStatusEl.textContent = 'tetris-ai.service (active)';
      daemonStatusEl.className = 'status-active';

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

  // Sync uptime clock (format: hh:mm:ss)
  function updateUptime() {
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    uptimeValEl.textContent = `${hrs}:${mins}:${secs}`;
  }

  // Update Uptime immediately and every second
  updateUptime();
  setInterval(updateUptime, 1000);

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
      finalScoreValEl.textContent = String(game.score).padStart(6, '0');
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
