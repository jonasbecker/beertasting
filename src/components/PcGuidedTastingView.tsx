import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Beer as BeerIcon, 
  Trophy, 
  Shuffle, 
  ArrowRight, 
  RotateCcw, 
  Users, 
  Eye, 
  EyeOff, 
  Check, 
  Award, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  PartyPopper, 
  Camera,
  Coins,
  Sparkles,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { TournamentSession, Beer, Player, TastingRound, PlayerRoundRating, BeerStyle, PriceCategory } from '../types';
import { soundController } from '../utils/audio';
import { DEFAULT_SPANISH_BEERS } from '../data/spanishBeers';
import { BeerBottleVisual } from './BeerBottleVisual';

interface PcGuidedTastingViewProps {
  session: TournamentSession;
  onUpdateSession: (updated: TournamentSession) => void;
  onOpenCertificates?: () => void;
  onOpenScanner?: () => void;
}

type PcStep = 
  | 'WIZARD_SETUP'     // 1. Setup: Spieler & Biere festlegen
  | 'SECRET_POUR'      // 2. Geheim: Zapfmeister schenkt Flasche X ein, andere schauen weg
  | 'TASTING_INPUT'    // 3. Verkostung: Einer nach dem anderen in zufälliger Reihenfolge
  | 'REVEAL'           // 4. Auflösung: Trommelwirbel, echte Sorte, Punkte & Sieger
  | 'FINAL_PODIUM';    // 5. Großes Finale: Siegerehrung & Urkunden

const BEER_STYLES: { id: BeerStyle; label: string; desc: string; icon: string }[] = [
  { id: 'Lager', label: 'Lager / Helles', desc: 'Mild, süffig, goldgelb (Estrella Galicia, Steinburg)', icon: '🍺' },
  { id: 'Märzen / Amber', label: 'Märzen / Amber', desc: 'Röstmalz, rötlicher Schein (Turia Märzen)', icon: '🌾' },
  { id: 'Helles Bock', label: 'Bock / Starkbier', desc: 'Kräftig, malzbetont, edel (Alhambra 1925, 1906)', icon: '👑' },
  { id: 'Doble Malta', label: 'Doble Malta (7,2%)', desc: 'Wuchtiges Doppelmalz, intensiv (Voll-Damm)', icon: '💥' },
  { id: 'Pilsner', label: 'Pilsner (Herb)', desc: 'Hopfenbetont, spritzig, feinherb (Mahou 5 Estrellas)', icon: '🌿' },
  { id: 'Witbier / Weizen', label: 'Witbier / Weizen', desc: 'Zitrus, Koriander, trüb (Inedit Ferran Adrià)', icon: '🍊' },
  { id: 'IPA', label: 'IPA (Craft)', desc: 'Fruchtiger Aromahopfen, markant herb', icon: '⚡' },
  { id: 'Anderer Stil', label: 'Anderer Stil', desc: 'Dunkelbier, Porter oder Spezialbrauung', icon: '❓' }
];

const PRICE_CATEGORIES: { id: PriceCategory; label: string; sub: string; icon: string }[] = [
  { id: 'mercadona_budget', label: '38c Supermarkt', sub: 'Mercadona Steinburg Dose', icon: '🥫' },
  { id: 'classic_bar', label: '1,00 – 1,30 € Bar', sub: 'Klassische spanische Kneipe', icon: '🍻' },
  { id: 'premium_craft', label: '1,80 – 2,60 € Craft/Edel', sub: 'Alhambra 1925, Voll-Damm, Inedit', icon: '💎' }
];

export const PcGuidedTastingView: React.FC<PcGuidedTastingViewProps> = ({
  session,
  onUpdateSession,
  onOpenCertificates,
  onOpenScanner
}) => {
  // Current active step
  const [step, setStep] = useState<PcStep>(() => {
    if (session.isFinished) return 'FINAL_PODIUM';
    if (session.rounds.length === 0) return 'WIZARD_SETUP';
    const lastRound = session.rounds[session.rounds.length - 1];
    if (!lastRound.isCompleted) return 'TASTING_INPUT';
    if (session.rounds.length < session.beers.length) return 'SECRET_POUR';
    return 'FINAL_PODIUM';
  });

  // Current round index (0-based)
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(() => {
    if (session.rounds.length === 0) return 0;
    const lastIdx = session.rounds.length - 1;
    return session.rounds[lastIdx].isCompleted ? Math.min(lastIdx + 1, session.beers.length - 1) : lastIdx;
  });

  // Secret pour privacy veil
  const [isVeilOpen, setIsVeilOpen] = useState(false);

  // Pouring master (Zapfmeister)
  const [zapfmeisterMode, setZapfmeisterMode] = useState<'fixed' | 'rotating'>('rotating');
  const [fixedZapfmeisterId, setFixedZapfmeisterId] = useState<string>(session.players[0]?.id || 'player-1');

  // Turn management: Random player order for the round
  const [randomPlayerIds, setRandomPlayerIds] = useState<string[]>([]);
  const [currentPlayerTurnIdx, setCurrentPlayerTurnIdx] = useState<number>(0);
  const [isDrumrolling, setIsDrumrolling] = useState<boolean>(false);

  // Ratings store for the active round: player ID -> input
  const [currentRoundRatings, setCurrentRoundRatings] = useState<Record<string, {
    guessedStyle: BeerStyle;
    score: number; // 1 to 20
    guessedPrice: PriceCategory;
    isCompleted: boolean;
  }>>({});

  // Audio & mute state
  const [isMuted, setIsMuted] = useState(soundController.getIsMuted());

  // New player input in setup
  const [newPlayerName, setNewPlayerName] = useState('');

  // Fallback player in case session.players is empty
  const fallbackPlayer: Player = {
    id: 'player-default',
    name: 'Spieler',
    nickname: 'Sommelier',
    avatarEmoji: '🍺',
    totalPoints: 0,
    correctStyleGuesses: 0,
    totalGuesses: 0,
    matchedFlavorsCount: 0,
    fastestDrinkSeconds: null,
    averageRatingGiven: 0,
    beersTastedCount: 0,
    badges: []
  };

  // Determine who pours for the current round
  const activeZapfmeister = (() => {
    if (zapfmeisterMode === 'fixed') {
      return session.players.find(p => p.id === fixedZapfmeisterId) || session.players[0] || fallbackPlayer;
    }
    const idx = currentRoundIdx % Math.max(1, session.players.length);
    return session.players[idx] || session.players[0] || fallbackPlayer;
  })();

  // Current secret beer to pour (guaranteed non-null)
  const currentSecretBeer: Beer = session.beers[currentRoundIdx] || session.beers[0] || DEFAULT_SPANISH_BEERS[0];

  // Helper to shuffle array
  const shuffleArray = <T,>(arr: T[]): T[] => {
    return [...arr].sort(() => Math.random() - 0.5);
  };

  // When step changes to TASTING_INPUT, generate a new random turn order!
  const startTastingTurnPhase = () => {
    const playerIds = session.players.map(p => p.id);
    const randomized = shuffleArray(playerIds);
    setRandomPlayerIds(randomized.length > 0 ? randomized : playerIds);
    setCurrentPlayerTurnIdx(0);

    const initial: typeof currentRoundRatings = {};
    session.players.forEach(p => {
      initial[p.id] = {
        guessedStyle: 'Lager',
        score: 14, // default 14/20
        guessedPrice: 'classic_bar',
        isCompleted: false
      };
    });
    setCurrentRoundRatings(initial);
    setIsDrumrolling(false);
    setStep('TASTING_INPUT');
  };

  // Ensure queue is populated whenever entering TASTING_INPUT
  useEffect(() => {
    if (step === 'TASTING_INPUT') {
      if (randomPlayerIds.length === 0 || randomPlayerIds.length !== session.players.length) {
        startTastingTurnPhase();
      }
    }
  }, [step, session.players.length]);

  // Keyboard shortcut support (Space = Next/Reveal, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' && step === 'SECRET_POUR') {
        e.preventDefault();
        setIsVeilOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  const toggleMute = () => {
    const muted = soundController.toggleMute();
    setIsMuted(muted);
  };

  const fireFiestaConfetti = () => {
    confetti({
      particleCount: 90,
      spread: 110,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#E11D48', '#10B981', '#3B82F6', '#8B5CF6']
    });
  };

  // Setup handlers
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const avatars = ['🍺', '👑', '⚡', '🍷', '🐂', '🔥', '🌴', '😎', '🏆'];
    const randomAvatar = avatars[session.players.length % avatars.length];
    const newPlayer: Player = {
      id: 'player-' + Date.now(),
      name: newPlayerName.trim(),
      nickname: 'Sommelier',
      avatarEmoji: randomAvatar,
      totalPoints: 0,
      correctStyleGuesses: 0,
      totalGuesses: 0,
      matchedFlavorsCount: 0,
      fastestDrinkSeconds: null,
      averageRatingGiven: 0,
      beersTastedCount: 0,
      badges: ['Neuer Herausforderer']
    };
    onUpdateSession({
      ...session,
      players: [...session.players, newPlayer]
    });
    setNewPlayerName('');
    soundController.playBeerOpen();
  };

  const handleRemovePlayer = (id: string) => {
    if (session.players.length <= 2) {
      alert('Mindestens 2 Spieler werden für das Tasting benötigt!');
      return;
    }
    onUpdateSession({
      ...session,
      players: session.players.filter(p => p.id !== id)
    });
  };

  const handleShuffleBeers = () => {
    const shuffled = shuffleArray(session.beers);
    onUpdateSession({
      ...session,
      beers: shuffled,
      rounds: [],
      currentRoundIndex: 0
    });
    soundController.playBeerOpen();
    fireFiestaConfetti();
  };

  const handleStartTastingFromWizard = () => {
    if (session.players.length < 2) {
      alert('Bitte tragt mindestens 2 Spieler ein!');
      return;
    }
    if (session.beers.length < 2) {
      alert('Bitte wählt mindestens 2 Biere aus!');
      return;
    }

    soundController.playBeerOpen();
    setCurrentRoundIdx(0);
    setIsVeilOpen(false);
    setStep('SECRET_POUR');
  };

  const handleFinishedPouring = () => {
    soundController.playBeerOpen();
    setIsVeilOpen(false);
    startTastingTurnPhase();
  };

  // Turn management: Active player in random order
  const activePlayerId = randomPlayerIds[currentPlayerTurnIdx] || session.players[0]?.id || fallbackPlayer.id;
  const activePlayer = session.players.find(p => p.id === activePlayerId) || session.players[0] || fallbackPlayer;

  const currentActiveInput = currentRoundRatings[activePlayerId] || {
    guessedStyle: 'Lager',
    score: 14,
    guessedPrice: 'classic_bar',
    isCompleted: false
  };

  const handleUpdateActivePlayerInput = (field: 'guessedStyle' | 'score' | 'guessedPrice', value: any) => {
    setCurrentRoundRatings(prev => ({
      ...prev,
      [activePlayerId]: {
        ...(prev[activePlayerId] || {
          guessedStyle: 'Lager',
          score: 14,
          guessedPrice: 'classic_bar',
          isCompleted: false
        }),
        [field]: value
      }
    }));
  };

  const finalizeReveal = (ratingsToUse: Record<string, any>) => {
    try {
      soundController.playCheers();
    } catch (e) {
      console.warn('Audio cheers error:', e);
    }
    try {
      fireFiestaConfetti();
    } catch (e) {
      console.warn('Confetti error:', e);
    }

    const beerToReveal = currentSecretBeer || session.beers[currentRoundIdx] || session.beers[0] || DEFAULT_SPANISH_BEERS[0];

    // Compute round results and update player points
    const roundRatings: Record<string, PlayerRoundRating> = {};
    const updatedPlayers = session.players.map(player => {
      const ratingInput = ratingsToUse[player.id] || currentRoundRatings[player.id] || {
        guessedStyle: 'Lager',
        score: 14,
        guessedPrice: 'classic_bar',
        isCompleted: true
      };

      // Compare style and price
      const isStyleMatch = ratingInput.guessedStyle === beerToReveal.style;
      const isPriceMatch = ratingInput.guessedPrice === (beerToReveal.priceCategory || 'classic_bar');

      let pointsEarned = 0;
      if (isStyleMatch) pointsEarned += 100; // Correct style bonus
      if (isPriceMatch) pointsEarned += 25;  // Correct price category bonus

      const playerRatingRecord: PlayerRoundRating = {
        playerId: player.id,
        score: Number(ratingInput.score) || 14,
        guessedStyle: ratingInput.guessedStyle || 'Lager',
        guessedPriceCategory: ratingInput.guessedPrice || 'classic_bar',
        timeSeconds: 25,
        speedBonusPoints: 0,
        stylePoints: isStyleMatch ? 100 : 0,
        pricePoints: isPriceMatch ? 25 : 0,
        isPriceMatch,
        flavorPoints: 0,
        matchedFlavors: [],
        totalPointsEarned: pointsEarned,
        flavorTags: [],
        isHost: player.id === activeZapfmeister.id
      };

      roundRatings[player.id] = playerRatingRecord;

      const oldAvg = typeof player.averageRatingGiven === 'number' ? player.averageRatingGiven : 0;
      const oldCount = typeof player.beersTastedCount === 'number' ? player.beersTastedCount : 0;
      const roundScore = Number(ratingInput.score) || 14;

      return {
        ...player,
        totalPoints: (player.totalPoints || 0) + pointsEarned,
        correctStyleGuesses: (player.correctStyleGuesses || 0) + (isStyleMatch ? 1 : 0),
        correctPriceGuesses: (player.correctPriceGuesses || 0) + (isPriceMatch ? 1 : 0),
        totalGuesses: (player.totalGuesses || 0) + 1,
        beersTastedCount: oldCount + 1,
        averageRatingGiven: Math.round(((oldAvg * oldCount) + roundScore) / (oldCount + 1))
      };
    });

    const newRound: TastingRound = {
      roundNumber: currentRoundIdx + 1,
      secretBeerId: beerToReveal.id,
      hostPlayerId: activeZapfmeister.id,
      ratings: roundRatings,
      isCompleted: true,
      timestamp: Date.now()
    };

    const updatedRounds = [...session.rounds];
    updatedRounds[currentRoundIdx] = newRound;

    onUpdateSession({
      ...session,
      players: updatedPlayers,
      rounds: updatedRounds,
      currentRoundIndex: currentRoundIdx
    });

    setIsDrumrolling(false);
    setStep('REVEAL');
  };

  const handleTriggerReveal = (ratingsToUse?: Record<string, any>) => {
    const ratings = ratingsToUse || currentRoundRatings;
    setIsDrumrolling(true);

    try {
      soundController.playDrumroll();
    } catch (e) {
      console.warn('Audio drumroll error:', e);
    }

    setTimeout(() => {
      finalizeReveal(ratings);
    }, 1100);
  };

  // Next player or trigger reveal
  const handleConfirmPlayerTurn = () => {
    try {
      soundController.playBeerOpen();
    } catch (e) {
      console.warn('Audio beer open error:', e);
    }

    const currentInput = currentRoundRatings[activePlayerId] || {
      guessedStyle: 'Lager',
      score: 14,
      guessedPrice: 'classic_bar',
      isCompleted: true
    };

    const nextRatings = {
      ...currentRoundRatings,
      [activePlayerId]: {
        ...currentInput,
        isCompleted: true
      }
    };
    setCurrentRoundRatings(nextRatings);

    if (currentPlayerTurnIdx + 1 < randomPlayerIds.length) {
      // Advance to next random player
      setCurrentPlayerTurnIdx(prev => prev + 1);
    } else {
      // All players finished! Trigger big reveal!
      handleTriggerReveal(nextRatings);
    }
  };

  const handleProceedToNextRound = () => {
    const nextIdx = currentRoundIdx + 1;
    if (nextIdx >= session.beers.length) {
      try {
        soundController.playTada();
      } catch {}
      try {
        fireFiestaConfetti();
      } catch {}
      onUpdateSession({
        ...session,
        isFinished: true
      });
      setIsDrumrolling(false);
      setStep('FINAL_PODIUM');
    } else {
      setCurrentRoundIdx(nextIdx);
      setIsVeilOpen(false);
      setIsDrumrolling(false);
      setStep('SECRET_POUR');
    }
  };

  const handleRestartTasting = () => {
    if (window.confirm('Möchtest du das Tasting von vorne starten?')) {
      const resetPlayers = session.players.map(p => ({
        ...p,
        totalPoints: 0,
        correctStyleGuesses: 0,
        totalGuesses: 0,
        beersTastedCount: 0,
        averageRatingGiven: 0
      }));
      onUpdateSession({
        ...session,
        players: resetPlayers,
        rounds: [],
        currentRoundIndex: 0,
        isFinished: false
      });
      setCurrentRoundIdx(0);
      setIsVeilOpen(false);
      setStep('WIZARD_SETUP');
    }
  };

  // Helper for score badge
  const getScoreDescription = (score: number) => {
    if (score <= 4) return { label: 'Plörre 🤮', color: 'text-red-400 bg-red-500/10 border-red-500/30' };
    if (score <= 8) return { label: 'Unterdurchschnittlich 😐', color: 'text-amber-400/80 bg-amber-500/10 border-amber-500/20' };
    if (score <= 12) return { label: 'Solides Urlaubs-Bier 🍺', color: 'text-amber-300 bg-amber-500/20 border-amber-500/30' };
    if (score <= 16) return { label: 'Sehr lecker & süffig 😋', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' };
    return { label: 'Göttertrunk / Meisterwerk 👑', color: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40' };
  };

  // -------------------------------------------------------------
  // RENDER: WIZARD SETUP
  // -------------------------------------------------------------
  if (step === 'WIZARD_SETUP') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in text-stone-100">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-900/60 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold mb-2 border border-amber-500/30">
                🖥️ PC & Laptop Host-Modus • Reihum am Bildschirm
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Blind-Tasting Fiesta</span>
                <span className="text-amber-400">Xàbia</span>
              </h1>
              <p className="text-stone-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Einer schenkt geheim aus – danach kommt <strong>jeder Mitspieler in zufälliger Reihenfolge</strong> an den PC: 
                <strong>Bier-Sorte schätzen</strong>, <strong>Bewertung von 1 bis 20</strong> abgeben und die <strong>Preisklasse</strong> tippen!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white text-sm font-semibold flex items-center gap-2 transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                <span>{isMuted ? 'Ton an' : 'Sound aktiv'}</span>
              </button>
              {onOpenScanner && (
                <button
                  onClick={onOpenScanner}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm font-semibold flex items-center gap-2 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Foto-Scan (KI)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2 Setup Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Players */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">1</div>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    Wer trinkt mit? ({session.players.length} Spieler)
                  </h2>
                  <p className="text-xs text-stone-400">Jeder kommt in jeder Runde in zufälliger Reihenfolge an den PC</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {session.players.map((player) => (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-stone-800/80 border border-stone-700/60 hover:border-amber-500/40 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl">{player.avatarEmoji}</span>
                      <div className="truncate">
                        <div className="font-bold text-white text-sm truncate">{player.name}</div>
                        <div className="text-[11px] text-amber-400/80 truncate">{player.nickname || 'Sommelier'}</div>
                      </div>
                    </div>
                    {session.players.length > 2 && (
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 p-1 transition"
                        title="Entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add player */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Spielername..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleAddPlayer}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Hinzufügen</span>
                </button>
              </div>
            </div>

            {/* Zapfmeister Rule */}
            <div className="mt-6 pt-5 border-t border-stone-800">
              <label className="text-xs font-bold text-stone-400 block mb-2">Wer schenkt die Biere geheim ein?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setZapfmeisterMode('rotating')}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    zapfmeisterMode === 'rotating'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <div className="font-bold">🔄 Wechselt jede Runde</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Jede Runde schenkt ein anderer ein</div>
                </button>

                <button
                  onClick={() => setZapfmeisterMode('fixed')}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    zapfmeisterMode === 'fixed'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <div className="font-bold">👑 Fester Zapfmeister</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Eine feste Person bleibt Spielleiter</div>
                </button>
              </div>
            </div>
          </div>

          {/* Beer Lineup */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">2</div>
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <BeerIcon className="w-5 h-5 text-amber-400" />
                      Bier-Lineup ({session.beers.length} Runden)
                    </h2>
                    <p className="text-xs text-stone-400">Verkostet werden {session.beers.length} spanische Biere</p>
                  </div>
                </div>

                <button
                  onClick={handleShuffleBeers}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-amber-300 border border-stone-700 flex items-center gap-1.5 transition"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Mischen 🎲</span>
                </button>
              </div>

              {/* Beer cards */}
              <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                {session.beers.map((beer, idx) => (
                  <div
                    key={beer.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-800/80 border border-stone-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 flex items-center justify-center bg-stone-900/60 rounded-xl overflow-hidden shrink-0 border border-stone-700/40">
                        <BeerBottleVisual beer={beer} size="sm" showLabel={false} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{beer.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-700 text-amber-400 font-mono">#{idx + 1}</span>
                        </div>
                        <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                          <span className="text-amber-400/90 font-semibold">{beer.style}</span>
                          <span>•</span>
                          <span>{beer.abv}% vol</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-stone-700/60 text-amber-300 font-bold shrink-0">
                      {beer.priceEur ? `${beer.priceEur.toFixed(2)} €` : 'Spanien'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-stone-800 text-xs text-stone-400">
              💡 Tipp: Haltet die Flaschen im Kühlschrank oder einer Tasche versteckt!
            </div>
          </div>
        </div>

        {/* Start button */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={handleStartTastingFromWizard}
            className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black text-xl sm:text-2xl rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>TASTING JETZT STARTEN! 🚀</span>
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: SECRET POUR (DER GEHEIME ZAPFMEISTER)
  // -------------------------------------------------------------
  if (step === 'SECRET_POUR') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in text-stone-100">
        <div className="flex items-center justify-between bg-stone-900/80 border border-stone-800 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs uppercase tracking-wider">
              Runde {currentRoundIdx + 1} von {session.beers.length}
            </span>
            <span className="text-stone-400 text-sm font-semibold">• Blindprobe geheim einschenken</span>
          </div>
          <button
            onClick={handleRestartTasting}
            className="text-stone-500 hover:text-stone-300 text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Neustart</span>
          </button>
        </div>

        <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden">
          {!isVeilOpen ? (
            <div className="space-y-6 max-w-xl mx-auto py-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Lock className="w-10 h-10" />
              </div>

              <div>
                <div className="inline-block px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-black text-sm mb-3 animate-pulse">
                  🛑 BITTE ALLE WEGSCHAUEN!
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white">
                  Geheime Einschenk-Phase
                </h2>
                <p className="text-stone-300 text-base sm:text-lg mt-3 leading-relaxed">
                  Nur der Zapfmeister dieser Runde (<strong className="text-amber-400 text-xl font-bold">{activeZapfmeister.name} {activeZapfmeister.avatarEmoji}</strong>) 
                  darf jetzt auf den Bildschirm schauen!
                </p>
                <p className="text-stone-400 text-xs sm:text-sm mt-1">
                  Alle anderen drehen sich um und bereiten ihre Tasting-Gläser vor.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setIsVeilOpen(true);
                    try { soundController.playBeerOpen(); } catch {}
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 mx-auto transition transform hover:scale-105"
                >
                  <Eye className="w-5 h-5" />
                  <span>Ich bin {activeZapfmeister.name} – Bier aufdecken!</span>
                </button>
                <div className="text-stone-400 text-xs mt-2 font-medium">(Oder drücke die Leertaste)</div>

                <button
                  type="button"
                  onClick={handleFinishedPouring}
                  className="mt-4 text-xs font-semibold text-stone-400 hover:text-amber-400 underline decoration-stone-600 hover:decoration-amber-400 block mx-auto transition"
                >
                  Bier schon im Glas? ➔ Direkt zur Verkostung springen
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto animate-fade-in py-2">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-full px-4 py-1 w-fit mx-auto">
                <Unlock className="w-4 h-4" />
                <span>Zapfmeister-Sicht geöffnet</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-stone-900/60 border border-amber-500/30 rounded-3xl p-6">
                {currentSecretBeer && (
                  <div className="shrink-0 bg-stone-950/70 p-3 rounded-2xl border border-stone-800 shadow-inner">
                    <BeerBottleVisual beer={currentSecretBeer} size="md" />
                  </div>
                )}

                <div className="text-center sm:text-left">
                  <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                    Schenke jetzt heimlich ein:
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black text-white mt-1 text-amber-300">
                    {currentSecretBeer?.name}
                  </h1>
                  <div className="text-base text-stone-300 font-semibold mt-1">
                    {currentSecretBeer?.brewery} • {currentSecretBeer?.origin}
                  </div>
                  {currentSecretBeer?.servingTemp && (
                    <div className="text-xs text-amber-400/90 font-medium mt-1">
                      ❄️ Servier-Tipp: <strong>{currentSecretBeer.servingTemp}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-5 text-left grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-stone-400 font-semibold">Echte Sorte:</div>
                  <div className="font-black text-amber-300 text-base">{currentSecretBeer?.style}</div>
                </div>
                <div>
                  <div className="text-xs text-stone-400 font-semibold">Alkoholgehalt:</div>
                  <div className="font-bold text-white text-base">{currentSecretBeer?.abv}% vol</div>
                </div>
                <div>
                  <div className="text-xs text-stone-400 font-semibold">Preis im Laden:</div>
                  <div className="font-bold text-white text-base">ca. {currentSecretBeer?.priceEur?.toFixed(2)} €</div>
                </div>
                {currentSecretBeer?.description && (
                  <div className="sm:col-span-3 text-xs text-stone-300 border-t border-stone-800 pt-3">
                    <strong>Erkennungs-Tipp:</strong> {currentSecretBeer.description}
                  </div>
                )}
              </div>

              <div className="bg-amber-950/30 border border-amber-500/20 rounded-2xl p-4 text-sm text-stone-300 text-left space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <Check className="w-4 h-4" />
                  <span>Zapfmeister-Aufgabe für Runde {currentRoundIdx + 1}:</span>
                </div>
                <p>1. Hole Flasche/Dose <strong>{currentSecretBeer?.name}</strong> unbemerkt hervor.</p>
                <p>2. Schenke jedem Mitspieler einen Schluck in ihr <strong>Glas #{currentRoundIdx + 1}</strong>.</p>
                <p>3. Verstecke die Flasche/Dose wieder sicher vor neugierigen Blicken!</p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsVeilOpen(false)}
                  className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Wieder verdecken</span>
                </button>

                <button
                  onClick={handleFinishedPouring}
                  className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-stone-950 font-black text-lg rounded-2xl shadow-xl flex items-center gap-2 transition transform hover:scale-105"
                >
                  <span>Gläser sind voll! ➔ Runde starten!</span>
                  <ArrowRight className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: TASTING INPUT (EINER NACH DEM ANDEREN IN RANDOM REIHENFOLGE)
  // -------------------------------------------------------------
  if (step === 'TASTING_INPUT') {
    const isLastPlayer = currentPlayerTurnIdx + 1 === randomPlayerIds.length;
    const scoreInfo = getScoreDescription(currentActiveInput.score);

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in text-stone-100">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-stone-900 to-amber-950/40 border border-stone-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider">
              Runde {currentRoundIdx + 1} von {session.beers.length}
            </span>
            <span className="text-stone-300 font-bold text-sm">🍻 Reihum Verkostung</span>
          </div>

          <div className="text-xs text-stone-400">
            Eingeschenkt von: <strong className="text-amber-300">{activeZapfmeister.name}</strong>
          </div>
        </div>

        {/* Random Queue Indicator */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span>Zufällige Spieler-Reihenfolge dieser Runde:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {randomPlayerIds.map((pId, idx) => {
              const p = session.players.find(x => x.id === pId);
              if (!p) return null;
              const isCurrent = idx === currentPlayerTurnIdx;
              const isDone = idx < currentPlayerTurnIdx || currentRoundRatings[p.id]?.isCompleted;

              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setCurrentPlayerTurnIdx(idx)}
                  title={`Zu ${p.name} wechseln`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition ${
                    isCurrent
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-105'
                      : isDone
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50'
                      : 'bg-stone-800/60 text-stone-400 border-stone-700/60 hover:bg-stone-700/70 hover:text-stone-200'
                  }`}
                >
                  <span>{p.avatarEmoji}</span>
                  <span>{p.name}</span>
                  {isDone && <Check className="w-3.5 h-3.5" />}
                  {isCurrent && <span className="text-[10px] bg-stone-950 text-amber-400 px-1 rounded ml-1">DRAN</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Player Big Turn Card */}
        <div className="bg-stone-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Who is on screen */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-5">
            <div className="flex items-center gap-4">
              <span className="text-4xl sm:text-5xl">{activePlayer.avatarEmoji}</span>
              <div>
                <div className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Spieler {currentPlayerTurnIdx + 1} von {randomPlayerIds.length} ist dran:
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-0.5">
                  {activePlayer.name}
                </h2>
                <div className="text-xs text-stone-400 mt-0.5">
                  Bisherige Gesamtpunkte: <strong className="text-amber-300 font-bold">{activePlayer.totalPoints} Pkt</strong>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-stone-400 block font-medium">Glas #{currentRoundIdx + 1} probieren</span>
              <span className="text-xl font-black text-amber-400">Tipp abgeben</span>
            </div>
          </div>

          {/* 1. BEER STYLE GUESS (NICHT DAS BIER, SONDERN DIE SORTE!) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">1</span>
                <span>Welche Bier-Sorte ist das? (Stil tippen):</span>
              </label>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                +100 Punkte bei Treffer!
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BEER_STYLES.map((styleItem) => {
                const isSelected = currentActiveInput.guessedStyle === styleItem.id;
                return (
                  <button
                    key={styleItem.id}
                    type="button"
                    onClick={() => handleUpdateActivePlayerInput('guessedStyle', styleItem.id)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg ring-2 ring-amber-400/40 scale-[1.02]'
                        : 'bg-stone-800/80 text-stone-200 border-stone-700/80 hover:border-stone-500 hover:bg-stone-800'
                    }`}
                  >
                    <div>
                      <div className="text-xl mb-1">{styleItem.icon}</div>
                      <div className={`font-black text-sm leading-tight ${isSelected ? 'text-stone-950' : 'text-white'}`}>
                        {styleItem.label}
                      </div>
                    </div>
                    <div className={`text-[10px] mt-1.5 line-clamp-2 ${isSelected ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
                      {styleItem.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. RATING SCALE 1 TO 20 */}
          <div className="space-y-3 pt-3 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">2</span>
                <span>Deine Bewertung (1 bis 20 Punkte):</span>
              </label>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${scoreInfo.color}`}>
                  {scoreInfo.label}
                </span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {currentActiveInput.score} <span className="text-sm text-stone-400 font-sans">/ 20</span>
                </span>
              </div>
            </div>

            {/* Slider 1-20 */}
            <input
              type="range"
              min="1"
              max="20"
              value={currentActiveInput.score}
              onChange={(e) => handleUpdateActivePlayerInput('score', Number(e.target.value))}
              className="w-full accent-amber-500 h-3 bg-stone-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-stone-400 font-medium px-1">
              <span>1 (Plörre 🤮)</span>
              <span>10 (Geht so 😐)</span>
              <span>15 (Sehr gut 😋)</span>
              <span>20 (Göttertrunk 👑)</span>
            </div>
          </div>

          {/* 3. PRICE CATEGORY (GELD BLEIBT SO) */}
          <div className="space-y-3 pt-3 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">3</span>
                <span>Preisklasse schätzen (Geld):</span>
              </label>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                +25 Punkte bei Treffer!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRICE_CATEGORIES.map((cat) => {
                const isSelected = currentActiveInput.guessedPrice === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleUpdateActivePlayerInput('guessedPrice', cat.id)}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                        : 'bg-stone-800/80 text-stone-200 border-stone-700/80 hover:border-stone-500 hover:bg-stone-800'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <div className={`font-black text-sm ${isSelected ? 'text-stone-950' : 'text-white'}`}>
                        {cat.label}
                      </div>
                      <div className={`text-[11px] ${isSelected ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
                        {cat.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm Button & Direct Reveal Bypass */}
          <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => handleTriggerReveal()}
              className="text-xs font-bold text-stone-400 hover:text-amber-400 flex items-center gap-1.5 transition underline decoration-stone-600 hover:decoration-amber-400 py-1"
            >
              <span>⚡ Vorzeitig auflösen (Direkt zur Auflösung)</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              type="button"
              onClick={handleConfirmPlayerTurn}
              disabled={isDrumrolling}
              className={`w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 transition transform hover:scale-[1.02] active:scale-[0.98] ${
                isDrumrolling ? 'opacity-75 cursor-wait' : ''
              }`}
            >
              {isDrumrolling ? (
                <>
                  <span className="animate-spin text-xl">⏳</span>
                  <span>Trommelwirbel... Auflösung lädt! 🥁</span>
                </>
              ) : isLastPlayer ? (
                <>
                  <span>Alle fertig! ➔ ZUR AUFLÖSUNG! 🥁</span>
                  <PartyPopper className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span>Tipp von {activePlayer.name} speichern ➔ Weiter ({currentPlayerTurnIdx + 1}/{randomPlayerIds.length || session.players.length})</span>
                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: SUSPENSE DRUMROLL (TROMMELWIRBEL VOR DER AUFLÖSUNG)
  // -------------------------------------------------------------
  if (isDrumrolling) {
    return (
      <div className="w-full max-w-3xl mx-auto py-12 px-4 text-center space-y-8 animate-fade-in text-stone-100">
        <div className="bg-gradient-to-b from-stone-900 via-amber-950/40 to-stone-950 border-2 border-amber-500/60 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-5xl shadow-xl animate-bounce">
            🥁
          </div>
          <div>
            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-400 font-black text-xs uppercase tracking-wider mb-3">
              Runde {currentRoundIdx + 1} von {session.beers.length} • Alle Tipps abgegeben!
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              Trommelwirbel läuft...
            </h1>
            <p className="text-stone-300 text-base sm:text-lg mt-2 max-w-lg mx-auto">
              Wer am Tisch hat den richtigen Stil und Preis erkannt? Die Auflösung wird enthüllt!
            </p>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={() => finalizeReveal(currentRoundRatings)}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black text-base rounded-2xl shadow-lg flex items-center gap-2 transition transform hover:scale-105"
            >
              <span>⚡ Sofort aufdecken</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: REVEAL (DIE GROSSE ENTHÜLLUNG)
  // -------------------------------------------------------------
  if (step === 'REVEAL') {
    const correctStyleGuessers = session.players.filter(p => {
      const r = currentRoundRatings[p.id];
      return r && r.guessedStyle === currentSecretBeer?.style;
    });

    const correctPriceGuessers = session.players.filter(p => {
      const r = currentRoundRatings[p.id];
      return r && r.guessedPrice === currentSecretBeer?.priceCategory;
    });

    // Average rating (out of 20!)
    const scores = session.players.map(p => currentRoundRatings[p.id]?.score || 0);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';

    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in text-stone-100">
        {/* Banner with true identity & Visual Bottle */}
        <div className="bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-900/80 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            {/* Visual Bottle */}
            {currentSecretBeer && (
              <div className="shrink-0 bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-2xl flex items-center justify-center">
                <BeerBottleVisual beer={currentSecretBeer} size="lg" />
              </div>
            )}

            <div className="text-center md:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-2 border border-emerald-500/40">
                🎉 Runde {currentRoundIdx + 1} Aufgelöst!
              </div>

              <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                In euren Gläsern war:
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-white mt-1 text-amber-300 drop-shadow-md">
                {currentSecretBeer?.name}
              </h1>

              {/* Style Highlight */}
              <div className="mt-2.5 inline-block px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-base">
                Echter Stil / Sorte: <span className="underline decoration-amber-400 decoration-2">{currentSecretBeer?.style}</span>
              </div>

              <div className="text-base sm:text-lg font-bold text-stone-200 mt-2 flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                <span>{currentSecretBeer?.brewery}</span>
                <span>•</span>
                <span>{currentSecretBeer?.abv}% vol</span>
                {currentSecretBeer?.ibu && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300 font-mono text-sm">{currentSecretBeer.ibu} IBU</span>
                  </>
                )}
                <span>•</span>
                <span className="text-emerald-400 font-extrabold">ca. {currentSecretBeer?.priceEur?.toFixed(2)} €</span>
              </div>

              {/* Food pairings & serving temp */}
              <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2">
                {currentSecretBeer?.servingTemp && (
                  <span className="px-3 py-1 rounded-lg bg-stone-800/90 text-stone-300 text-xs font-medium border border-stone-700">
                    ❄️ {currentSecretBeer.servingTemp}
                  </span>
                )}
                {currentSecretBeer?.foodPairings?.map((food, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
                    🥘 {food}
                  </span>
                ))}
              </div>

              {currentSecretBeer?.trivia && (
                <div className="mt-3.5 p-3 rounded-2xl bg-black/40 border border-stone-800 text-stone-300 text-sm italic">
                  „{currentSecretBeer.trivia}“
                </div>
              )}

              <div className="mt-3.5 inline-block px-5 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm">
                Euer Notenschnitt am Tisch: <strong>{avgScore} / 20 Punkte ⭐</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Players results breakdown */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Ergebnisse Runde {currentRoundIdx + 1}: Wer hat die Sorte & den Preis erkannt?</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {session.players.map(player => {
              const r = currentRoundRatings[player.id];
              const isStyleCorrect = r && r.guessedStyle === currentSecretBeer?.style;
              const isPriceCorrect = r && r.guessedPrice === currentSecretBeer?.priceCategory;

              return (
                <div 
                  key={player.id}
                  className={`p-4 rounded-2xl border transition ${
                    isStyleCorrect
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-stone-800/70 border-stone-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-bold text-white text-base">
                      <span>{player.avatarEmoji}</span>
                      <span>{player.name}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300 text-sm">{r?.score || 0}/20 Pkt</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Tipp Sorte:</span>
                      <span className={`font-bold flex items-center gap-1 ${isStyleCorrect ? 'text-emerald-400' : 'text-stone-300'}`}>
                        {r?.guessedStyle}
                        {isStyleCorrect ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : '❌'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Tipp Preis:</span>
                      <span className={`font-bold ${isPriceCorrect ? 'text-emerald-400' : 'text-stone-400'}`}>
                        {r?.guessedPrice === 'mercadona_budget' ? '38c Dose' : r?.guessedPrice === 'classic_bar' ? '1€ Bar' : '2€+ Edel'}
                        {isPriceCorrect ? ' ✅' : ''}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-stone-700/40 flex justify-between font-black text-amber-400">
                      <span>Runden-Gewinn:</span>
                      <span>+{(isStyleCorrect ? 100 : 0) + (isPriceCorrect ? 25 : 0)} Pkt</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Scoreboard Table */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-black text-white flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Aktuelle Gesamtwertung nach Runde {currentRoundIdx + 1}</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...session.players]
              .sort((a, b) => b.totalPoints - a.totalPoints)
              .map((p, rank) => (
                <div key={p.id} className="p-3 rounded-2xl bg-stone-800/60 border border-stone-700/60 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                    rank === 0 ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-700 text-stone-300'
                  }`}>
                    #{rank + 1}
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="font-bold text-white text-sm truncate">{p.name} {p.avatarEmoji}</div>
                    <div className="text-xs text-amber-400 font-extrabold">{p.totalPoints} Punkte</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Next Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleProceedToNextRound}
            className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black text-xl rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>
              {currentRoundIdx + 1 >= session.beers.length
                ? 'ZUM GROSSEN FINALE! 🏆'
                : `WEITER ZU RUNDE ${currentRoundIdx + 2} ➔`}
            </span>
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: FINAL PODIUM
  // -------------------------------------------------------------
  if (step === 'FINAL_PODIUM') {
    const sortedPlayers = [...session.players].sort((a, b) => b.totalPoints - a.totalPoints);
    const winner = sortedPlayers[0];
    const second = sortedPlayers[1];
    const third = sortedPlayers[2];
    const lastPlace = sortedPlayers[sortedPlayers.length - 1];

    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in text-stone-100 py-4">
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 border-2 border-amber-500 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider mb-4">
            🏆 SIEGEREHRUNG • COSTA BLANCA 2026
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            Sommelier de Xàbia 👑
          </h1>
          <p className="text-stone-300 text-base sm:text-lg mt-2 max-w-xl mx-auto">
            Alle Runden wurden blind verkostet! Der Sieger mit dem feinsten Gaumen am Tisch steht fest!
          </p>

          {winner && (
            <div className="mt-8 p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-400 max-w-md mx-auto shadow-2xl">
              <span className="text-6xl mb-2 block">{winner.avatarEmoji}</span>
              <div className="text-xs uppercase font-extrabold text-amber-400">1. Platz & Großmeister</div>
              <h2 className="text-3xl font-black text-white mt-1">{winner.name}</h2>
              <div className="text-2xl font-black text-amber-400 mt-1">{winner.totalPoints} Punkte</div>
              <div className="text-xs text-stone-300 mt-2 font-medium">
                {winner.correctStyleGuesses} von {session.beers.length} Bier-Sorten richtig erkannt!
              </div>
            </div>
          )}
        </div>

        {/* Podium */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {second && (
            <div className="p-6 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-4xl">{second.avatarEmoji}</span>
                <div className="text-xs font-bold text-stone-400 uppercase mt-2">2. Platz • Silber 🥈</div>
                <h3 className="text-xl font-bold text-white mt-1">{second.name}</h3>
                <div className="text-lg font-black text-amber-400 mt-1">{second.totalPoints} Pkt</div>
              </div>
            </div>
          )}

          {winner && (
            <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 to-stone-900 border-2 border-amber-500/60 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-4xl">{winner.avatarEmoji}</span>
                <div className="text-xs font-bold text-amber-400 uppercase mt-2">1. Platz • Gold 🥇</div>
                <h3 className="text-xl font-black text-white mt-1">{winner.name}</h3>
                <div className="text-lg font-black text-amber-400 mt-1">{winner.totalPoints} Pkt</div>
              </div>
            </div>
          )}

          {third && (
            <div className="p-6 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-4xl">{third.avatarEmoji}</span>
                <div className="text-xs font-bold text-stone-400 uppercase mt-2">3. Platz • Bronze 🥉</div>
                <h3 className="text-xl font-bold text-white mt-1">{third.name}</h3>
                <div className="text-lg font-black text-amber-400 mt-1">{third.totalPoints} Pkt</div>
              </div>
            </div>
          )}
        </div>

        {/* Special Award */}
        {lastPlace && lastPlace.id !== winner?.id && (
          <div className="bg-stone-900/80 border border-red-500/30 rounded-3xl p-6 shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🚨</span>
              <div>
                <div className="text-xs font-bold text-red-400 uppercase">Ehrentitel des Abends</div>
                <h4 className="text-lg font-black text-white">
                  Offizieller Bier-Banause von Xàbia: <span className="text-amber-300">{lastPlace.name}</span>
                </h4>
                <p className="text-xs text-stone-400">
                  Hat mit {lastPlace.totalPoints} Punkten den mutigsten (oder verwirrtesten) Gaumen bewiesen. Trinkt zur Strafe das nächste Wasser!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {onOpenCertificates && (
            <button
              onClick={onOpenCertificates}
              className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2 transition"
            >
              <Award className="w-5 h-5" />
              <span>Urkunden mit Gruppen-Polaroid drucken</span>
            </button>
          )}

          <button
            onClick={handleRestartTasting}
            className="w-full sm:w-auto px-8 py-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-base rounded-2xl border border-stone-700 flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Neues Tasting starten</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
