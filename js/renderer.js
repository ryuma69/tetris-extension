/**
 * Canvas Renderer
 * Responsible for rendering the board, blocks, active pieces, ghost indicators, next-piece preview, grid effects, and line flashes.
 */

class TetrisRenderer {
  constructor(canvasId, nextCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.nextCanvas = document.getElementById(nextCanvasId);
    this.nextCtx = this.nextCanvas.getContext('2d');

    // Layout configuration
    this.blockSize = 30; // Will be computed dynamically
    this.boardWidth = 0;
    this.boardHeight = 0;
    this.boardOffsetX = 0;
    this.boardOffsetY = 0;

    // Line clearing animation state
    this.clearedRowsAnim = [];
    this.animFrame = 0;

    // Listen to linesCleared custom event from engine to trigger flash animations
    window.addEventListener('linesCleared', (e) => {
      // Find rows that were fully filled right before clearing (can be tracked or estimated)
      // Actually, we can flash the whole grid briefly or just run a standard animation state.
      // Let's capture active animation frames in the main loop.
      this.animFrame = 10; // 10 frames of flashing
    });

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Compute block size dynamically: fit 20 rows nicely with 82% viewport height
    const targetHeight = window.innerHeight * 0.82;
    this.blockSize = Math.floor(targetHeight / 20);
    // Keep it between reasonable sizes (zoomed for desktop)
    this.blockSize = Math.max(24, Math.min(this.blockSize, 45));

    this.boardWidth = 10 * this.blockSize;
    this.boardHeight = 20 * this.blockSize;

    // Center the board
    this.boardOffsetX = Math.floor((this.canvas.width - this.boardWidth) / 2);
    this.boardOffsetY = Math.floor((this.canvas.height - this.boardHeight) / 2);

    // Update CSS custom variable for HTML overlays spacing
    document.documentElement.style.setProperty('--block-size', `${this.blockSize}px`);
  }

  // Draw a single block with premium aesthetic (rounded, gradient, border)
  drawBlock(ctx, gridX, gridY, colorIndex, isGhost = false) {
    if (colorIndex === 0 || colorIndex >= COLORS.length) return;

    const baseColor = COLORS[colorIndex];
    
    // Pixel coordinates
    const pxX = this.boardOffsetX + gridX * this.blockSize;
    const pxY = this.boardOffsetY + gridY * this.blockSize;
    const size = this.blockSize;

    ctx.save();
    
    if (isGhost) {
      // Ghost Piece styling: thin dashed outline
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([4, 3]);
      
      ctx.beginPath();
      ctx.roundRect(pxX + 2, pxY + 2, size - 4, size - 4, 6);
      ctx.stroke();
    } else {
      // Gradient fill for depth
      const grad = ctx.createLinearGradient(pxX, pxY, pxX + size, pxY + size);
      grad.addColorStop(0, this.adjustColorBrightness(baseColor, 30)); // lighter top-left
      grad.addColorStop(1, this.adjustColorBrightness(baseColor, -30)); // darker bottom-right
      ctx.fillStyle = grad;

      // Glow effect for blocks
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.roundRect(pxX + 1, pxY + 1, size - 2, size - 2, 6);
      ctx.fill();

      // Border outline
      ctx.shadowBlur = 0; // turn off shadow for outline
      ctx.strokeStyle = this.adjustColorBrightness(baseColor, 50);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Utility to lighten or darken a hex color
  adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt((R * (100 + percent)) / 100);
    G = parseInt((G * (100 + percent)) / 100);
    B = parseInt((B * (100 + percent)) / 100);

    R = Math.min(255, Math.max(0, R));
    G = Math.min(255, Math.max(0, G));
    B = Math.min(255, Math.max(0, B));

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  // Clear main canvas screen
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Render the entire game layout
  render(game) {
    this.clear();

    // 1. Draw glowing grid frame
    this.drawBoardFrame(game.isPaused);

    // 2. Draw subtle grid gridlines
    this.drawGridlines();

    // 3. Draw landed board blocks
    for (let r = 0; r < game.rows; r++) {
      for (let c = 0; c < game.cols; c++) {
        if (game.board[r][c] !== 0) {
          this.drawBlock(this.ctx, c, r, game.board[r][c]);
        }
      }
    }

    // 4. Draw active falling piece and ghost indicator (if game is active and piece is defined)
    if (game.currentPiece) {
      const colorIndex = Object.keys(SHAPES).indexOf(game.currentPiece.key) + 1;
      
      // Draw Ghost Piece first (below current piece)
      if (!game.isGameOver && !game.isPaused && !document.body.classList.contains('ambient-autoplay')) {
        const ghostY = game.getGhostY();
        const matrix = game.currentPiece.matrix;
        for (let r = 0; r < matrix.length; r++) {
          for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== 0) {
              this.drawBlock(this.ctx, game.currentX + c, ghostY + r, colorIndex, true);
            }
          }
        }
      }

      // Draw Active Piece
      const matrix = game.currentPiece.matrix;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c] !== 0) {
            this.drawBlock(this.ctx, game.currentX + c, game.currentY + r, colorIndex);
          }
        }
      }
    }

    // 5. Draw flash overlay for line clears
    if (this.animFrame > 0) {
      this.drawClearFlash();
      this.animFrame--;
    }

    // 6. Draw Next Piece Preview
    this.renderNextPiece(game.nextPiece);
  }

  // Draw board background and glowing border
  drawBoardFrame(isPaused) {
    const x = this.boardOffsetX;
    const y = this.boardOffsetY;
    const w = this.boardWidth;
    const h = this.boardHeight;

    this.ctx.save();
    
    // Translucent glass board background
    this.ctx.fillStyle = 'rgba(8, 10, 24, 0.65)';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, 16);
    this.ctx.fill();

    // Glowing border outline
    this.ctx.strokeStyle = isPaused ? 'rgba(140, 146, 172, 0.25)' : 'rgba(109, 93, 252, 0.35)';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = isPaused ? '#8c92ac' : '#6d5dfc';
    this.ctx.shadowBlur = 15;
    
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, 16);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // Draw subtle grid helper lines inside the frame
  drawGridlines() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let c = 1; c < 10; c++) {
      const x = this.boardOffsetX + c * this.blockSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.boardOffsetY);
      this.ctx.lineTo(x, this.boardOffsetY + this.boardHeight);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let r = 1; r < 20; r++) {
      const y = this.boardOffsetY + r * this.blockSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardOffsetX, y);
      this.ctx.lineTo(this.boardOffsetX + this.boardWidth, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // Full board temporary neon flashing during clears
  drawClearFlash() {
    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 255, 255, ${this.animFrame / 10 * 0.4})`;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 20;

    this.ctx.beginPath();
    this.ctx.roundRect(this.boardOffsetX, this.boardOffsetY, this.boardWidth, this.boardHeight, 16);
    this.ctx.fill();
    this.ctx.restore();
  }

  // Render Next Piece inside HUD Box
  renderNextPiece(nextPiece) {
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    if (!nextPiece) return;

    const matrix = nextPiece.matrix;
    const colorIndex = Object.keys(SHAPES).indexOf(nextPiece.key) + 1;
    const baseColor = COLORS[colorIndex];

    const gridRows = matrix.length;
    const gridCols = matrix[0].length;
    
    // Fit drawing inside 120x120 next-canvas
    const blockPixelSize = 22;
    const drawWidth = gridCols * blockPixelSize;
    const drawHeight = gridRows * blockPixelSize;
    
    // Center alignment offsets
    const ox = (this.nextCanvas.width - drawWidth) / 2;
    const oy = (this.nextCanvas.height - drawHeight) / 2;

    this.nextCtx.save();
    
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (matrix[r][c] !== 0) {
          const pxX = ox + c * blockPixelSize;
          const pxY = oy + r * blockPixelSize;

          const grad = this.nextCtx.createLinearGradient(pxX, pxY, pxX + blockPixelSize, pxY + blockPixelSize);
          grad.addColorStop(0, this.adjustColorBrightness(baseColor, 30));
          grad.addColorStop(1, this.adjustColorBrightness(baseColor, -30));

          this.nextCtx.fillStyle = grad;
          this.nextCtx.shadowColor = baseColor;
          this.nextCtx.shadowBlur = 6;

          this.nextCtx.beginPath();
          this.nextCtx.roundRect(pxX + 1, pxY + 1, blockPixelSize - 2, blockPixelSize - 2, 4);
          this.nextCtx.fill();

          this.nextCtx.shadowBlur = 0;
          this.nextCtx.strokeStyle = this.adjustColorBrightness(baseColor, 50);
          this.nextCtx.lineWidth = 1;
          this.nextCtx.stroke();
        }
      }
    }
    
    this.nextCtx.restore();
  }
}
