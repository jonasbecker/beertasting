import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, Check, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { haptic } from '../utils/haptics';

interface PWAInstallButtonProps {
  variant?: 'header' | 'button' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone display mode, hide the install UI
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    haptic.tap();
    if (isInstallable) {
      await install();
    } else {
      setShowIOSGuide(true);
    }
  };

  const renderTrigger = () => {
    if (variant === 'header') {
      return (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer ${className}`}
          title="App zum Home-Bildschirm hinzufügen"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Als App installieren</span>
          <span className="sm:hidden">App</span>
        </button>
      );
    }

    if (variant === 'card') {
      return (
        <div
          onClick={handleInstallClick}
          className={`p-3 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 rounded-2xl cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-stone-100 font-sans">
                App zum Home-Bildschirm
              </div>
              <div className="text-xs text-stone-400">
                Ohne Adressleiste — echtes Vollbild-Gefühl am Tisch
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500 text-stone-950 rounded-xl text-xs font-bold shrink-0 shadow">
            Installieren
          </span>
        </div>
      );
    }

    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-base shadow transition-all active:scale-95 cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Zum Home-Bildschirm hinzufügen</span>
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {/* Guided Step-by-Step Installation Modal for iOS & General Browsers */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#12151f] border border-amber-500/50 rounded-3xl p-5 shadow-2xl text-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-display font-bold text-white text-base">
                    {isIOS ? 'Auf iPhone / iPad installieren' : 'Zum Home-Bildschirm'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Vollbildmodus ohne Safari/Chrome-Adressleiste
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 font-sans text-xs text-stone-300">
                <p className="text-stone-200">
                  Für das beste Bar-Erlebnis auf der Terrasse lässt sich die App direkt als native Web-App auf deinen Startbildschirm legen:
                </p>

                <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
                    <Share className="w-5 h-5" />
                  </div>
                  <div>
                    <strong>1. Schritt:</strong> Tippe unten in Safari auf den <strong>Teilen-Button</strong> (Quadrat mit Pfeil nach oben).
                  </div>
                </div>

                <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                    <PlusSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <strong>2. Schritt:</strong> Scrolle etwas nach unten und wähle <strong>„Zum Home-Bildschirm“</strong>.
                  </div>
                </div>

                <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <strong>3. Fertig!</strong> Öffne das neue <strong>Cerveza Xàbia</strong> Icon auf deinem Homescreen für volles Vollbild!
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 font-sans text-xs text-stone-300">
                <p>
                  Tippe in deinem Browser-Menü (oben rechts die 3 Punkte) auf <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong>.
                </p>
                <p className="text-amber-300">
                  Danach öffnet sich die Blindverkostung ohne störende Adressleisten wie eine echte App.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs rounded-xl shadow cursor-pointer transition-colors text-center"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
};
