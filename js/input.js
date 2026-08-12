/**
 * Input Handler
 * Captures user keystrokes, applies search-box exclusion logic, and triggers engine mechanics.
 */

class InputHandler {
  constructor(game, toggleGameModeCallback) {
    this.game = game;
    this.toggleGameModeCallback = toggleGameModeCallback;

    // Throttle / speed settings for key repeats if needed
    // In basic Tetris, standard keydown listener handles single actions well.
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      // 1. Search Box Guard: Ignore inputs when search is focused
      if (document.activeElement && document.activeElement.id === 'search-input') {
        // Exception: allow pressing Escape to unfocus the search box
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      // 2. Activation Keys (Always active outside the search box)
      if (e.code === 'KeyT') {
        e.preventDefault();
        
        if (this.game.isGameOver) {
          // Restart immediately on T if game is over
          this.game.reset();
          this.toggleGameModeCallback(true);
        } else {
          // Toggle active play mode
          this.toggleGameModeCallback(true);
        }
        return;
      }

      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        // Return to ambient background mode
        this.toggleGameModeCallback(false);
        return;
      }

      // 3. Play Mode Controls
      // Only process these if the player is actively playing
      const isAmbient = document.body.classList.contains('ambient-autoplay');
      if (isAmbient) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          this.game.moveLeft();
          break;

        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.game.moveRight();
          break;

        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this.game.rotate();
          break;

        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.game.moveDown();
          break;

        case 'Space':
          e.preventDefault();
          this.game.hardDrop();
          break;

        case 'KeyP':
          e.preventDefault();
          this.game.togglePause();
          break;
      }
    });
  }
}
