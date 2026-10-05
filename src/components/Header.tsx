import React from 'react';
import { Volume2, VolumeX, RefreshCw, Share2, Music, Camera, Award, Droplets } from 'lucide-react';
import { AccentColor } from '../types';
import { haptic } from '../utils/haptics';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: 'tasting' | 'beers' | 'players' | 'minigames' | 'setup';
  setActiveTab: (tab: 'tasting' | 'beers' | 'players' | 'minigames' | 'setup') => void;
  accentColor: AccentColor;
  onOpenMusic: () => void;
  onOpenSync: () => void;
  onOpenShare: () => void;
  onOpenScanner: () => void;
  onOpenOnboarding: () => void;
  onOpenCertificates?: () => void;
  onOpenHidratador?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFiestaPlaying: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  accentColor,
  onOpenMusic,
  onOpenSync,
  onOpenShare,
  onOpenScanner,
  onOpenOnboarding,
  onOpenCertificates,
  onOpenHidratador,
  isMuted,
  onToggleMute,
  isFiestaPlaying
}) => {
  return (
    <header className="no-print sticky top-0 z-40 w-full bg-[#0d0f17]/95 backdrop-blur-md border-b border-stone-800/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Wordmark */}
        <button
          onClick={() => {
            haptic.tap();
            setActiveTab('tasting');
          }}
          className="text-left cursor-pointer focus:outline-none flex items-center gap-2"
        >
          <span className="text-xl">🍺</span>
          <span className="font-display text-base font-bold text-white tracking-tight">
            Cerveza Xàbia
          </span>
        </button>

        {/* Quick App Actions */}
        <div className="flex items-center gap-1.5">
          <PWAInstallButton variant="header" />

          {onOpenHidratador && (
            <button
              onClick={() => {
                haptic.tap();
                onOpenHidratador();
              }}
              title="El Hidratador (Wasser- & Tapas-Pause)"
              className="p-2 text-cyan-300 bg-stone-900 border border-cyan-500/40 hover:border-cyan-400 rounded-xl transition-colors cursor-pointer"
            >
              <Droplets className="w-4 h-4" />
            </button>
          )}

          {onOpenCertificates && (
            <button
              onClick={() => {
                haptic.tap();
                onOpenCertificates();
              }}
              title="Sommelier-Urkunden"
              className="p-2 text-amber-300 bg-stone-900 border border-amber-500/40 hover:border-amber-400 rounded-xl transition-colors cursor-pointer"
            >
              <Award className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              haptic.tap();
              onOpenScanner();
            }}
            title="Biere per Foto erkennen"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#d35400] hover:bg-[#b84500] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Foto-Scan</span>
          </button>

          <button
            onClick={() => {
              haptic.tap();
              onOpenMusic();
            }}
            title="Soundboard & Fiesta-Musik"
            className="p-2 text-stone-300 bg-stone-900 border border-stone-800 rounded-xl hover:text-white transition-colors cursor-pointer relative"
          >
            <Music className="w-4 h-4 text-amber-400" />
            {isFiestaPlaying && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              haptic.tap();
              onToggleMute();
            }}
            title={isMuted ? 'Ton an' : 'Stumm'}
            className="p-2 text-stone-400 hover:text-white bg-stone-900 border border-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              haptic.tap();
              onOpenShare();
            }}
            title="WhatsApp Karte"
            className="p-2 text-stone-300 hover:text-white bg-stone-900 border border-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={() => {
              haptic.tap();
              onOpenSync();
            }}
            title="Sync & Backup"
            className="p-2 text-stone-950 font-bold bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
