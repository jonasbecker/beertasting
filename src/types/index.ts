export type AccentColor = 'amber' | 'sunset' | 'emerald' | 'cyan';

export type BeerStyle = 
  | 'Lager'
  | 'Märzen / Amber'
  | 'Pilsner'
  | 'Helles Bock'
  | 'Doble Malta'
  | 'IPA'
  | 'Witbier / Weizen'
  | 'Anderer Stil';

export interface Beer {
  id: string;
  name: string;
  brewery: string;
  origin: string;
  style: BeerStyle;
  abv: number;
  description: string;
  flavorProfile: string[]; // e.g. ['Malzig', 'Karamell', 'Hopfig-Herb']
  trivia?: string;
  colorHex?: string;
  notes?: string;
}

export interface Player {
  id: string;
  name: string;
  nickname: string;
  avatarEmoji: string;
  totalPoints: number;
  correctStyleGuesses: number;
  totalGuesses: number;
  matchedFlavorsCount: number;
  fastestDrinkSeconds: number | null;
  averageRatingGiven: number;
  beersTastedCount: number;
  badges: string[];
}

export interface PlayerRoundRating {
  playerId: string;
  score: number; // 1 to 20
  guessedStyle?: BeerStyle;
  timeSeconds: number; // Drinking & deciding time
  speedBonusPoints: number;
  stylePoints: number;
  flavorPoints: number; // +10 pts per matched flavor
  matchedFlavors: string[];
  totalPointsEarned: number;
  flavorTags: string[];
  isHost: boolean;
}

export interface TastingRound {
  roundNumber: number;
  secretBeerId: string;
  hostPlayerId: string;
  ratings: Record<string, PlayerRoundRating>;
  isCompleted: boolean;
  minigamePlayed?: string;
  timestamp: number;
}

export type PartyModeId = 
  | 'fiesta_standard' 
  | 'sommelier_pro' 
  | 'speedrun_xabia' 
  | 'penalty_shots';

export interface PartyMode {
  id: PartyModeId;
  name: string;
  description: string;
  speedBonusActive: boolean;
  maxSpeedBonus: number;
  speedCutoffSeconds: number;
  styleAccuracyPoints: number; // e.g. 50 pts
  flavorMatchPoints: number; // 10 pts per matching tag
  penaltySipsOnWrongGuess: number;
  tagline: string;
}

export interface Minigame {
  id: string;
  title: string;
  category: 'Verbal' | 'Reaktion' | 'Wissen' | 'Trinkspiel';
  durationMinutes: number;
  shortDescription: string;
  instructions: string[];
  penalty: string;
  tagline: string;
}

export interface TournamentSession {
  id: string;
  title: string;
  location: string;
  date: string;
  partyMode: PartyModeId;
  players: Player[];
  beers: Beer[];
  rounds: TastingRound[];
  currentRoundIndex: number;
  isFinished: boolean;
  accentColor: AccentColor;
  playMode?: 'single_screen' | 'multiplayer';
  roomCode?: string;
}

export type MultiplayerStage = 
  | 'LOBBY'
  | 'POURING'
  | 'TASTING'
  | 'PRE_REVEAL'
  | 'DRUMROLL'
  | 'REVEAL'
  | 'MINIGAME'
  | 'FINAL';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  nickname: string;
  avatarEmoji: string;
  isHost: boolean;
  hasSubmitted: boolean;
}

export interface MultiplayerRoom {
  code: string;
  hostId: string;
  stage: MultiplayerStage;
  currentBeerIndex: number;
  players: MultiplayerPlayer[];
  currentRoundRatings: Record<string, PlayerRoundRating>;
  session: TournamentSession;
  currentMinigame?: {
    title: string;
    subtitle: string;
    description: string;
    prompt?: string;
    bgClass: string;
    buttonText: string;
  };
}
