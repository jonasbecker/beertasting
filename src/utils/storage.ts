import { TournamentSession, Player, Beer, AccentColor } from '../types';
import { DEFAULT_SPANISH_BEERS } from '../data/spanishBeers';

const STORAGE_KEY = 'cerveza_xabia_tasting_session_v3_18beers';

export const DEFAULT_PLAYERS: Player[] = [
  {
    id: 'player-1',
    name: 'Jonas',
    nickname: 'El Capitán',
    avatarEmoji: '👑',
    totalPoints: 0,
    correctStyleGuesses: 0,
    totalGuesses: 0,
    matchedFlavorsCount: 0,
    fastestDrinkSeconds: null,
    averageRatingGiven: 0,
    beersTastedCount: 0,
    badges: ['Kapitän']
  },
  {
    id: 'player-2',
    name: 'Alex',
    nickname: 'Der Sommelier',
    avatarEmoji: '🍷',
    totalPoints: 0,
    correctStyleGuesses: 0,
    totalGuesses: 0,
    matchedFlavorsCount: 0,
    fastestDrinkSeconds: null,
    averageRatingGiven: 0,
    beersTastedCount: 0,
    badges: ['Feiner Gaumen']
  },
  {
    id: 'player-3',
    name: 'Felix',
    nickname: 'Der Zischer',
    avatarEmoji: '⚡',
    totalPoints: 0,
    correctStyleGuesses: 0,
    totalGuesses: 0,
    matchedFlavorsCount: 0,
    fastestDrinkSeconds: null,
    averageRatingGiven: 0,
    beersTastedCount: 0,
    badges: ['Speed-Trinker']
  },
  {
    id: 'player-4',
    name: 'Moritz',
    nickname: 'El Toro',
    avatarEmoji: '🐂',
    totalPoints: 0,
    correctStyleGuesses: 0,
    totalGuesses: 0,
    matchedFlavorsCount: 0,
    fastestDrinkSeconds: null,
    averageRatingGiven: 0,
    beersTastedCount: 0,
    badges: ['Märzen-Fan']
  }
];

export function createInitialSession(): TournamentSession {
  return {
    id: 'session-' + Date.now(),
    title: 'Xàbia Boys Blind Tasting',
    location: 'Xàbia / Jávea',
    date: new Date().toISOString().split('T')[0],
    partyMode: 'fiesta_standard',
    players: DEFAULT_PLAYERS,
    beers: DEFAULT_SPANISH_BEERS,
    rounds: [],
    currentRoundIndex: 0,
    isFinished: false,
    accentColor: 'amber'
  };
}

export function loadSavedSession(): TournamentSession {
  if (typeof window === 'undefined') return createInitialSession();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSession();
    const parsed = JSON.parse(raw) as TournamentSession;
    if (!parsed.players || parsed.players.length === 0) {
      return createInitialSession();
    }
    return parsed;
  } catch (err) {
    console.error('Error loading session from localStorage:', err);
    return createInitialSession();
  }
}

export function saveSession(session: TournamentSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Error saving session to localStorage:', err);
  }
}

export function exportSessionAsJSON(session: TournamentSession): void {
  const jsonStr = JSON.stringify(session, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cerveza-xabia-tasting-${session.date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function createSyncCode(session: TournamentSession): string {
  try {
    const jsonStr = JSON.stringify(session);
    return btoa(encodeURIComponent(jsonStr));
  } catch (err) {
    console.error('Error creating sync code', err);
    return '';
  }
}

export function restoreSessionFromSyncCode(code: string): TournamentSession | null {
  try {
    const jsonStr = decodeURIComponent(atob(code.trim()));
    const parsed = JSON.parse(jsonStr) as TournamentSession;
    if (parsed && parsed.players && parsed.beers) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse sync code', err);
  }
  return null;
}
