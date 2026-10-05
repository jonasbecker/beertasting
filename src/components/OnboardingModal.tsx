import React from 'react';
import { X, Check, Beer, Play, Trophy, Sparkles, Users, Zap } from 'lucide-react';
import { APP_IMAGES } from '../assets';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTasting: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartTasting
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#12151f] border border-stone-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Hero Image */}
        <div className="relative h-44 w-full bg-stone-900 overflow-hidden">
          <img
            src={APP_IMAGES.sunsetTerrace}
            alt="Terrasse in Xàbia mit Blick auf das Meer"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12151f] via-[#12151f]/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/90 text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
              Urlaubs-Anleitung · Costa Blanca
            </span>
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Blindverkostung in Xàbia: So läuft die Runde
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-stone-300">
          <p className="text-stone-300 leading-relaxed">
            Willkommen in Xàbia! Ihr seid zu viert auf der Terrasse und habt den Kofferraum voll spanischer Biere. Diese App führt euch Schritt für Schritt durch eine faire, packende Blindverkostung.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Beer className="w-4 h-4" />
                <span>1. Der Ausschenker</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Jede Runde schenkt einer von euch heimlich das nächste Bier ein. Er sieht die Flasche und darf <strong>nicht raten</strong>, vergibt am Ende aber trotzdem seine Geschmackswertung (1–20).
              </p>
            </div>

            <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Zap className="w-4 h-4" />
                <span>2. Reihum Verkosten</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Die anderen drei verkosten das Bier. Der Trink-Timer läuft: Wer zügig und treffsicher tippt, kassiert bis zu <strong>30 Speed-Bonuspunkte</strong>!
              </p>
            </div>

            <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>3. Punkte & Strafschlucke</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Genauer Tipp: <strong>+100 Pkt</strong>. Richtiger Bierstil: <strong>+40 Pkt</strong>. Liegt man komplett daneben, wird laut Partymodus ein Strafschluck fällig!
              </p>
            </div>

            <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold">
                <Users className="w-4 h-4" />
                <span>4. Mini-Spiele & Reveal</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Nach dem feierlichen Enttarnen des Bieres gibt es ein verbales Terrassen-Minispiel (Medusa, Wer würde eher, El Toro), bevor der nächste Ausschenker dran ist.
              </p>
            </div>
          </div>

          <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-lg flex items-center justify-between text-xs text-amber-200">
            <span>Alle Daten werden offline auf eurem Gerät gespeichert & können per Sync-Code geteilt werden.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0e111a] border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            Schließen
          </button>
          <button
            onClick={() => {
              onClose();
              onStartTasting();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Verkostung starten!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
