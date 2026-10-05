import React from 'react';
import { Droplet, Utensils, X, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { soundController } from '../utils/audio';
import { haptic } from '../utils/haptics';

interface HidratadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  beersCount: number;
}

export const HidratadorModal: React.FC<HidratadorModalProps> = ({
  isOpen,
  onClose,
  beersCount
}) => {
  if (!isOpen) return null;

  const handleDrinkWater = () => {
    haptic.cheers();
    soundController.playGlassesCheers();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#131926] border-2 border-cyan-500/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-stone-100">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 p-4 text-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm mb-2 shadow-inner">
            <span className="text-3xl animate-bounce">💧</span>
          </div>

          <div className="text-xs uppercase tracking-widest font-sans font-bold text-cyan-200">
            Offizielle Schutzmaßnahme
          </div>
          <h2 className="font-display font-black text-2xl tracking-tight text-white mt-0.5">
            ¡EL HIDRATADOR DE XÀBIA!
          </h2>
          <p className="text-xs text-cyan-100 font-sans mt-0.5">
            Tapas- & Wasser-Pause für die Runde
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 font-sans text-xs">
          <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white text-sm">
                Promille-Check: {beersCount} spanische Runden geschafft!
              </span>
              <p className="text-stone-300 leading-relaxed">
                Biere wie <em>Voll-Damm (7,2 %)</em> oder <em>Alhambra 1925 (6,4 %)</em> fordern ihren Tribut. Damit heute niemand vorzeitig im Pool versinkt oder das Finale verpasst:
              </p>
            </div>
          </div>

          {/* Action Checklist */}
          <div className="space-y-2 font-hand text-xl">
            <div className="p-2.5 bg-stone-900/80 rounded-xl border border-stone-800 flex items-center gap-3">
              <span className="text-2xl">🚰</span>
              <div>
                <b className="text-cyan-300">1 großes Glas Wasser</b>
                <div className="text-xs font-sans text-stone-400">Neutralisiert die Geschmacksnerven für den nächsten Test</div>
              </div>
            </div>

            <div className="p-2.5 bg-stone-900/80 rounded-xl border border-stone-800 flex items-center gap-3">
              <span className="text-2xl">🫒</span>
              <div>
                <b className="text-amber-300">Tapas-Runde einlegen</b>
                <div className="text-xs font-sans text-stone-400">Pimientos de Padrón, Manchego oder Oliven auf den Tisch</div>
              </div>
            </div>

            <div className="p-2.5 bg-stone-900/80 rounded-xl border border-stone-800 flex items-center gap-3">
              <span className="text-2xl">☀️</span>
              <div>
                <b className="text-emerald-300">Kater-Prävention</b>
                <div className="text-xs font-sans text-stone-400">Damit der Strandtag morgen in Jávea nicht ausfällt!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-4 bg-stone-900 border-t border-stone-800">
          <button
            onClick={handleDrinkWater}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-hand font-bold text-2xl rounded-xl shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>¡Agua y Tapas! (Weiter geht's)</span>
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
