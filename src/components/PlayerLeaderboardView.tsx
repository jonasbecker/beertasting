import React from 'react';
import { Trophy, Target, Zap, Sparkles, Award, ShoppingBag } from 'lucide-react';
import { TournamentSession } from '../types';
import { computePlayerLeaderboard } from '../utils/scoring';

interface PlayerLeaderboardViewProps {
  session: TournamentSession;
  onOpenCertificates?: () => void;
}

export const PlayerLeaderboardView: React.FC<PlayerLeaderboardViewProps> = ({ session, onOpenCertificates }) => {
  const playerSummaries = computePlayerLeaderboard(session.players, session.rounds);
  const leader = playerSummaries[0];

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 pb-20">
      {/* Sommelier Certificate Award Trigger Banner */}
      {onOpenCertificates && (
        <button
          onClick={onOpenCertificates}
          className="w-full p-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-[#d35400] text-white font-hand font-bold text-2xl rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:brightness-105 active:scale-95 transition-all"
        >
          <Award className="w-6 h-6 text-amber-100" />
          <span>🏆 Sommelier-Urkunden (WhatsApp & Download)</span>
        </button>
      )}

      {/* Tournament Leader Banner */}
      {leader && leader.totalPoints > 0 && (
        <div className="tasting-container p-5 rounded-2xl border border-stone-300 text-stone-900 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{leader.player.avatarEmoji}</span>
            <div>
              <div className="text-sm font-hand font-bold text-[#d35400] flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                <span>Turnier-Spitzenreiter</span>
              </div>
              <h3 className="font-hand font-bold text-3xl text-stone-900">
                {leader.player.name}
              </h3>
              <div className="font-hand text-lg text-stone-600">"{leader.player.nickname}"</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-hand text-5xl font-bold text-[#d35400] leading-none">
              {leader.totalPoints}
            </div>
            <div className="font-hand text-base text-stone-600">Punkte</div>
          </div>
        </div>
      )}

      {/* Player List Cards */}
      <div className="space-y-3">
        {playerSummaries.map((summary) => {
          const { player, totalPoints, correctStyleGuesses, correctPriceGuesses, totalGuesses, fastestTimeSeconds, matchedFlavorsCount, rank } = summary;

          return (
            <div
              key={player.id}
              className={`tasting-container p-4 rounded-2xl border transition-all ${
                rank === 1
                  ? 'border-2 border-[#d35400] shadow-md'
                  : 'border border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-200 border border-stone-400 flex items-center justify-center font-hand font-bold text-xl text-stone-800">
                    #{rank}
                  </div>
                  <span className="text-3xl">{player.avatarEmoji}</span>
                  <div>
                    <div className="font-hand font-bold text-2xl text-stone-900 leading-tight">
                      {player.name}
                    </div>
                    <div className="font-hand text-base text-[#d35400]">
                      "{player.nickname}"
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-hand text-3xl font-bold text-[#d35400] leading-none">
                    {totalPoints}
                  </div>
                  <div className="font-hand text-sm text-stone-600">Punkte</div>
                </div>
              </div>

              {/* 4 Stats Chips */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-stone-300 text-center font-hand text-base">
                <div className="bg-white/80 p-1.5 rounded-xl border border-stone-300">
                  <div className="text-xs text-stone-600 flex items-center justify-center gap-0.5 font-sans">
                    <Target className="w-3 h-3 text-[#2980b9]" />
                    <span>Stil</span>
                  </div>
                  <div className="font-bold text-stone-900 text-lg mt-0.5">
                    {correctStyleGuesses}/{totalGuesses}
                  </div>
                </div>

                <div className="bg-white/80 p-1.5 rounded-xl border border-stone-300">
                  <div className="text-xs text-stone-600 flex items-center justify-center gap-0.5 font-sans">
                    <ShoppingBag className="w-3 h-3 text-amber-600" />
                    <span>Preis</span>
                  </div>
                  <div className="font-bold text-stone-900 text-lg mt-0.5">
                    {correctPriceGuesses} Treffer
                  </div>
                </div>

                <div className="bg-white/80 p-1.5 rounded-xl border border-stone-300">
                  <div className="text-xs text-stone-600 flex items-center justify-center gap-0.5 font-sans">
                    <Sparkles className="w-3 h-3 text-[#27ae60]" />
                    <span>Noten</span>
                  </div>
                  <div className="font-bold text-stone-900 text-lg mt-0.5">
                    {matchedFlavorsCount}
                  </div>
                </div>

                <div className="bg-white/80 p-1.5 rounded-xl border border-stone-300">
                  <div className="text-xs text-stone-600 flex items-center justify-center gap-0.5 font-sans">
                    <Zap className="w-3 h-3 text-[#d35400]" />
                    <span>Speed</span>
                  </div>
                  <div className="font-bold text-stone-900 text-lg mt-0.5">
                    {fastestTimeSeconds !== null ? `${fastestTimeSeconds}s` : '-'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
