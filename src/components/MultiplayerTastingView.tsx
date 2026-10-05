import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Smartphone, 
  Copy, 
  Check, 
  ArrowRight, 
  Share2, 
  Crown, 
  Loader2, 
  Flame, 
  Beer as BeerIcon,
  LogOut,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
  ShoppingBag,
  QrCode,
  Droplets
} from 'lucide-react';
import QRCode from 'qrcode';
import { 
  MultiplayerRoom, 
  MultiplayerPlayer, 
  Player, 
  TournamentSession, 
  BeerStyle, 
  PlayerRoundRating,
  PriceCategory 
} from '../types';
import { multiplayerClient } from '../utils/multiplayerClient';
import { calculateSpeedBonus, calculateEvaluationPoints, computePlayerLeaderboard, computeBeerLeaderboard } from '../utils/scoring';
import { PARTY_MODES } from '../data/minigames';
import { soundController } from '../utils/audio';
import { haptic } from '../utils/haptics';
import { LiveBuzzerToolbar } from './LiveBuzzerToolbar';
import { JoinQRCodeModal } from './JoinQRCodeModal';
import { ElHidratadorModal } from './ElHidratadorModal';

interface MultiplayerTastingViewProps {
  session: TournamentSession;
  onUpdateSession: (updated: TournamentSession) => void;
  onSwitchToSingleScreen: () => void;
  onNavigateToLeaderboard: () => void;
  onOpenCertificates?: () => void;
}

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

export const MultiplayerTastingView: React.FC<MultiplayerTastingViewProps> = ({
  session,
  onUpdateSession,
  onSwitchToSingleScreen,
  onNavigateToLeaderboard,
  onOpenCertificates
}) => {
  const currentMode = PARTY_MODES.find((m) => m.id === session.partyMode) || PARTY_MODES[0];

  // Join / Create State
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(() => session.players[0]);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [playerNameInput, setPlayerNameInput] = useState<string>(session.players[0]?.name || 'Jonas');
  const [playerEmojiInput, setPlayerEmojiInput] = useState<string>(session.players[0]?.avatarEmoji || '👑');
  const [playerNicknameInput, setPlayerNicknameInput] = useState<string>(session.players[0]?.nickname || 'Sommelier');

  // Collapsible progress bar
  const [isProgressExpanded, setIsProgressExpanded] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState<boolean>(false);
  const [lobbyQrCodeDataUrl, setLobbyQrCodeDataUrl] = useState<string>('');

  // Active round inputs on this device
  const [score, setScore] = useState<number>(12);
  const [selectedStyle, setSelectedStyle] = useState<BeerStyle>('Lager');
  const [selectedPriceCategory, setSelectedPriceCategory] = useState<PriceCategory | undefined>(undefined);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const isHost = room ? room.hostId === currentPlayer.id : false;
  const currentBeer = room ? (room.session.beers[room.currentBeerIndex] || session.beers[0]) : session.beers[0];

  // Progressive drunk sway calculation
  const currentRoundNum = room ? room.currentBeerIndex : 0;
  const swayDeg = Math.min(4.8, currentRoundNum * 0.55).toFixed(1);
  const swaySpeed = Math.max(2.8, 6.0 - currentRoundNum * 0.32).toFixed(1);
  const dynamicSwayStyle = {
    '--sway-deg': `${swayDeg}deg`,
    '--sway-speed': `${swaySpeed}s`
  } as React.CSSProperties;

  // Check URL parameters for direct join: ?room=XXXXX
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('room');
    if (codeFromUrl) {
      setRoomCodeInput(codeFromUrl.toUpperCase());
    }
  }, []);

  // Generate QR code data URL whenever room code is created/updated
  useEffect(() => {
    if (typeof window === 'undefined' || !room?.code) return;
    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    QRCode.toDataURL(joinUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#1c1917', light: '#ffffff' }
    })
      .then((url) => setLobbyQrCodeDataUrl(url))
      .catch((err) => console.error('Error generating lobby QR code:', err));
  }, [room?.code]);

  // Subscribe to real-time room updates via WebSocket & Polling
  useEffect(() => {
    if (!room?.code) return;

    const unsubscribe = multiplayerClient.subscribe(room.code, currentPlayer.id, (updatedRoom) => {
      setRoom(updatedRoom);

      // Trigger synchronized sounds & confetti on stage transitions
      if (updatedRoom.stage === 'DRUMROLL') {
        soundController.playSuspense();
        haptic.drumroll();
      } else if (updatedRoom.stage === 'REVEAL') {
        soundController.playTada();
        haptic.tada();
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } else if (updatedRoom.stage === 'MINIGAME') {
        soundController.playBeerOpen();
        haptic.alarm();
      } else if (updatedRoom.stage === 'HIDRATADOR') {
        soundController.playWaterSplash();
        haptic.alarm();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [room?.code, currentPlayer.id]);

  // Timer for tasting
  useEffect(() => {
    if (room?.stage === 'TASTING' && !hasAlreadySubmitted) {
      setTimerRunning(true);
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - start) / 1000));
      }, 500);
    } else {
      setTimerRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.stage, room?.currentBeerIndex]);

  const hasAlreadySubmitted = room
    ? !!room.currentRoundRatings[currentPlayer.id] ||
      room.players.find((p) => p.id === currentPlayer.id)?.hasSubmitted
    : false;

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const host: Player = {
        id: 'host-' + Date.now(),
        name: playerNameInput.trim() || 'Host',
        nickname: playerNicknameInput.trim() || 'El Capitán',
        avatarEmoji: playerEmojiInput || '👑',
        totalPoints: 0,
        correctStyleGuesses: 0,
        totalGuesses: 0,
        matchedFlavorsCount: 0,
        fastestDrinkSeconds: null,
        averageRatingGiven: 0,
        beersTastedCount: 0,
        badges: ['Host']
      };
      setCurrentPlayer(host);

      const createdRoom = await multiplayerClient.createRoom(host, session);
      setRoom(createdRoom);
      soundController.playBeerOpen();
      haptic.success();
    } catch (err: any) {
      setErrorMsg(err.message || 'Konnte Raum nicht erstellen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCodeInput.trim()) {
      setErrorMsg('Bitte gib einen Raum-Code ein!');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const guest: Player = {
        id: 'guest-' + Date.now(),
        name: playerNameInput.trim() || 'Mitspieler',
        nickname: playerNicknameInput.trim() || 'Gast',
        avatarEmoji: playerEmojiInput || '🍺',
        totalPoints: 0,
        correctStyleGuesses: 0,
        totalGuesses: 0,
        matchedFlavorsCount: 0,
        fastestDrinkSeconds: null,
        averageRatingGiven: 0,
        beersTastedCount: 0,
        badges: ['Gast']
      };
      setCurrentPlayer(guest);

      const joinedRoom = await multiplayerClient.joinRoom(roomCodeInput.trim().toUpperCase(), guest);
      setRoom(joinedRoom);
      soundController.playBeerOpen();
      haptic.success();
    } catch (err: any) {
      setErrorMsg(err.message || 'Raum nicht gefunden');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!room?.code) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    const text = `🍻 Cerveza Xàbia Tasting! Tritt unserer Runde bei:\nRaum-Code: *${room.code}*\nLink: ${shareUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    haptic.tap();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleStartGameFromLobby = async () => {
    if (!room?.code) return;
    haptic.success();
    await multiplayerClient.sendAction(room.code, 'START_GAME');
  };

  const toggleFlavor = (tag: string) => {
    haptic.tap();
    if (selectedFlavors.includes(tag)) {
      setSelectedFlavors(selectedFlavors.filter((t) => t !== tag));
    } else {
      setSelectedFlavors([...selectedFlavors, tag]);
    }
  };

  const handleSubmitMyRating = async () => {
    if (!room?.code) return;

    const speedBonus = calculateSpeedBonus(timeElapsed, currentMode);
    const { isStyleMatch, stylePoints, matchedFlavors, flavorPoints, isPriceMatch, pricePoints } = calculateEvaluationPoints(
      selectedStyle,
      selectedFlavors,
      currentBeer,
      currentMode,
      selectedPriceCategory
    );

    const totalPointsEarned = speedBonus + stylePoints + flavorPoints + pricePoints;

    const rating: PlayerRoundRating = {
      playerId: currentPlayer.id,
      score,
      guessedStyle: selectedStyle,
      guessedPriceCategory: selectedPriceCategory,
      timeSeconds: timeElapsed,
      speedBonusPoints: speedBonus,
      stylePoints,
      flavorPoints,
      matchedFlavors,
      pricePoints,
      isPriceMatch,
      totalPointsEarned,
      flavorTags: selectedFlavors,
      isHost: false
    };

    soundController.playCountdownTick(true);
    haptic.success();

    await multiplayerClient.sendAction(room.code, 'SUBMIT_RATING', {
      playerId: currentPlayer.id,
      rating
    });
  };

  const handleHostStartDrumroll = async () => {
    if (!room?.code) return;
    haptic.drumroll();
    await multiplayerClient.sendAction(room.code, 'START_DRUMROLL');
    setTimeout(async () => {
      await multiplayerClient.sendAction(room.code, 'SHOW_REVEAL');
    }, 1500);
  };

  const handleHostNextBeer = async () => {
    if (!room?.code) return;
    haptic.tap();
    const nextIdx = room.currentBeerIndex + 1;

    if (nextIdx >= room.session.beers.length) {
      await multiplayerClient.sendAction(room.code, 'SHOW_FINAL');
      return;
    }

    // Minigames on milestone beers
    if (nextIdx === 2) {
      await multiplayerClient.sendAction(room.code, 'TRIGGER_MINIGAME', {
        minigame: {
          title: '🦉 Stammtisch-Philosophie',
          subtitle: 'Tiefgang an der Costa Blanca',
          description: 'Legt kurz die Handys beiseite und diskutiert für 2 Minuten:',
          prompt: '"Wenn jeder von euch ein spanisches Bier wäre – welches wäre er und warum?"',
          bgClass: 'deep-bg',
          buttonText: '✅ Weiter zu Bier 3'
        }
      });
    } else if (nextIdx === 4) {
      soundController.playWaterSplash();
      haptic.alarm();
      await multiplayerClient.sendAction(room.code, 'TRIGGER_HIDRATADOR');
    } else {
      await multiplayerClient.sendAction(room.code, 'NEXT_BEER', { nextBeerIndex: nextIdx });
    }
  };

  const handleHostFinishHidratador = async () => {
    if (!room?.code) return;
    haptic.success();
    soundController.playPasodobleFanfare();
    await multiplayerClient.sendAction(room.code, 'NEXT_BEER', {
      nextBeerIndex: room.currentBeerIndex + 1
    });
  };

  const handleHostFinishMinigame = async () => {
    if (!room?.code) return;
    haptic.tap();
    await multiplayerClient.sendAction(room.code, 'NEXT_BEER', {
      nextBeerIndex: room.currentBeerIndex + 1
    });
  };

  const handleLeaveRoom = () => {
    multiplayerClient.disconnect();
    setRoom(null);
  };

  const totalBeersCount = room ? room.session.beers.length : session.beers.length;
  const currentBeerNum = room ? room.currentBeerIndex + 1 : 1;
  const remainingBeersCount = Math.max(0, totalBeersCount - currentBeerNum);
  const progressPercent = Math.min(100, Math.max(6, (currentBeerNum / totalBeersCount) * 100));

  return (
    <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-between overflow-hidden h-full select-none">
      {/* ========================================================================= */}
      {/* COLLAPSIBLE PROGRESS BAR (DURING MULTIPLAYER ROUNDS) */}
      {/* ========================================================================= */}
      {room && room.stage !== 'LOBBY' && room.stage !== 'FINAL' && (
        <div className="mb-2 shrink-0 animate-fade-in">
          {!isProgressExpanded ? (
            /* Compact Collapsed Bar */
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
                  Bier {currentBeerNum} von {totalBeersCount}
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
            /* Expanded Full Bar */
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
                  <span>Bier {currentBeerNum} von {totalBeersCount}</span>
                </span>
                <div className="flex items-center gap-1 text-stone-300 text-sm">
                  <span>{remainingBeersCount === 0 ? '🏁 Finale Runde!' : `Noch ${remainingBeersCount} übrig`}</span>
                  <ChevronUp className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              <div className="relative w-full h-3 bg-stone-950 rounded-full border border-stone-700/80 p-0.5 overflow-hidden flex items-center shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 rounded-full transition-all duration-300 ease-out relative flex items-center justify-end shadow"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="w-2 h-full bg-white/95 rounded-full shadow-sm" />
                </div>
              </div>

              <div className="flex justify-between px-1 text-[10px] font-mono text-stone-500">
                {room.session.beers.map((_, i) => (
                  <span
                    key={i}
                    className={`transition-colors ${
                      i === room.currentBeerIndex
                        ? 'text-amber-400 font-bold scale-110'
                        : i < room.currentBeerIndex
                        ? 'text-amber-600 font-medium'
                        : 'text-stone-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-xs">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic.tap();
                    setShowQRCodeModal(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg cursor-pointer transition-colors"
                  title="QR-Code zum Beitreten anzeigen"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR-Code zeigen</span>
                </button>

                {isHost && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      haptic.alarm();
                      soundController.playWaterSplash();
                      await multiplayerClient.sendAction(room.code, 'TRIGGER_HIDRATADOR');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 rounded-lg cursor-pointer transition-colors"
                    title="Wasser- & Tapas-Pause ausrufen"
                  >
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    <span>El Hidratador</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ROOM ENTRY / CHOICE */}
      {/* ========================================================================= */}
      {!room && (
        <div className="tasting-container rounded-2xl p-4 sm:p-6 space-y-4 text-stone-900 border border-stone-300 shadow-xl animate-fade-in flex-1 flex flex-col justify-between overflow-hidden">
          <div className="space-y-3">
            <div className="text-center space-y-0.5">
              <h1 className="text-3xl sm:text-4xl font-hand font-bold text-[#d35400]">
                📲 Multiplayer-Modus
              </h1>
              <p className="text-base sm:text-lg font-hand text-stone-700">
                Jeder tippt live auf seinem eigenen Smartphone!
              </p>
            </div>

            {/* Profile */}
            <div className="p-3 bg-white/90 border border-stone-300 rounded-xl space-y-1.5 font-hand">
              <span className="text-base font-bold text-stone-800">Dein Spieler-Profil:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playerEmojiInput}
                  onChange={(e) => setPlayerEmojiInput(e.target.value)}
                  className="w-11 p-1 text-center text-xl bg-stone-100 border border-stone-400 rounded-xl"
                />
                <input
                  type="text"
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  placeholder="Dein Name"
                  className="flex-1 p-1.5 text-lg bg-stone-100 border border-stone-400 rounded-xl text-stone-900"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-100 border border-red-300 rounded-xl font-hand text-base text-red-800">
                {errorMsg}
              </div>
            )}

            {/* Create Room Button */}
            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full py-3 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-xl rounded-xl shadow cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              <span>Neuen Raum erstellen (Ich bin Host)</span>
            </button>

            <div className="flex items-center gap-2 text-stone-500 font-hand text-sm">
              <div className="flex-1 h-px bg-stone-300"></div>
              <span>ODER</span>
              <div className="flex-1 h-px bg-stone-300"></div>
            </div>

            {/* Join with Code */}
            <div className="p-3 bg-white/90 border border-stone-300 rounded-xl space-y-2 font-hand">
              <label className="text-base font-bold text-stone-800 block text-center">
                Raum-Code von Freunden:
              </label>
              <input
                type="text"
                maxLength={6}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="z.B. XABIA"
                className="w-full p-2 text-center tracking-widest text-2xl font-bold uppercase bg-stone-100 border-2 border-[#2980b9] rounded-xl text-[#2980b9]"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isLoading || !roomCodeInput.trim()}
                className="w-full py-2.5 bg-[#2980b9] hover:bg-[#1f6391] text-white font-bold text-xl rounded-xl shadow cursor-pointer active:scale-95 transition-all text-center"
              >
                🚪 Raum beitreten
              </button>
            </div>
          </div>

          <div className="mt-auto pt-2 shrink-0">
            <button
              onClick={onSwitchToSingleScreen}
              className="w-full h-11 bg-stone-200 hover:bg-stone-300 text-stone-800 font-hand font-bold text-lg rounded-xl shadow cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>1 Bildschirm Modus (Handy rumreichen)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MULTIPLAYER LOBBY */}
      {/* ========================================================================= */}
      {room && room.stage === 'LOBBY' && (
        <div className="tasting-container rounded-2xl p-4 sm:p-6 space-y-4 text-stone-900 border border-stone-300 shadow-xl animate-fade-in flex-1 flex flex-col justify-between overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-300 pb-1.5">
              <div>
                <span className="text-xs uppercase font-hand font-bold text-[#d35400]">
                  Multiplayer Lobby
                </span>
                <h2 className="text-2xl font-hand font-bold text-stone-900">
                  Raum ist bereit!
                </h2>
              </div>
              <button
                onClick={handleLeaveRoom}
                className="p-1.5 text-stone-500 hover:text-red-600 cursor-pointer"
                title="Raum verlassen"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Room Code Card */}
            <div className="p-3 bg-white/95 border-2 border-dashed border-[#d35400] rounded-xl text-center space-y-2">
              <span className="font-hand text-base text-stone-600">Raum-Code:</span>
              <div className="font-hand text-4xl sm:text-5xl font-bold tracking-widest text-[#d35400] leading-none">
                {room.code}
              </div>

              {/* Instant QR Code for Table Friends */}
              {lobbyQrCodeDataUrl && (
                <div 
                  onClick={() => {
                    haptic.tap();
                    setShowQRCodeModal(true);
                  }}
                  className="p-2 bg-stone-100/90 rounded-xl border border-stone-300 inline-flex flex-col items-center gap-1 mx-auto cursor-pointer hover:bg-stone-200 transition-colors shadow-sm active:scale-95"
                  title="Zum Vergrößern tippen"
                >
                  <img
                    src={lobbyQrCodeDataUrl}
                    alt={`QR Code ${room.code}`}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg block select-none bg-white p-1"
                  />
                  <div className="flex items-center gap-1 text-[11px] font-sans font-bold text-stone-700">
                    <QrCode className="w-3.5 h-3.5 text-[#d35400]" />
                    <span>📸 Kamera draufhalten zum Beitreten</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-0.5">
                <button
                  onClick={handleCopyInviteLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#2980b9] hover:bg-[#1f6391] text-white font-hand font-bold text-base rounded-xl shadow cursor-pointer active:scale-95 transition-all"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Kopiert!' : 'WhatsApp Einladung kopieren'}</span>
                </button>

                <button
                  onClick={() => {
                    haptic.tap();
                    setShowQRCodeModal(true);
                  }}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-hand font-bold text-base rounded-xl shadow cursor-pointer active:scale-95 transition-all"
                  title="QR-Code im Großformat zeigen"
                >
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Groß</span>
                </button>
              </div>
            </div>

            {/* Players */}
            <div className="space-y-1">
              <div className="font-hand text-lg font-bold text-stone-800 flex items-center justify-between">
                <span>Mitspieler ({room.players.length}):</span>
                <span className="text-xs font-sans text-emerald-700">● Live</span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {room.players.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 bg-white/80 border border-stone-300 rounded-xl flex items-center justify-between font-hand text-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{p.avatarEmoji}</span>
                      <span className="font-bold text-stone-900">{p.name}</span>
                    </div>
                    {p.isHost ? (
                      <span className="text-xs font-sans text-[#d35400] font-bold">[Host]</span>
                    ) : (
                      <span className="text-xs font-sans text-emerald-700 font-medium">Bereit ✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-2 shrink-0">
            {isHost ? (
              <button
                onClick={handleStartGameFromLobby}
                className="w-full h-12 sm:h-14 bg-[#27ae60] hover:bg-[#219150] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                🚀 Verkostung mit allen starten!
              </button>
            ) : (
              <div className="w-full h-12 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center text-center font-hand text-lg text-stone-800">
                ⏳ Warte auf den Host zum Starten...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MULTIPLAYER TASTING */}
      {/* ========================================================================= */}
      {room && room.stage === 'TASTING' && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-3.5 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden text-stone-900 border border-stone-300 shadow-xl animate-fade-in"
        >
          <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
            {/* Header & Status */}
            <div className="text-center space-y-0.5">
              <div className="player-turn-banner !text-2xl !py-1">
                🕵️ Bier Nummer {currentBeerNum}
              </div>

              {/* Live Tracker */}
              <div className="flex flex-wrap gap-1 justify-center pt-0.5">
                {room.players.map((p) => {
                  const hasSubmitted = p.hasSubmitted || !!room.currentRoundRatings[p.id];
                  return (
                    <span
                      key={p.id}
                      className={`px-2 py-0.5 rounded-lg text-xs font-hand border flex items-center gap-1 ${
                        hasSubmitted
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-stone-100 border-stone-300 text-stone-500'
                      }`}
                    >
                      <span>{p.avatarEmoji}</span>
                      <span>{p.name}</span>
                      <span>{hasSubmitted ? '✓' : '...'}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {hasAlreadySubmitted ? (
              <div className="p-4 text-center space-y-2 font-hand bg-white/80 rounded-2xl border border-stone-300 flex-1 flex flex-col justify-center">
                <div className="text-6xl animate-bounce">🍻</div>
                <h3 className="text-2xl font-bold text-emerald-800">
                  Wertung eingeloggt!
                </h3>
                <p className="text-lg text-stone-700">
                  Warte auf die anderen am Tisch... Sobald alle fertig sind, wird aufgelöst!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Score */}
                <div className="text-center space-y-0.5">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-hand text-xl text-stone-800">Punkte:</span>
                    <span className="font-hand text-4xl sm:text-5xl font-bold text-[#d35400] leading-none">
                      {score}
                    </span>
                    <span className="font-hand text-lg text-stone-500">/ 20</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={score}
                    onChange={(e) => {
                      setScore(Number(e.target.value));
                      haptic.tick();
                    }}
                    className="w-full accent-[#d35400] cursor-pointer"
                  />
                </div>

                {/* Style */}
                <div className="space-y-1">
                  <p className="text-base text-center font-hand text-stone-800 leading-none">
                    Welcher Bier-Typ ist es?
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {GUESS_CATEGORIES.map((cat) => {
                      const isSelected = selectedStyle === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedStyle(cat.id);
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

                {/* Flavors */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between font-hand text-sm text-stone-800">
                    <span>Noten herausschmecken:</span>
                    <span className="text-emerald-700 font-bold">+10 Pkt</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {FLAVOR_TAGS.map((tag) => {
                      const isSelected = selectedFlavors.includes(tag);
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

                {/* Billig oder Edel? Preisschätzung */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between font-hand text-sm text-stone-800">
                    <span>🛒 Billig oder Edel? (Preistipp):</span>
                    <span className="text-amber-700 font-bold">+25 Pkt</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 font-hand">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPriceCategory('mercadona_budget');
                        haptic.tap();
                      }}
                      className={`p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                        selectedPriceCategory === 'mercadona_budget'
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
                        setSelectedPriceCategory('classic_bar');
                        haptic.tap();
                      }}
                      className={`p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                        selectedPriceCategory === 'classic_bar'
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
                        setSelectedPriceCategory('premium_craft');
                        haptic.tap();
                      }}
                      className={`p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                        selectedPriceCategory === 'premium_craft'
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
              </div>
            )}
          </div>

          {/* Bottom Button */}
          <div className="mt-auto pt-2 shrink-0">
            {hasAlreadySubmitted ? (
              isHost ? (
                <button
                  onClick={handleHostStartDrumroll}
                  className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  🥁 Auflösung für alle starten
                </button>
              ) : (
                <div className="w-full h-12 bg-stone-200 border border-stone-300 rounded-xl flex items-center justify-center text-center font-hand text-lg text-stone-600">
                  Warte auf die anderen am Tisch...
                </div>
              )
            ) : (
              <button
                onClick={handleSubmitMyRating}
                className="w-full h-12 sm:h-14 bg-[#27ae60] hover:bg-[#219150] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                ✅ Wertung abschicken
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MULTIPLAYER PRE-REVEAL */}
      {/* ========================================================================= */}
      {room && room.stage === 'PRE_REVEAL' && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-4 sm:p-6 flex-1 flex flex-col justify-between overflow-hidden text-stone-900 border border-stone-300 text-center shadow-xl animate-fade-in"
        >
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-hand font-bold text-[#d35400]">
              Bier {currentBeerNum}
            </h2>
            <p className="text-2xl font-hand text-stone-800">
              Alle haben getippt!
            </p>
            <div className="text-7xl my-2">🤫</div>
            {!isHost && (
              <p className="font-hand text-xl text-stone-600 italic">
                Der Host startet gleich den Trommelwirbel...
              </p>
            )}
          </div>

          <div className="mt-auto pt-2 shrink-0">
            {isHost ? (
              <button
                onClick={handleHostStartDrumroll}
                className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                🥁 Auflösung auf allen Handys starten!
              </button>
            ) : (
              <div className="w-full h-12 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center text-center font-hand text-lg text-stone-800">
                🤫 Bereit machen für die Auflösung...
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRUMROLL */}
      {room && room.stage === 'DRUMROLL' && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-6 flex-1 flex flex-col justify-center items-center overflow-hidden text-stone-900 border border-stone-300 text-center shadow-xl animate-fade-in"
        >
          <div className="text-8xl font-hand font-bold text-[#d35400] animate-bounce">
            🥁...
          </div>
          <p className="text-3xl font-hand text-stone-600 mt-3">
            Gleich wird auf allen Handys aufgelöst...
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MULTIPLAYER REVEAL */}
      {/* ========================================================================= */}
      {room && room.stage === 'REVEAL' && currentBeer && (
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
                    <th className="py-1 px-1.5 text-left">Spieler</th>
                    <th className="py-1 px-1 text-center">Pkt</th>
                    <th className="py-1 px-1.5 text-left">Tipp</th>
                    <th className="py-1 px-1 text-center">Preis</th>
                    <th className="py-1 px-1 text-center">Noten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {room.players.map((p) => {
                    const r = room.currentRoundRatings[p.id];
                    return (
                      <tr key={p.id}>
                        <td className="py-1 px-1.5 font-bold flex items-center gap-1">
                          <span>{p.avatarEmoji}</span>
                          <span className="truncate max-w-[80px]">{p.name}</span>
                        </td>
                        <td className="py-1 px-1 text-center font-bold text-[#d35400]">
                          {r ? r.score : '-'}
                        </td>
                        <td className="py-1 px-1.5 text-sm">
                          {r?.guessedStyle ? (
                            r.guessedStyle === currentBeer.style ? (
                              <span className="text-emerald-700 font-bold">✓ {r.guessedStyle}</span>
                            ) : (
                              <span className="text-stone-700">{r.guessedStyle}</span>
                            )
                          ) : '-'}
                        </td>
                        <td className="py-1 px-1 text-center text-xs">
                          {r?.isHost ? '-' : r?.isPriceMatch ? (
                            <span className="text-emerald-700 font-bold">✓ +25</span>
                          ) : (
                            <span className="text-stone-500">✗</span>
                          )}
                        </td>
                        <td className="py-1 px-1 text-center text-emerald-700 font-bold text-sm">
                          {r?.matchedFlavors && r.matchedFlavors.length > 0 ? `+${r.flavorPoints}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Real-time Emoji Buzzer & Soundboard Toolbar */}
            <LiveBuzzerToolbar
              playerName={currentPlayer.name}
              isMultiplayer={true}
            />
          </div>

          <div className="mt-auto pt-2 shrink-0">
            {isHost ? (
              <button
                onClick={handleHostNextBeer}
                className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Nächste Runde für alle</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-full h-12 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center text-center font-hand text-lg text-stone-800">
                Warte auf den Host für die nächste Runde...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MULTIPLAYER MINIGAME */}
      {/* ========================================================================= */}
      {room && room.stage === 'MINIGAME' && room.currentMinigame && (
        <div
          style={dynamicSwayStyle}
          className="tasting-container dynamic-sway rounded-2xl p-4 sm:p-6 flex-1 flex flex-col justify-between overflow-hidden text-stone-900 border border-stone-300 shadow-xl animate-fade-in"
        >
          <div className="minigame-card space-y-2 text-center flex-1 flex flex-col justify-center">
            <h1 className="text-3xl sm:text-4xl font-hand font-bold text-[#d35400]">
              {room.currentMinigame.title}
            </h1>
            <h2 className="text-xl font-hand text-stone-800">
              {room.currentMinigame.subtitle}
            </h2>
            <p className="text-lg font-hand text-stone-700 leading-snug">
              {room.currentMinigame.description}
            </p>

            {room.currentMinigame.prompt && (
              <p className="text-xl font-hand font-bold text-[#d35400] italic my-2 px-1">
                {room.currentMinigame.prompt}
              </p>
            )}
          </div>

          <div className="mt-auto pt-2 shrink-0">
            {isHost ? (
              <button
                onClick={handleHostFinishMinigame}
                className="w-full h-12 sm:h-14 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {room.currentMinigame.buttonText}
              </button>
            ) : (
              <div className="w-full h-12 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center text-center font-hand text-lg text-stone-800">
                Der Host schaltet gleich weiter...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MULTIPLAYER FINAL */}
      {/* ========================================================================= */}
      {room && room.stage === 'FINAL' && (
        <div className="tasting-container rounded-2xl p-4 sm:p-6 space-y-4 text-stone-900 border border-stone-300 text-center shadow-xl animate-fade-in flex-1 flex flex-col justify-between overflow-hidden">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-hand font-bold text-[#d35400]">
              🏆 Das große Finale!
            </h1>
            <p className="text-lg font-hand text-stone-700">
              Das Tasting ist beendet! Alle Daten wurden ausgewertet.
            </p>
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
              onClick={onNavigateToLeaderboard}
              className="w-full h-12 sm:h-14 bg-[#2980b9] text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              📊 Gesamtrangliste & König von Xàbia ansehen
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. EL HIDRATADOR (WASSER- & TAPAS-PAUSE SYNCHRONIZED) */}
      {/* ========================================================================= */}
      {room && (
        <ElHidratadorModal
          isOpen={room.stage === 'HIDRATADOR'}
          onClose={handleHostFinishHidratador}
          roundNumber={room.currentBeerIndex + 1}
          isHost={isHost}
        />
      )}

      {/* ========================================================================= */}
      {/* 9. JOIN QR CODE FULLSCREEN MODAL */}
      {/* ========================================================================= */}
      {room && (
        <JoinQRCodeModal
          isOpen={showQRCodeModal}
          onClose={() => setShowQRCodeModal(false)}
          roomCode={room.code}
        />
      )}
    </div>
  );
};
