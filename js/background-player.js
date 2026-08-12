/**
 * Ambient Tetris AI Solver (Background Player)
 * Analyzes the grid configuration and chooses the optimal column and rotation for the active piece,
 * then guides it step-by-step to the target position.
 */

class TetrisAI {
  constructor(game) {
    this.game = game;
    this.targetX = 0;
    this.targetRotationCount = 0;
    this.currentPieceId = null;
    this.lastActionTime = 0;
    this.actionInterval = 120; // ms delay between keyboard-like actions for natural play appearance
    
    // Heuristic coefficients
    this.weights = {
      sumHeight: -0.51,
      lines: 1.5,
      holes: -0.42,
      bumpiness: -0.18,
      maxHeight: -0.15
    };
  }

  // Reset target tracking
  resetTarget() {
    this.currentPieceId = null;
  }

  /**
   * Run one update step. Handles delay and keyboard command emulation.
   * Returns true if an action was executed.
   */
  update(time) {
    if (this.game.isPaused || this.game.isGameOver) {
      return false;
    }

    // Determine if we need to calculate a new target
    // We identify the active piece by a unique string representing its key and starting coordinates
    const activePieceId = `${this.game.currentPiece.key}_${this.game.currentPiece.matrix.length}`;
    
    if (this.currentPieceId !== activePieceId) {
      this.calculateBestMove();
      this.currentPieceId = activePieceId;
      this.lastActionTime = time;
    }

    if (time - this.lastActionTime < this.actionInterval) {
      return false; // Wait for natural delay
    }

    this.lastActionTime = time;

    // 1. Rotate to match target rotation count
    if (this.targetRotationCount > 0) {
      if (this.game.rotate()) {
        this.targetRotationCount--;
        return true;
      } else {
        // If rotation is blocked (wall kicks failed), reset target calculations
        this.calculateBestMove();
        return false;
      }
    }

    // 2. Move horizontally to target column
    if (this.game.currentX < this.targetX) {
      this.game.moveRight();
      return true;
    } else if (this.game.currentX > this.targetX) {
      this.game.moveLeft();
      return true;
    }

    // 3. Drop down once in position
    this.game.moveDown();
    return true;
  }

  /**
   * Find the optimal placement by testing all possible rotations and column placements.
   */
  calculateBestMove() {
    const piece = this.game.currentPiece;
    if (!piece) return;

    let bestScore = -Infinity;
    let bestX = this.game.currentX;
    let bestRotationCount = 0;

    // Test up to 4 rotation states
    let tempMatrix = JSON.parse(JSON.stringify(piece.matrix));
    for (let rot = 0; rot < 4; rot++) {
      if (rot > 0) {
        // Rotate tempMatrix clockwise
        tempMatrix = this.rotateMatrix(tempMatrix);
      }

      // Determine valid column range for this matrix
      const minX = -this.getLeftOffset(tempMatrix);
      const maxX = this.game.cols - tempMatrix[0].length + this.getRightOffset(tempMatrix);

      for (let x = minX; x <= maxX; x++) {
        // Skip positions where the piece collides immediately at spawn height
        if (this.game.checkCollision(x, this.game.currentY, tempMatrix)) {
          continue;
        }

        // Simulate drop to find landing row
        let y = this.game.currentY;
        while (!this.game.checkCollision(x, y + 1, tempMatrix)) {
          y++;
        }

        // Simulate merging the piece on a copy of the board
        const simulatedBoard = this.game.board.map(row => [...row]);
        this.simulatedMerge(simulatedBoard, x, y, tempMatrix);

        // Calculate lines cleared on simulated board
        const linesResult = this.simulatedClear(simulatedBoard);
        const linesCleared = linesResult.cleared;

        // Evaluate grid parameters
        const gridHeights = this.getGridHeights(simulatedBoard);
        const sumHeight = gridHeights.reduce((a, b) => a + b, 0);
        const maxHeight = Math.max(...gridHeights);
        const holes = this.countHoles(simulatedBoard, gridHeights);
        const bumpiness = this.calculateBumpiness(gridHeights);

        // Heuristic Fitness function
        const score = 
          (this.weights.sumHeight * sumHeight) + 
          (this.weights.lines * linesCleared) + 
          (this.weights.holes * holes) + 
          (this.weights.bumpiness * bumpiness) + 
          (this.weights.maxHeight * maxHeight);

        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestRotationCount = rot;
        }
      }
    }

    this.targetX = bestX;
    this.targetRotationCount = bestRotationCount;
  }

  // Helper: Rotate a square matrix 90 degrees clockwise
  rotateMatrix(matrix) {
    const n = matrix.length;
    const rotated = [];
    for (let r = 0; r < n; r++) {
      rotated.push(new Array(n).fill(0));
    }
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotated[c][n - 1 - r] = matrix[r][c];
      }
    }
    return rotated;
  }

  // Count empty columns inside a piece matrix from left boundary
  getLeftOffset(matrix) {
    for (let c = 0; c < matrix[0].length; c++) {
      for (let r = 0; r < matrix.length; r++) {
        if (matrix[r][c] !== 0) return c;
      }
    }
    return 0;
  }

  // Count empty columns inside a piece matrix from right boundary
  getRightOffset(matrix) {
    const width = matrix[0].length;
    for (let c = width - 1; c >= 0; c--) {
      for (let r = 0; r < matrix.length; r++) {
        if (matrix[r][c] !== 0) return (width - 1) - c;
      }
    }
    return 0;
  }

  simulatedMerge(board, startX, startY, matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const targetY = startY + r;
          const targetX = startX + c;
          if (targetY >= 0 && targetY < board.length && targetX >= 0 && targetX < board[0].length) {
            board[targetY][targetX] = matrix[r][c];
          }
        }
      }
    }
  }

  simulatedClear(board) {
    let cleared = 0;
    for (let r = board.length - 1; r >= 0; r--) {
      if (board[r].every(val => val !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(board[0].length).fill(0));
        r++;
        cleared++;
      }
    }
    return { board, cleared };
  }

  // Heights of columns (distance from bottom to top filled block)
  getGridHeights(board) {
    const cols = board[0].length;
    const rows = board.length;
    const heights = new Array(cols).fill(0);
    
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (board[r][c] !== 0) {
          heights[c] = rows - r;
          break;
        }
      }
    }
    return heights;
  }

  // Count empty spaces under filled blocks
  countHoles(board, heights) {
    let holes = 0;
    const cols = board[0].length;
    const rows = board.length;

    for (let c = 0; c < cols; c++) {
      const height = heights[c];
      if (height === 0) continue;
      
      const startRow = rows - height;
      for (let r = startRow + 1; r < rows; r++) {
        if (board[r][c] === 0) {
          holes++;
        }
      }
    }
    return holes;
  }

  // Aggregate height differences between adjacent columns
  calculateBumpiness(heights) {
    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
      bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }
    return bumpiness;
  }
}
