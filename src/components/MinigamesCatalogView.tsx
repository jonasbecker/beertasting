import React, { useState, useEffect } from 'react';
import { Dice5, Play, Pause, RotateCcw, Flame } from 'lucide-react';
import { MINIGAMES, WER_WUERDE_EHER_PROMPTS } from '../data/minigames';
import { soundController } from '../utils/audio';

export const MinigamesCatalogView: React.FC = () => {
  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [randomPromptIndex, setRandomPromptIndex] = useState<number>(0);

  const selectedGame = MINIGAMES[selectedGameIndex] || MINIGAMES[0];

  useEffect(() => {
    let interval: number | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            soundController.playBuzzer();
            setIsTimerRunning(false);
            return 0;
          }
          if (prev <= 3) {
            soundController.playCountdownTick(true);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const handleStartTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
    soundController.playCountdownTick(false);
  };

  const handleNextGame = () => {
    setIsTimerRunning(false);
    setSelectedGameIndex((prev) => (prev + 1) % MINIGAMES.length);
    setRandomPromptIndex(Math.floor(Math.random() * WER_WUERDE_EHER_PROMPTS.length));
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-hand font-bold text-amber-400">
            Minispiel {selectedGameIndex + 1} / {MINIGAMES.length}
          </span>
          <h2 className="font-hand font-bold text-3xl text-white">
            {selectedGame.title}
          </h2>
        </div>

        <button
          onClick={handleNextGame}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#d35400] text-white font-hand font-bold text-xl rounded-xl shadow cursor-pointer active:scale-95 transition-transform"
        >
          <Dice5 className="w-4 h-4" />
          <span>Weiter</span>
        </button>
      </div>

      {/* Main Game Card in Paper Look */}
      <div className="tasting-container border border-stone-300 rounded-2xl p-6 space-y-4 shadow-lg text-stone-900">
        <div className="font-hand text-2xl text-[#d35400] font-bold">
          {selectedGame.tagline}
        </div>

        <p className="font-hand text-xl text-stone-800 leading-relaxed">
          {selectedGame.shortDescription}
        </p>

        {/* Prompt if "Wer würde eher" */}
        {selectedGame.id === 'mg-wer-wuerde-eher' && (
          <div className="p-4 bg-white/90 border-2 border-dashed border-[#d35400] rounded-xl text-center space-y-2">
            <span className="font-hand text-lg text-stone-600 font-bold">Zufalls-Frage für die Jungs:</span>
            <div className="font-hand text-2xl font-bold text-[#d35400]">
              "{WER_WUERDE_EHER_PROMPTS[randomPromptIndex]}"
            </div>
            <button
              onClick={() => setRandomPromptIndex((prev) => (prev + 1) % WER_WUERDE_EHER_PROMPTS.length)}
              className="font-hand text-base text-stone-600 underline cursor-pointer"
            >
              Neue Frage würfeln 🎲
            </button>
          </div>
        )}

        {/* Penalty */}
        <div className="p-3 bg-amber-500/15 border border-amber-600/30 rounded-xl flex items-center justify-between font-hand text-xl">
          <span className="text-[#d35400] font-bold flex items-center gap-1">
            <Flame className="w-4 h-4" /> Strafe:
          </span>
          <span className="text-stone-900 font-bold">{selectedGame.penalty}</span>
        </div>

        {/* Built-in Timer Bar */}
        <div className="pt-2 border-t border-stone-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-hand text-4xl font-bold text-[#d35400]">
              {timerSeconds}s
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handleStartTimer(30)}
                className="px-2.5 py-1 font-hand text-lg bg-stone-200 rounded border border-stone-400 text-stone-800"
              >
                30s
              </button>
              <button
                onClick={() => handleStartTimer(60)}
                className="px-2.5 py-1 font-hand text-lg bg-stone-200 rounded border border-stone-400 text-stone-800"
              >
                60s
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`px-4 py-1.5 font-hand text-xl font-bold rounded-xl transition-all cursor-pointer ${
                isTimerRunning
                  ? 'bg-[#d35400] text-white'
                  : 'bg-[#27ae60] text-white'
              }`}
            >
              {isTimerRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(60);
              }}
              className="p-2 bg-stone-200 border border-stone-400 rounded-xl text-stone-700 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
