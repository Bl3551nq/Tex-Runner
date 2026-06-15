import React, { useEffect, useRef } from 'react';
import { Play, Pause, ArrowDown, ArrowUp } from 'lucide-react';
import { ObstacleType, CloudType, ParticleType } from '../types';
import { 
  drawPixelSprite, 
  DINO_STATIC, DINO_RUN1, DINO_RUN2, DINO_DUCK1, DINO_DUCK2,
  CACTUS_SMALL, CACTUS_LARGE,
  BIRD_WINGS_UP, BIRD_WINGS_DOWN,
  CLOUD
} from '../utils/sprites';
import { playJumpSound, playCrashSound, playMilestoneSound } from '../utils/audio';

// Custom Crescent Moon sprite for dark mode night cycles
const CONST_MOON: string[] = [
  "     ██████     ",
  "   █████████    ",
  "  █████   ███   ",
  " ████           ",
  " ████           ",
  " ████           ",
  "  ████          ",
  "   ████████   █ ",
  "    ███████████ ",
  "      ███████   "
];

// Simple blinking star sprite
const CONST_STAR: string[] = [
  "   █   ",
  "  ███  ",
  " █   █ ",
  "  ███  ",
  "   █   "
];

// Reload icon drawn on gameover
const RELOAD_ICON: string[] = [
  "    ████████    ",
  "  ████    ████  ",
  " ███        ███ ",
  "███          ███",
  "███        █  ██",
  "███       ███ ██",
  "███      ████ ██",
  " ███    ████████",
  "  ████████  ████",
  "    ████        "
];

interface GameCanvasProps {
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  highScore: number;
  setHighScore: (score: number) => void;
  gameState: 'idle' | 'playing' | 'paused' | 'gameover';
  setGameState: React.Dispatch<React.SetStateAction<'idle' | 'playing' | 'paused' | 'gameover'>>;
  isNightMode: boolean;
  setIsNightMode: (night: boolean) => void;
  isSystemDarkMode: boolean;
}

export default function GameCanvas({
  score,
  setScore,
  highScore,
  setHighScore,
  gameState,
  setGameState,
  isNightMode,
  setIsNightMode,
  isSystemDarkMode
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hardcoded physical sizes to matches the original game coordinates
  const groundY = 230; // Dino ground level
  const canvasVirtualWidth = 600;
  const canvasVirtualHeight = 260;

  // Mutable game loop environment
  const stateRef = useRef({
    gameState,
    score,
    highScore,
    isNightMode,
    isSystemDarkMode,
    gameSpeed: 6,
    dinoY: 0,
    dinoVy: 0,
    isJumping: false,
    isDucking: false,
    obstacles: [] as ObstacleType[],
    clouds: [] as CloudType[],
    stars: [] as { x: number; y: number; brightness: number }[],
    groundRocks: [] as { x: number; size: number }[],
    frameCount: 0,
    nextObstacleTimer: 60,
    flashScoreTimer: 0,
    screenShake: 0
  });

  // Keep state sync updated from React props
  useEffect(() => {
    stateRef.current.gameState = gameState;
  }, [gameState]);

  useEffect(() => {
    stateRef.current.highScore = highScore;
  }, [highScore]);

  useEffect(() => {
    stateRef.current.isSystemDarkMode = isSystemDarkMode;
  }, [isSystemDarkMode]);

  const resumeGame = () => {
    const s = stateRef.current;
    s.gameState = 'playing';
    setGameState('playing');
  };

  const togglePause = () => {
    const s = stateRef.current;
    if (s.gameState === 'playing') {
      s.gameState = 'paused';
      setGameState('paused');
    } else if (s.gameState === 'paused') {
      resumeGame();
    } else if (s.gameState === 'idle') {
      resetGame();
    }
  };

  // Set up Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.repeat) return;

      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        triggerJumpOrStart();
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setDucking(true);
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setDucking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const triggerJumpOrStart = () => {
    const s = stateRef.current;
    if (s.gameState === 'playing') {
        if (!s.isJumping && !s.isDucking) {
          s.dinoVy = -11.5; // Classic high jump strength
          s.isJumping = true;
          playJumpSound();
        }
    } else if (s.gameState === 'idle') {
      resetGame();
    } else if (s.gameState === 'gameover') {
      resetGame();
    } else if (s.gameState === 'paused') {
      resumeGame();
    }
  };

  const setDucking = (ducking: boolean) => {
    const s = stateRef.current;
    if (s.gameState === 'playing') {
      s.isDucking = ducking;
      // High-speed slam down if duck is pressed mid-air
      if (ducking && s.isJumping) {
        s.dinoVy += 5.0; // accelerate descent
      }
    }
  };

  const resetGame = () => {
    const s = stateRef.current;
    s.gameState = 'playing';
    s.score = 0;
    setScore(0);
    s.gameSpeed = 6;
    s.dinoY = 0;
    s.dinoVy = 0;
    s.isJumping = false;
    s.isDucking = false;
    s.obstacles = [];
    s.flashScoreTimer = 0;
    s.isNightMode = false;
    setIsNightMode(false);
    s.frameCount = 0;
    s.nextObstacleTimer = 60;
    
    // Spawn initial clouds
    s.clouds = [
      { x: 150, y: 30, speed: 0.2, size: 2.0 },
      { x: 380, y: 44, speed: 0.16, size: 2.5 },
      { x: 550, y: 20, speed: 0.24, size: 1.8 }
    ];

    // Spawns twinkling stars
    s.stars = [
      { x: 100, y: 24, brightness: 1 },
      { x: 280, y: 36, brightness: 0.8 },
      { x: 420, y: 16, brightness: 1.2 },
      { x: 520, y: 40, brightness: 0.5 }
    ];

    // Spawn rocks
    s.groundRocks = [
      { x: 30, size: 2 },
      { x: 150, size: 1 },
      { x: 280, size: 3 },
      { x: 400, size: 2 },
      { x: 510, size: 1 }
    ];

    setGameState('playing');
  };

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;

    const tick = () => {
      const s = stateRef.current;

      // Maintain exact 2:1 aspect box inside standard scaled width
      if (canvas.width !== canvasVirtualWidth || canvas.height !== canvasVirtualHeight) {
        canvas.width = canvasVirtualWidth;
        canvas.height = canvasVirtualHeight;
      }

      // Dynamic day/night cycle colors
      // In Chrome, day/night cycles every 700 points, starting at 700 points and lasting for 200 points.
      const currentCycle = Math.floor(s.score / 700);
      const scoreWithinCycle = s.score % 700;
      const computedNight = s.score > 0 && currentCycle > 0 && scoreWithinCycle < 200;
      
      if (computedNight !== s.isNightMode) {
        s.isNightMode = computedNight;
        setIsNightMode(computedNight);
      }

      const activeBg = s.isNightMode ? '#202124' : '#ffffff';
      
      // Resolve element color based on manual system dark overlay preference and game night state
      const useBrightElements = s.isSystemDarkMode ? !s.isNightMode : s.isNightMode;
      const activeLineColor = useBrightElements ? '#e8eaed' : '#535353';
      const activeDinoColor = useBrightElements ? '#f1f1f1' : '#535353';
      const activeObstColor = useBrightElements ? '#dedede' : '#535353';
      const secondaryTextColor = useBrightElements ? '#9aa0a6' : '#9a9a9a';

      // Clean Canvas background
      ctx.clearRect(0, 0, canvasVirtualWidth, canvasVirtualHeight);

      // Handle custom screen Shake effect on collision
      ctx.save();
      if (s.screenShake > 0) {
        const dx = (Math.random() - 0.5) * s.screenShake;
        const dy = (Math.random() - 0.5) * s.screenShake;
        ctx.translate(dx, dy);
        s.screenShake *= 0.8;
        if (s.screenShake < 0.2) s.screenShake = 0;
      }

      // Update calculations only if playing
      if (s.gameState === 'playing') {
        s.frameCount++;

        // Increase speed smoothly over time/score increase
        s.gameSpeed = 6 + Math.min(8, s.score / 150);

        // Score ticks every 5 animation frames
        if (s.frameCount % 5 === 0) {
          s.score += 1;
          setScore(s.score);

          // Beep on multiples of 100 points
          if (s.score > 0 && s.score % 100 === 0) {
            playMilestoneSound();
            s.flashScoreTimer = 50; // flash score for several frames
          }
        }

        // Dino physics
        if (s.isJumping) {
          s.dinoY += s.dinoVy;
          s.dinoVy += 0.58; // gravity parameter for classic 150 height coordinates

          if (s.dinoY >= 0) {
            s.dinoY = 0;
            s.dinoVy = 0;
            s.isJumping = false;
          }
        }

        // Update background elements
        s.clouds.forEach(c => {
          c.x -= c.speed;
          if (c.x < -60) {
            c.x = canvasVirtualWidth + 20;
            c.y = 15 + Math.random() * 40;
          }
        });

        // Twinkle stars in night mode
        if (s.isNightMode) {
          s.stars.forEach(st => {
            st.x -= 0.1; // slide slowly
            if (st.x < -20) st.x = canvasVirtualWidth + 10;
            // cyclic twinkle brightness
            st.brightness = 0.5 + Math.abs(Math.sin(s.frameCount / 20)) * 0.8;
          });
        }

        s.groundRocks.forEach(r => {
          r.x -= s.gameSpeed;
          if (r.x < -20) {
            r.x = canvasVirtualWidth + 20;
          }
        });

        // Obstacles generator timer logic
        s.nextObstacleTimer--;
        if (s.nextObstacleTimer <= 0) {
          // Determine spawn candidates: Small Cactus, Large Cactus, Bird (increasing spawn rate by level)
          const currentLevel = Math.floor(s.score / 200) + 1;
          const allowPterodactyl = currentLevel >= 2;
          const choice = Math.random();

          let newOb: ObstacleType;

          // Birds (pterodactyls) become more frequent as level increases:
          // Level 2: 20% (choice > 0.8)
          // Level 3: 25% (choice > 0.75)
          // Level 4+: 35% (choice > 0.65)
          const birdThreshold = currentLevel === 2 ? 0.8 : (currentLevel === 3 ? 0.75 : 0.65);

          if (allowPterodactyl && choice > birdThreshold) {
            // flying pterodactyl
            // At Level 2, introduce low/medium altitudes so player gets used to jumping and ducking.
            // At Level 3+, add advanced high altitudes too.
            const altitudes = currentLevel === 2 ? [45, 65] : [45, 65, 95];
            const pickedY = altitudes[Math.floor(Math.random() * altitudes.length)];
            newOb = {
              x: canvasVirtualWidth,
              y: groundY - pickedY - 32,
              width: 64,
              height: 32,
              type: 'pterodactyl',
              pterodactylY: pickedY,
              frame: 0
            };
          } else if (choice > 0.45 || (!allowPterodactyl && choice > 0.5)) {
            // small cactus single or double combo
            const isDouble = Math.random() > 0.6;
            newOb = {
              x: canvasVirtualWidth,
              y: groundY - 50,
              width: isDouble ? 50 : 30,
              height: 50,
              type: 'cactus_small'
            };
          } else {
            // large cactus single or double combo
            const isDouble = Math.random() > 0.7;
            newOb = {
              x: canvasVirtualWidth,
              y: groundY - 58,
              width: isDouble ? 65 : 41,
              height: 58,
              type: 'cactus_large'
            };
          }

          s.obstacles.push(newOb);
          // Set minimum spacing between obstacles based on game speed limits to prevent unavoidable deaths
          s.nextObstacleTimer = 55 + Math.floor(Math.random() * 50) + Math.max(0, 30 - s.gameSpeed);
        }

        // Check active obstacles, move and handle collisions
        const survivingObs: ObstacleType[] = [];
        
        // Character bounds
        // Dino sprites have width ~16(duck:22) and height ~15(duck:9) scaled via pixelSize = 5.2
        const dPixelSize = 5.2;
        const dinoWidth = s.isDucking ? 22 * dPixelSize : 16 * dPixelSize;
        const dinoHeight = s.isDucking ? 9 * dPixelSize : 15 * dPixelSize;
        const dinoX = 50;
        const dinoActualY = groundY - dinoHeight + s.dinoY;

        s.obstacles.forEach(ob => {
          ob.x -= s.gameSpeed;

          if (ob.type === 'pterodactyl' && s.frameCount % 10 === 0) {
            ob.frame = ob.frame === 0 ? 1 : 0;
          }

          // Clean, forgiving hitboxes with custom vertical and horizontal insets so that ducking under birds is smooth and authentic.
          const dinoPaddingX = s.isDucking ? 16 : 12;
          const dinoPaddingY = s.isDucking ? 18 : 8; // Extra vertical forgiveness when ducking to easily go under birds
          
          const dinoHitX = dinoX + dinoPaddingX;
          const dinoHitWidth = Math.max(4, dinoWidth - dinoPaddingX * 2);
          const dinoHitY = dinoActualY + dinoPaddingY;
          const dinoHitHeight = Math.max(4, dinoHeight - dinoPaddingY * 2);

          const obPaddingX = ob.type === 'pterodactyl' ? 20 : 8; // Birds get more horizontal forgiveness
          const obPaddingY = ob.type === 'pterodactyl' ? 14 : 6; // Birds get more vertical forgiveness
          
          const obHitX = ob.x + obPaddingX;
          const obHitWidth = Math.max(4, ob.width - obPaddingX * 2);
          const obHitY = ob.y + obPaddingY;
          const obHitHeight = Math.max(4, ob.height - obPaddingY * 2);

          const isColliding = (
            dinoHitX < obHitX + obHitWidth &&
            dinoHitX + dinoHitWidth > obHitX &&
            dinoHitY < obHitY + obHitHeight &&
            dinoHitY + dinoHitHeight > obHitY
          );

          if (isColliding) {
            s.gameState = 'gameover';
            setGameState('gameover');
            s.screenShake = 6;
            playCrashSound();
            
            // Sync final highscore
            if (s.score > s.highScore) {
              s.highScore = s.score;
              setHighScore(s.score);
            }
          }

          if (ob.x + ob.width > 0) {
            survivingObs.push(ob);
          }
        });
        s.obstacles = survivingObs;
      }

      // ----------------- RENDER PROCESS -----------------
      
      // Disable shadows on canvas graphics
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw moon & stars if Night mode
      if (s.isNightMode) {
        // Draw moon
        drawPixelSprite(ctx, CONST_MOON, canvasVirtualWidth - 120, 15, 2.5, '#f1f1f1');

        // Draw stars
        s.stars.forEach(st => {
          ctx.save();
          ctx.globalAlpha = st.brightness;
          drawPixelSprite(ctx, CONST_STAR, st.x, st.y, 1.8, '#f1f1f1');
          ctx.restore();
        });
      }

      // Draw clouds
      s.clouds.forEach(c => {
        drawPixelSprite(ctx, CLOUD, c.x, c.y, c.size, s.isNightMode ? 'rgba(255,255,255,0.15)' : 'rgba(83,83,83,0.15)');
      });

      // Ground horizon line
      ctx.strokeStyle = activeLineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvasVirtualWidth, groundY);
      ctx.stroke();

      // Rocks sliding along ground
      s.groundRocks.forEach(rk => {
        ctx.fillStyle = activeLineColor;
        ctx.fillRect(rk.x, groundY + 3, rk.size * 2, 1.5);
        ctx.fillRect(rk.x + 6, groundY + 7, rk.size, 1.5);
      });

      // Draw obstacles (cacti or birds)
      s.obstacles.forEach(ob => {
        if (ob.type === 'cactus_small') {
          drawPixelSprite(ctx, CACTUS_SMALL, ob.x, ob.y, 5.0, activeObstColor);
          if (ob.width > 35) {
            // double small cactus offset
            drawPixelSprite(ctx, CACTUS_SMALL, ob.x + 25, ob.y + 2, 4.8, activeObstColor);
          }
        } else if (ob.type === 'cactus_large') {
          drawPixelSprite(ctx, CACTUS_LARGE, ob.x, ob.y, 4.5, activeObstColor);
          if (ob.width > 45) {
            // double composite cactus
            drawPixelSprite(ctx, CACTUS_LARGE, ob.x + 28, ob.y + 2, 4.2, activeObstColor);
          }
        } else if (ob.type === 'pterodactyl') {
          const frame = ob.frame === 0 ? BIRD_WINGS_UP : BIRD_WINGS_DOWN;
          drawPixelSprite(ctx, frame, ob.x, ob.y, 3.2, activeObstColor);
        }
      });

      // Render Dinosaur character
      const isStatic = s.gameState === 'idle';
      const isFootSwingFrame = s.frameCount % 10 < 5;
      const dPixelSize = 5.2;
      const dinoX = 50;
      const dinoHeight = s.isDucking ? 9 * dPixelSize : 15 * dPixelSize;
      const dinoActualY = groundY - dinoHeight + s.dinoY;

      let dinoSprite = DINO_STATIC;
      if (s.isDucking) {
        dinoSprite = isFootSwingFrame ? DINO_DUCK1 : DINO_DUCK2;
      } else if (s.isJumping || isStatic) {
        dinoSprite = DINO_STATIC;
      } else {
        dinoSprite = isFootSwingFrame ? DINO_RUN1 : DINO_RUN2;
      }

      drawPixelSprite(ctx, dinoSprite, dinoX, dinoActualY, dPixelSize, activeDinoColor);

      // Score flashing timer decrement
      if (s.flashScoreTimer > 0) s.flashScoreTimer--;

      // Draw Retro circular Reload controls & GAME OVER at center
      if (s.gameState === 'gameover') {
        ctx.textAlign = 'center';
        ctx.fillStyle = activeDinoColor;
        ctx.font = 'bold 15px "Courier New", Courier, monospace';
        ctx.fillText('G A M E   O V E R', canvasVirtualWidth / 2, 100);

        // Render circular reload arrow icon center screen
        drawPixelSprite(ctx, RELOAD_ICON, canvasVirtualWidth / 2 - 16, 125, 2.0, activeDinoColor);
      } else if (s.gameState === 'paused') {
        ctx.textAlign = 'center';
        ctx.fillStyle = activeDinoColor;
        ctx.font = 'bold 18px "Courier New", Courier, monospace';
        ctx.fillText('P A U S E D', canvasVirtualWidth / 2, 105);
        ctx.font = '11px "Courier New", Courier, monospace';
        ctx.fillText('PRESS ESC, P, OR CLICK TO RESUME', canvasVirtualWidth / 2, 135);
      }

      ctx.restore();
      ctx.restore(); // restore screenshake translate

      // request next anim frame
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If clicking on the pause button, let it handle its own event
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    const s = stateRef.current;
    if (s.gameState !== 'playing') {
      triggerJumpOrStart();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;

    // Left hand side (less than 50% width) bends the dino, Right hand side jumps
    if (relativeX < rect.width * 0.5) {
      setDucking(true);
    } else {
      triggerJumpOrStart();
    }
  };

  const handlePointerUpOrCancel = () => {
    setDucking(false);
  };

  return (
    <div className="w-full flex-grow flex flex-col">
      {/* Main Game rendering stage layout, interactions moved completely to the bottom */}
      <div 
        onMouseDown={(e) => {
          // If clicking on the pause button, let it handle its own event
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          const s = stateRef.current;
          if (s.gameState === 'gameover' || s.gameState === 'idle') {
            e.preventDefault();
            e.stopPropagation();
            triggerJumpOrStart();
          }
        }}
        onTouchStart={(e) => {
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          const s = stateRef.current;
          if (s.gameState === 'gameover' || s.gameState === 'idle') {
            e.preventDefault();
            e.stopPropagation();
            triggerJumpOrStart();
          }
        }}
        className="relative w-full overflow-hidden select-none outline-none group touch-none font-sans cursor-pointer"
      >
        {gameState !== 'gameover' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePause();
            }}
            onPointerDown={(e) => e.stopPropagation()} // Prevent triggering jump/duck when clicking pause button
            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-neutral-500/10 hover:bg-neutral-500/20 active:scale-95 transition-all text-current border-0 outline-none cursor-pointer flex items-center justify-center animate-fade-in"
            title={gameState === 'playing' ? 'Pause Game' : 'Play / Resume Game'}
          >
            {gameState === 'playing' ? (
              <Pause className="w-5 h-5 animate-scale-up" />
            ) : (
              <Play className="w-5 h-5 fill-current animate-scale-up" />
            )}
          </button>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-auto block max-w-full"
          style={{ aspectRatio: '600 / 260', imageRendering: 'pixelated' }}
        />
      </div>

      {/* Visual side-by-side Arcade Controller Division at the bottom of the screen */}
      <div className="w-full h-24 flex touch-none select-none relative z-10 border border-[#535353]/15 dark:border-white/15 rounded-xl overflow-hidden mt-3 bg-neutral-500/5">
        {/* Left Hand Side Button: Bend / Duck */}
        <div 
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const s = stateRef.current;
            if (s.gameState === 'playing') {
              setDucking(true);
            } else {
              triggerJumpOrStart();
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const s = stateRef.current;
            if (s.gameState === 'playing') {
              setDucking(true);
            } else {
              triggerJumpOrStart();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDucking(false);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDucking(false);
          }}
          onMouseLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDucking(false);
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDucking(false);
          }}
          className="w-1/2 h-full cursor-pointer bg-transparent flex flex-col justify-center items-center border-r border-[#535353]/15 dark:border-white/15 hover:bg-[#535353]/5 dark:hover:bg-white/5 active:bg-[#535353]/15 dark:active:bg-white/15 transition-all"
        >
          <div className="flex flex-col items-center justify-center gap-1.5 select-none pointer-events-none">
            <ArrowDown className="w-5 h-5 text-[#535353] dark:text-white opacity-85" />
            <span className="text-[11px] font-mono font-extrabold tracking-widest text-[#535353] dark:text-white uppercase">
              BEND / DUCK
            </span>
          </div>
        </div>

        {/* Right Hand Side Button: Jump / Start */}
        <div 
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerJumpOrStart();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerJumpOrStart();
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDucking(false);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDucking(false);
          }}
          className="w-1/2 h-full cursor-pointer bg-transparent flex flex-col justify-center items-center hover:bg-[#535353]/5 dark:hover:bg-white/5 active:bg-[#535353]/15 dark:active:bg-white/15 transition-all"
        >
          <div className="flex flex-col items-center justify-center gap-1.5 select-none pointer-events-none">
            <ArrowUp className="w-5 h-5 text-[#535353] dark:text-white opacity-85" />
            <span className="text-[11px] font-mono font-extrabold tracking-widest text-[#535353] dark:text-white uppercase">
              JUMP / START
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
