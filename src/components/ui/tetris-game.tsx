import React, { useEffect, useRef } from 'react';
import { Piece, SHAPES } from '../../hooks/useTetris';

interface TetrisGameProps {
  board: number[][];
  score: number;
  highScore: number;
  level: number;
  lines: number;
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  isPaused: boolean;
  isGameOver: boolean;
  isAmbient: boolean;
  getGhostY: () => number;
}

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

export const TetrisGame: React.FC<TetrisGameProps> = ({
  board,
  score,
  highScore,
  level,
  lines,
  currentPiece,
  nextPiece,
  isPaused,
  isGameOver,
  isAmbient,
  getGhostY
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const blockSizeRef = useRef<number>(30);
  const animFrameRef = useRef<number>(0);

  // Handle line flash triggers
  useEffect(() => {
    const handleFlash = () => {
      animFrameRef.current = 10;
    };
    window.addEventListener('linesCleared', handleFlash);
    return () => window.removeEventListener('linesCleared', handleFlash);
  }, []);

  // Compute block size dynamically to fit viewport height
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const targetHeight = window.innerHeight * 0.82;
      const computedSize = Math.floor(targetHeight / 20);
      const size = Math.max(24, Math.min(computedSize, 45));
      blockSizeRef.current = size;

      document.documentElement.style.setProperty('--block-size', `${size}px`);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to adjust color brightness
  const adjustColorBrightness = (hex: string, percent: number) => {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = Math.min(255, Math.max(0, parseInt(((R * (100 + percent)) / 100).toString())));
    G = Math.min(255, Math.max(0, parseInt(((G * (100 + percent)) / 100).toString())));
    B = Math.min(255, Math.max(0, parseInt(((B * (100 + percent)) / 100).toString())));

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  };

  // Main canvas renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const blockSize = blockSizeRef.current;
    const boardWidth = 10 * blockSize;
    const boardHeight = 20 * blockSize;
    const offsetX = Math.floor((canvas.width - boardWidth) / 2);
    const offsetY = Math.floor((canvas.height - boardHeight) / 2);

    // Clear Screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw board terminal outline
    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 24, 0.7)';
    ctx.beginPath();
    ctx.roundRect(offsetX, offsetY, boardWidth, boardHeight, 12);
    ctx.fill();

    ctx.strokeStyle = isPaused ? 'rgba(140, 146, 172, 0.25)' : '#00ff41';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = isPaused ? 0 : 15;
    ctx.beginPath();
    ctx.roundRect(offsetX, offsetY, boardWidth, boardHeight, 12);
    ctx.stroke();
    ctx.restore();

    // 2. Draw subtle gridlines
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
    ctx.lineWidth = 1;
    // Vertical lines
    for (let c = 1; c < 10; c++) {
      const x = offsetX + c * blockSize;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + boardHeight);
      ctx.stroke();
    }
    // Horizontal lines
    for (let r = 1; r < 20; r++) {
      const y = offsetY + r * blockSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + boardWidth, y);
      ctx.stroke();
    }
    ctx.restore();

    // Block drawing helper
    const drawBlock = (x: number, y: number, colorIndex: number, isGhost = false) => {
      if (colorIndex <= 0 || colorIndex >= COLORS.length) return;
      const baseColor = COLORS[colorIndex]!;
      const pxX = offsetX + x * blockSize;
      const pxY = offsetY + y * blockSize;

      ctx.save();
      if (isGhost) {
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.roundRect(pxX + 2, pxY + 2, blockSize - 4, blockSize - 4, 6);
        ctx.stroke();
      } else {
        const grad = ctx.createLinearGradient(pxX, pxY, pxX + blockSize, pxY + blockSize);
        grad.addColorStop(0, adjustColorBrightness(baseColor, 30));
        grad.addColorStop(1, adjustColorBrightness(baseColor, -30));
        ctx.fillStyle = grad;
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(pxX + 1, pxY + 1, blockSize - 2, blockSize - 2, 6);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = adjustColorBrightness(baseColor, 50);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    };

    // 3. Draw landed board blocks
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        if (board[r][c] !== 0) {
          drawBlock(c, r, board[r][c]);
        }
      }
    }

    // 4. Draw active falling piece and ghost indicator
    if (currentPiece) {
      const colorIndex = Object.keys(SHAPES).indexOf(currentPiece.key) + 1;

      // Draw Ghost Piece first
      if (!isGameOver && !isPaused && !isAmbient) {
        const ghostY = getGhostY();
        for (let r = 0; r < currentPiece.matrix.length; r++) {
          for (let c = 0; c < currentPiece.matrix[r].length; c++) {
            if (currentPiece.matrix[r][c] !== 0) {
              drawBlock(currentPiece.x + c, ghostY + r, colorIndex, true);
            }
          }
        }
      }

      // Draw active falling piece
      for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
          if (currentPiece.matrix[r][c] !== 0) {
            drawBlock(currentPiece.x + c, currentPiece.y + r, colorIndex);
          }
        }
      }
    }

    // 5. Draw flash line clears
    if (animFrameRef.current > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${(animFrameRef.current / 10) * 0.4})`;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(offsetX, offsetY, boardWidth, boardHeight, 12);
      ctx.fill();
      ctx.restore();
      animFrameRef.current--;
    }
  }, [board, currentPiece, getGhostY, isPaused, isGameOver, isAmbient]);

  // Next piece canvas renderer
  useEffect(() => {
    const nextCanvas = nextCanvasRef.current;
    if (!nextCanvas) return;

    const ctx = nextCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;

    const matrix = nextPiece.matrix;
    const colorIndex = Object.keys(SHAPES).indexOf(nextPiece.key) + 1;
    const baseColor = COLORS[colorIndex]!;

    const blockPixelSize = 22;
    const drawWidth = matrix[0].length * blockPixelSize;
    const drawHeight = matrix.length * blockPixelSize;
    const ox = (nextCanvas.width - drawWidth) / 2;
    const oy = (nextCanvas.height - drawHeight) / 2;

    ctx.save();
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const pxX = ox + c * blockPixelSize;
          const pxY = oy + r * blockPixelSize;

          const grad = ctx.createLinearGradient(pxX, pxY, pxX + blockPixelSize, pxY + blockPixelSize);
          grad.addColorStop(0, adjustColorBrightness(baseColor, 30));
          grad.addColorStop(1, adjustColorBrightness(baseColor, -30));

          ctx.fillStyle = grad;
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(pxX + 1, pxY + 1, blockPixelSize - 2, blockPixelSize - 2, 4);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = adjustColorBrightness(baseColor, 50);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }, [nextPiece]);

  return (
    <div className={`fixed inset-0 z-[8] flex justify-center items-center gap-[60px] pointer-events-none transition-all duration-500 ${isAmbient ? 'opacity-0 translate-y-2.5' : 'opacity-100 translate-y-0 pointer-events-auto'}`}>
      
      {/* Invisible alignment spacer matching calculated block sizes */}
      <div className="block flex-shrink-0 w-[calc(10*var(--block-size,32px))] h-[calc(20*var(--block-size,32px))]" />

      {/* Main Canvas rendering target */}
      <canvas id="tetris-canvas" ref={canvasRef} className="fixed inset-0 w-screen h-screen z-0" />

      {/* HUD Cards sidebar panel */}
      <div className="flex flex-col gap-4 w-[260px] flex-shrink-0 relative z-10">
        
        {/* High Score */}
        <div className="bg-terminal-panel border-2 border-phosphor/50 rounded p-4 flex flex-col gap-1 shadow-[0_0_10px_rgba(0,255,65,0.05)] hover:border-phosphor hover:shadow-[0_0_15px_rgba(0,255,65,0.15)] transition-all">
          <div className="text-xs font-semibold text-phosphor-dim tracking-wider">[ HIGH SCORE ]</div>
          <div className="font-mono text-[1.8rem] font-bold text-phosphor [text-shadow:0_0_6px_rgba(0,255,65,0.45)]">
            {String(highScore).padStart(6, '0')}
          </div>
        </div>

        {/* Score */}
        <div className="bg-terminal-panel border-2 border-phosphor rounded p-4 flex flex-col gap-1 shadow-[0_0_12px_rgba(0,255,65,0.12)] hover:border-phosphor hover:shadow-[0_0_15px_rgba(0,255,65,0.15)] transition-all">
          <div className="text-xs font-semibold text-phosphor-dim tracking-wider">[ SCORE ]</div>
          <div className="font-mono text-[1.8rem] font-bold text-phosphor [text-shadow:0_0_6px_rgba(0,255,65,0.45)]">
            {String(score).padStart(6, '0')}
          </div>
        </div>

        {/* Level and Lines stats */}
        <div className="flex gap-3">
          <div className="flex-1 bg-terminal-panel border-2 border-phosphor/50 rounded px-3 py-2 flex flex-col gap-1 shadow-[0_0_10px_rgba(0,255,65,0.05)]">
            <div className="text-[10px] font-semibold text-phosphor-dim tracking-wider">[ LVL ]</div>
            <div className="font-mono text-xl font-bold text-phosphor">{level}</div>
          </div>
          <div className="flex-1 bg-terminal-panel border-2 border-phosphor/50 rounded px-3 py-2 flex flex-col gap-1 shadow-[0_0_10px_rgba(0,255,65,0.05)]">
            <div className="text-[10px] font-semibold text-phosphor-dim tracking-wider">[ LINES ]</div>
            <div className="font-mono text-xl font-bold text-phosphor">{lines}</div>
          </div>
        </div>

        {/* Next Piece box preview */}
        <div className="bg-terminal-panel border-2 border-phosphor/50 rounded p-4 flex flex-col items-center gap-1">
          <div className="text-xs font-semibold text-phosphor-dim tracking-wider">[ NEXT ]</div>
          <div className="bg-black/40 rounded p-2 mt-1 border border-phosphor/15">
            <canvas ref={nextCanvasRef} width={120} height={120} />
          </div>
        </div>

        {/* Game instructions */}
        <div className="bg-terminal-panel border-2 border-phosphor/50 rounded p-4 flex flex-col gap-1 font-mono">
          <div className="text-xs font-semibold text-phosphor-dim tracking-wider">[ CONTROLS ]</div>
          <div className="flex flex-col gap-1.5 mt-1 text-xs text-phosphor-dim">
            <div className="flex justify-between"><span>A/D, ←/→</span><span className="text-white">Move</span></div>
            <div className="flex justify-between"><span>W, ↑</span><span className="text-white">Rotate</span></div>
            <div className="flex justify-between"><span>S, ↓</span><span className="text-white">Drop</span></div>
            <div className="flex justify-between"><span>Space</span><span className="text-white">Hard Drop</span></div>
            <div className="flex justify-between"><span>P</span><span className="text-white">Pause</span></div>
            <div className="flex justify-between"><span>Esc</span><span className="text-white">Exit</span></div>
          </div>
        </div>

        {/* Footer command instruction back to console */}
        <footer className="text-xs text-phosphor-dim pt-2 border-t border-dashed border-phosphor/20">
          guest@tetris-tab:~$ kill -9 tetris <span className="text-white font-semibold">[Press ESC]</span>
        </footer>
      </div>

      {/* Pause Screen Overlay */}
      <div className={`absolute inset-0 z-50 bg-terminal/85 flex justify-center items-center transition-all ${isPaused && !isAmbient ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-black border-2 border-phosphor rounded-lg p-9 text-center shadow-[0_0_30px_rgba(0,255,65,0.25)] animate-[terminalBoot_0.35s_cubic-bezier(0.25,0.8,0.25,1)]">
          <h2 className="font-mono text-2xl font-bold text-phosphor [text-shadow:0_0_10px_rgba(0,255,65,0.45)] mb-4">[ PROCESS PAUSED ]</h2>
          <p className="text-phosphor-dim text-sm">Press <span className="inline-block bg-phosphor/10 border border-phosphor rounded px-1.5 py-0.5 text-white font-mono font-semibold mx-0.5">P</span> to SIGCONT</p>
        </div>
      </div>

      {/* Game Over Screen Overlay */}
      <div className={`absolute inset-0 z-50 bg-terminal/85 flex justify-center items-center transition-all ${isGameOver && !isAmbient ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-black border-2 border-phosphor rounded-lg p-9 text-center shadow-[0_0_30px_rgba(0,255,65,0.25)] animate-[terminalBoot_0.35s_cubic-bezier(0.25,0.8,0.25,1)]">
          <h2 className="font-mono text-2xl font-bold text-phosphor [text-shadow:0_0_10px_rgba(0,255,65,0.45)] mb-4">[ PROCESS TERMINATED ]</h2>
          <div className="flex flex-col gap-1 mb-5 text-sm text-phosphor-dim">
            <span>Exit Code Status:</span>
            <span className="text-white font-bold text-2xl [text-shadow:0_0_8px_rgba(255,255,255,0.3)]">{String(score).padStart(6, '0')}</span>
          </div>
          <p className="text-phosphor-dim text-sm border-t border-dashed border-phosphor/15 pt-4">Press <span className="inline-block bg-phosphor/10 border border-phosphor rounded px-1.5 py-0.5 text-white font-mono font-semibold mx-0.5">T</span> to Reboot</p>
        </div>
      </div>

    </div>
  );
};
