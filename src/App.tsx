import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { isMuted, toggleMute, playClickSound } from './utils/audio';
import { Volume2, VolumeX, Moon, Sun, RefreshCw } from 'lucide-react';

export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');

  // Interactive state synchronizations
  const [isNightMode, setIsNightMode] = useState(false); // Active day/night game cycles
  const [isSystemDarkMode, setIsSystemDarkMode] = useState(true); // Chrome default Dark/Light template switch
  const [muted, setMuted] = useState(false);

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
    } catch (e) {
      console.warn('Preferences loading failed:', e);
    }
  }, []);

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
    <div className={`min-h-screen transition-colors duration-500 flex flex-col items-center justify-start p-4 font-sans select-none ${pageBgClass}`}>
      
      {/* Centralized immersive full-screen container */}
      <div className="w-full max-w-[1440px] flex flex-col flex-grow gap-4">
        
        {/* Top bar with minimal controls and transparent scoreboard */}
        <div className="flex justify-between items-center w-full px-4 font-mono select-none">
          {/* Top-Left: Mode Toggle & Audio Controls */}
          <div className="flex gap-2">
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

          {/* Top-Right: Monospace ultra-clean score display */}
          <div className="flex gap-6 sm:gap-8 text-3xl sm:text-5xl font-black tracking-wider selection:bg-transparent tabular-nums items-end">
            <span className={`text-sm sm:text-base uppercase font-bold tracking-widest mr-2 self-center ${isSystemDarkMode ? 'bg-black/40 text-white border border-white/10' : 'bg-white/40 text-[#535353] border border-[#535353]/10'} px-2.5 py-1 rounded`}>
              LV {Math.floor(score / 200) + 1}
            </span>
            {highScore > 0 && (
              <span className={`${secondaryTextColor} text-2xl sm:text-4xl self-center`}>
                HI {String(highScore).padStart(5, '0')}
              </span>
            )}
            <span className={`${activeLineColor} self-center`}>
              {String(score).padStart(5, '0')}
            </span>
          </div>
        </div>

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
          />
        </div>

      </div>

    </div>
  );
}
