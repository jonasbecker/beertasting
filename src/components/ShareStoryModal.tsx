import React, { useState } from 'react';
import { X, Copy, Check, Share2, Trophy, Beer, Sparkles } from 'lucide-react';
import { TournamentSession } from '../types';
import { computePlayerLeaderboard, computeBeerLeaderboard } from '../utils/scoring';
import { APP_IMAGES } from '../assets';

interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TournamentSession;
}

export const ShareStoryModal: React.FC<ShareStoryModalProps> = ({ isOpen, onClose, session }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const playerSummaries = computePlayerLeaderboard(session.players, session.rounds);
  const beerSummaries = computeBeerLeaderboard(session.beers, session.rounds, session.players);

  const champion = playerSummaries[0];
  const bestBeer = beerSummaries.find((b) => b.totalRatingsCount > 0) || beerSummaries[0];

  const generateWhatsAppShareText = () => {
    let text = `🍻 *CERVEZA XÀBIA BLINDVERKOSTUNG* 🇪🇸\n`;
    text += `📍 ${session.location} · ${session.date}\n\n`;
    text += `👑 *Turniersieger:* ${champion?.player.name} (${champion?.totalPoints} Pkt. | Trefferquote ${champion?.accuracyPercent}%)\n`;
    text += `🏆 *König von Xàbia (Bestes Bier):* ${bestBeer?.beer.name} (Ø ${bestBeer?.averageScore}/20)\n\n`;
    text += `📊 *Endstand der Jungs:*\n`;
    playerSummaries.forEach((p, idx) => {
      text += `${idx + 1}. ${p.player.name} "${p.player.nickname}" – ${p.totalPoints} Pkt (${p.correctStyleGuesses}/${p.totalGuesses} Stile getroffen)\n`;
    });
    text += `\n*Gekrönt auf der Terrasse in Xàbia! Prost!* 🍺☀️`;
    return text;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateWhatsAppShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#12151f] border border-stone-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            <span className="font-display font-bold text-white text-sm">
              Social Media & WhatsApp Brag Card
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Visual Brag Card (Instagram / Story Style) */}
          <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-b from-[#181d2a] via-[#10141e] to-[#0a0c12] p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400 tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>XÀBIA BLINDVERKOSTUNG</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            <div className="space-y-1">
              <div className="text-3xl">👑</div>
              <div className="text-xs text-stone-400 uppercase tracking-wider">Turnier-Champion</div>
              <h2 className="font-display text-2xl font-black text-white">
                {champion?.player.name}
              </h2>
              <div className="text-xs text-amber-400 font-medium">"{champion?.player.nickname}"</div>
              <div className="font-mono text-xl font-bold text-white mt-1">
                {champion?.totalPoints} Punkte
              </div>
            </div>

            <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 space-y-1">
              <div className="text-[11px] text-stone-400 uppercase tracking-wide">
                Bestes Bier der Reise
              </div>
              <div className="font-bold text-sm text-amber-300">
                {bestBeer?.beer.name}
              </div>
              <div className="font-mono tabular-nums text-xs text-stone-300">
                Ø {bestBeer?.averageScore} von 20 Punkten ({bestBeer?.totalRatingsCount} Stimmen)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left text-xs">
              {playerSummaries.map((p, idx) => (
                <div key={p.player.id} className="p-2 bg-stone-900/50 rounded border border-stone-800/80 flex items-center justify-between">
                  <span className="truncate">{idx + 1}. {p.player.name}</span>
                  <span className="font-mono font-bold text-amber-400">{p.totalPoints}P</span>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-stone-500 pt-1">
              {session.location} · {session.date}
            </div>
          </div>

          {/* WhatsApp Text Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">
                Text für eure WhatsApp-Gruppe:
              </span>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopiert!' : 'Text kopieren'}</span>
              </button>
            </div>
            <pre className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
              {generateWhatsAppShareText()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0e111a] border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
