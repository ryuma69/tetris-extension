/**
 * Tetris Engine
 * Manages the state, board representation, piece matrices, collision checks, rotations, scoring, and level progression.
 */

// Tetris Piece Shapes (Matrices)
const SHAPES = {
  'I': [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  'O': [
    [2, 2],
    [2, 2]
  ],
  'T': [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0]
  ],
  'S': [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0]
  ],
  'Z': [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0]
  ],
  'J': [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0]
  ],
  'L': [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0]
  ]
};

// Colors matching the shapes indexes (1 to 7)
const COLORS = [
  null,
  '#00f0ff', // I (Cyan)
  '#f0f000', // O (Yellow)
  '#a000f0', // T (Purple)
  '#00f000', // S (Green)
  '#f00000', // Z (Red)
  '#0000f0', // J (Blue)
  '#f0a000'  // L (Orange)
];

class TetrisGame {
  constructor(cols = 10, rows = 20) {
    this.cols = cols;
    this.rows = rows;
    this.board = this.createBoardMatrix();
    
    // Game stats
    this.score = 0;
    this.highScore = 0;
    this.level = 1;
    this.lines = 0;
    
    // Active / Next Piece
    this.currentPiece = null;
    this.currentX = 0;
    this.currentY = 0;
    this.nextPiece = null;
    
    // Status
    this.isPaused = false;
    this.isGameOver = false;

    // Load High Score from Storage
    this.loadHighScore();
  }

  createBoardMatrix() {
    const matrix = [];
    for (let r = 0; r < this.rows; r++) {
      matrix.push(new Array(this.cols).fill(0));
    }
    return matrix;
  }

  reset() {
    this.board = this.createBoardMatrix();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.currentPiece = null;
    this.nextPiece = null;
    this.spawnPiece();
  }

  // Get current fall speed in milliseconds (faster for higher levels)
  getSpeed() {
    return Math.max(80, 1000 - (this.level - 1) * 80);
  }

  // Choose a random piece key
  getRandomPieceKey() {
    const keys = Object.keys(SHAPES);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  spawnPiece() {
    if (!this.nextPiece) {
      this.nextPiece = {
        key: this.getRandomPieceKey(),
        matrix: null
      };
      this.nextPiece.matrix = SHAPES[this.nextPiece.key];
    }

    this.currentPiece = {
      key: this.nextPiece.key,
      matrix: JSON.parse(JSON.stringify(this.nextPiece.matrix))
    };

    // Pick a new next piece
    const nextKey = this.getRandomPieceKey();
    this.nextPiece = {
      key: nextKey,
      matrix: SHAPES[nextKey]
    };

    // Spawn point: center-top
    this.currentX = Math.floor((this.cols - this.currentPiece.matrix[0].length) / 2);
    this.currentY = this.currentPiece.key === 'I' ? -1 : 0; // Spawn I slightly higher for better alignment

    // Check collision at spawn point
    if (this.checkCollision(this.currentX, this.currentY, this.currentPiece.matrix)) {
      this.isGameOver = true;
    }
  }

  /**
   * Check if a piece at (offsetX, offsetY) collides with walls, floor, or board pieces
   */
  checkCollision(offsetX, offsetY, matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const targetX = offsetX + c;
          const targetY = offsetY + r;

          // Wall / Floor boundaries
          if (targetX < 0 || targetX >= this.cols || targetY >= this.rows) {
            return true;
          }

          // Collide with filled blocks on the board (above screen y < 0 is allowed)
          if (targetY >= 0 && this.board[targetY][targetX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  moveLeft() {
    if (this.isPaused || this.isGameOver) return false;
    if (!this.checkCollision(this.currentX - 1, this.currentY, this.currentPiece.matrix)) {
      this.currentX--;
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.isPaused || this.isGameOver) return false;
    if (!this.checkCollision(this.currentX + 1, this.currentY, this.currentPiece.matrix)) {
      this.currentX++;
      return true;
    }
    return false;
  }

  moveDown() {
    if (this.isPaused || this.isGameOver) return false;
    
    if (!this.checkCollision(this.currentX, this.currentY + 1, this.currentPiece.matrix)) {
      this.currentY++;
      return true;
    }

    // Landed!
    this.mergePiece();
    this.clearLines();
    this.spawnPiece();
    return false;
  }

  hardDrop() {
    if (this.isPaused || this.isGameOver) return 0;
    let drops = 0;
    while (!this.checkCollision(this.currentX, this.currentY + 1, this.currentPiece.matrix)) {
      this.currentY++;
      drops++;
    }
    // Hard drop adds 2 * drops to the score
    this.score += drops * 2;
    this.mergePiece();
    this.clearLines();
    this.spawnPiece();
    return drops;
  }

  // Rotate clockwise
  rotate() {
    if (this.isPaused || this.isGameOver) return false;
    const matrix = this.currentPiece.matrix;
    const n = matrix.length;
    
    // Transpose and reverse rows to rotate 90 degrees clockwise
    const rotated = this.createBoardMatrix(); // temp holder sized appropriately
    const nextMatrix = [];
    for (let r = 0; r < n; r++) {
      nextMatrix.push(new Array(n).fill(0));
    }

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        nextMatrix[c][n - 1 - r] = matrix[r][c];
      }
    }

    // Wall kicks: try shifting to fit the rotated piece
    const kicks = [0, -1, 1, -2, 2];
    for (let kick of kicks) {
      if (!this.checkCollision(this.currentX + kick, this.currentY, nextMatrix)) {
        this.currentX += kick;
        this.currentPiece.matrix = nextMatrix;
        return true;
      }
    }
    return false;
  }

  mergePiece() {
    const matrix = this.currentPiece.matrix;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const targetY = this.currentY + r;
          const targetX = this.currentX + c;
          
          if (targetY >= 0) {
            this.board[targetY][targetX] = matrix[r][c];
          }
        }
      }
    }
  }

  clearLines() {
    let linesCleared = 0;
    
    for (let r = this.rows - 1; r >= 0; r--) {
      // Check if row is completely filled
      if (this.board[r].every(val => val !== 0)) {
        // Remove the row
        this.board.splice(r, 1);
        // Insert empty row at top
        this.board.unshift(new Array(this.cols).fill(0));
        // Check this row index again since upper rows shifted down
        r++;
        linesCleared++;
      }
    }

    if (linesCleared > 0) {
      this.lines += linesCleared;
      
      // Traditional scoring system scaled by level
      const baseScores = [0, 100, 300, 500, 800];
      const addedScore = (baseScores[linesCleared] || 800) * this.level;
      this.score += addedScore;

      // Advance level every 10 lines
      this.level = Math.floor(this.lines / 10) + 1;

      // Update High Score if needed
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore();
      }

      // Dispatch event for visual flashing animations on line clear
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('linesCleared', { detail: { count: linesCleared } });
        window.dispatchEvent(event);
      }
    }
  }

  togglePause() {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
  }

  loadHighScore() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['tetrisHighScore'], (result) => {
        if (result.tetrisHighScore) {
          this.highScore = result.tetrisHighScore;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('highScoreUpdated', { detail: this.highScore }));
          }
        }
      });
    } else {
      // Local storage fallback
      try {
        const val = localStorage.getItem('tetrisHighScore');
        if (val) {
          this.highScore = parseInt(val, 10);
        }
      } catch (e) {
        console.warn('Local storage not accessible', e);
      }
    }
  }

  saveHighScore() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ tetrisHighScore: this.highScore });
    } else {
      try {
        localStorage.setItem('tetrisHighScore', this.highScore.toString());
      } catch (e) {
        console.warn('Local storage not accessible', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('highScoreUpdated', { detail: this.highScore }));
    }
  }

  /**
   * Helper to check the ghost piece landing coordinate Y
   */
  getGhostY() {
    if (!this.currentPiece) return 0;
    let ghostY = this.currentY;
    while (!this.checkCollision(this.currentX, ghostY + 1, this.currentPiece.matrix)) {
      ghostY++;
    }
    return ghostY;
  }
}
