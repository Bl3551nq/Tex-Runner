import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { isMuted, toggleMute, playClickSound } from './utils/audio';
import { Volume2, VolumeX, Moon, Sun, RefreshCw, Move } from 'lucide-react';

export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover' | 'victory'>('idle');

  // Interactive state synchronizations
  const [isNightMode, setIsNightMode] = useState(false); // Active day/night game cycles
  const [isSystemDarkMode, setIsSystemDarkMode] = useState(true); // Chrome default Dark/Light template switch
  const [muted, setMuted] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<'trex' | 'zilla' | 'dog'>('trex');

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedHi = localStorage.getItem('dino_high_score');
      if (savedHi) {
        setHighScore(parseInt(savedHi, 10));
      }

      const savedTheme = localStorage.getItem('dino_chrome_dark_mode');
      if (savedTheme === 'false') {
        setIsSystemDarkMode(false);
      } else {
        setIsSystemDarkMode(true);
      }

      const savedMute = localStorage.getItem('dino_chrome_mute_mode');
      if (savedMute === 'true') {
        if (!isMuted()) toggleMute();
        setMuted(true);
      }

      const savedChar = localStorage.getItem('dino_chrome_character');
      if (savedChar && ['trex', 'zilla', 'dog'].includes(savedChar)) {
        setSelectedCharacter(savedChar as any);
      }
    } catch (e) {
      console.warn('Preferences loading failed:', e);
    }
  }, []);

  const handleSelectCharacter = (char: 'trex' | 'zilla' | 'dog') => {
    playClickSound();
    setSelectedCharacter(char);
    try {
      localStorage.setItem('dino_chrome_character', char);
    } catch (e) {}
  };

  const handleSetHighScore = (newHi: number) => {
    setHighScore(newHi);
    try {
      localStorage.setItem('dino_high_score', String(newHi));
    } catch (e) {
      console.warn('Saving highscore failed:', e);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = toggleMute();
    setMuted(nextMuted);
    localStorage.setItem('dino_chrome_mute_mode', String(nextMuted));
  };

  // Moveable positions state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  const handleDragStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...position };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: positionStart.current.x + dx,
      y: positionStart.current.y + dy
    });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleToggleDarkLightPreference = () => {
    playClickSound();
    const nextDark = !isSystemDarkMode;
    setIsSystemDarkMode(nextDark);
    localStorage.setItem('dino_chrome_dark_mode', String(nextDark));
  };

  // The background of the container is fully transparent to support seamless floating overlay behavior in Android
  const pageBgClass = 'bg-transparent';

  const secondaryTextColor = isSystemDarkMode ? 'text-[#e8eaed]/65' : 'text-[#535353]/65';

  const activeLineColor = isSystemDarkMode ? 'text-[#e8eaed]' : 'text-[#535353]';

  return (
    <div className={`w-full h-full max-h-screen overflow-hidden transition-colors duration-500 flex flex-col items-center justify-start p-4 font-sans select-none ${pageBgClass}`}>
      
      {/* Centralized immersive full-screen container */}
      <div 
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
        className="w-full max-w-[1440px] flex flex-col flex-grow gap-4 relative animate-fade-in"
      >
        

        {/* Top bar with minimal controls and transparent scoreboard */}
        {gameState !== 'gameover' && (
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center w-full px-4 font-mono select-none">
            {/* Top-Left: Mode Toggle & Audio Controls */}
            <div className="flex flex-wrap gap-2 md:gap-3 items-center">
              <div className="flex gap-2 items-center">
                {/* Moveable controller icon */}
                <button
                  onPointerDown={handleDragStart}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                  className={`p-2 rounded-lg border border-neutral-500/10 cursor-grab active:cursor-grabbing flex items-center justify-center transition-all touch-none select-none ${
                    isSystemDarkMode 
                      ? 'bg-black/30 text-[#e8eaed] hover:bg-black/50 hover:border-white/10 active:scale-95' 
                      : 'bg-white/30 text-[#535353] hover:bg-white/50 hover:border-black/10 active:scale-95'
                  }`}
                  title="Drag to move game"
                >
                  <Move className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToggleDarkLightPreference}
                  className={`p-2 rounded-lg border border-neutral-500/10 cursor-pointer flex items-center justify-center transition-all ${
                    isSystemDarkMode 
                      ? 'bg-black/30 text-[#e8eaed] hover:bg-black/50 hover:border-white/10 active:scale-95' 
                      : 'bg-white/30 text-[#535353] hover:bg-white/50 hover:border-black/10 active:scale-95'
                  }`}
                  title={isSystemDarkMode ? 'Switch to White Theme' : 'Switch to Dark Theme'}
                >
                  {isSystemDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleToggleMute}
                  className={`p-2 rounded-lg border border-neutral-500/10 cursor-pointer flex items-center justify-center transition-all ${
                    isSystemDarkMode 
                      ? 'bg-black/30 text-[#e8eaed] hover:bg-black/50 hover:border-white/10 active:scale-95' 
                      : 'bg-white/30 text-[#535353] hover:bg-white/50 hover:border-black/10 active:scale-95'
                  }`}
                  title={muted ? 'Unmute Game Sound' : 'Mute Game Sound'}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Separator split */}
              <span className="w-px h-6 bg-neutral-400/20 dark:bg-white/10 hidden sm:inline"></span>

              {/* Retro select dropdown menu (Black & White, Space-saving) */}
              <div className="flex items-center gap-2 font-mono">
                <label 
                  htmlFor="character-select"
                  className={`text-[11px] uppercase tracking-wider font-bold select-none ${
                    isSystemDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  CHARACTER:
                </label>
                <div className="relative">
                  <select
                    id="character-select"
                    value={selectedCharacter}
                    onChange={(e) => handleSelectCharacter(e.target.value as any)}
                    className={`text-xs font-bold font-mono px-3 py-1.5 rounded border outline-none cursor-pointer tracking-wider transition-all appearance-none pr-8 select-none ${
                      isSystemDarkMode
                        ? 'bg-black border-white/20 text-white hover:border-white/40 focus:border-white/50'
                        : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400 focus:border-neutral-500'
                    }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${isSystemDarkMode ? 'white' : 'black'}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '12px',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    <option value="trex" className={isSystemDarkMode ? 'bg-black text-white' : 'bg-white text-black'}>T-REX</option>
                    <option value="zilla" className={isSystemDarkMode ? 'bg-black text-white' : 'bg-white text-black'}>ZILLA</option>
                    <option value="dog" className={isSystemDarkMode ? 'bg-black text-white' : 'bg-white text-black'}>DOG</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Top-Right: Compact monospace score display */}
            <div className="flex gap-3 sm:gap-4 text-lg sm:text-xl font-bold tracking-wider selection:bg-transparent tabular-nums items-center">
              <span className={`text-xs uppercase font-extrabold tracking-widest ${isSystemDarkMode ? 'bg-black/40 text-white border border-white/10' : 'bg-white/40 text-[#535353] border border-[#535353]/10'} px-2 py-0.5 rounded`}>
                LV {Math.min(10, Math.floor(score / 200) + 1)}
              </span>
              {highScore > 0 && (
                <span className={`${secondaryTextColor} text-[#535353]/65 text-xs sm:text-sm`}>
                  HI {String(highScore).padStart(5, '0')}
                </span>
              )}
              <span className={`${activeLineColor} text-sm sm:text-base font-extrabold`}>
                {String(score).padStart(5, '0')}
              </span>
            </div>
          </div>
        )}

        {/* Embedded Game Stage block styled massively to expand downwards */}
        <div className="w-full relative overflow-hidden bg-transparent transition-all flex flex-col flex-grow">
          <GameCanvas
            score={score}
            setScore={setScore}
            highScore={highScore}
            setHighScore={handleSetHighScore}
            gameState={gameState}
            setGameState={setGameState}
            isNightMode={isNightMode}
            setIsNightMode={setIsNightMode}
            isSystemDarkMode={isSystemDarkMode}
            selectedCharacter={selectedCharacter}
          />
        </div>

      </div>

    </div>
  );
}
