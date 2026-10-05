import React, { useState } from 'react';
import { Edit2, Palette } from 'lucide-react';
import { TournamentSession, Player, AccentColor, PartyModeId } from '../types';
import { PARTY_MODES } from '../data/minigames';
import { PWAInstallButton } from './PWAInstallButton';

interface SetupViewProps {
  session: TournamentSession;
  onUpdateSession: (updated: TournamentSession) => void;
  onOpenScanner?: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({ session, onUpdateSession, onOpenScanner }) => {
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editEmoji, setEditEmoji] = useState('🍺');

  const startEditPlayer = (p: Player) => {
    setEditingPlayerId(p.id);
    setEditName(p.name);
    setEditNickname(p.nickname);
    setEditEmoji(p.avatarEmoji);
  };

  const savePlayerEdit = () => {
    if (!editingPlayerId) return;
    const updated = session.players.map((p) => {
      if (p.id === editingPlayerId) {
        return {
          ...p,
          name: editName.trim() || p.name,
          nickname: editNickname.trim() || p.nickname,
          avatarEmoji: editEmoji || p.avatarEmoji
        };
      }
      return p;
    });

    onUpdateSession({
      ...session,
      players: updated
    });
    setEditingPlayerId(null);
  };

  const handleSetPartyMode = (modeId: PartyModeId) => {
    onUpdateSession({
      ...session,
      partyMode: modeId
    });
  };

  const handleResetTournament = () => {
    if (confirm('Möchtest du alle Rundenwertungen zurücksetzen und von vorne beginnen?')) {
      const resetPlayers = session.players.map((p) => ({
        ...p,
        totalPoints: 0,
        correctStyleGuesses: 0,
        totalGuesses: 0,
        matchedFlavorsCount: 0,
        fastestDrinkSeconds: null,
        averageRatingGiven: 0,
        beersTastedCount: 0
      }));

      onUpdateSession({
        ...session,
        rounds: [],
        currentRoundIndex: 0,
        isFinished: false,
        players: resetPlayers
      });
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 pb-20">
      {/* 1. Spieler-Verwaltung */}
      <div className="tasting-container border border-stone-300 rounded-2xl p-5 space-y-3 shadow-sm text-stone-900">
        <h3 className="text-2xl font-hand font-bold text-[#d35400]">
          👥 Die 4 Jungs in Xàbia
        </h3>

        <div className="space-y-2">
          {session.players.map((player) => {
            const isEditing = editingPlayerId === player.id;
            return (
              <div
                key={player.id}
                className="p-3 bg-white/80 border border-stone-300 rounded-xl flex items-center justify-between gap-2"
              >
                {isEditing ? (
                  <div className="flex-1 space-y-1.5 font-hand">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editEmoji}
                        onChange={(e) => setEditEmoji(e.target.value)}
                        className="w-12 p-1 text-center bg-stone-100 border border-stone-400 rounded text-xl"
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        className="flex-1 p-1 bg-stone-100 border border-stone-400 rounded text-xl text-stone-900"
                      />
                    </div>
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="Spitzname"
                      className="w-full p-1 bg-stone-100 border border-stone-400 rounded text-lg text-stone-700"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingPlayerId(null)}
                        className="px-3 py-1 font-hand text-lg text-stone-600"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={savePlayerEdit}
                        className="px-4 py-1 font-hand text-lg font-bold bg-[#d35400] text-white rounded"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 font-hand">
                      <span className="text-3xl">{player.avatarEmoji}</span>
                      <div>
                        <div className="font-bold text-2xl text-stone-900 leading-tight">{player.name}</div>
                        <div className="text-base text-[#d35400]">"{player.nickname}"</div>
                      </div>
                    </div>
                    <button
                      onClick={() => startEditPlayer(player)}
                      className="p-2 text-stone-600 hover:text-stone-900 bg-stone-200 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Foto-Scanner */}
      {onOpenScanner && (
        <div className="tasting-container border border-stone-300 rounded-2xl p-5 space-y-2.5 shadow-sm text-stone-900">
          <h3 className="text-2xl font-hand font-bold text-[#d35400]">
            📸 Biere per Foto scannen
          </h3>
          <p className="font-hand text-lg text-stone-700 leading-snug">
            Fotografiere eure Flaschen und Dosen auf dem Tisch in Xàbia. Die KI erkennt automatisch alle spanischen Biere und packt sie in eure Verkostungsliste!
          </p>
          <button
            onClick={onOpenScanner}
            className="w-full py-3 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-2xl rounded-xl shadow cursor-pointer active:scale-95 transition-all"
          >
            📸 Foto aufnehmen / hochladen
          </button>
        </div>
      )}

      {/* 3. Partymodus */}
      <div className="tasting-container border border-stone-300 rounded-2xl p-5 space-y-3 shadow-sm text-stone-900">
        <h3 className="text-2xl font-hand font-bold text-[#d35400]">
          🎮 Partymodus
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {PARTY_MODES.map((mode) => {
            const isActive = session.partyMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleSetPartyMode(mode.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer font-hand ${
                  isActive
                    ? 'bg-[#1e293b] text-white border-[#1e293b] shadow'
                    : 'bg-white/80 border-stone-400 text-stone-800'
                }`}
              >
                <div className="text-xl font-bold truncate">{mode.name}</div>
                <div className={`text-sm mt-0.5 truncate ${isActive ? 'text-amber-300' : 'text-stone-600'}`}>
                  {mode.tagline}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PWA Home-Screen Install Card */}
      <PWAInstallButton variant="card" />

      {/* 3. Reset Button */}
      <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-2xl flex items-center justify-between font-hand">
        <span className="text-xl text-red-200 font-bold">
          Turnier neu starten
        </span>
        <button
          onClick={handleResetTournament}
          className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xl font-bold rounded-xl cursor-pointer"
        >
          Zurücksetzen
        </button>
      </div>
    </div>
  );
};
