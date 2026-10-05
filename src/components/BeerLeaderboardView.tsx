import React, { useState, useMemo } from 'react';
import { Search, Trophy, ChevronDown, ChevronUp, Sparkles, Utensils } from 'lucide-react';
import { TournamentSession } from '../types';
import { computeBeerLeaderboard } from '../utils/scoring';
import { BeerBottleVisual } from './BeerBottleVisual';

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
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in text-stone-100 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-amber-950/60 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs uppercase tracking-wider">
            Spanischer Bier-Katalog & Rangliste
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">
            Die Biere der Verkostung 🍺
          </h1>
          <p className="text-stone-300 text-sm mt-1">
            Alle verkosteten spanischen Biere mit Noten, Brauerei-Hintergründen und Tapas-Empfehlungen.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Bier, Stil, Region..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-950/90 border border-stone-700 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Top Card (König von Xàbia) */}
      {topBeer && (
        <div className="bg-gradient-to-r from-amber-500/15 via-stone-900 to-amber-950/40 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-28 bg-stone-950/80 rounded-2xl p-2 border border-amber-500/30 shrink-0 flex items-center justify-center">
              <BeerBottleVisual beer={topBeer.beer} size="sm" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 tracking-wider">
                <Trophy className="w-4 h-4" />
                <span>König von Xàbia (Platz 1)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                {topBeer.beer.name}
              </h2>
              <div className="text-sm font-semibold text-stone-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>{topBeer.beer.brewery}</span>
                <span>•</span>
                <span className="text-amber-400">{topBeer.beer.style}</span>
                <span>•</span>
                <span>{topBeer.beer.abv}% Vol</span>
                <span>•</span>
                <span className="text-stone-400">{topBeer.beer.origin}</span>
              </div>
            </div>
          </div>

          <div className="text-center sm:text-right shrink-0 bg-stone-900/80 px-6 py-4 rounded-2xl border border-stone-800">
            <div className="text-4xl sm:text-5xl font-black text-amber-400 leading-none">
              {(topBeer.averageScore / 2).toFixed(1)}
            </div>
            <div className="text-xs font-bold text-stone-400 mt-1 uppercase tracking-wider">von 10 Sternen ⭐</div>
            <div className="text-[11px] text-stone-500 mt-0.5">{topBeer.totalRatingsCount} Bewertungen</div>
          </div>
        </div>
      )}

      {/* Ranked Beers List */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((item, index) => {
          const isExpanded = expandedBeerId === item.beer.id;
          const hasRatings = item.totalRatingsCount > 0;

          return (
            <div
              key={item.beer.id}
              className="bg-stone-900/85 border border-stone-800 rounded-3xl overflow-hidden shadow-lg transition hover:border-amber-500/40"
            >
              <div
                onClick={() => setExpandedBeerId(isExpanded ? null : item.beer.id)}
                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-stone-800 text-amber-400 font-black text-sm flex items-center justify-center shrink-0 border border-stone-700">
                    #{index + 1}
                  </div>

                  <div className="w-12 h-16 bg-stone-950/70 rounded-xl p-1 shrink-0 flex items-center justify-center border border-stone-800">
                    <BeerBottleVisual beer={item.beer} size="sm" showLabel={false} />
                  </div>

                  <div className="min-w-0 truncate">
                    <div className="font-extrabold text-white text-base sm:text-lg truncate flex items-center gap-2">
                      <span>{item.beer.name}</span>
                      {item.beer.priceEur && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 font-mono font-semibold">
                          {item.beer.priceEur.toFixed(2)} €
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-stone-400 flex items-center gap-2 mt-0.5 flex-wrap truncate">
                      <span>{item.beer.brewery}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">{item.beer.style}</span>
                      <span>•</span>
                      <span>{item.beer.abv}% vol</span>
                      {item.beer.ibu && (
                        <>
                          <span>•</span>
                          <span className="text-stone-300">{item.beer.ibu} IBU</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-2">
                  <div className="text-right">
                    {hasRatings ? (
                      <>
                        <div className="font-black text-amber-400 text-lg sm:text-xl">
                          {(item.averageScore / 2).toFixed(1)} <span className="text-xs text-amber-300">⭐</span>
                        </div>
                        <div className="text-[11px] text-stone-400">{item.totalRatingsCount} Tipps</div>
                      </>
                    ) : (
                      <span className="text-xs text-stone-500 font-medium italic">Noch nicht verkostet</span>
                    )}
                  </div>
                  <div className="text-stone-500 hover:text-stone-300">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Sommelier Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-stone-800 bg-stone-950/40 space-y-4 animate-fade-in text-sm text-stone-300">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800">
                      <span className="text-xs text-stone-400 block font-semibold">Herkunft & Brauerei</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">{item.beer.origin}</span>
                      <span className="text-xs text-amber-400">{item.beer.brewery}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800">
                      <span className="text-xs text-stone-400 block font-semibold">Servier-Empfehlung</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">
                        {item.beer.servingTemp || '4 – 6 °C'}
                      </span>
                      <span className="text-xs text-stone-400">Eiskalt im Glas servieren</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800">
                      <span className="text-xs text-stone-400 block font-semibold">Geschmacksprofil</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.beer.flavorProfile.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Food Pairing */}
                  {item.beer.foodPairings && item.beer.foodPairings.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 flex items-start gap-3">
                      <Utensils className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-amber-300">Empfohlene Tapas & Begleiter:</div>
                        <div className="text-xs text-stone-300 mt-1 flex flex-wrap gap-2">
                          {item.beer.foodPairings.map((food, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-stone-800 text-stone-200">
                              {food}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trivia / Story */}
                  {item.beer.trivia && (
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-stone-800 italic text-xs text-stone-300">
                      „{item.beer.trivia}“
                    </div>
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
