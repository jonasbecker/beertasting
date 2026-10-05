import React, { useState, useEffect } from 'react';
import { Waves, Flame, Check, ShieldAlert, Sparkles, X, Utensils, Droplets } from 'lucide-react';
import { soundController } from '../utils/audio';
import { haptic } from '../utils/haptics';

interface ElHidratadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundNumber?: number;
  isHost?: boolean;
}

export const ElHidratadorModal: React.FC<ElHidratadorModalProps> = ({
  isOpen,
  onClose,
  roundNumber = 4,
  isHost = true
}) => {
  const [waterChecked, setWaterChecked] = useState(false);
  const [tapasChecked, setTapasChecked] = useState(false);
  const [crewChecked, setCrewChecked] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(45);

  useEffect(() => {
    if (isOpen) {
      soundController.playWaterSplash();
      haptic.alarm();
      setSecondsRemaining(45);
      setWaterChecked(false);
      setTapasChecked(false);
      setCrewChecked(false);

      const interval = window.setInterval(() => {
        setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleCheck = (type: 'water' | 'tapas' | 'crew') => {
    haptic.tap();
    if (type === 'water') {
      const next = !waterChecked;
      setWaterChecked(next);
      if (next) soundController.playWaterSplash();
    } else if (type === 'tapas') {
      const next = !tapasChecked;
      setTapasChecked(next);
      if (next) soundController.playBeerOpen();
    } else if (type === 'crew') {
      const next = !crewChecked;
      setCrewChecked(next);
      if (next) soundController.playGlassesCheers();
    }
  };

  const handleFinish = () => {
    haptic.success();
    soundController.playPasodobleFanfare();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0f172a] via-[#132035] to-[#0b1320] border-2 border-cyan-500/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-stone-100 max-h-[92vh]">
        {/* Animated Top Water Wave Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white relative overflow-hidden text-center shrink-0">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse" />
          
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase">
              <Droplets className="w-3.5 h-3.5 text-cyan-200 animate-bounce" />
              <span>Costa Blanca Lebensretter-Protokoll</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-hand font-bold tracking-wide flex items-center justify-center gap-2">
              <span>🌊</span>
              <span>¡EL HIDRATADOR!</span>
              <span>🫑</span>
            </h2>

            <p className="text-sm sm:text-base font-hand text-cyan-100">
              Pimientos de Padrón & Agua-Pause auf der Terrasse
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Why Warning Box */}
          <div className="p-3.5 bg-cyan-950/60 border border-cyan-500/40 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-300 shrink-0">
              <ShieldAlert className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="space-y-1 text-xs sm:text-sm">
              <h3 className="font-bold text-cyan-200 uppercase tracking-wider text-[11px]">
                Pegel-Alarm nach Runde {roundNumber}
              </h3>
              <p className="text-stone-300 leading-relaxed font-sans">
                Spanische Hochkaräter wie <strong>Voll-Damm (7,2 %)</strong> oder <strong>Alhambra Reserva 1925 (6,4 %)</strong> haben ordentlich Umdrehungen!
                Damit alle Jungs das Finale noch bei klarem Verstand erleben:
              </p>
            </div>
          </div>

          {/* Interactive Checklist */}
          <div className="space-y-2">
            <span className="text-xs font-bold font-sans uppercase tracking-wider text-cyan-300 px-1">
              Erfrischungs-Checkliste am Tisch:
            </span>

            {/* Item 1: Water */}
            <div
              onClick={() => toggleCheck('water')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                waterChecked
                  ? 'bg-cyan-950/80 border-cyan-400 shadow-md scale-[1.01]'
                  : 'bg-stone-900/80 border-stone-700/80 hover:border-cyan-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💧</span>
                <div>
                  <div className="font-bold text-sm font-sans text-stone-100">
                    Großes Glas Agua fresca / Agua con gas
                  </div>
                  <div className="text-xs text-stone-400">
                    Jeder am Tisch ext jetzt mindestens 0,3l Wasser gegen den Kater
                  </div>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                  waterChecked ? 'bg-cyan-500 border-cyan-400 text-stone-950' : 'border-stone-500'
                }`}
              >
                {waterChecked && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* Item 2: Tapas */}
            <div
              onClick={() => toggleCheck('tapas')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                tapasChecked
                  ? 'bg-emerald-950/80 border-emerald-400 shadow-md scale-[1.01]'
                  : 'bg-stone-900/80 border-stone-700/80 hover:border-emerald-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🫑</span>
                <div>
                  <div className="font-bold text-sm font-sans text-stone-100">
                    Tapas-Stärkung
                  </div>
                  <div className="text-xs text-stone-400">
                    Pimientos de Padrón, Aceitunas, Patatas Bravas oder Pan con Tomate snacken
                  </div>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                  tapasChecked ? 'bg-emerald-500 border-emerald-400 text-stone-950' : 'border-stone-500'
                }`}
              >
                {tapasChecked && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* Item 3: Crew Check */}
            <div
              onClick={() => toggleCheck('crew')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                crewChecked
                  ? 'bg-amber-950/80 border-amber-400 shadow-md scale-[1.01]'
                  : 'bg-stone-900/80 border-stone-700/80 hover:border-amber-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗣️</span>
                <div>
                  <div className="font-bold text-sm font-sans text-stone-100">
                    Ausschenker- & Schiedsrichter-Check
                  </div>
                  <div className="text-xs text-stone-400">
                    Niemand lallt unkontrolliert und die nächste Flasche steht bereit
                  </div>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                  crewChecked ? 'bg-amber-500 border-amber-400 text-stone-950' : 'border-stone-500'
                }`}
              >
                {crewChecked && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Pause Timer Pill */}
          <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-300 text-xs">
              <Waves className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Empfohlene Terrassen-Atempause:</span>
            </div>
            <div className="font-mono font-bold text-cyan-300 text-base">
              {secondsRemaining > 0 ? `00:${secondsRemaining.toString().padStart(2, '0')}` : 'Ready!'}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 shrink-0">
          <button
            onClick={handleFinish}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-stone-950 font-hand font-bold text-xl sm:text-2xl rounded-2xl shadow-lg cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
          >
            <span>💧</span>
            <span>Hydriert & gestärkt! Weiterverkosten!</span>
            <span>🍻</span>
          </button>
        </div>
      </div>
    </div>
  );
};
