import React, { useState, useMemo } from 'react';
import { Search, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { TournamentSession } from '../types';
import { computeBeerLeaderboard } from '../utils/scoring';

interface BeerLeaderboardViewProps {
  session: TournamentSession;
}

export const BeerLeaderboardView: React.FC<BeerLeaderboardViewProps> = ({ session }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBeerId, setExpandedBeerId] = useState<string | null>(null);

  const summaries = useMemo(() => {
    return computeBeerLeaderboard(session.beers, session.rounds, session.players);
  }, [session.beers, session.rounds, session.players]);

  const filtered = useMemo(() => {
    return summaries.filter((item) => {
      return (
        item.beer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.beer.style.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.beer.origin.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [summaries, searchTerm]);

  const topBeer = summaries.length > 0 && summaries[0].totalRatingsCount > 0 ? summaries[0] : null;

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 pb-20">
      {/* Top Card (König von Xàbia) */}
      {topBeer && (
        <div className="tasting-container p-5 rounded-2xl border border-stone-300 text-stone-900 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-sm font-hand font-bold text-[#d35400] flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>👑 König von Xàbia (Platz 1)</span>
            </div>
            <div className="font-hand font-bold text-3xl text-stone-900 mt-0.5">
              {topBeer.beer.name}
            </div>
            <div className="font-hand text-lg text-stone-700">
              {topBeer.beer.style} · {topBeer.beer.abv}% Vol. ({topBeer.beer.origin})
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-hand text-5xl font-bold text-[#d35400] leading-none">
              {topBeer.averageScore}
            </div>
            <div className="font-hand text-base text-stone-600">von 20 Pkt</div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          placeholder="Bier oder Stil suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/95 border border-stone-300 rounded-xl pl-9 pr-3 py-2.5 font-hand text-xl text-stone-900 focus:outline-none focus:border-[#d35400]"
        />
      </div>

      {/* Ranked Beers List */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const isExpanded = expandedBeerId === item.beer.id;
          const hasRatings = item.totalRatingsCount > 0;

          return (
            <div
              key={item.beer.id}
              className="tasting-container border border-stone-300 rounded-xl overflow-hidden shadow-sm"
            >
              <div
                onClick={() => setExpandedBeerId(isExpanded ? null : item.beer.id)}
                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-200 border border-stone-400 flex items-center justify-center font-hand font-bold text-xl text-stone-800">
                    {hasRatings ? (
                      item.rank === 1 ? '👑' : `#${item.rank}`
                    ) : (
                      <span className="text-stone-500">-</span>
                    )}
                  </div>
                  <div>
                    <div className="font-hand font-bold text-2xl text-stone-900 leading-tight">
                      {item.beer.name}
                    </div>
                    <div className="font-hand text-base text-stone-600">
                      {item.beer.style} · {item.beer.abv}% ({item.beer.origin})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {hasRatings ? (
                      <span className="font-hand text-2xl font-bold text-[#d35400]">
                        {item.averageScore} <span className="text-sm text-stone-600 font-normal">/20</span>
                      </span>
                    ) : (
                      <span className="font-hand text-lg text-stone-500">Offen</span>
                    )}
                    <div className="font-hand text-sm text-stone-600">{item.totalRatingsCount} Stimmen</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-stone-600" /> : <ChevronDown className="w-5 h-5 text-stone-600" />}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-stone-300 bg-white/70 font-hand text-lg space-y-2">
                  <div className="text-stone-700">
                    💡 <b>Noten:</b> {item.beer.flavorProfile.join(' · ')}
                  </div>
                  {item.beer.trivia && (
                    <div className="text-stone-600 italic">
                      "{item.beer.trivia}"
                    </div>
                  )}
                  {hasRatings ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {item.allScores.map((scoreObj, idx) => (
                        <div key={idx} className="p-2 bg-stone-100 rounded border border-stone-300 flex items-center justify-between">
                          <span className="text-stone-800">{scoreObj.playerName}</span>
                          <span className="font-bold text-[#d35400]">{scoreObj.score}/20</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-stone-500 italic">Noch nicht verkostet.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
