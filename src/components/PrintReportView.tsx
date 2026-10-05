import React from 'react';
import { Printer, X, Download, Trophy, Beer } from 'lucide-react';
import { TournamentSession } from '../types';
import { computeBeerLeaderboard, computePlayerLeaderboard } from '../utils/scoring';

interface PrintReportViewProps {
  isOpen: boolean;
  onClose: () => void;
  session: TournamentSession;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({ isOpen, onClose, session }) => {
  if (!isOpen) return null;

  const beerSummaries = computeBeerLeaderboard(session.beers, session.rounds, session.players);
  const playerSummaries = computePlayerLeaderboard(session.players, session.rounds);
  const champion = playerSummaries[0];
  const bestBeer = beerSummaries.find((b) => b.totalRatingsCount > 0) || beerSummaries[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[96vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm">Druckansicht & PDF-Export</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Als PDF drucken / speichern</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-8 bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-amber-700">
                Offizielles Verkostungsprotokoll
              </div>
              <h1 className="font-display text-3xl font-extrabold text-slate-950 mt-1">
                Cerveza Xàbia · Blindverkostung
              </h1>
              <div className="text-sm text-slate-600 mt-1">
                {session.location} · Datum: {session.date} · Modus: {session.partyMode}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900">
                {session.rounds.filter((r) => r.isCompleted).length} / {session.beers.length}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">
                Verkostete Runden
              </div>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
              <div className="text-xs uppercase font-bold text-amber-700 tracking-wider">
                👑 Turniersieger der Jungs
              </div>
              <div className="text-xl font-black text-slate-900">
                {champion?.player.name} ("{champion?.player.nickname}")
              </div>
              <div className="text-xs text-slate-600">
                {champion?.totalPoints} Punkte · {champion?.accuracyPercent}% Stil-Trefferquote ({champion?.correctStyleGuesses}/{champion?.totalGuesses})
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
              <div className="text-xs uppercase font-bold text-amber-700 tracking-wider">
                🍺 König von Xàbia (Bestes Bier)
              </div>
              <div className="text-xl font-black text-slate-900">
                {bestBeer?.beer.name}
              </div>
              <div className="text-xs text-slate-600">
                Durchschnitt: {bestBeer?.averageScore} / 20 Punkte · {bestBeer?.beer.brewery} ({bestBeer?.beer.abv}%)
              </div>
            </div>
          </div>

          {/* Section 1: Bier-Rangliste */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
              1. Gesamtwertung aller Biere (Sortiert nach Durchschnitt 1–20)
            </h2>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 uppercase text-[10px]">
                  <th className="py-2 px-1 font-mono">Rang</th>
                  <th className="py-2 px-2">Bier & Brauerei</th>
                  <th className="py-2 px-2">Stil</th>
                  <th className="py-2 px-1 font-mono text-center">Alk.</th>
                  {session.players.map((p) => (
                    <th key={p.id} className="py-2 px-1 text-center font-mono">
                      {p.name}
                    </th>
                  ))}
                  <th className="py-2 px-2 font-mono text-right font-bold">Ø Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {beerSummaries.map((item) => (
                  <tr key={item.beer.id}>
                    <td className="py-2 px-1 font-mono font-bold text-slate-700">
                      #{item.rank}
                    </td>
                    <td className="py-2 px-2">
                      <strong className="text-slate-900">{item.beer.name}</strong>
                      <div className="text-[10px] text-slate-500">{item.beer.brewery}</div>
                    </td>
                    <td className="py-2 px-2 text-slate-600">{item.beer.style}</td>
                    <td className="py-2 px-1 font-mono text-center text-slate-600">
                      {item.beer.abv}%
                    </td>
                    {session.players.map((p) => {
                      const scoreObj = item.allScores.find((s) => s.playerName === p.name);
                      return (
                        <td key={p.id} className="py-2 px-1 font-mono text-center text-slate-800">
                          {scoreObj ? scoreObj.score : '-'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 font-mono text-right font-bold text-slate-950">
                      {item.averageScore > 0 ? `${item.averageScore}/20` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Spieler-Statistiken */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
              2. Spieler-Statistiken & Auszeichnungen
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {playerSummaries.map((p) => (
                <div key={p.player.id} className="p-3 border border-slate-200 rounded text-xs space-y-1">
                  <div className="font-bold text-slate-900">
                    {p.rank}. {p.player.name}
                  </div>
                  <div className="text-[11px] text-slate-500">"{p.player.nickname}"</div>
                  <div className="font-mono font-bold text-sm text-slate-900 pt-1">
                    {p.totalPoints} Punkte
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Stile: {p.correctStyleGuesses}/{p.totalGuesses} ({p.accuracyPercent}%)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Ø Trinkzeit: {p.averageTimeSeconds}s
                  </div>
                  <div className="text-[10px] text-amber-800 font-semibold pt-1">
                    {p.player.badges.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-4 gap-4 text-center text-xs text-slate-500">
            {session.players.map((p) => (
              <div key={p.id} className="space-y-4">
                <div className="h-8 border-b border-slate-300"></div>
                <div>Unterschrift {p.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
