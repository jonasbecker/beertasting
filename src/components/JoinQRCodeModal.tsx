import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, X, Smartphone, Sparkles } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface JoinQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const JoinQRCodeModal: React.FC<JoinQRCodeModalProps> = ({
  isOpen,
  onClose,
  roomCode
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomCode}`
    : `https://cerveza-xabia.app/?room=${roomCode}`;

  useEffect(() => {
    if (isOpen && roomCode) {
      QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1c1917',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, roomCode, joinUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    haptic.tap();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#12151f] border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl text-stone-100 space-y-4 text-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800/80 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Zero-Friction Beitreten</span>
          </div>
          <h3 className="text-2xl font-hand font-bold text-white">
            📸 Smartphone-Kamera draufhalten
          </h3>
          <p className="text-xs text-stone-300">
            Die Jungs am Tisch scannen einfach diesen QR-Code und sind sofort im Tasting!
          </p>
        </div>

        {/* QR Code Canvas/Image */}
        <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-500/30 inline-block mx-auto">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code für Raum ${roomCode}`}
              className="w-56 h-56 block rounded-lg select-none"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-stone-500 text-xs">
              Generiere QR-Code...
            </div>
          )}
        </div>

        {/* Room Code Badge */}
        <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-between px-4">
          <div className="text-left">
            <div className="text-[10px] uppercase font-bold text-stone-400">Raum-Code:</div>
            <div className="font-hand text-2xl font-bold text-amber-400 tracking-wider">
              {roomCode}
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition cursor-pointer active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Kopiert!' : 'Link kopieren'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#d35400] hover:bg-[#b84500] text-white font-hand font-bold text-lg rounded-xl shadow cursor-pointer transition-all active:scale-95"
        >
          Fertig / Zurück zur Runde
        </button>
      </div>
    </div>
  );
};
