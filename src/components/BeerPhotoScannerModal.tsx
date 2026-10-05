import React, { useState } from 'react';
import { Camera, Upload, X, Check, Loader2, Sparkles, Plus, AlertCircle, Trash2, Beer as BeerIcon } from 'lucide-react';
import { Beer, BeerStyle } from '../types';
import { soundController } from '../utils/audio';
import { DEFAULT_SPANISH_BEERS } from '../data/spanishBeers';

interface BeerPhotoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBeers: (newBeers: Beer[], replaceExisting: boolean) => void;
}

// Client-side image compressor for smartphone photos
function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = (e.target?.result as string) || '';
          const b64 = raw.includes(',') ? raw.split(',')[1] : raw;
          resolve({ base64: b64, mimeType: file.type || 'image/jpeg' });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        const raw = (e.target?.result as string) || '';
        const b64 = raw.includes(',') ? raw.split(',')[1] : raw;
        resolve({ base64: b64, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve({ base64: '', mimeType: 'image/jpeg' });
    reader.readAsDataURL(file);
  });
}

export const BeerPhotoScannerModal: React.FC<BeerPhotoScannerModalProps> = ({
  isOpen,
  onClose,
  onAddBeers
}) => {
  const [images, setImages] = useState<{ id: string; url: string; base64: string; mimeType: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('Analysiere Fotos...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recognizedBeers, setRecognizedBeers] = useState<Beer[]>([]);
  const [replaceMode, setReplaceMode] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressImage(file);
        if (compressed.base64) {
          setImages((prev) => [
            ...prev,
            {
              id: 'img-' + Date.now() + '-' + Math.random(),
              url: URL.createObjectURL(file),
              base64: compressed.base64,
              mimeType: compressed.mimeType
            }
          ]);
        }
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  };

  const removeImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
  };

  const handleScanBeers = async () => {
    if (images.length === 0) {
      setErrorMsg('Bitte lade zuerst mindestens ein Foto eurer Bierflaschen oder Dosen hoch!');
      return;
    }

    setIsLoading(true);
    setLoadingStatus('Bilder werden analysiert...');
    setErrorMsg(null);
    setRecognizedBeers([]);

    try {
      const payload = images.map((img) => ({
        data: img.base64,
        mimeType: img.mimeType
      }));

      setTimeout(() => {
        setLoadingStatus('KI erkennt spanische Bier-Etiketten & Stile...');
      }, 700);

      const res = await fetch('/api/recognize-beers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: payload })
      });

      const data = await res.json().catch(() => ({}));
      const rawBeers = data.beers || [];

      if (rawBeers.length === 0) {
        throw new Error('Keine Biere gefunden. Bitte versuche ein schärferes Foto der Flaschen-Etiketten.');
      }

      const formattedBeers: Beer[] = rawBeers.map((b: any, index: number) => ({
        id: 'scanned-beer-' + Date.now() + '-' + index,
        name: b.name || 'Spanisches Bier',
        brewery: b.brewery || 'Spanische Brauerei',
        origin: b.origin || 'Spanien',
        style: (b.style as BeerStyle) || 'Lager',
        abv: Number(b.abv) || 5.0,
        description: b.description || 'Frisch im Urlaub in Xàbia entdeckt.',
        flavorProfile: Array.isArray(b.flavorProfile) ? b.flavorProfile : ['Süffig', 'Malzig', 'Hopfig-Herb'],
        trivia: b.trivia || 'Kult-Bier an der Costa Blanca!',
        colorHex: '#C67A26'
      }));

      setRecognizedBeers(formattedBeers);
      soundController.playTada();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Die Foto-Erkennung konnte nicht abgeschlossen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeRecognizedBeer = (id: string) => {
    setRecognizedBeers(recognizedBeers.filter((b) => b.id !== id));
  };

  const handleConfirmAdd = () => {
    if (recognizedBeers.length === 0) return;
    onAddBeers(recognizedBeers, replaceMode);
    soundController.playBeerOpen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="tasting-container relative w-full max-w-lg rounded-2xl p-6 space-y-5 text-stone-900 border border-stone-300 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-300 pb-3">
          <div>
            <span className="text-sm uppercase font-hand font-bold text-[#d35400] tracking-wider flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              <span>Automatische Foto-Erkennung</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-hand font-bold text-[#1e293b] mt-0.5">
              📸 Biere per Foto erkennen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Upload Zone */}
        {recognizedBeers.length === 0 && (
          <div className="space-y-4">
            {/* Quick 18 Kitchen Beers Preset Banner */}
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="text-left">
                <div className="font-extrabold text-amber-400 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Eure 18 Biere aus dem Foto (Küchenzeile)</span>
                </div>
                <div className="text-xs text-stone-300 mt-0.5">
                  Stella, Corona, Leffe, Erdinger, Heineken, Karlsquell, Voll-Damm, Amstel Oro, Cerdo Volador etc.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecognizedBeers(DEFAULT_SPANISH_BEERS);
                  soundController.playTada();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black text-xs rounded-xl shadow-lg hover:brightness-110 flex items-center justify-center gap-1.5 shrink-0 transition active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>18 Biere jetzt laden</span>
              </button>
            </div>

            <p className="text-sm text-stone-300 leading-snug">
              Oder fotografiere eure Flaschen und Dosen direkt hier – die Erkennung analysiert alle Etiketten, Marken, Stile und Alkoholgehalte:
            </p>

            {/* Photo Picker Options */}
            <div className="grid grid-cols-2 gap-3">
              <label className="p-4 bg-stone-900 border-2 border-dashed border-amber-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-stone-800/80 transition text-center active:scale-95 shadow-sm">
                <Camera className="w-7 h-7 text-amber-400" />
                <span className="font-bold text-base text-white">
                  Foto aufnehmen
                </span>
                <span className="text-xs text-stone-400">Handy-Kamera öffnen</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <label className="p-4 bg-stone-900 border-2 border-dashed border-amber-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-stone-800/80 transition text-center active:scale-95 shadow-sm">
                <Upload className="w-7 h-7 text-amber-400" />
                <span className="font-bold text-base text-white">
                  Fotos wählen
                </span>
                <span className="text-xs text-stone-400">Aus der Galerie</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview Thumbnails */}
            {images.length > 0 && (
              <div className="space-y-2">
                <div className="font-hand text-xl font-bold text-stone-800 flex items-center justify-between">
                  <span>Bereite {images.length} Foto(s) vor:</span>
                  <button
                    onClick={() => setImages([])}
                    className="text-xs font-sans text-red-600 underline cursor-pointer"
                  >
                    Alle löschen
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {images.map((img) => (
                    <div key={img.id} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-stone-400 shadow">
                      <img src={img.url} alt="Bier-Vorschau" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 p-1 bg-black/75 text-white rounded-full hover:bg-black cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-xl font-hand text-xl text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Scan Button */}
            <button
              onClick={handleScanBeers}
              disabled={isLoading || images.length === 0}
              className={`w-full py-4 rounded-xl font-hand font-bold text-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isLoading || images.length === 0
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  : 'bg-[#d35400] hover:bg-[#b84500] text-white active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>{loadingStatus}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  <span>Biere jetzt automatisch erkennen!</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Screen */}
        {recognizedBeers.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl font-hand text-2xl text-emerald-900 text-center font-bold">
              🎉 {recognizedBeers.length} Biere erfolgreich erkannt!
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {recognizedBeers.map((b, idx) => (
                <div key={b.id} className="p-3 bg-white/95 border border-stone-300 rounded-xl space-y-1 font-hand shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-2xl text-stone-900 leading-tight">
                      {idx + 1}. {b.name}
                    </span>
                    <button
                      onClick={() => removeRecognizedBeer(b.id)}
                      className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"
                      title="Entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-stone-700 text-lg">
                    {b.brewery} · <strong className="text-[#2980b9]">{b.style}</strong> ({b.abv}%)
                  </div>
                  {b.trivia && (
                    <div className="text-xs font-sans text-stone-600 italic">
                      💡 {b.trivia}
                    </div>
                  )}
                  <div className="text-xs font-sans text-emerald-800 font-medium">
                    Noten: {b.flavorProfile.join(' · ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Replace or Append Checkbox */}
            <div className="p-3.5 bg-white/80 border border-stone-300 rounded-xl font-hand text-xl space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceMode}
                  onChange={(e) => setReplaceMode(e.target.checked)}
                  className="w-5 h-5 accent-[#d35400] cursor-pointer"
                />
                <span className="font-bold text-stone-900">Bestehende Bierliste durch diese ersetzen</span>
              </label>
              <div className="text-xs font-sans text-stone-500 pl-7">
                (Unangehakt werden die Biere einfach zur Liste hinzugefügt)
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setRecognizedBeers([])}
                className="flex-1 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 font-hand font-bold text-xl rounded-xl cursor-pointer"
              >
                Nochmal scannen
              </button>
              <button
                onClick={handleConfirmAdd}
                className="flex-1 py-3 bg-[#27ae60] hover:bg-[#219150] text-white font-hand font-bold text-2xl rounded-xl shadow cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <Plus className="w-5 h-5" />
                <span>In die Liste packen!</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
