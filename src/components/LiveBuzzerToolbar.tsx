import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { soundController } from '../utils/audio';
import { haptic } from '../utils/haptics';
import { multiplayerClient, LiveReaction } from '../utils/multiplayerClient';

interface LiveBuzzerToolbarProps {
  playerName: string;
  isMultiplayer?: boolean;
}

interface FloatingReactionItem {
  id: string;
  emoji: string;
  senderName: string;
  xPercent: number;
}

const EMOJI_BUZZERS = [
  { emoji: '🍺', label: 'Prost!' },
  { emoji: '🔥', label: 'Fuego!' },
  { emoji: '💀', label: 'Tot!' },
  { emoji: '🍋', label: 'Sauer!' },
  { emoji: '💧', label: 'Agua!' },
  { emoji: '🎺', label: 'Olé!' },
  { emoji: '🇪🇸', label: 'Xàbia!' }
];

export const LiveBuzzerToolbar: React.FC<LiveBuzzerToolbarProps> = ({
  playerName,
  isMultiplayer = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);

  // Subscribe to multiplayer reactions if active
  useEffect(() => {
    if (!isMultiplayer) return;

    const unsubscribe = multiplayerClient.subscribeReactions((reaction: LiveReaction) => {
      if (reaction.reactionType === 'emoji' && reaction.emoji) {
        addFloatingReaction(reaction.emoji, reaction.senderName);
        soundController.playReactionPop();
        haptic.tap();
      } else if (reaction.reactionType === 'sound' && reaction.sound) {
        triggerSoundByName(reaction.sound);
        haptic.tap();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isMultiplayer]);

  const addFloatingReaction = (emoji: string, sender: string) => {
    const id = Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    // Random horizontal position between 15% and 85%
    const xPercent = Math.floor(Math.random() * 70) + 15;
    const newItem: FloatingReactionItem = { id, emoji, senderName: sender, xPercent };

    setFloatingReactions((prev) => [...prev.slice(-12), newItem]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2300);
  };

  const triggerSoundByName = (soundName: string) => {
    switch (soundName) {
      case 'pasodoble':
        soundController.playPasodobleFanfare();
        break;
      case 'cheers':
        soundController.playGlassesCheers();
        break;
      case 'fail':
        soundController.playSadTrombone();
        break;
      case 'salud':
        soundController.playSaludCojones();
        break;
      case 'airhorn':
        soundController.playAirHorn();
        break;
      case 'water':
        soundController.playWaterSplash();
        haptic.alarm();
        break;
      default:
        break;
    }
  };

  const handleEmojiClick = (emoji: string) => {
    haptic.tap();
    soundController.playReactionPop();
    addFloatingReaction(emoji, playerName);

    if (isMultiplayer) {
      multiplayerClient.sendEmojiBuzzer(emoji, playerName);
    }
  };

  const handleSoundClick = (soundKey: string) => {
    haptic.tap();
    triggerSoundByName(soundKey);

    if (isMultiplayer) {
      multiplayerClient.sendSoundTrigger(soundKey, playerName);
    }
  };

  return (
    <>
      {/* Floating Reaction Bubbles Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((item) => (
          <div
            key={item.id}
            className="absolute bottom-24 flex flex-col items-center animate-float-up pointer-events-none transition-transform"
            style={{ left: `${item.xPercent}%` }}
          >
            <span className="text-4xl drop-shadow-md select-none">{item.emoji}</span>
            <span className="text-[10px] font-sans font-bold bg-stone-900/85 text-amber-300 border border-stone-700 px-2 py-0.5 rounded-full mt-1 backdrop-blur-sm whitespace-nowrap shadow">
              {item.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Docked Toolbar Container */}
      <div className="w-full bg-[#121520]/95 backdrop-blur-md border border-stone-800 rounded-2xl shadow-xl p-2 my-2 transition-all">
        {/* Top: Emoji Buzzers */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1 justify-around">
            {EMOJI_BUZZERS.map((b) => (
              <button
                key={b.emoji}
                onClick={() => handleEmojiClick(b.emoji)}
                title={b.label}
                className="w-10 h-10 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/60 active:scale-90 flex items-center justify-center text-xl transition-all cursor-pointer shadow hover:bg-stone-800"
              >
                {b.emoji}
              </button>
            ))}
          </div>

          {/* Toggle for Quick Sounds */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isExpanded
                ? 'bg-amber-500 text-stone-950 border-amber-400'
                : 'bg-stone-900 text-stone-300 border-stone-800 hover:text-white'
            }`}
            title="Soundboard Effekte einblenden"
          >
            <Volume2 className="w-3.5 h-3.5" />
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Sound Triggers */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-stone-800 grid grid-cols-2 sm:grid-cols-5 gap-1.5 animate-fade-in font-sans">
            <button
              onClick={() => handleSoundClick('pasodoble')}
              className="px-2 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xl text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all truncate"
            >
              <span>🎺</span>
              <span>Pasodoble</span>
            </button>

            <button
              onClick={() => handleSoundClick('cheers')}
              className="px-2 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 rounded-xl text-[11px] font-bold text-cyan-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all truncate"
            >
              <span>🍻</span>
              <span>Anstoßen</span>
            </button>

            <button
              onClick={() => handleSoundClick('fail')}
              className="px-2 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 rounded-xl text-[11px] font-bold text-red-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all truncate"
            >
              <span>😭</span>
              <span>Wah-Wah Fail</span>
            </button>

            <button
              onClick={() => handleSoundClick('salud')}
              className="px-2 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 rounded-xl text-[11px] font-bold text-emerald-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all truncate"
            >
              <span>🔥</span>
              <span>¡Salud, Cojones!</span>
            </button>

            <button
              onClick={() => handleSoundClick('airhorn')}
              className="px-2 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 rounded-xl text-[11px] font-bold text-purple-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all truncate"
            >
              <span>📢</span>
              <span>Air Horn</span>
            </button>

            <button
              onClick={() => handleSoundClick('water')}
              className="px-2 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 rounded-xl text-[11px] font-bold text-cyan-200 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all truncate"
            >
              <span>💧</span>
              <span>Wasserpause</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};
