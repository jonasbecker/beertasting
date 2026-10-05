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
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fiesta-Soundboard & Buzzer für das Tasting</span>
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => soundController.playPasodobleFanfare()}
                className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left hover:border-amber-400 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5 text-sm">
                  🎺 Pasodoble-Fanfare
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Spanischer Stierkampf-Klassiker (España Cañí)
                </div>
              </button>

              <button
                onClick={() => soundController.playGlassesCheers()}
                className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-left hover:border-cyan-400 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-cyan-300 group-hover:text-cyan-200 flex items-center gap-1.5 text-sm">
                  🍻 Lautes Gläserklirren
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Kristallklares Anstoßen / Prost!
                </div>
              </button>

              <button
                onClick={() => soundController.playSadTrombone()}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-left hover:border-red-400 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-red-300 group-hover:text-red-200 flex items-center gap-1.5 text-sm">
                  😭 Traurige Posaune
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Wah-Wah-Waaaaah bei 0 Punkten & Fehl-Tipp
                </div>
              </button>

              <button
                onClick={() => soundController.playSaludCojones()}
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-left hover:border-emerald-400 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1.5 text-sm">
                  🔥 ¡SALUD, COJONES!
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Euphorischer Trinkruf + Fiesta-Jubel
                </div>
              </button>

              <button
                onClick={() => soundController.playAirHorn()}
                className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-left hover:border-purple-400 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-purple-300 group-hover:text-purple-200 flex items-center gap-1.5 text-sm">
                  📢 Reggaeton Air Horn
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Bap-Bap-Baaaaap Party-Hupe
                </div>
              </button>

              <button
                onClick={() => soundController.playBeerOpen()}
                className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-left hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-white group-hover:text-amber-400 flex items-center gap-1.5 text-sm">
                  🍾 Kronkorken-Plopp
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Zischen & Flaschenöffnung
                </div>
              </button>

              <button
                onClick={() => soundController.playSuspense()}
                className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-left hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-white group-hover:text-amber-400 flex items-center gap-1.5 text-sm">
                  🥁 Trommelwirbel
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Hochspannung vor dem Reveal
                </div>
              </button>

              <button
                onClick={() => soundController.playSiren()}
                className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-left hover:border-red-500/50 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-white group-hover:text-red-400 flex items-center gap-1.5 text-sm">
                  🚨 Polizei-Sirene
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Alarm & Minispiel-Unterbrechung
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
