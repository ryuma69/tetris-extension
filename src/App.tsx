import { useState, useEffect } from 'react';
import ShaderBackground from './components/ui/shader-background';
import { TerminalDashboard } from './components/ui/terminal-dashboard';
import { TetrisGame } from './components/ui/tetris-game';
import { useTetris } from './hooks/useTetris';

function App() {
  const [isAmbient, setIsAmbient] = useState(true);
  const game = useTetris(isAmbient);

  // Global key listener with input focus guards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search Box Input Guard
      if (document.activeElement && document.activeElement.id === 'search-input') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      // 2. Main Mode Toggles
      if (e.code === 'KeyT') {
        e.preventDefault();
        if (game.isGameOver) {
          game.resetGame();
        }
        setIsAmbient(false);
        return;
      }

      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        setIsAmbient(true);
        return;
      }

      // 3. Delegation to Tetris engine when playing
      if (isAmbient) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          game.moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          game.moveRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          game.rotate();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          game.moveDown();
          break;
        case 'Space':
          e.preventDefault();
          game.hardDrop();
          break;
        case 'KeyP':
          e.preventDefault();
          game.togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game, isAmbient]);

  return (
    <div className="relative w-screen h-screen flex justify-center items-center bg-terminal overflow-hidden select-none">
      
      {/* 1. WebGL Plasma Line Shader background */}
      <ShaderBackground />

      {/* 2. CRT scanlines raster and screen vignette frames */}
      <div className="crt-scanlines" />
      <div className="crt-vignette" />

      {/* 3. Terminal specs and console dashboard */}
      <div className={`transition-all duration-500 ease-in-out flex justify-center items-center w-full max-w-[820px] px-4 ${!isAmbient ? 'opacity-0 scale-95 pointer-events-none blur-sm' : 'opacity-100 scale-100 pointer-events-auto'}`}>
        <TerminalDashboard isAmbient={isAmbient} />
      </div>

      <TetrisGame 
        {...game} 
        isAmbient={isAmbient} 
      />

    </div>
  );
}

export default App;
