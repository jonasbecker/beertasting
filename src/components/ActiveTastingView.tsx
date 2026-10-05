import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Beer as BeerIcon, 
  Trophy, 
  Shuffle, 
  FileText, 
  ArrowRight, 
  RotateCcw, 
  Camera, 
  Users, 
  Smartphone,
  ChevronDown,
  ChevronUp,
  Award,
  ShoppingBag
} from 'lucide-react';
import { TournamentSession, Beer, Player, TastingRound, PlayerRoundRating, BeerStyle, PriceCategory } from '../types';
import { PARTY_MODES } from '../data/minigames';
import { calculateSpeedBonus, calculateEvaluationPoints, computeBeerLeaderboard, computePlayerLeaderboard } from '../utils/scoring';
import { soundController } from '../utils/audio';
import { haptic } from '../utils/haptics';
import { LiveBuzzerToolbar } from './LiveBuzzerToolbar';
import { ElHidratadorModal } from './ElHidratadorModal';

interface ActiveTastingViewProps {
  session: TournamentSession;
  onUpdateSession: (updated: TournamentSession) => void;
  onNavigateToLeaderboard: () => void;
  onOpenScanner?: () => void;
  onSwitchToMultiplayer?: () => void;
  onOpenCertificates?: () => void;
}

type GameFlowState = 
  | 'SETUP'
  | 'TASTING_TURN'
  | 'PRE_REVEAL'
  | 'DRUMROLL'
  | 'REVEAL'
  | 'MINIGAME'
  | 'FINAL_SCREEN';

const GUESS_CATEGORIES: { id: BeerStyle; label: string; icon: string }[] = [
  { id: 'Lager', label: 'Lager / Helles', icon: '🍺' },
  { id: 'Pilsner', label: 'Pils (Herb)', icon: '🌿' },
  { id: 'Märzen / Amber', label: 'Märzen (Turia)', icon: '🌾' },
  { id: 'Helles Bock', label: 'Bock (Alhambra)', icon: '👑' },
  { id: 'Doble Malta', label: 'Doble Malta', icon: '💥' },
  { id: 'Witbier / Weizen', label: 'Witbier (Inedit)', icon: '🍊' },
  { id: 'IPA', label: 'IPA (Craft)', icon: '⚡' },
  { id: 'Anderer Stil', label: 'Anderer Stil', icon: '❓' }
];

const FLAVOR_TAGS = [
  'Malzig', 'Hopfig-Herb', 'Fruchtig', 'Karamell', 
  'Süffig', 'Spritzig', 'Röstig', 'Zitrusfrisch', 'Mild', 'Würzig'
];

export const ActiveTastingView: React.FC<ActiveTastingViewProps> = ({
  session,
  onUpdateSession,
  onNavigateToLeaderboard,
  onOpenScanner,
  onSwitchToMultiplayer,
  onOpenCertificates
}) => {
  const currentMode = PARTY_MODES.find((m) => m.id === session.partyMode) || PARTY_MODES[0];

  // Flow State
  const [flowState, setFlowState] = useState<GameFlowState>(() => {
    if (session.rounds.length === 0) return 'SETUP';
    const lastRound = session.rounds[session.rounds.length - 1];
    if (session.isFinished) return 'FINAL_SCREEN';
    if (!lastRound.isCompleted) return 'TASTING_TURN';
    return 'REVEAL';
  });

  const [currentBeerIndex, setCurrentBeerIndex] = useState<number>(() => {
    return session.rounds.length > 0 ? session.rounds.length - 1 : 0;
  });

  // Turn management inside round: 0..3 (3 tasters + 1 host)
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);

  // Active round input states
  const [currentScore, setCurrentScore] = useState<number>(12);
  const [currentGuess, setCurrentGuess] = useState<BeerStyle>('Lager');
  const [currentPriceGuess, setCurrentPriceGuess] = useState<PriceCategory | undefined>(undefined);
  const [currentFlavors, setCurrentFlavors] = useState<string[]>([]);

  // Collapsible Progress Bar State
  const [isProgressExpanded, setIsProgressExpanded] = useState<boolean>(false);

  // Timer
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // Active minigame definition
  const [currentMinigame, setCurrentMinigame] = useState<{
    title: string;
    subtitle: string;
    description: string;
    prompt?: string;
    bgClass: string;
    buttonText: string;
  } | null>(null);

  // Cheat Sheet Modal
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  // El Hidratador (Wasser- & Tapas-Pause)
  const [showHidratador, setShowHidratador] = useState(false);

  // Host calculation for current beer: rotates round-by-round
  const hostPlayer = session.players[currentBeerIndex % session.players.length] || session.players[0];

  // Turn list for this round: 3 non-hosts taste first, then host rates
  const nonHostPlayers = session.players.filter((p) => p.id !== hostPlayer.id);
  const turnOrderPlayers = [...nonHostPlayers, hostPlayer];
  const activeTurnPlayer = turnOrderPlayers[currentTurnIndex] || turnOrderPlayers[0];
  const isHostTurn = activeTurnPlayer.id === hostPlayer.id;

  // Active beer
  const currentBeer = session.beers[currentBeerIndex] || session.beers[0];

  // Progressive drunk sway calculation:
  const swayDeg = Math.min(4.8, currentBeerIndex * 0.55).toFixed(1);
  const swaySpeed = Math.max(2.8, 6.0 - currentBeerIndex * 0.32).toFixed(1);
  const dynamicSwayStyle = {
    '--sway-deg': `${swayDeg}deg`,
    '--sway-speed': `${swaySpeed}s`
  } as React.CSSProperties;

  // Apply body classes (minigame background colors)
  useEffect(() => {
    document.body.className = '';
    if (currentMinigame) {
      document.body.classList.add(currentMinigame.bgClass);
    }
    return () => {
      document.body.className = '';
    };
  }, [currentMinigame]);

  // Drinking Timer
  useEffect(() => {
    if (timerRunning) {
      const startTime = Date.now() - timeElapsed * 1000;
      timerRef.current = window.setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Shuffle Beers
  const handleShuffleBeers = () => {
    const shuffled = [...session.beers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    onUpdateSession({ ...session, beers: shuffled });
    soundController.playBeerOpen();
    alert('🎲 Die Biere wurden zufällig für die Blindverkostung gemischt!');
  };

  // Start Tasting from Setup
  const handleStartTasting = () => {
    soundController.playBeerOpen();
    haptic.success();
    initRound(0);
  };

  const initRound = (beerIdx: number) => {
    setCurrentBeerIndex(beerIdx);
    setCurrentTurnIndex(0);
    resetTurnInputs();
    setTimeElapsed(0);
    setTimerRunning(true);
    setFlowState('TASTING_TURN');
  };

  const resetTurnInputs = () => {
    setCurrentScore(12);
    setCurrentGuess('Lager');
    setCurrentPriceGuess(undefined);
    setCurrentFlavors([]);
    setTimeElapsed(0);
  };

  const toggleFlavor = (tag: string) => {
    haptic.tap();
    if (currentFlavors.includes(tag)) {
      setCurrentFlavors(currentFlavors.filter((t) => t !== tag));
    } else {
      setCurrentFlavors([...currentFlavors, tag]);
    }
  };

  // Submit Turn (one player finishes rating & guess)
  const handleConfirmTurn = () => {
    setTimerRunning(false);
    haptic.success();

    // Calculate rating for active player
    const speedBonus = isHostTurn ? 0 : calculateSpeedBonus(timeElapsed, currentMode);
    const { isStyleMatch, stylePoints, matchedFlavors, flavorPoints, isPriceMatch, pricePoints } = isHostTurn
      ? { isStyleMatch: false, stylePoints: 0, matchedFlavors: [], flavorPoints: 0, isPriceMatch: false, pricePoints: 0 }
      : calculateEvaluationPoints(currentGuess, currentFlavors, currentBeer, currentMode, currentPriceGuess);

    const totalPointsEarned = isHostTurn
      ? Math.round(currentScore * 2.5) + 30
      : speedBonus + stylePoints + flavorPoints + pricePoints;

    const roundRating: PlayerRoundRating = {
      playerId: activeTurnPlayer.id,
      score: currentScore,
      guessedStyle: isHostTurn ? undefined : currentGuess,
      guessedPriceCategory: isHostTurn ? undefined : currentPriceGuess,
      timeSeconds: timeElapsed,
      speedBonusPoints: speedBonus,
      stylePoints,
      flavorPoints,
      matchedFlavors,
      pricePoints,
      isPriceMatch,
      totalPointsEarned,
      flavorTags: currentFlavors,
      isHost: isHostTurn
    };

    // Update session round
    const existingRounds = [...session.rounds];
    const targetRoundIdx = currentBeerIndex;
    let roundObj = existingRounds[targetRoundIdx];

    if (!roundObj) {
      roundObj = {
        roundNumber: targetRoundIdx + 1,
        secretBeerId: currentBeer.id,
        hostPlayerId: hostPlayer.id,
        ratings: {},
        isCompleted: false,
        timestamp: Date.now()
      };
      existingRounds[targetRoundIdx] = roundObj;
    }

    roundObj.ratings[activeTurnPlayer.id] = roundRating;

    onUpdateSession({
      ...session,
      rounds: existingRounds
    });

    // Advance turn or go to pre-reveal
    if (currentTurnIndex < turnOrderPlayers.length - 1) {
      setCurrentTurnIndex(currentTurnIndex + 1);
      resetTurnInputs();
      setTimerRunning(true);
    } else {
      // All 4 have rated -> Mark completed & go to Pre-Reveal
      roundObj.isCompleted = true;
      onUpdateSession({
        ...session,
        rounds: existingRounds
      });
      setFlowState('PRE_REVEAL');
    }
  };

  // Start Reveal (Drumroll Suspense)
  const handleStartReveal = () => {
    soundController.playSuspense();
    haptic.drumroll();
    setFlowState('DRUMROLL');

    setTimeout(() => {
      soundController.playTada();
      haptic.tada();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setFlowState('REVEAL');
    }, 1500);
  };

  // Next Beer / Trigger Minigames
  const handleNextBeer = () => {
    haptic.tap();
    const nextIdx = currentBeerIndex + 1;

    if (nextIdx >= session.beers.length) {
      // Finished all beers
      onUpdateSession({ ...session, isFinished: true });
      setFlowState('FINAL_SCREEN');
      return;
    }

    // Trigger funny minigames at specific milestones
    if (nextIdx === 2) {
      // Nach Bier 2
      setCurrentMinigame({
        title: '🦉 Stammtisch-Philosophie',
        subtitle: 'Etwas Tiefgang für die Jungs in Xàbia',
        description: 'Der erste Durst ist gelöscht. Legt das Smartphone kurz beiseite und diskutiert folgende Frage für 2 Minuten:',
        prompt: '"Wenn jeder von euch 4 ein spanisches Bier wäre – welches wäre er und warum?"',
        bgClass: 'deep-bg',
        buttonText: '✅ Philosophisch genug! Weiter zu Bier 3'
      });
      setFlowState('MINIGAME');
    } else if (nextIdx === 4) {
      // Nach Bier 4: El Hidratador (Tapas- & Wasser-Pause)
      soundController.playWaterSplash();
      haptic.alarm();
      setShowHidratador(true);
      return;
    } else if (nextIdx === 6) {
      // Nach Bier 6
      const randomTaster = nonHostPlayers[Math.floor(Math.random() * nonHostPlayers.length)];
      setCurrentMinigame({
        title: '🥂 Der Sommelier-Toast',
        subtitle: 'Lass ihn hochleben!',
        description: `Der Zufallsgenerator hat entschieden: ${randomTaster.name} (${randomTaster.nickname})!`,
        prompt: 'Du musst jetzt aufstehen und eine 30-sekündige feierliche Lobrede voller spanischer Weinkenner-Begriffe auf eure Urlaubsrunde halten!',
        bgClass: 'toast-bg',
        buttonText: '🍻 Salud! Weiter zu Bier 7'
      });
      setFlowState('MINIGAME');
    } else if (nextIdx === 8) {
      // Nach Bier 8
      const victim = session.players[Math.floor(Math.random() * session.players.length)];
      setCurrentMinigame({
        title: '👅 Zungen-Test (Pegel-Check)',
        subtitle: 'Wer lallt schon?',
        description: `${victim.name}, du wurdest ausgewählt! Lies folgenden Satz fehlerfrei und laut vor:`,
        prompt: '"Tres tristes tigres tragan trigo en un trigal – oder: Bierbrauer Bauer braut braunes Bier!"',
        bgClass: 'toast-bg',
        buttonText: '✅ Zungentest bestanden! Weiter'
      });
      setFlowState('MINIGAME');
    } else if (nextIdx === session.beers.length - 1) {
      // Vor dem allerletzten Bier
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
      setCurrentMinigame({
        title: '🏁 Endspurt! Das Grande Finale',
        subtitle: 'Das allerletzte Bier des Urlaubs',
        description: 'Respekt, ihr habt euch wacker geschlagen! Nur noch ein einziges geheimes Bier wartet auf euch.',
        prompt: 'Noch einmal volle Konzentration für den finalen Geschmack!',
        bgClass: 'party-bg',
        buttonText: '🍻 Auf zum letzten Bier!'
      });
      setFlowState('MINIGAME');
    } else {
      initRound(nextIdx);
    }
  };

  const handleFinishMinigame = () => {
    haptic.tap();
    setCurrentMinigame(null);
    initRound(currentBeerIndex + 1);
  };

  const currentRoundRatings = session.rounds[currentBeerIndex]?.ratings || {};
  const remainingBeersCount = Math.max(0, session.beers.length - (currentBeerIndex + 1));
  const progressPercent = Math.min(100, Math.max(6, ((currentBeerIndex + (flowState === 'REVEAL' ? 1 : 0.4)) / session.beers.length) * 100));

  return (
    <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-between overflow-hidden h-full select-none">
      {/* ========================================================================= */}
      {/* COLLAPSIBLE PROGRESS BAR AT TOP */}
      {/* ========================================================================= */}
      {flowState !== 'SETUP' && flowState !== 'FINAL_SCREEN' && (
        <div className="mb-2 shrink-0 animate-fade-in">
          {!isProgressExpanded ? (
            /* Compact Collapsed Bar (One tap expands) */
            <div
              onClick={() => {
                haptic.tap();
                setIsProgressExpanded(true);
              }}
              className="px-3 py-1.5 bg-stone-900/90 backdrop-blur-md rounded-xl border border-stone-700/80 shadow flex items-center justify-between text-stone-200 cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-2">
                <BeerIcon className="w-4 h-4 text-amber-400" />
                <span className="font-hand font-bold text-amber-400 text-lg">
                  Bier {currentBeerIndex + 1} von {session.beers.length}
                </span>
                <div className="w-16 sm:w-24 h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-stone-300 font-hand text-base">
                <span>{remainingBeersCount === 0 ? '🏁 Finale!' : `Noch ${remainingBeersCount}`}</span>
                <ChevronDown className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          ) : (
            /* Expanded Full Bar (One tap collapses) */
            <div className="p-2.5 bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-700/80 shadow-lg space-y-1.5 animate-fade-in text-stone-200">
              <div
                onClick={() => {
                  haptic.tap();
                  setIsProgressExpanded(false);
                }}
                className="flex items-center justify-between font-hand text-lg cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-bold text-amber-400">
                  <BeerIcon className="w-4 h-4 text-amber-400" />
                  <span>Bier {currentBeerIndex + 1} von {session.beers.length}</span>
                </span>
                <div className="flex items-center gap-1 text-stone-300 text-sm">
                  <span>{remainingBeersCount === 0 ? '🏁 Finale Runde!' : `Noch ${remainingBeersCount} übrig`}</span>
                  <ChevronUp className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              {/* Liquid Beer Progress Bar with Foam */}
              <div className="relative w-full h-3 bg-stone-950 rounded-full border border-stone-700/80 p-0.5 overflow-hidden flex items-center shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 rounded-full transition-all duration-300 ease-out relative flex items-center justify-end shadow"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="w-2 h-full bg-white/95 rounded-full shadow-sm" />
                </div>
              </div>

              {/* Step numbers below bar */}
              <div className="flex justify-between px-1 text-[10px] font-mono text-stone-500">
                {session.beers.map((_, i) => (
                  <span
                    key={i}
                    className={`transition-colors ${
                      i === currentBeerIndex
                        ? 'text-amber-400 font-bold scale-110'
                        : i < currentBeerIndex
                        ? 'text-amber-600 font-medium'
                        : 'text-stone-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SETUP / START SCREEN */}
      {/* ========================================================================= */}
      {flowState === 'SETUP' && (
        <div className="tasting-container rounded-2xl p-4 sm:p-6 space-y-4 text-stone-900 border border-stone-300 shadow-xl flex-1 flex flex-col justify-between overflow-hidden">
          <div className="space-y-3">
            <div className="text-center space-y-0.5">
              <h1 className="text-3xl sm:text-4xl font-bold text-[#d35400] font-hand tracking-tight leading-tight">
                🍻 Cerveza Xàbia
              </h1>
              <p className="text-lg sm:text-xl text-stone-700 font-hand">
                Das ultimative Blind-Tasting der Jungs
              </p>
            </div>

            {/* Mode Choice: 1 Screen vs Multiplayer */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <div className="p-2.5 bg-amber-500/15 border-2 border-[#d35400] rounded-xl text-center shadow-sm">
                <Smartphone className="w-6 h-6 mx-auto text-[#d35400]" />
                <div className="font-hand font-bold text-xl text-[#d35400] mt-0.5">1 Bildschirm</div>
                <div className="font-sans text-[11px] text-stone-700">Handy rumreichen</div>
              </div>

              {onSwitchToMultiplayer && (
                <button
                  onClick={onSwitchToMultiplayer}
                  className="p-2.5 bg-sky-500/15 border-2 border-[#2980b9] rounded-xl text-center cursor-pointer hover:bg-sky-500/25 active:scale-95 transition-all shadow-sm"
                >
                  <Users className="w-6 h-6 mx-auto text-[#2980b9]" />
                  <div className="font-hand font-bold text-xl text-[#2980b9] mt-0.5">Multiplayer</div>
                  <div className="font-sans text-[11px] text-stone-700">Mit Code beitreten</div>
                </button>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
              {onOpenScanner && (
                <button
                  onClick={onOpenScanner}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#d35400] text-white font-hand text-base rounded-xl shadow cursor-pointer active:scale-95 transition-transform"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Fotos scannen</span>
                </button>
              )}
              <button
                onClick={handleShuffleBeers}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#2980b9] text-white font-hand text-base rounded-xl shadow cursor-pointer active:scale-95 transition-transform"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Mischen</span>
              </button>
              <button
                onClick={() => setShowCheatSheet(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#27ae60] text-white font-hand text-base rounded-xl shadow cursor-pointer active:scale-95 transition-transform"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Spickzettel</span>
              </button>
            </div>

            <div className="space-y-1 pt-0.5">
              <p className="text-lg text-center font-hand text-stone-700">
                Die 4 Jungs am Tisch in Xàbia:
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-center">
                {session.players.map((p) => (
                  <div
                    key={p.id}
                    className="p-1.5 bg-white/80 rounded-xl border border-stone-300 font-hand text-base text-stone-800 flex items-center justify-center gap-1.5"
                  >
                    <span>{p.avatarEmoji}</span>
                    <span className="font-bold">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stable Anchored Bottom Button */}
          <div className="mt-auto pt-2 shrink-0">
            <button
              onClick={handleStartTasting}
              className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl sm:text-3xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              🚀 Tasting Starten!
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PHASE 1: BLINDVERKOSTUNG (REIHUM TESTER) */}
      {/* ========================================================================= */}
      {flowState === 'TASTING_TURN' && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-3.5 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden text-stone-900 border border-stone-300 shadow-xl animate-fade-in"
        >
          <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
            {/* Header & Turn */}
            <div className="text-center space-y-0.5">
              <div className="player-turn-banner !text-2xl !py-1">
                {activeTurnPlayer.avatarEmoji} {activeTurnPlayer.name}, du bist dran!
              </div>

              {isHostTurn ? (
                <div className="p-1.5 bg-amber-500/15 border border-[#d35400] rounded-lg text-center font-hand text-base text-stone-800">
                  👑 <b>Ausschenker</b>: Bewerte den Geschmack (1–20)
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs font-mono text-stone-600 px-1">
                  <span>Zeit: <strong>{timeElapsed}s</strong></span>
                  <span>Speed: <strong className="text-emerald-700">+{calculateSpeedBonus(timeElapsed, currentMode)} Pkt</strong></span>
                </div>
              )}
            </div>

            {/* Score Slider 1 - 20 */}
            <div className="text-center space-y-0.5">
              <div className="flex items-center justify-center gap-2">
                <span className="font-hand text-xl text-stone-800">Deine Punkte:</span>
                <span className="font-hand text-4xl sm:text-5xl font-bold text-[#d35400] leading-none">
                  {currentScore}
                </span>
                <span className="font-hand text-lg text-stone-500">/ 20</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={currentScore}
                onChange={(e) => {
                  setCurrentScore(Number(e.target.value));
                  haptic.tick();
                }}
                className="w-full accent-[#d35400] cursor-pointer"
              />
            </div>

            {/* Bier-Typ Direkt Klick */}
            {!isHostTurn && (
              <div className="space-y-1">
                <p className="text-base text-center font-hand text-stone-800 leading-none">
                  Welcher Bier-Typ ist es?
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {GUESS_CATEGORIES.map((cat) => {
                    const isSelected = currentGuess === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCurrentGuess(cat.id);
                          haptic.tap();
                        }}
                        className={`p-1.5 rounded-lg border font-hand text-base text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#1e293b] text-white border-[#1e293b] shadow scale-[1.01]'
                            : 'bg-transparent text-stone-800 border-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Geschmacksnoten */}
            {!isHostTurn && (
              <div className="space-y-0.5">
                <div className="flex items-center justify-between font-hand text-sm text-stone-800">
                  <span>Noten herausschmecken:</span>
                  <span className="text-emerald-700 font-bold">+10 Pkt</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {FLAVOR_TAGS.map((tag) => {
                    const isSelected = currentFlavors.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleFlavor(tag)}
                        className={`px-2 py-0.5 rounded border font-hand text-sm transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#d35400] text-white border-[#d35400] font-bold shadow'
                            : 'bg-white/80 text-stone-700 border-stone-400 hover:bg-stone-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Billig oder Edel? Preisschätzung */}
            {!isHostTurn && (
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between font-hand text-sm text-stone-800">
                  <span>🛒 Billig oder Edel? (Preistipp):</span>
                  <span className="text-amber-700 font-bold">+25 Pkt</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-hand">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPriceGuess('mercadona_budget');
                      haptic.tap();
                    }}
                    className={`p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                      currentPriceGuess === 'mercadona_budget'
                        ? 'bg-amber-600 text-white border-amber-700 font-bold shadow scale-[1.02]'
                        : 'bg-white/80 text-stone-700 border-stone-400 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-base">🛒</div>
                    <div className="font-bold text-sm leading-tight">Mercadona</div>
                    <div className="text-[10px] opacity-80">&lt; 0,80 €</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPriceGuess('classic_bar');
                      haptic.tap();
                    }}
                    className={`p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                      currentPriceGuess === 'classic_bar'
                        ? 'bg-sky-600 text-white border-sky-700 font-bold shadow scale-[1.02]'
                        : 'bg-white/80 text-stone-700 border-stone-400 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-base">🍻</div>
                    <div className="font-bold text-sm leading-tight">Bar-Bier</div>
                    <div className="text-[10px] opacity-80">0,80–1,80 €</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPriceGuess('premium_craft');
                      haptic.tap();
                    }}
                    className={`p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                      currentPriceGuess === 'premium_craft'
                        ? 'bg-purple-600 text-white border-purple-700 font-bold shadow scale-[1.02]'
                        : 'bg-white/80 text-stone-700 border-stone-400 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-base">💎</div>
                    <div className="font-bold text-sm leading-tight">Edel / Craft</div>
                    <div className="text-[10px] opacity-80">&gt; 1,80 €</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stable Anchored Bottom Button (EXACT SAME HEIGHT ACROSS SCREENS) */}
          <div className="mt-auto pt-2 shrink-0">
            <button
              onClick={handleConfirmTurn}
              className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              ✅ Bestätigen & Weiter
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRE-REVEAL (DRAMATISCHE PAUSE VOR DER AUFLÖSUNG) */}
      {/* ========================================================================= */}
      {flowState === 'PRE_REVEAL' && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-4 sm:p-6 flex-1 flex flex-col justify-between overflow-hidden text-stone-900 border border-stone-300 text-center shadow-xl animate-fade-in"
        >
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-hand font-bold text-[#d35400]">
              Bier {currentBeerIndex + 1}
            </h2>
            <p className="text-2xl font-hand text-stone-800">
              Alle 4 haben probiert und blind gewertet!
            </p>
            <div className="text-7xl my-2">🤫</div>
            <p className="font-hand text-xl text-stone-600">
              Bereit für die Auflösung am Tisch?
            </p>
          </div>

          {/* Stable Anchored Bottom Button */}
          <div className="mt-auto pt-2 shrink-0">
            <button
              onClick={handleStartReveal}
              className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              🥁 Auflösung anzeigen
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DRUMROLL SCREEN */}
      {/* ========================================================================= */}
      {flowState === 'DRUMROLL' && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-6 flex-1 flex flex-col justify-center items-center overflow-hidden text-stone-900 border border-stone-300 text-center shadow-xl animate-fade-in"
        >
          <div className="text-8xl font-hand font-bold text-[#d35400] animate-bounce">
            🥁...
          </div>
          <p className="text-3xl font-hand text-stone-600 mt-3">
            Die Spannung steigt in Xàbia...
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PHASE 2: REVEAL (DIE AUFLÖSUNG) */}
      {/* ========================================================================= */}
      {flowState === 'REVEAL' && currentBeer && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-3.5 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden text-stone-900 border border-stone-300 shadow-xl animate-fade-in"
        >
          <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
            <div className="text-center space-y-0.5">
              <h3 className="text-xl font-hand text-stone-600">Tada! Es war:</h3>
              <h1 className="text-3xl sm:text-4xl font-hand font-bold text-[#1e293b] leading-tight">
                {currentBeer.name}
              </h1>
              <p className="text-base font-hand text-stone-700">
                ({currentBeer.brewery} · {currentBeer.style} · {currentBeer.abv}% Vol.)
              </p>
            </div>

            {/* Trivia Box */}
            <div className="trivia-box !text-base !py-1.5">
              💡 <b>Schon gewusst?</b> {currentBeer.trivia || currentBeer.description}
            </div>

            {/* Results Table */}
            <div className="overflow-y-auto max-h-36 sm:max-h-44">
              <div className="flex items-center justify-between px-1 py-1 mb-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs font-hand text-stone-800">
                <span className="font-bold flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                  <span>Preisklasse:</span>
                </span>
                <span className="font-bold text-stone-900">
                  {currentBeer.priceCategory === 'mercadona_budget'
                    ? `🛒 Mercadona-Dose (~${currentBeer.priceEur?.toFixed(2) || '0.40'} €)`
                    : currentBeer.priceCategory === 'classic_bar'
                    ? `🍻 Bar-Bier (~${currentBeer.priceEur?.toFixed(2) || '1.15'} €)`
                    : `💎 Edel-Craft / Reserva (~${currentBeer.priceEur?.toFixed(2) || '1.85'} €)`}
                </span>
              </div>

              <table className="w-full border-collapse font-hand text-lg">
                <thead>
                  <tr className="bg-black/5 border-b border-stone-400">
                    <th className="py-1 px-1.5 text-left">Wer?</th>
                    <th className="py-1 px-1 text-center">Pkt</th>
                    <th className="py-1 px-1.5 text-left">Tipp</th>
                    <th className="py-1 px-1 text-center">Preis</th>
                    <th className="py-1 px-1 text-center">Noten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {session.players.map((p) => {
                    const r = currentRoundRatings[p.id];
                    if (!r) return null;
                    return (
                      <tr key={p.id}>
                        <td className="py-1 px-1.5 font-bold flex items-center gap-1">
                          <span>{p.avatarEmoji}</span>
                          <span className="truncate max-w-[80px]">{p.name}</span>
                        </td>
                        <td className="py-1 px-1 text-center font-bold text-[#d35400]">
                          {r.score}
                        </td>
                        <td className="py-1 px-1.5 text-sm">
                          {r.isHost ? 'Ausschenker' : (r.guessedStyle || '-')}
                        </td>
                        <td className="py-1 px-1 text-center text-xs">
                          {r.isHost ? '-' : r.isPriceMatch ? (
                            <span className="text-emerald-700 font-bold">✓ +25</span>
                          ) : (
                            <span className="text-stone-500">✗</span>
                          )}
                        </td>
                        <td className="py-1 px-1 text-center text-emerald-700 font-bold text-sm">
                          {r.matchedFlavors && r.matchedFlavors.length > 0 ? `+${r.flavorPoints}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Buzzer & Soundboard Toolbar */}
            <LiveBuzzerToolbar
              playerName={activeTurnPlayer.name}
              isMultiplayer={false}
            />
          </div>

          {/* Stable Anchored Bottom Button */}
          <div className="mt-auto pt-2 shrink-0">
            <button
              onClick={handleNextBeer}
              className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              <span>Nächste Runde</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MINIGAMES SCREEN (BETWEEN BEERS) */}
      {/* ========================================================================= */}
      {flowState === 'MINIGAME' && currentMinigame && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-4 sm:p-6 flex-1 flex flex-col justify-between overflow-hidden text-stone-900 border border-stone-300 shadow-xl animate-fade-in"
        >
          <div className="minigame-card space-y-2 text-center flex-1 flex flex-col justify-center">
            <h1 className="text-3xl sm:text-4xl font-hand font-bold text-[#d35400]">
              {currentMinigame.title}
            </h1>
            <h2 className="text-xl font-hand text-stone-800">
              {currentMinigame.subtitle}
            </h2>
            <p className="text-lg font-hand text-stone-700 leading-snug">
              {currentMinigame.description}
            </p>

            {currentMinigame.prompt && (
              <p className="text-xl font-hand font-bold text-[#d35400] italic my-2 px-1">
                {currentMinigame.prompt}
              </p>
            )}
          </div>

          {/* Stable Anchored Bottom Button */}
          <div className="mt-auto pt-2 shrink-0">
            <button
              onClick={handleFinishMinigame}
              className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {currentMinigame.buttonText}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. FINAL SCREEN */}
      {/* ========================================================================= */}
      {flowState === 'FINAL_SCREEN' && (
        <div className="tasting-container rounded-2xl p-4 sm:p-6 space-y-4 text-stone-900 border border-stone-300 shadow-xl animate-fade-in flex-1 flex flex-col justify-between overflow-hidden">
          <div className="space-y-3">
            <div className="text-center space-y-0.5">
              <h1 className="text-3xl sm:text-4xl font-hand font-bold text-[#d35400]">
                🏆 Das große Finale
              </h1>
              <p className="text-lg font-hand text-stone-700">
                Xàbia Blind-Tasting vollständig ausgewertet!
              </p>
            </div>

            {/* Awards Box */}
            {(() => {
              const playerStats = computePlayerLeaderboard(session.players, session.rounds);
              if (playerStats.length === 0) return null;

              const kritiker = [...playerStats].sort((a, b) => a.averageRatingGiven - b.averageRatingGiven)[0];
              const jubler = [...playerStats].sort((a, b) => b.averageRatingGiven - a.averageRatingGiven)[0];
              const sommelier = [...playerStats].sort((a, b) => b.correctStyleGuesses - a.correctStyleGuesses)[0];

              return (
                <div className="p-3 bg-white/90 border border-[#2980b9] rounded-xl space-y-1 font-hand text-lg text-center">
                  <h3 className="text-xl font-bold text-[#2980b9]">
                    👑 Urlaubs-Awards der 4 Jungs
                  </h3>
                  <p>
                    <b>Kritiker:</b> {kritiker.player.name} (Ø {kritiker.averageRatingGiven}/20)
                  </p>
                  <p>
                    <b>Jubler:</b> {jubler.player.name} (Ø {jubler.averageRatingGiven}/20)
                  </p>
                  <p>
                    <b>Sommelier:</b> {sommelier.player.name} ({sommelier.correctStyleGuesses} Stile erraten!)
                  </p>
                </div>
              );
            })()}

            {/* Sieger-Biere */}
            {(() => {
              const beerRankings = computeBeerLeaderboard(session.beers, session.rounds, session.players);
              return (
                <div className="space-y-1 font-hand text-lg">
                  <h2 className="text-xl font-bold text-[#d35400] text-center">
                    🥇 Sieger-Biere (König von Xàbia)
                  </h2>
                  <ol className="list-decimal pl-6 space-y-0.5">
                    {beerRankings.slice(0, 3).map((item, idx) => (
                      <li key={item.beer.id} className={idx === 0 ? 'font-bold text-xl text-[#d35400]' : ''}>
                        <b>{item.beer.name}</b> (Ø {item.averageScore}/20)
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })()}
          </div>

          <div className="mt-auto pt-2 shrink-0 space-y-2">
            {onOpenCertificates && (
              <button
                onClick={onOpenCertificates}
                className="w-full h-12 sm:h-14 bg-gradient-to-r from-amber-600 via-amber-500 to-[#d35400] hover:brightness-105 text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Award className="w-6 h-6 text-amber-100" />
                <span>🏆 Sommelier-Urkunden (WhatsApp & Download)</span>
              </button>
            )}

            <button
              onClick={() => {
                setFlowState('SETUP');
                onUpdateSession({ ...session, rounds: [], isFinished: false });
              }}
              className="w-full h-12 sm:h-14 bg-[#2980b9] hover:bg-[#1f6391] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer text-center flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Neues Tasting starten</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SPICKZETTEL MODAL */}
      {/* ========================================================================= */}
      {showCheatSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="tasting-container rounded-2xl p-5 w-full max-w-md space-y-3 border border-stone-300 shadow-2xl">
            <h2 className="text-2xl font-hand font-bold text-[#d35400] text-center">
              📋 Spickzettel
            </h2>
            <p className="text-base font-hand text-center text-stone-700">
              Geheime Reihenfolge für den Ausschenker:
            </p>
            <ol className="list-decimal pl-6 font-hand text-lg space-y-1 max-h-56 overflow-y-auto">
              {session.beers.map((b, i) => (
                <li key={b.id}>
                  <b>Bier {i + 1}:</b> {b.name} <span className="text-xs font-sans text-stone-600">({b.style})</span>
                </li>
              ))}
            </ol>
            <button
              onClick={() => setShowCheatSheet(false)}
              className="w-full h-11 bg-[#2980b9] text-white font-hand font-bold text-xl rounded-xl cursor-pointer"
            >
              🔙 Schließen
            </button>
          </div>
        </div>
      )}

      {/* EL HIDRATADOR (WASSER- & TAPAS-PAUSE) */}
      <ElHidratadorModal
        isOpen={showHidratador}
        onClose={() => {
          setShowHidratador(false);
          initRound(currentBeerIndex + 1);
        }}
        roundNumber={currentBeerIndex + 1}
      />
    </div>
  );
};
