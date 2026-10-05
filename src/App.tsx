import React, { useState, useEffect } from 'react';
import { TournamentSession, Beer } from './types';
import { loadSavedSession, saveSession } from './utils/storage';
import { soundController } from './utils/audio';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { ActiveTastingView } from './components/ActiveTastingView';
import { PcGuidedTastingView } from './components/PcGuidedTastingView';
import { MultiplayerTastingView } from './components/MultiplayerTastingView';
import { BeerLeaderboardView } from './components/BeerLeaderboardView';
import { PlayerLeaderboardView } from './components/PlayerLeaderboardView';
import { MinigamesCatalogView } from './components/MinigamesCatalogView';
import { SetupView } from './components/SetupView';
import { OnboardingModal } from './components/OnboardingModal';
import { MusicAtmosphereModal } from './components/MusicAtmosphereModal';
import { ShareStoryModal } from './components/ShareStoryModal';
import { BackupSyncModal } from './components/BackupSyncModal';
import { PrintReportView } from './components/PrintReportView';
import { BeerPhotoScannerModal } from './components/BeerPhotoScannerModal';
import { SommelierCertificateModal } from './components/SommelierCertificateModal';
import { ElHidratadorModal } from './components/ElHidratadorModal';

export default function App() {
  const [session, setSession] = useState<TournamentSession>(() => loadSavedSession());
  const [activeTab, setActiveTab] = useState<'tasting' | 'beers' | 'players' | 'minigames' | 'setup'>('tasting');
  const [playMode, setPlayMode] = useState<'single_screen' | 'multiplayer'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return 'multiplayer';
    }
    return 'single_screen';
  });

  // Modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCertificates, setShowCertificates] = useState(false);
  const [showHidratador, setShowHidratador] = useState(false);

  // Audio state
  const [isMuted, setIsMuted] = useState(false);
  const [isFiestaPlaying, setIsFiestaPlaying] = useState(false);

  // Sync session changes to localStorage
  useEffect(() => {
    saveSession(session);
  }, [session]);

  const handleToggleMute = () => {
    const muted = soundController.toggleMute();
    setIsMuted(muted);
    setIsFiestaPlaying(soundController.getIsMusicPlaying());
  };

  const handleToggleFiesta = () => {
    const playing = soundController.toggleFiestaMusic();
    setIsFiestaPlaying(playing);
  };

  const handleUpdateSession = (updated: TournamentSession) => {
    setSession(updated);
  };

  const handleRestoreSession = (restored: TournamentSession) => {
    setSession(restored);
  };

  const handleAddRecognizedBeers = (newBeers: Beer[], replaceExisting: boolean) => {
    if (replaceExisting) {
      setSession({
        ...session,
        beers: newBeers,
        rounds: [],
        currentRoundIndex: 0
      });
    } else {
      // Append non-duplicate beers
      const existingNames = new Set(session.beers.map((b) => b.name.toLowerCase()));
      const uniqueNewBeers = newBeers.filter((b) => !existingNames.has(b.name.toLowerCase()));
      setSession({
        ...session,
        beers: [...session.beers, ...uniqueNewBeers]
      });
    }
    setActiveTab('beers');
  };

  return (
    <div className="min-h-screen bg-[#242f3e] text-stone-100 flex flex-col font-hand selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Mobile App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        accentColor={session.accentColor || 'amber'}
        onOpenMusic={() => setShowMusic(true)}
        onOpenSync={() => setShowSync(true)}
        onOpenShare={() => setShowShare(true)}
        onOpenScanner={() => setShowScanner(true)}
        onOpenOnboarding={() => setShowOnboarding(true)}
        onOpenCertificates={() => setShowCertificates(true)}
        onOpenHidratador={() => setShowHidratador(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isFiestaPlaying={isFiestaPlaying}
      />

      {/* Main Screen Container - Responsive & Wide on PC/Laptop */}
      <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 flex-1 py-4 pb-24">
        {activeTab === 'tasting' && (
          playMode === 'multiplayer' ? (
            <MultiplayerTastingView
              session={session}
              onUpdateSession={handleUpdateSession}
              onSwitchToSingleScreen={() => setPlayMode('single_screen')}
              onNavigateToLeaderboard={() => setActiveTab('beers')}
              onOpenCertificates={() => setShowCertificates(true)}
            />
          ) : (
            <PcGuidedTastingView
              session={session}
              onUpdateSession={handleUpdateSession}
              onOpenCertificates={() => setShowCertificates(true)}
              onOpenScanner={() => setShowScanner(true)}
            />
          )
        )}

        {activeTab === 'beers' && (
          <BeerLeaderboardView session={session} />
        )}

        {activeTab === 'players' && (
          <PlayerLeaderboardView
            session={session}
            onOpenCertificates={() => setShowCertificates(true)}
          />
        )}

        {activeTab === 'minigames' && (
          <MinigamesCatalogView />
        )}

        {activeTab === 'setup' && (
          <SetupView
            session={session}
            onUpdateSession={handleUpdateSession}
            onOpenScanner={() => setShowScanner(true)}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar (Mobile App Style) */}
      <BottomNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        accentColor={session.accentColor || 'amber'}
      />

      {/* Camera / AI Photo Scanner Modal */}
      <BeerPhotoScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onAddBeers={handleAddRecognizedBeers}
      />

      {/* Other Modals */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onStartTasting={() => {
          setShowOnboarding(false);
          setActiveTab('tasting');
        }}
      />

      <MusicAtmosphereModal
        isOpen={showMusic}
        onClose={() => setShowMusic(false)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isFiestaPlaying={isFiestaPlaying}
        onToggleFiesta={handleToggleFiesta}
      />

      <ShareStoryModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        session={session}
      />

      <BackupSyncModal
        isOpen={showSync}
        onClose={() => setShowSync(false)}
        session={session}
        onRestoreSession={handleRestoreSession}
      />

      <PrintReportView
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        session={session}
      />

      <SommelierCertificateModal
        isOpen={showCertificates}
        onClose={() => setShowCertificates(false)}
        session={session}
      />

      <ElHidratadorModal
        isOpen={showHidratador}
        onClose={() => setShowHidratador(false)}
        roundNumber={session.rounds.length || 4}
      />
    </div>
  );
}
