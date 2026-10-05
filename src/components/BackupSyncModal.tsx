import React, { useState } from 'react';
import { X, Download, Upload, RefreshCw, Copy, Check, ShieldCheck, Smartphone, Database } from 'lucide-react';
import { TournamentSession } from '../types';
import { exportSessionAsJSON, createSyncCode, restoreSessionFromSyncCode } from '../utils/storage';

interface BackupSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TournamentSession;
  onRestoreSession: (session: TournamentSession) => void;
}

export const BackupSyncModal: React.FC<BackupSyncModalProps> = ({
  isOpen,
  onClose,
  session,
  onRestoreSession
}) => {
  const [syncCode, setSyncCode] = useState(() => createSyncCode(session));
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleImportCode = () => {
    if (!inputCode.trim()) return;
    const restored = restoreSessionFromSyncCode(inputCode);
    if (restored) {
      onRestoreSession(restored);
      setRestoreStatus('Erfolgreich synchronisiert! Der Spielstand wurde geladen.');
      setTimeout(() => {
        setRestoreStatus(null);
        onClose();
      }, 1500);
    } else {
      setRestoreStatus('Fehler: Ungültiger Sync-Code.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.players && parsed.beers) {
          onRestoreSession(parsed);
          setRestoreStatus('Backup erfolgreich wiederhergestellt!');
          setTimeout(() => {
            setRestoreStatus(null);
            onClose();
          }, 1500);
        } else {
          setRestoreStatus('Fehler: Die Datei enthält kein gültiges Tasting-Backup.');
        }
      } catch (err) {
        setRestoreStatus('Fehler beim Lesen der JSON-Datei.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#12151f] border border-stone-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-white tracking-tight">
              Backup & Multi-Geräte Sync
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-300">
          {/* Offline Status Notice */}
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center gap-3 text-emerald-300">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold">Offline-Erfassung aktiv</div>
              <div className="text-[11px] text-emerald-400/80">
                Alle Runden und Notizen sind lokal im Speicher eures Smartphones gesichert.
              </div>
            </div>
          </div>

          {/* Section 1: JSON File Backup */}
          <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-bold">
              <Database className="w-4 h-4 text-amber-400" />
              <span>1. Datei-Backup (JSON Export & Import)</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Lade die gesamte Tasting-Datenbank herunter oder stelle eine frühere Sicherung wieder her.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => exportSessionAsJSON(session)}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold rounded-lg cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup herunterladen (.json)</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Datei importieren</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Section 2: Direct Sync Code for friends */}
          <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-bold">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>2. Multi-Geräte Sync-Code</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Möchte ein anderer Kumpel am Tisch den Spielstand auf seinem Handy haben? Kopiere diesen Code und sende ihn per Chat:
            </p>

            {/* Generated Sync Code */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={syncCode}
                className="flex-1 bg-stone-950 border border-stone-800 rounded-lg p-2 font-mono text-[10px] text-stone-400 select-all"
              />
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg cursor-pointer transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopiert' : 'Kopieren'}</span>
              </button>
            </div>

            {/* Paste Code on Second Device */}
            <div className="pt-2 border-t border-stone-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-stone-300">
                Code auf diesem Gerät einfügen:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Sync-Code hier einfügen..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleImportCode}
                  className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-bold rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  Laden
                </button>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {restoreStatus && (
            <div className="p-3 bg-stone-900 border border-amber-500/50 rounded-lg text-center font-semibold text-amber-300">
              {restoreStatus}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0e111a] border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
