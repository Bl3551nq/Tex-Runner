export interface GameStats {
  highScore: number;
  totalDistance: number;
  jumpsCount: number;
  playCount: number;
}

export interface ScoreRecord {
  name: string;
  score: number;
  date: string;
  character: string;
  difficulty: string;
}

export type ThemeType = 'classic' | 'cyberpunk' | 'matrix' | 'sunset';

export interface GameTheme {
  id: ThemeType;
  name: string;
  background: string;
  canvasBg: string;
  accent: string;
  dinoColor: string;
  obstacleColor: string;
  textColor: string;
  cardBg: string;
  buttonActiveBg: string;
}

export type CharacterType = 'dino' | 'kitty' | 'bot';

export interface CharacterConfig {
  id: CharacterType;
  name: string;
  desc: string;
  jumpForce: number;
  gravity: number;
  icon: string;
  color: string;
}

export type DifficultySettings = 'normal' | 'fast' | 'hyper';

export interface ObstacleType {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cactus_small' | 'cactus_large' | 'pterodactyl';
  pterodactylY?: number;
  frame?: number;
}

export interface CloudType {
  x: number;
  y: number;
  speed: number;
  size: number;
}

export interface ParticleType {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}
