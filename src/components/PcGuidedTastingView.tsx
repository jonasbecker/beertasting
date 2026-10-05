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
  Sparkles, 
  Award, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  HelpCircle,
  Plus,
  Trash2,
  Lock,
  Unlock,
  GlassWater,
  PartyPopper,
  Camera
} from 'lucide-react';
import { TournamentSession, Beer, Player, TastingRound, PlayerRoundRating, BeerStyle, PriceCategory } from '../types';
import { soundController } from '../utils/audio';
import { DEFAULT_SPANISH_BEERS } from '../data/spanishBeers';
import { ElHidratadorModal } from './ElHidratadorModal';

interface PcGuidedTastingViewProps {
  session: TournamentSession;
  onUpdateSession: (updated: TournamentSession) => void;
  onOpenCertificates?: () => void;
  onOpenScanner?: () => void;
}

type PcStep = 
  | 'WIZARD_SETUP'     // 1. Setup: Spieler & Biere festlegen
  | 'SECRET_POUR'      // 2. Geheim: Zapfmeister schenkt Flasche X ein, andere schauen weg
  | 'TASTING_INPUT'    // 3. Verkostung: Alle probieren & geben Tipps am PC ab
  | 'REVEAL'           // 4. Auflösung: Trommelwirbel, echtes Bier, Punkte & Banausen
  | 'HIDRATADOR_PAUSE' // 5. Wasser- & Tapas-Pause nach Runde 3
  | 'FINAL_PODIUM';    // 6. Großes Finale: Siegerehrung & Urkunden

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

  // Temporary player ratings for the currently active round
  const [currentRoundRatings, setCurrentRoundRatings] = useState<Record<string, {
    guessedBeerId: string;
    score: number; // 1 to 10
    guessedPrice: PriceCategory;
    isReady: boolean;
  }>>({});

  // Sound & Mute state
  const [isMuted, setIsMuted] = useState(soundController.getIsMuted());

  // Hidratador modal
  const [showHidratador, setShowHidratador] = useState(false);

  // New player input
  const [newPlayerName, setNewPlayerName] = useState('');

  // Selected beer list for tasting
  const [selectedBeerIds, setSelectedBeerIds] = useState<string[]>(() => {
    return session.beers.map(b => b.id);
  });

  // Determine who pours for the current round
  const activeZapfmeister = (() => {
    if (zapfmeisterMode === 'fixed') {
      return session.players.find(p => p.id === fixedZapfmeisterId) || session.players[0];
    }
    const idx = currentRoundIdx % Math.max(1, session.players.length);
    return session.players[idx] || session.players[0];
  })();

  // Current secret beer to pour
  const currentSecretBeer: Beer | undefined = session.beers[currentRoundIdx];

  // Initialize round ratings when entering tasting phase
  useEffect(() => {
    if (step === 'TASTING_INPUT') {
      const initial: typeof currentRoundRatings = {};
      session.players.forEach(p => {
        initial[p.id] = {
          guessedBeerId: session.beers[0]?.id || '',
          score: 8,
          guessedPrice: 'classic_bar',
          isReady: false
        };
      });
      setCurrentRoundRatings(initial);
    }
  }, [step, currentRoundIdx, session.players]);

  // Audio mute toggle
  const toggleMute = () => {
    const muted = soundController.toggleMute();
    setIsMuted(muted);
  };

  // Keyboard shortcut support (Space = Next, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing
      }
      if (e.code === 'Space' && step === 'SECRET_POUR') {
        e.preventDefault();
        setIsVeilOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  // Helper: Trigger confetti
  const fireFiestaConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#E11D48', '#10B981', '#3B82F6', '#8B5CF6']
    });
  };

  // -------------------------------------------------------------
  // HANDLERS FOR WIZARD SETUP
  // -------------------------------------------------------------
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
    const shuffled = [...session.beers].sort(() => Math.random() - 0.5);
    onUpdateSession({
      ...session,
      beers: shuffled,
      rounds: [],
      currentRoundIndex: 0
    });
    setSelectedBeerIds(shuffled.map(b => b.id));
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

  // -------------------------------------------------------------
  // HANDLERS FOR SECRET POUR
  // -------------------------------------------------------------
  const handleFinishedPouring = () => {
    soundController.playBeerOpen();
    setIsVeilOpen(false);
    setStep('TASTING_INPUT');
  };

  // -------------------------------------------------------------
  // HANDLERS FOR TASTING INPUT (ALL PLAYERS ON SCREEN)
  // -------------------------------------------------------------
  const handlePlayerRatingChange = (
    playerId: string, 
    field: 'guessedBeerId' | 'score' | 'guessedPrice' | 'isReady', 
    value: any
  ) => {
    setCurrentRoundRatings(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }));
  };

  const allPlayersReady = session.players.length > 0 && session.players.every(
    p => currentRoundRatings[p.id]?.isReady
  );

  const handleTriggerReveal = () => {
    if (!currentSecretBeer) return;

    soundController.playDrumroll();

    setTimeout(() => {
      soundController.playCheers();
      fireFiestaConfetti();

      // Compute round results and update player points
      const roundRatings: Record<string, PlayerRoundRating> = {};
      const updatedPlayers = session.players.map(player => {
        const ratingInput = currentRoundRatings[player.id];
        if (!ratingInput) return player;

        // Check if guess matches the actual beer
        const isCorrectBeer = ratingInput.guessedBeerId === currentSecretBeer.id;
        const guessedBeerObj = session.beers.find(b => b.id === ratingInput.guessedBeerId);
        const isCorrectStyle = guessedBeerObj?.style === currentSecretBeer.style;
        const isCorrectPrice = ratingInput.guessedPrice === currentSecretBeer.priceCategory;

        let pointsEarned = 0;
        if (isCorrectBeer) pointsEarned += 100; // Big bonus for exact beer
        else if (isCorrectStyle) pointsEarned += 40; // Partial bonus for correct style

        if (isCorrectPrice) pointsEarned += 20;

        const playerRatingRecord: PlayerRoundRating = {
          playerId: player.id,
          score: ratingInput.score * 2, // scale 1-10 to 1-20
          guessedStyle: guessedBeerObj?.style || 'Lager',
          guessedPriceCategory: ratingInput.guessedPrice,
          timeSeconds: 30,
          speedBonusPoints: 0,
          stylePoints: isCorrectBeer ? 100 : (isCorrectStyle ? 40 : 0),
          pricePoints: isCorrectPrice ? 20 : 0,
          isPriceMatch: isCorrectPrice,
          flavorPoints: 0,
          matchedFlavors: [],
          totalPointsEarned: pointsEarned,
          flavorTags: [],
          isHost: player.id === activeZapfmeister.id
        };

        roundRatings[player.id] = playerRatingRecord;

        return {
          ...player,
          totalPoints: player.totalPoints + pointsEarned,
          correctStyleGuesses: player.correctStyleGuesses + (isCorrectBeer || isCorrectStyle ? 1 : 0),
          totalGuesses: player.totalGuesses + 1,
          beersTastedCount: player.beersTastedCount + 1,
          averageRatingGiven: Math.round(((player.averageRatingGiven * player.beersTastedCount) + (ratingInput.score * 2)) / (player.beersTastedCount + 1))
        };
      });

      const newRound: TastingRound = {
        roundNumber: currentRoundIdx + 1,
        secretBeerId: currentSecretBeer.id,
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

      setStep('REVEAL');
    }, 1800);
  };

  // -------------------------------------------------------------
  // HANDLERS FOR REVEAL & NEXT ROUND
  // -------------------------------------------------------------
  const handleProceedToNextRound = () => {
    // Check if we should insert El Hidratador pause (after round 3)
    if (currentRoundIdx === 2 && !showHidratador) {
      setShowHidratador(true);
      return;
    }

    const nextIdx = currentRoundIdx + 1;
    if (nextIdx >= session.beers.length) {
      // Tasting completed!
      soundController.playTada();
      fireFiestaConfetti();
      onUpdateSession({
        ...session,
        isFinished: true
      });
      setStep('FINAL_PODIUM');
    } else {
      setCurrentRoundIdx(nextIdx);
      setIsVeilOpen(false);
      setStep('SECRET_POUR');
    }
  };

  const handleRestartTasting = () => {
    if (window.confirm('Möchtest du das Tasting wirklich von vorne starten?')) {
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

  // -------------------------------------------------------------
  // RENDER: WIZARD SETUP (SCHRITT 1: VORBEREITUNG)
  // -------------------------------------------------------------
  if (step === 'WIZARD_SETUP') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in text-stone-100">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-900/60 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none text-9xl">🍻</div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold mb-2 border border-amber-500/30">
                🖥️ PC & Laptop Host-Modus • Alle an einem Bildschirm
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span>Blind-Tasting Fiesta</span>
                <span className="text-amber-400">Xàbia</span>
              </h1>
              <p className="text-stone-300 text-sm sm:text-base mt-2 max-w-2xl">
                Der Bildschirm führt euch automatisch Schritt für Schritt durch das Tasting. 
                Einer schenkt geheim ein – alle probieren, tippen am Bildschirm und am Ende krönen wir den <strong>Sommelier von Xàbia</strong>!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white text-sm font-medium flex items-center gap-2 transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                <span>{isMuted ? 'Ton an' : 'Sound aktiv'}</span>
              </button>
              {onOpenScanner && (
                <button
                  onClick={onOpenScanner}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm font-medium flex items-center gap-2 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Foto-Scan (KI)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Setup Columns: Players & Beers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Die Spieler */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">1</div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      Wer trinkt mit?
                    </h2>
                    <p className="text-xs text-stone-400">Trage alle Mitspieler am Tisch ein ({session.players.length} Spieler)</p>
                  </div>
                </div>
              </div>

              {/* Player list tags */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-4">
                {session.players.map((player, idx) => (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-stone-800/80 border border-stone-700/60 hover:border-amber-500/40 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{player.avatarEmoji}</span>
                      <div className="truncate">
                        <div className="font-bold text-stone-100 text-sm truncate">{player.name}</div>
                        <div className="text-xs text-amber-400/80 truncate">{player.nickname || 'Taster'}</div>
                      </div>
                    </div>
                    {session.players.length > 2 && (
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 p-1 transition"
                        title="Spieler entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add player form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Neuer Spielername..."
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
              <label className="text-xs font-semibold text-stone-400 block mb-2">Wer schenkt die Biere geheim ein?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setZapfmeisterMode('rotating')}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    zapfmeisterMode === 'rotating'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🔄 Wechselt jede Runde</span>
                  </div>
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
                  <div className="font-bold flex items-center gap-1.5">
                    <span>👑 Fester Zapfmeister</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">Eine Person bleibt Spielleiter</div>
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Die Biere */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">2</div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <BeerIcon className="w-5 h-5 text-amber-400" />
                      Das Bier-Lineup ({session.beers.length} Runden)
                    </h2>
                    <p className="text-xs text-stone-400">Diese Biere werden nacheinander blind verkostet</p>
                  </div>
                </div>

                <button
                  onClick={handleShuffleBeers}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-amber-300 border border-stone-700 flex items-center gap-1.5 transition"
                  title="Reihenfolge zufällig mischen"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Mischen 🎲</span>
                </button>
              </div>

              {/* Beer cards preview */}
              <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                {session.beers.map((beer, idx) => (
                  <div
                    key={beer.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-stone-800/80 border border-stone-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-stone-700 text-amber-400 font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-stone-100 text-sm">{beer.name}</div>
                        <div className="text-xs text-stone-400 flex items-center gap-2">
                          <span>{beer.brewery}</span>
                          <span>•</span>
                          <span className="text-amber-400/90">{beer.style}</span>
                          <span>•</span>
                          <span>{beer.abv}% vol</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-stone-700/60 text-stone-300 font-medium">
                      {beer.priceEur ? `${beer.priceEur.toFixed(2)} €` : 'Spanien'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
              <span>💡 Tipp: Haltet die Flaschen im Kühlschrank oder einer Tasche versteckt!</span>
            </div>
          </div>
        </div>

        {/* Big Start Button */}
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
  // RENDER: SECRET POUR (SCHRITT 2: DER GEHEIME ZAPFMEISTER)
  // -------------------------------------------------------------
  if (step === 'SECRET_POUR') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in text-stone-100">
        {/* Header bar */}
        <div className="flex items-center justify-between bg-stone-900/80 border border-stone-800 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs uppercase tracking-wider">
              Runde {currentRoundIdx + 1} von {session.beers.length}
            </span>
            <span className="text-stone-400 text-sm">• Blindverkostung vorbereiten</span>
          </div>
          <button
            onClick={handleRestartTasting}
            className="text-stone-500 hover:text-stone-300 text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Neustart</span>
          </button>
        </div>

        {/* The Secret Pour Privacy Box */}
        <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden">
          {!isVeilOpen ? (
            /* SHIELD ACTIVE: Other players MUST NOT LOOK */
            <div className="space-y-6 max-w-xl mx-auto py-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Lock className="w-10 h-10" />
              </div>

              <div>
                <div className="inline-block px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm mb-3 animate-pulse">
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
                    soundController.playBeerOpen();
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 mx-auto transition transform hover:scale-105"
                >
                  <Eye className="w-5 h-5" />
                  <span>Ich bin {activeZapfmeister.name} – Bier aufdecken!</span>
                </button>
                <div className="text-stone-400 text-xs mt-2">(Oder drücke die Leertaste)</div>
              </div>
            </div>
          ) : (
            /* VEIL OPENED: Zapfmeister sees which bottle to grab */
            <div className="space-y-6 max-w-2xl mx-auto animate-fade-in py-2">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-full px-4 py-1 w-fit mx-auto">
                <Unlock className="w-4 h-4" />
                <span>Zapfmeister-Sicht geöffnet</span>
              </div>

              <div>
                <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                  Schenke jetzt heimlich ein:
                </span>
                <h1 className="text-4xl sm:text-5xl font-black text-white mt-1 text-amber-300">
                  {currentSecretBeer?.name}
                </h1>
                <div className="text-lg text-stone-300 font-semibold mt-1">
                  {currentSecretBeer?.brewery} • {currentSecretBeer?.origin}
                </div>
              </div>

              {/* Secret Details for Pourer */}
              <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-5 text-left grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-stone-400">Bier-Stil:</div>
                  <div className="font-bold text-amber-300">{currentSecretBeer?.style}</div>
                </div>
                <div>
                  <div className="text-xs text-stone-400">Alkoholgehalt:</div>
                  <div className="font-bold text-white">{currentSecretBeer?.abv}% vol</div>
                </div>
                <div>
                  <div className="text-xs text-stone-400">Preis im Laden:</div>
                  <div className="font-bold text-white">ca. {currentSecretBeer?.priceEur?.toFixed(2)} €</div>
                </div>
                {currentSecretBeer?.description && (
                  <div className="sm:col-span-3 text-xs text-stone-300 border-t border-stone-800 pt-3">
                    <strong>Optischer Hinweis:</strong> {currentSecretBeer.description}
                  </div>
                )}
              </div>

              {/* Step instructions */}
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
                  <span>Gläser sind voll! ➔ Alle hersehen!</span>
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
  // RENDER: TASTING INPUT (SCHRITT 3: ALLE RATEN AM SCREEN)
  // -------------------------------------------------------------
  if (step === 'TASTING_INPUT') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in text-stone-100">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-stone-900 to-amber-950/40 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1 rounded-full bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider">
                Blindprobe Runde {currentRoundIdx + 1} von {session.beers.length}
              </span>
              <span className="text-stone-300 font-bold text-sm">🍻 Jetzt wird probiert & getippt!</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Welches Bier habt ihr im Glas?
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400">
              Eingeschenkt von: <strong className="text-amber-300">{activeZapfmeister.name}</strong>
            </span>
          </div>
        </div>

        {/* Players interactive grid (Side-by-side columns on PC) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {session.players.map(player => {
            const rating = currentRoundRatings[player.id] || {
              guessedBeerId: session.beers[0]?.id || '',
              score: 8,
              guessedPrice: 'classic_bar',
              isReady: false
            };

            return (
              <div 
                key={player.id}
                className={`bg-stone-900/90 border rounded-3xl p-5 shadow-xl transition flex flex-col justify-between ${
                  rating.isReady 
                    ? 'border-emerald-500/60 ring-2 ring-emerald-500/20' 
                    : 'border-stone-800 hover:border-amber-500/40'
                }`}
              >
                <div>
                  {/* Player header */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{player.avatarEmoji}</span>
                      <div>
                        <div className="font-extrabold text-white text-base leading-tight">{player.name}</div>
                        <div className="text-[11px] text-amber-400 font-medium">{player.totalPoints} Punkte bisher</div>
                      </div>
                    </div>
                    {rating.isReady ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Bereit</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                        Tippt...
                      </span>
                    )}
                  </div>

                  {/* Guess selection */}
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1.5 flex items-center justify-between">
                        <span>1. Welches Bier ist das?</span>
                      </label>
                      <select
                        value={rating.guessedBeerId}
                        disabled={rating.isReady}
                        onChange={(e) => handlePlayerRatingChange(player.id, 'guessedBeerId', e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-semibold text-amber-300 focus:outline-none focus:border-amber-500 disabled:opacity-80"
                      >
                        {session.beers.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.style})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Score Slider (1-10) */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-stone-300">2. Geschmack / Note:</span>
                        <span className="font-black text-amber-400 text-sm">{rating.score} / 10 ⭐</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={rating.score}
                        disabled={rating.isReady}
                        onChange={(e) => handlePlayerRatingChange(player.id, 'score', Number(e.target.value))}
                        className="w-full accent-amber-500 h-2 bg-stone-800 rounded-lg cursor-pointer disabled:opacity-50"
                      />
                      <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                        <span>1 (Plörre 🤮)</span>
                        <span>5 (Geht so 😐)</span>
                        <span>10 (Göttertrunk 👑)</span>
                      </div>
                    </div>

                    {/* Price category guess */}
                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1">3. Preisklasse-Schätzung:</label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'mercadona_budget', label: '38c Dose' },
                          { id: 'classic_bar', label: '1€ Bar' },
                          { id: 'premium_craft', label: '2€+ Edel' }
                        ].map(item => (
                          <button
                            key={item.id}
                            type="button"
                            disabled={rating.isReady}
                            onClick={() => handlePlayerRatingChange(player.id, 'guessedPrice', item.id)}
                            className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                              rating.guessedPrice === item.id
                                ? 'bg-amber-500 text-stone-950 border-amber-400'
                                : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:text-stone-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ready toggle button */}
                <div className="mt-5 pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !rating.isReady;
                      handlePlayerRatingChange(player.id, 'isReady', nextState);
                      if (nextState) soundController.playBeerOpen();
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      rating.isReady
                        ? 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 hover:brightness-110 shadow-md'
                    }`}
                  >
                    {rating.isReady ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Tipp ändern</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{player.name} ist fertig!</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Big Reveal Trigger Bar */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2 justify-center sm:justify-start">
              <span>Haben alle am Tisch getippt?</span>
              {allPlayersReady && <span className="text-emerald-400 text-xs font-bold bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/40">Alle bereit! 🎉</span>}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Klickt auf „Bier enthüllen“, um die Punkte zu vergeben und zu sehen, wer richtig lag!
            </p>
          </div>

          <button
            onClick={handleTriggerReveal}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black text-xl rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>AUFLÖSUNG STARTEN! 🥁</span>
            <PartyPopper className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: REVEAL (SCHRITT 4: DIE GROSSE ENTHÜLLUNG)
  // -------------------------------------------------------------
  if (step === 'REVEAL') {
    const lastRound = session.rounds[currentRoundIdx];
    const correctGuessers = session.players.filter(p => {
      const r = currentRoundRatings[p.id];
      return r && r.guessedBeerId === currentSecretBeer?.id;
    });

    const wrongGuessers = session.players.filter(p => {
      const r = currentRoundRatings[p.id];
      return r && r.guessedBeerId !== currentSecretBeer?.id;
    });

    // Average rating
    const scores = session.players.map(p => currentRoundRatings[p.id]?.score || 0);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';

    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in text-stone-100">
        {/* Banner with true identity */}
        <div className="bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-900/80 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-2 border border-emerald-500/40">
            🎉 Runde {currentRoundIdx + 1} Aufgelöst!
          </div>

          <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
            In euren Gläsern war:
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white mt-1 text-amber-300 drop-shadow-md">
            {currentSecretBeer?.name}
          </h1>

          <div className="text-lg sm:text-xl font-bold text-stone-200 mt-2 flex items-center justify-center gap-3 flex-wrap">
            <span>{currentSecretBeer?.brewery}</span>
            <span>•</span>
            <span className="text-amber-400">{currentSecretBeer?.style}</span>
            <span>•</span>
            <span>{currentSecretBeer?.abv}% vol</span>
            <span>•</span>
            <span className="text-emerald-400 font-extrabold">ca. {currentSecretBeer?.priceEur?.toFixed(2)} €</span>
          </div>

          {currentSecretBeer?.trivia && (
            <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-stone-800 text-stone-300 text-sm max-w-2xl mx-auto italic">
              „{currentSecretBeer.trivia}“
            </div>
          )}

          <div className="mt-4 inline-block px-5 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm">
            Euer Notenschnitt am Tisch: <strong>{avgScore} / 10 Sterne ⭐</strong>
          </div>
        </div>

        {/* Who guessed right & who failed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Winners */}
          <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-black text-emerald-400 flex items-center gap-2 mb-4">
              <Award className="w-5 h-5" />
              <span>Richtig getippt! (+100 Pkt)</span>
            </h3>
            {correctGuessers.length > 0 ? (
              <div className="space-y-3">
                {correctGuessers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 rounded-2xl bg-emerald-900/30 border border-emerald-500/30">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{player.avatarEmoji}</span>
                      <div>
                        <div className="font-extrabold text-white text-base">{player.name}</div>
                        <div className="text-xs text-emerald-300 font-semibold">Bier exakt erraten!</div>
                      </div>
                    </div>
                    <span className="text-base font-black text-emerald-400">+100 Pkt</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-stone-400 text-sm italic py-4 text-center">
                Niemand lag richtig! Dieses Bier hat euch alle reingelegt. 😅
              </div>
            )}
          </div>

          {/* Fails / Wrong guesses */}
          <div className="bg-red-950/20 border border-red-500/30 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-black text-red-400 flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5" />
              <span>Daneben gelegen:</span>
            </h3>
            {wrongGuessers.length > 0 ? (
              <div className="space-y-3">
                {wrongGuessers.map(player => {
                  const guessedId = currentRoundRatings[player.id]?.guessedBeerId;
                  const guessedBeer = session.beers.find(b => b.id === guessedId);
                  return (
                    <div key={player.id} className="flex items-center justify-between p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{player.avatarEmoji}</span>
                        <div>
                          <div className="font-bold text-white text-sm">{player.name}</div>
                          <div className="text-xs text-stone-400">
                            Dachte es wäre: <strong className="text-amber-300">{guessedBeer?.name || 'Anderes Bier'}</strong>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-stone-400">+0 Pkt</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-emerald-400 text-sm font-bold py-4 text-center">
                Unglaublich! Alle am Tisch lagen richtig! 🍻
              </div>
            )}
          </div>
        </div>

        {/* Current Scoreboard Table */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Aktueller Zwischenstand nach Runde {currentRoundIdx + 1}</span>
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
  // RENDER: FINAL PODIUM (SCHRITT 6: GROSSES FINALE & SIEGEREHRUNG)
  // -------------------------------------------------------------
  if (step === 'FINAL_PODIUM') {
    const sortedPlayers = [...session.players].sort((a, b) => b.totalPoints - a.totalPoints);
    const winner = sortedPlayers[0];
    const second = sortedPlayers[1];
    const third = sortedPlayers[2];
    const lastPlace = sortedPlayers[sortedPlayers.length - 1];

    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in text-stone-100 py-4">
        {/* Banner */}
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

          {/* Top 1 Big Card */}
          {winner && (
            <div className="mt-8 p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-400 max-w-md mx-auto shadow-2xl">
              <span className="text-6xl mb-2 block">{winner.avatarEmoji}</span>
              <div className="text-xs uppercase font-extrabold text-amber-400">1. Platz & Großmeister</div>
              <h2 className="text-3xl font-black text-white mt-1">{winner.name}</h2>
              <div className="text-2xl font-black text-amber-400 mt-1">{winner.totalPoints} Punkte</div>
              <div className="text-xs text-stone-300 mt-2 font-medium">
                {winner.correctStyleGuesses} von {session.beers.length} Bieren richtig erkannt!
              </div>
            </div>
          )}
        </div>

        {/* Podium cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {/* 2nd place */}
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

          {/* 1st place small summary */}
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

          {/* 3rd place */}
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

        {/* Special Award: Bier-Banause des Abends */}
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

        {/* Certificate Button & Restart */}
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
