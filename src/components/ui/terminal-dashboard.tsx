import React, { useState, useEffect } from 'react';

interface TerminalDashboardProps {
  isAmbient: boolean;
}

export const TerminalDashboard: React.FC<TerminalDashboardProps> = ({ isAmbient }) => {
  const [uptime, setUptime] = useState('00:00:00');
  const [searchVal, setSearchVal] = useState('');

  // Page boot timer for UNIX Uptime Spec
  useEffect(() => {
    const pageLoadTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
      const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      setUptime(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchVal)}`;
  };

  return (
    <main className="relative z-10 w-full max-w-[820px] bg-terminal-panel border-2 border-phosphor rounded-lg shadow-[0_0_30px_rgba(0,255,65,0.12),inset_0_0_10px_rgba(0,255,65,0.08)] flex flex-col transition-all duration-500 overflow-hidden">
      
      {/* Terminal Title Bar */}
      <div className="bg-terminal-header border-b-2 border-phosphor px-4 py-2.5 flex items-center relative">
        <div className="flex gap-2 absolute left-4">
          <span className="w-3 h-3 rounded-full border border-phosphor bg-terminal-dark opacity-60"></span>
          <span className="w-3 h-3 rounded-full border border-phosphor bg-terminal-dark opacity-60"></span>
          <span className="w-3 h-3 rounded-full border border-phosphor bg-terminal-dark opacity-60"></span>
        </div>
        <span className="w-full text-center text-xs font-medium tracking-wider text-phosphor [text-shadow:0_0_5px_rgba(0,255,65,0.45)]">
          bash - guest@tetris-tab: ~
        </span>
      </div>

      {/* Terminal Shell Body */}
      <div className="p-8 flex flex-col gap-9">
        
        {/* Neofetch System Information */}
        <section className="flex flex-col sm:flex-row gap-8 items-start">
          <pre className="font-mono text-sm leading-tight text-phosphor [text-shadow:0_0_8px_rgba(0,255,65,0.45)] whitespace-pre">
{`    _     _  
   [_]   [_] 
   [_]_ _[_] 
   [__] [__] 
   [_]   [_] `}
          </pre>
          <div className="flex flex-col gap-1 font-mono text-sm text-phosphor">
            <div className="font-bold text-base [text-shadow:0_0_5px_rgba(0,255,65,0.45)]">guest@tetris-tab</div>
            <div className="text-phosphor-dim">----------------</div>
            <div><span className="text-phosphor-dim font-semibold mr-2">OS:</span> TetrisOS v1.2.0</div>
            <div><span className="text-phosphor-dim font-semibold mr-2">Host:</span> React-shdcn-Vite TTY1</div>
            <div><span className="text-phosphor-dim font-semibold mr-2">Kernel:</span> ChromeV3-React-Engine</div>
            <div><span className="text-phosphor-dim font-semibold mr-2">Uptime:</span> {uptime}</div>
            <div><span className="text-phosphor-dim font-semibold mr-2">Shell:</span> bash 5.1.16</div>
            <div>
              <span className="text-phosphor-dim font-semibold mr-2">Daemon:</span> 
              <span className={`inline-block ${isAmbient ? 'text-phosphor animate-pulse-green' : 'text-phosphor-amber animate-pulse-amber'}`}>
                {isAmbient ? 'tetris-ai.service (active)' : 'tetris-ai.service (suspended)'}
              </span>
            </div>
          </div>
        </section>

        {/* Bash Command Prompt Search */}
        <section className="w-full">
          <form onSubmit={handleSearchSubmit} className="flex items-center flex-wrap gap-x-3 gap-y-2">
            <span className="text-phosphor-dim font-semibold font-mono">guest@tetris-tab:~$</span>
            <span className="text-white [text-shadow:0_0_4px_rgba(255,255,255,0.4)] font-mono">google-search --query</span>
            <div className="relative flex items-center flex-grow min-w-[200px]">
              <input 
                id="search-input" 
                type="text" 
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Enter query..." 
                className="bg-transparent border-none outline-none font-mono text-phosphor w-full select-text caret-transparent"
                autoComplete="off"
                autoFocus
              />
              {/* Custom blinking terminal cursor blocks */}
              <span 
                className="absolute pointer-events-none w-[9px] h-4 bg-phosphor shadow-[0_0_8px_rgba(0,255,65,0.45)] animate-cursor-blink"
                style={{ 
                  left: `${Math.min(300, searchVal.length * 8.5)}px` 
                }}
              ></span>
            </div>
          </form>
        </section>

        {/* Shortcuts Directory File Listing (ls -la) */}
        <section className="w-full">
          <div className="border border-phosphor/20 rounded px-5 py-4 bg-terminal-dark/30 flex flex-col gap-3 font-mono text-sm">
            <div className="border-b border-dashed border-phosphor/20 pb-2 mb-1">
              <span className="text-phosphor-dim font-semibold mr-2">guest@tetris-tab:~$</span> 
              <span className="text-white">ls -la /shortcuts</span>
            </div>
            <div className="flex flex-col gap-1.5 text-phosphor-dim">
              <div className="italic">total 12</div>
              <div className="flex gap-4">
                <span>drwxr-xr-x</span> <span>1</span> <span className="text-phosphor">ryuma</span> <span>staff</span> <span className="text-phosphor">4096</span> <span>Aug 12</span> 
                <a href="https://github.com" className="text-white hover:text-phosphor hover:[text-shadow:0_0_8px_rgba(0,255,65,0.45)] hover:underline font-medium transition-all" target="_blank" rel="noopener noreferrer">github.lnk/</a>
              </div>
              <div className="flex gap-4">
                <span>drwxr-xr-x</span> <span>1</span> <span className="text-phosphor">ryuma</span> <span>staff</span> <span className="text-phosphor">4096</span> <span>Aug 12</span> 
                <a href="https://youtube.com" className="text-white hover:text-phosphor hover:[text-shadow:0_0_8px_rgba(0,255,65,0.45)] hover:underline font-medium transition-all" target="_blank" rel="noopener noreferrer">youtube.lnk/</a>
              </div>
              <div className="flex gap-4">
                <span>drwxr-xr-x</span> <span>1</span> <span className="text-phosphor">ryuma</span> <span>staff</span> <span className="text-phosphor">4096</span> <span>Aug 12</span> 
                <a href="https://gmail.com" className="text-white hover:text-phosphor hover:[text-shadow:0_0_8px_rgba(0,255,65,0.45)] hover:underline font-medium transition-all" target="_blank" rel="noopener noreferrer">gmail.lnk/</a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Commands badge */}
        <footer className="border-t border-dashed border-phosphor/20 pt-4 text-sm text-phosphor-dim font-mono">
          <p className="status-ambient">
            <span className="text-phosphor-dim font-semibold mr-2">guest@tetris-tab:~$</span> ./boot_tetris.sh <span className="text-white font-semibold [text-shadow:0_0_4px_rgba(255,255,255,0.3)]">[Press T]</span>
          </p>
        </footer>
      </div>
    </main>
  );
};
