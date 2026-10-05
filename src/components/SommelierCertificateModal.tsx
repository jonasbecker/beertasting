import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Share2, Award, Trophy, Zap, Target, Sparkles, ChevronRight, Check, Camera, Image, Trash2 } from 'lucide-react';
import { TournamentSession, Player } from '../types';
import { computePlayerLeaderboard, computeBeerLeaderboard } from '../utils/scoring';
import { soundController } from '../utils/audio';
import { haptic } from '../utils/haptics';

interface SommelierCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TournamentSession;
}

type AwardCategory = 'gran_maestro' | 'radler_trinker' | 'speed_schlucker' | 'mercadona_detektiv' | 'individual';

export const SommelierCertificateModal: React.FC<SommelierCertificateModalProps> = ({
  isOpen,
  onClose,
  session
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedAward, setSelectedAward] = useState<AwardCategory>('gran_maestro');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(() => session.players[0]?.id || '');
  const [polaroidImage, setPolaroidImage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const playerSummaries = computePlayerLeaderboard(session.players, session.rounds);
  const beerSummaries = computeBeerLeaderboard(session.beers, session.rounds, session.players);
  const bestBeer = beerSummaries.find((b) => b.totalRatingsCount > 0) || beerSummaries[0];

  // Specific award recipients
  const champion = playerSummaries[0];
  const lastPlace = playerSummaries[playerSummaries.length - 1];

  // Fastest player
  const speedSorted = [...playerSummaries]
    .filter((p) => p.averageTimeSeconds > 0)
    .sort((a, b) => a.averageTimeSeconds - b.averageTimeSeconds);
  const fastestPlayer = speedSorted[0] || playerSummaries[0];

  // Best price detective
  const priceSorted = [...playerSummaries].sort(
    (a, b) => (b.correctPriceGuesses || 0) - (a.correctPriceGuesses || 0)
  );
  const priceDetective = priceSorted[0] || playerSummaries[0];

  // Resolve current active target player based on selected award
  const getActivePlayer = (): { player: Player; title: string; subtitle: string; description: string; badgeEmoji: string } => {
    switch (selectedAward) {
      case 'gran_maestro':
        return {
          player: champion?.player || session.players[0],
          title: 'Gran Maestro Cervecero de Jávea',
          subtitle: 'Offizieller Gaumengott & Turniersieger',
          description: `Für überragende ${champion?.totalPoints || 0} Punkte und unerschütterliche Treffsicherheit beim Verkosten spanischer Gerstensäfte auf der Terrasse in Xàbia. Gekrönt zum unangefochtenen Biersommelier der Runde.`,
          badgeEmoji: '🥇'
        };
      case 'radler_trinker':
        return {
          player: lastPlace?.player || session.players[session.players.length - 1],
          title: 'Der Radler-Trinker / Dosen-Verwechsler',
          subtitle: 'Ehrenurkunde für dringenden Nachholbedarf',
          description: `Weil er im Blindtest nachweislich die edelsten Craft-Biere zerrissen und günstige Supermarktdosen für Gourmet-Nektar gehalten hat. Zur Strafe ernennt ihn die Runde zum offiziellen Tapas-Holer für den Rest des Urlaubs.`,
          badgeEmoji: '🥉'
        };
      case 'speed_schlucker':
        return {
          player: fastestPlayer?.player || session.players[0],
          title: 'Speed-Schlucker des Abends',
          subtitle: 'Schnellster Schluck der Costa Blanca',
          description: `Erst trinken, dann denken! Mit einer Rekord-Durchschnittszeit von ${fastestPlayer?.averageTimeSeconds || 0} Sekunden hat er das Bier schneller geleert als der Ausschenker nachgießen konnte.`,
          badgeEmoji: '⚡'
        };
      case 'mercadona_detektiv':
        return {
          player: priceDetective?.player || session.players[0],
          title: 'Mercadona-Spürnase & Preisfuchs',
          subtitle: 'Meister der Billig- vs. Edel-Entlarvung',
          description: `Hat mit chirurgischer Präzision (${priceDetective?.correctPriceGuesses || 0} Volltreffer) die billigen Strand-Dosen von noblen Reserva-Flaschen unterschieden. Ein Mann, den kein Supermarkt der Welt täuschen kann!`,
          badgeEmoji: '🎯'
        };
      case 'individual':
      default: {
        const found = session.players.find((p) => p.id === selectedPlayerId) || session.players[0];
        const pSummary = playerSummaries.find((s) => s.player.id === found.id);
        return {
          player: found,
          title: `Cervezero de Honor de Xàbia`,
          subtitle: `Ehren-Verkoster der Costa Blanca (${pSummary?.totalPoints || 0} Punkte)`,
          description: `Hat tapfer an allen ${session.rounds.length || session.beers.length} Verkostungsrunden teilgenommen und dem spanischen Bier und der Sonne Xàbias ehrenvoll Tribut gezollt.`,
          badgeEmoji: '🍺'
        };
      }
    }
  };

  const activeAward = getActivePlayer();

  // Draw the high-res certificate on the canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions (portrait high-res for crisp mobile & sharing: 1200x1600)
    canvas.width = 1200;
    canvas.height = 1600;

    // 1. Parchment Background
    ctx.fillStyle = '#fdfaf2';
    ctx.fillRect(0, 0, 1200, 1600);

    // Subtle paper texture gradient
    const paperGrad = ctx.createRadialGradient(600, 800, 100, 600, 800, 900);
    paperGrad.addColorStop(0, '#fffdfa');
    paperGrad.addColorStop(1, '#f3ebdc');
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, 1200, 1600);

    // 2. Double Ornamental Border
    ctx.strokeStyle = '#c67a26';
    ctx.lineWidth = 14;
    ctx.strokeRect(40, 40, 1120, 1520);

    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, 1080, 1480);

    // Corner flourishes
    const drawCorner = (x: number, y: number) => {
      ctx.fillStyle = '#d35400';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c67a26';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.stroke();
    };
    drawCorner(60, 60);
    drawCorner(1140, 60);
    drawCorner(60, 1540);
    drawCorner(1140, 1540);

    // 3. Top Crest & Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b84500';
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('★ COSTA BLANCA · REINO DE CERVEZA · XÀBIA ★', 600, 140);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 42px "Syne", sans-serif';
    ctx.fillText('OFICIALMENTE CERTIFICADO', 600, 200);

    // Decorative line
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(350, 230);
    ctx.lineTo(850, 230);
    ctx.stroke();

    // 4. Diploma Title
    ctx.fillStyle = '#78350f';
    ctx.font = 'italic 34px "Caveat", cursive';
    ctx.fillText('Hiermit wird feierlich beurkundet, dass', 600, 290);

    // 5. Player Name (The Star)
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 78px "Caveat", cursive';
    ctx.fillText(activeAward.player.name, 600, 390);

    ctx.fillStyle = '#d35400';
    ctx.font = 'bold 36px "Caveat", cursive';
    ctx.fillText(`„${activeAward.player.nickname}"`, 600, 445);

    // 6. Award Title & Badge
    ctx.fillStyle = '#0f172a';
    ctx.font = '90px sans-serif';
    ctx.fillText(activeAward.badgeEmoji, 600, 560);

    ctx.fillStyle = '#d35400';
    ctx.font = 'bold 54px "Syne", sans-serif';
    ctx.fillText(activeAward.title, 600, 640);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(activeAward.subtitle.toUpperCase(), 600, 690);

    // 7. Humorous Justification / Description Box
    ctx.fillStyle = 'rgba(211, 84, 0, 0.05)';
    ctx.fillRect(140, 740, 920, 250);
    ctx.strokeStyle = '#e2c8a2';
    ctx.lineWidth = 2;
    ctx.strokeRect(140, 740, 920, 250);

    // Word wrap description text
    ctx.fillStyle = '#334155';
    ctx.font = '34px "Caveat", cursive';
    const words = activeAward.description.split(' ');
    let line = '';
    let y = 800;
    const maxWidth = 840;
    const lineHeight = 46;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 600, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 600, y);

    // 8. Stats Ribbon
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TURNIER-DATEN DER VERKOSTUNG', 600, 1050);

    ctx.font = '30px "Caveat", cursive';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Ort: ${session.location}  ·  Datum: ${session.date}  ·  Bestes Bier: ${bestBeer?.beer.name || 'Spanisches Bier'}`, 600, 1100);

    const finishDraw = (userImg?: HTMLImageElement) => {
      // 9. Polaroid Photo or Golden Red Wax Seal Stamp
      if (userImg) {
        ctx.save();
        ctx.translate(600, 1260);
        ctx.rotate(-0.03); // vintage angle

        // Polaroid shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;

        // Polaroid white card frame
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-125, -135, 250, 270);

        // Reset shadow for photo image
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(-125, -135, 250, 270);

        // Draw photo cropped square
        ctx.save();
        ctx.beginPath();
        ctx.rect(-110, -120, 220, 190);
        ctx.clip();

        const minDim = Math.min(userImg.width, userImg.height);
        const sx = (userImg.width - minDim) / 2;
        const sy = (userImg.height - minDim) / 2;
        ctx.drawImage(userImg, sx, sy, minDim, minDim, -110, -120, 220, 190);
        ctx.restore();

        // Polaroid handwritten caption
        ctx.font = '30px "Caveat", cursive';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.fillText('Xàbia 2026 ☀️', 0, 105);

        // Small red push pin at top
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, -130, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // Default Wax Seal
        ctx.save();
        ctx.translate(600, 1260);

        // Wax seal circle
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI * 2);
        ctx.fill();

        // Wax seal inner ring
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 68, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('SELLO OFICIAL', 0, -20);
        ctx.font = '32px sans-serif';
        ctx.fillText('🍺', 0, 15);
        ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('XÀBIA 2026', 0, 42);
        ctx.restore();
      }

      // 10. Signatures
      ctx.textAlign = 'left';
      ctx.font = 'italic 34px "Caveat", cursive';
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Jonas (El Brandmeister)', 180, 1440);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(160, 1460);
      ctx.lineTo(440, 1460);
      ctx.stroke();
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('AUSSCHENKER & JUROR', 160, 1490);

      ctx.textAlign = 'right';
      ctx.font = 'italic 34px "Caveat", cursive';
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Die Jungs von Jávea', 1020, 1440);
      ctx.beginPath();
      ctx.moveTo(760, 1460);
      ctx.lineTo(1040, 1460);
      ctx.stroke();
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('BEZEUGT AUF DER TERRASSE', 770, 1490);
    };

    if (polaroidImage) {
      const img = new window.Image();
      img.onload = () => finishDraw(img);
      img.src = polaroidImage;
    } else {
      finishDraw();
    }
  }, [isOpen, selectedAward, selectedPlayerId, polaroidImage, session]);

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPolaroidImage(event.target?.result as string);
      haptic.bottlePop();
      soundController.playGlassesCheers();
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    haptic.tap();
    setPolaroidImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = () => {
    haptic.tap();
    soundController.playGlassesCheers();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `cerveza-xabia-urkunde-${activeAward.player.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShareWhatsApp = () => {
    haptic.tap();
    soundController.playPasodobleFanfare();

    let text = `🏆 *OFFIZIELLE SOMMELIER-URKUNDE AUS XÀBIA!* 🇪🇸🍺\n\n`;
    text += `Hiermit wird feierlich verliehen an:\n`;
    text += `👑 *${activeAward.player.name}* („${activeAward.player.nickname}")\n\n`;
    text += `Titel: *${activeAward.badgeEmoji} ${activeAward.title}*\n`;
    text += `Kategorie: _${activeAward.subtitle}_\n\n`;
    text += `📜 *Urkundliche Begründung:*\n"${activeAward.description}"\n\n`;
    text += `📍 Ausgestellt auf der Terrasse in ${session.location} (${session.date})\n`;
    text += `¡Salud, cojones! 🍻☀️`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#12151f] border border-amber-500/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display font-bold text-white text-base">
                Sommelier-Diplome & Urkunden
              </h2>
              <p className="text-[11px] text-stone-400">
                Offiziell beglaubigt für die Urlaubs-Gruppe in Xàbia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Award Category Selector Tabs */}
        <div className="p-3 bg-stone-950 border-b border-stone-800 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
          <button
            onClick={() => {
              haptic.tap();
              setSelectedAward('gran_maestro');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all ${
              selectedAward === 'gran_maestro'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'bg-stone-900 text-stone-300 hover:text-white'
            }`}
          >
            <span>🥇</span>
            <span>Gran Maestro</span>
          </button>

          <button
            onClick={() => {
              haptic.tap();
              setSelectedAward('radler_trinker');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all ${
              selectedAward === 'radler_trinker'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-stone-900 text-stone-300 hover:text-white'
            }`}
          >
            <span>🥉</span>
            <span>Radler-Trinker</span>
          </button>

          <button
            onClick={() => {
              haptic.tap();
              setSelectedAward('speed_schlucker');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all ${
              selectedAward === 'speed_schlucker'
                ? 'bg-cyan-500 text-stone-950 shadow-md'
                : 'bg-stone-900 text-stone-300 hover:text-white'
            }`}
          >
            <span>⚡</span>
            <span>Speed-König</span>
          </button>

          <button
            onClick={() => {
              haptic.tap();
              setSelectedAward('mercadona_detektiv');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all ${
              selectedAward === 'mercadona_detektiv'
                ? 'bg-emerald-500 text-stone-950 shadow-md'
                : 'bg-stone-900 text-stone-300 hover:text-white'
            }`}
          >
            <span>🛒</span>
            <span>Mercadona-Fuchs</span>
          </button>

          <button
            onClick={() => {
              haptic.tap();
              setSelectedAward('individual');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all ${
              selectedAward === 'individual'
                ? 'bg-stone-200 text-stone-950 shadow-md'
                : 'bg-stone-900 text-stone-300 hover:text-white'
            }`}
          >
            <span>👤</span>
            <span>Jeder Spieler</span>
          </button>
        </div>

        {/* Optional Player Picker if 'individual' selected */}
        {selectedAward === 'individual' && (
          <div className="p-2.5 bg-stone-900/90 border-b border-stone-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] text-stone-400 font-bold uppercase tracking-wider pl-2">
              Spieler:
            </span>
            {session.players.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  haptic.tap();
                  setSelectedPlayerId(p.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  selectedPlayerId === p.id
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300 hover:text-white'
                }`}
              >
                <span>{p.avatarEmoji}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Polaroid Selfie Camera / Photo Toolbar */}
        <div className="p-2.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {!polaroidImage ? (
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => {
                  haptic.tap();
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'user');
                    fileInputRef.current.click();
                  }
                }}
                className="flex-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>📸 Terrassen-Selfie als Polaroid stempeln</span>
              </button>

              <button
                onClick={() => {
                  haptic.tap();
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="py-1.5 px-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-xl border border-stone-700 flex items-center gap-1 cursor-pointer transition-colors"
                title="Foto aus Galerie hochladen"
              >
                <Image className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Galerie</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img
                  src={polaroidImage}
                  alt="Polaroid Vorschau"
                  className="w-8 h-8 rounded-lg object-cover border border-amber-400 shadow"
                />
                <span className="text-xs font-bold text-amber-300">
                  ✨ Urlaubs-Polaroid auf Urkunde gestempelt!
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    haptic.tap();
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'user');
                      fileInputRef.current.click();
                    }
                  }}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg border border-stone-700 flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Neues Foto</span>
                </button>

                <button
                  onClick={handleRemovePhoto}
                  className="p-1 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Foto entfernen (Siegel nutzen)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Certificate Preview Body */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#090b10]">
          <div className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-stone-700 bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-auto block select-none pointer-events-none"
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-3 bg-stone-900 border-t border-stone-800 flex items-center gap-2 justify-between">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>In WhatsApp teilen</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#d35400] hover:bg-[#b84500] text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Urkunde als Bild (PNG)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
