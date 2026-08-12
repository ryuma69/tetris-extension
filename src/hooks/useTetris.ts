import { useState, useEffect, useRef, useCallback } from 'react';

// Tetris Piece Shapes
export const SHAPES = {
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

export type PieceType = keyof typeof SHAPES;

export interface Piece {
  key: PieceType;
  matrix: number[][];
  x: number;
  y: number;
}

const COLS = 10;
const ROWS = 20;

// AI weights for background player
const AI_WEIGHTS = {
  sumHeight: -0.51,
  lines: 1.5,
  holes: -0.42,
  bumpiness: -0.18,
  maxHeight: -0.15
};

export function useTetris(isAmbient: boolean) {
  const [board, setBoard] = useState<number[][]>(() => 
    Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
  );
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // References for mutable game loop state to avoid closures issues
  const boardRef = useRef(board);
  boardRef.current = board;
  
  const currentPieceRef = useRef(currentPiece);
  currentPieceRef.current = currentPiece;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;

  const isAmbientRef = useRef(isAmbient);
  isAmbientRef.current = isAmbient;

  // AI Decision States
  const aiTargetXRef = useRef<number>(0);
  const aiTargetRotationsRef = useRef<number>(0);
  const aiCurrentPieceIdRef = useRef<string | null>(null);

  // Load High Score
  useEffect(() => {
    const chrome = (window as any).chrome;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['tetrisHighScore'], (result: any) => {
        if (result.tetrisHighScore) setHighScore(result.tetrisHighScore);
      });
    } else {
      const val = localStorage.getItem('tetrisHighScore');
      if (val) setHighScore(parseInt(val, 10));
    }
  }, []);

  const saveHighScore = (newHigh: number) => {
    setHighScore(newHigh);
    const chrome = (window as any).chrome;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ tetrisHighScore: newHigh });
    } else {
      localStorage.setItem('tetrisHighScore', newHigh.toString());
    }
  };

  // Helper functions
  const getRandomPieceKey = (): PieceType => {
    const keys = Object.keys(SHAPES) as PieceType[];
    return keys[Math.floor(Math.random() * keys.length)];
  };

  const createPiece = useCallback((key: PieceType): Piece => {
    const matrix = JSON.parse(JSON.stringify(SHAPES[key]));
    const x = Math.floor((COLS - matrix[0].length) / 2);
    const y = key === 'I' ? -1 : 0;
    return { key, matrix, x, y };
  }, []);

  const checkCollision = useCallback((x: number, y: number, matrix: number[][], currentBoard: number[][]) => {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const targetX = x + c;
          const targetY = y + r;

          if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
            return true;
          }

          if (targetY >= 0 && currentBoard[targetY][targetX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Spawn Piece
  const spawnPiece = useCallback((currentBoard: number[][]) => {
    let next = nextPiece;
    if (!next) {
      next = createPiece(getRandomPieceKey());
    }
    
    const active = { ...next };
    const newNext = createPiece(getRandomPieceKey());
    
    setNextPiece(newNext);

    if (checkCollision(active.x, active.y, active.matrix, currentBoard)) {
      setIsGameOver(true);
      setCurrentPiece(null);
    } else {
      setCurrentPiece(active);
    }
  }, [nextPiece, createPiece, checkCollision]);

  // Reset Game
  const resetGame = useCallback(() => {
    const cleanBoard = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    setBoard(cleanBoard);
    setScore(0);
    setLevel(1);
    setLines(0);
    setIsGameOver(false);
    setIsPaused(false);
    aiCurrentPieceIdRef.current = null;
    
    const initialNext = createPiece(getRandomPieceKey());
    const initialActive = createPiece(getRandomPieceKey());
    setNextPiece(initialNext);
    setCurrentPiece(initialActive);
  }, [createPiece]);

  // Rotation with Wall Kicks
  const rotateMatrix = (matrix: number[][]) => {
    const n = matrix.length;
    const rotated = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotated[c][n - 1 - r] = matrix[r][c];
      }
    }
    return rotated;
  };

  const rotate = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;
    const active = currentPieceRef.current;
    const rotatedMatrix = rotateMatrix(active.matrix);
    
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!checkCollision(active.x + kick, active.y, rotatedMatrix, boardRef.current)) {
        setCurrentPiece({
          ...active,
          x: active.x + kick,
          matrix: rotatedMatrix
        });
        return;
      }
    }
  }, [checkCollision]);

  // Horizontal Movement
  const moveLeft = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;
    const active = currentPieceRef.current;
    if (!checkCollision(active.x - 1, active.y, active.matrix, boardRef.current)) {
      setCurrentPiece({ ...active, x: active.x - 1 });
    }
  }, [checkCollision]);

  const moveRight = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;
    const active = currentPieceRef.current;
    if (!checkCollision(active.x + 1, active.y, active.matrix, boardRef.current)) {
      setCurrentPiece({ ...active, x: active.x + 1 });
    }
  }, [checkCollision]);

  // Merge & Clear
  const mergeAndClear = useCallback((active: Piece, currentBoard: number[][]) => {
    const newBoard = currentBoard.map(row => [...row]);
    
    // Merge
    for (let r = 0; r < active.matrix.length; r++) {
      for (let c = 0; c < active.matrix[r].length; c++) {
        if (active.matrix[r][c] !== 0) {
          const targetY = active.y + r;
          const targetX = active.x + c;
          if (targetY >= 0) {
            newBoard[targetY][targetX] = active.matrix[r][c];
          }
        }
      }
    }

    // Clear Lines
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newBoard[r].every(val => val !== 0)) {
        newBoard.splice(r, 1);
        newBoard.unshift(new Array(COLS).fill(0));
        r++;
        linesCleared++;
      }
    }

    if (linesCleared > 0) {
      setLines(l => {
        const nextLines = l + linesCleared;
        setLevel(Math.floor(nextLines / 10) + 1);
        return nextLines;
      });

      setScore(s => {
        const baseScores = [0, 100, 300, 500, 800];
        const nextScore = s + (baseScores[linesCleared] || 800) * level;
        if (nextScore > highScore) {
          saveHighScore(nextScore);
        }
        return nextScore;
      });

      // Dispatch visual line cleared event
      window.dispatchEvent(new CustomEvent('linesCleared', { detail: { count: linesCleared } }));
    }

    setBoard(newBoard);
    spawnPiece(newBoard);
  }, [level, highScore, spawnPiece]);

  // Soft Drop
  const moveDown = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;
    const active = currentPieceRef.current;
    
    if (!checkCollision(active.x, active.y + 1, active.matrix, boardRef.current)) {
      setCurrentPiece({ ...active, y: active.y + 1 });
      return true;
    } else {
      mergeAndClear(active, boardRef.current);
      return false;
    }
  }, [checkCollision, mergeAndClear]);

  // Hard Drop
  const hardDrop = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;
    const active = currentPieceRef.current;
    let drops = 0;
    
    while (!checkCollision(active.x, active.y + drops + 1, active.matrix, boardRef.current)) {
      drops++;
    }
    
    setScore(s => {
      const nextScore = s + drops * 2;
      if (nextScore > highScore) {
        saveHighScore(nextScore);
      }
      return nextScore;
    });

    const landedPiece = { ...active, y: active.y + drops };
    mergeAndClear(landedPiece, boardRef.current);
  }, [checkCollision, mergeAndClear, highScore]);

  // Toggle Pause
  const togglePause = useCallback(() => {
    if (isGameOverRef.current) return;
    setIsPaused(p => !p);
  }, []);

  // Ghost Y helper
  const getGhostY = useCallback(() => {
    const active = currentPiece;
    if (!active) return 0;
    let ghostY = active.y;
    while (!checkCollision(active.x, ghostY + 1, active.matrix, board)) {
      ghostY++;
    }
    return ghostY;
  }, [currentPiece, board, checkCollision]);

  // AI AUTOPLAY LOGIC
  const runAIHeuristic = useCallback(() => {
    const active = currentPieceRef.current;
    if (!active) return;

    let bestScore = -Infinity;
    let bestX = active.x;
    let bestRotationCount = 0;

    // Simulate placements
    let tempMatrix = JSON.parse(JSON.stringify(active.matrix));
    for (let rot = 0; rot < 4; rot++) {
      if (rot > 0) tempMatrix = rotateMatrix(tempMatrix);

      // Horizontal boundaries
      let leftOffset = 0;
      for (let c = 0; c < tempMatrix[0].length; c++) {
        let hasCell = false;
        for (let r = 0; r < tempMatrix.length; r++) {
          if (tempMatrix[r][c] !== 0) hasCell = true;
        }
        if (hasCell) { leftOffset = c; break; }
      }

      let rightOffset = 0;
      const w = tempMatrix[0].length;
      for (let c = w - 1; c >= 0; c--) {
        let hasCell = false;
        for (let r = 0; r < tempMatrix.length; r++) {
          if (tempMatrix[r][c] !== 0) hasCell = true;
        }
        if (hasCell) { rightOffset = (w - 1) - c; break; }
      }

      const minX = -leftOffset;
      const maxX = COLS - tempMatrix[0].length + rightOffset;

      for (let x = minX; x <= maxX; x++) {
        if (checkCollision(x, active.y, tempMatrix, boardRef.current)) continue;

        let y = active.y;
        while (!checkCollision(x, y + 1, tempMatrix, boardRef.current)) {
          y++;
        }

        // Simulate board copy
        const simulated = boardRef.current.map(row => [...row]);
        // Merge
        for (let r = 0; r < tempMatrix.length; r++) {
          for (let c = 0; c < tempMatrix[r].length; c++) {
            if (tempMatrix[r][c] !== 0 && y + r >= 0) {
              simulated[y + r][x + c] = tempMatrix[r][c];
            }
          }
        }

        // Simulated clear lines
        let linesCleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (simulated[r].every(val => val !== 0)) {
            simulated.splice(r, 1);
            simulated.unshift(new Array(COLS).fill(0));
            r++;
            linesCleared++;
          }
        }

        // Heights
        const heights = new Array(COLS).fill(0);
        for (let c = 0; c < COLS; c++) {
          for (let r = 0; r < ROWS; r++) {
            if (simulated[r][c] !== 0) { heights[c] = ROWS - r; break; }
          }
        }

        const sumHeight = heights.reduce((a, b) => a + b, 0);
        const maxHeight = Math.max(...heights);
        
        // Holes
        let holes = 0;
        for (let c = 0; c < COLS; c++) {
          if (heights[c] > 0) {
            for (let r = ROWS - heights[c] + 1; r < ROWS; r++) {
              if (simulated[r][c] === 0) holes++;
            }
          }
        }

        // Bumpiness
        let bumpiness = 0;
        for (let i = 0; i < COLS - 1; i++) {
          bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }

        const score = 
          (AI_WEIGHTS.sumHeight * sumHeight) + 
          (AI_WEIGHTS.lines * linesCleared) + 
          (AI_WEIGHTS.holes * holes) + 
          (AI_WEIGHTS.bumpiness * bumpiness) + 
          (AI_WEIGHTS.maxHeight * maxHeight);

        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestRotationCount = rot;
        }
      }
    }

    aiTargetXRef.current = bestX;
    aiTargetRotationsRef.current = bestRotationCount;
  }, [checkCollision]);

  // Tick timers
  useEffect(() => {
    if (isGameOver) {
      if (isAmbient) {
        // AI reset
        resetGame();
      }
      return;
    }

    if (!currentPiece) {
      spawnPiece(board);
      return;
    }

    let intervalId: number;

    if (isAmbient) {
      // AI action loop: ticks faster than gravity to perform key-like actions
      const aiInterval = 120;
      
      const tickAI = () => {
        if (isPausedRef.current) return;
        const active = currentPieceRef.current;
        if (!active) return;

        const activeId = `${active.key}_${active.matrix.length}`;
        if (aiCurrentPieceIdRef.current !== activeId) {
          runAIHeuristic();
          aiCurrentPieceIdRef.current = activeId;
        }

        // Action execution
        if (aiTargetRotationsRef.current > 0) {
          rotate();
          aiTargetRotationsRef.current--;
        } else if (active.x < aiTargetXRef.current) {
          moveRight();
        } else if (active.x > aiTargetXRef.current) {
          moveLeft();
        } else {
          moveDown();
        }
      };

      intervalId = window.setInterval(tickAI, aiInterval);
    } else {
      // Standard Player gravity ticks
      const speed = Math.max(80, 1000 - (level - 1) * 80);
      
      const tickPlayer = () => {
        if (isPausedRef.current) return;
        moveDown();
      };

      intervalId = window.setInterval(tickPlayer, speed);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [isGameOver, isAmbient, currentPiece, board, level, spawnPiece, rotate, moveLeft, moveRight, moveDown, runAIHeuristic, resetGame]);

  return {
    board,
    score,
    highScore,
    level,
    lines,
    currentPiece,
    nextPiece,
    isPaused,
    isGameOver,
    getGhostY,
    resetGame,
    moveLeft,
    moveRight,
    rotate,
    moveDown,
    hardDrop,
    togglePause
  };
}
