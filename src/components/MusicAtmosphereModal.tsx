import React from 'react';
import { X, Music, Volume2, VolumeX, Sparkles, Play, Square, ExternalLink } from 'lucide-react';
import { soundController } from '../utils/audio';

interface MusicAtmosphereModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFiestaPlaying: boolean;
  onToggleFiesta: () => void;
}

export const MusicAtmosphereModal: React.FC<MusicAtmosphereModalProps> = ({
  isOpen,
  onClose,
  isMuted,
  onToggleMute,
  isFiestaPlaying,
  onToggleFiesta
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#12151f] border border-stone-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Music className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-white tracking-tight">
              Party-Atmosphäre & Soundboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-300">
          {/* Ambient Fiesta Groove Synthesizer */}
          <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Live Web Audio Generator
                </span>
                <h3 className="text-sm font-bold text-white">
                  Mediterrane Terrassen-Gitarre & Shaker
                </h3>
              </div>
              <button
                onClick={onToggleFiesta}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  isFiestaPlaying
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                    : 'bg-emerald-400 text-stone-950 hover:bg-emerald-300'
                }`}
              >
                {isFiestaPlaying ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Fiesta Loop</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Warme Flamenco-Akkorde im Phrygischen Modus mit Rhythmus-Shakern. Funktioniert 100% offline ohne Internetverbindung direkt im Browser auf der Terrasse in Xàbia!
            </p>
          </div>

          {/* Soundboard for the guys */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
              Schnell-Soundboard für das Tasting
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => soundController.playBeerOpen()}
                className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-white group-hover:text-amber-400 flex items-center gap-1.5">
                  🍾 Kronkorken-Plopp
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Zischen & Flaschenöffnung
                </div>
              </button>

              <button
                onClick={() => soundController.playVictoryFanfare()}
                className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-emerald-500/50 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-white group-hover:text-emerald-400 flex items-center gap-1.5">
                  🎺 Jubel-Fanfare
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Perfekter Volltreffer
                </div>
              </button>

              <button
                onClick={() => soundController.playBuzzer()}
                className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-red-500/50 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-white group-hover:text-red-400 flex items-center gap-1.5">
                  🚨 Strafschluck-Buzzer
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Komplett falscher Tipp
                </div>
              </button>

              <button
                onClick={() => soundController.playCountdownTick(true)}
                className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-cyan-500/50 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-white group-hover:text-cyan-400 flex items-center gap-1.5">
                  ⏱️ Countdown Beep
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Sekunden ablaufen lassen
                </div>
              </button>
            </div>
          </div>

          {/* Spotify & Musik Playlists Inspiration */}
          <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-2.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              Spotify Playlists für Xàbia & Jávea
            </span>
            <div className="space-y-2 text-xs">
              <a
                href="https://open.spotify.com/search/chiringuito%20sunset"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 bg-stone-900 rounded-lg border border-stone-800 hover:border-emerald-500/40 text-stone-200 transition-colors"
              >
                <span>Chiringuito Sunset Sessions (Beach Bar Vibes)</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
              </a>
              <a
                href="https://open.spotify.com/search/spanish%20fiesta%20party"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 bg-stone-900 rounded-lg border border-stone-800 hover:border-emerald-500/40 text-stone-200 transition-colors"
              >
                <span>Spanische Fiesta & Tapas Bar Hits</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0e111a] border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={onToggleMute}
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Stummschaltung aufheben' : 'Gesamtsound stummschalten'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
