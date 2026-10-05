import React from 'react';
import { Beer } from '../types';

interface BeerBottleVisualProps {
  beer: Beer;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

export const BeerBottleVisual: React.FC<BeerBottleVisualProps> = ({
  beer,
  size = 'md',
  showLabel = true
}) => {
  // Determine visual styling based on beer name or bottleType
  const nameLower = beer.name.toLowerCase();

  let bottleType = beer.bottleType || 'amber_bottle';
  if (nameLower.includes('alhambra')) bottleType = 'green_embossed';
  else if (nameLower.includes('steinburg') || nameLower.includes('mercadona')) bottleType = 'supermarket_can';
  else if (nameLower.includes('inedit')) bottleType = 'gourmet_black';
  else if (nameLower.includes('estrella galicia') || nameLower.includes('1906')) bottleType = 'black_craft';

  // Size mapping
  const sizeClasses = {
    sm: 'w-16 h-28',
    md: 'w-24 h-40',
    lg: 'w-32 h-56',
    xl: 'w-44 h-72'
  }[size];

  // CAN STYLE (Steinburg Mercadona)
  if (bottleType === 'supermarket_can') {
    return (
      <div className={`relative flex flex-col items-center justify-center ${sizeClasses} select-none`}>
        <svg viewBox="0 0 100 160" className="w-full h-full drop-shadow-xl">
          <defs>
            <linearGradient id="canBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8A0B0B" />
              <stop offset="25%" stopColor="#C41C1C" />
              <stop offset="55%" stopColor="#E53935" />
              <stop offset="85%" stopColor="#C41C1C" />
              <stop offset="100%" stopColor="#5B0808" />
            </linearGradient>
            <linearGradient id="canMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9E9E9E" />
              <stop offset="40%" stopColor="#ECEFF1" />
              <stop offset="70%" stopColor="#CFD8DC" />
              <stop offset="100%" stopColor="#78909C" />
            </linearGradient>
            <linearGradient id="goldBanner" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Top Metal Rim */}
          <ellipse cx="50" cy="18" rx="34" ry="7" fill="url(#canMetal)" stroke="#607D8B" strokeWidth="1" />
          <ellipse cx="50" cy="16" rx="26" ry="5" fill="#455A64" />
          <rect x="44" y="14" width="12" height="4" rx="2" fill="#B0BEC5" />

          {/* Can Cylinder */}
          <path d="M16 18 Q50 25 84 18 L84 140 Q50 148 16 140 Z" fill="url(#canBody)" />

          {/* Golden Center Label */}
          <rect x="18" y="45" width="64" height="60" fill="url(#goldBanner)" rx="3" opacity="0.95" />
          <rect x="20" y="47" width="60" height="56" fill="#1C1917" rx="2" />

          {/* Text inside Can */}
          <text x="50" y="65" textAnchor="middle" fill="#F59E0B" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            STEINBURG
          </text>
          <text x="50" y="78" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
            CLÁSICA
          </text>
          <text x="50" y="94" textAnchor="middle" fill="#EF4444" fontSize="8" fontWeight="900" fontFamily="sans-serif">
            0,38 €
          </text>

          {/* Bottom Metal Rim */}
          <path d="M16 140 Q50 148 84 140 L80 152 Q50 158 20 152 Z" fill="url(#canMetal)" />
        </svg>
      </div>
    );
  }

  // ALHAMBRA 1925 (Iconic Green Glass Embossed Bottle)
  if (bottleType === 'green_embossed') {
    return (
      <div className={`relative flex flex-col items-center justify-center ${sizeClasses} select-none`}>
        <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-2xl">
          <defs>
            <linearGradient id="alhambraGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#062E19" />
              <stop offset="25%" stopColor="#0B5D34" />
              <stop offset="50%" stopColor="#15803D" />
              <stop offset="75%" stopColor="#0B5D34" />
              <stop offset="100%" stopColor="#031F10" />
            </linearGradient>
            <linearGradient id="goldNeck" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#B45309" />
              <stop offset="50%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
          </defs>

          {/* Gold Bottle Crown Cap */}
          <rect x="42" y="8" width="16" height="7" rx="1.5" fill="url(#goldNeck)" />
          <path d="M40 15 L60 15 L58 19 L42 19 Z" fill="#92400E" />

          {/* Bottle Neck */}
          <path d="M43 19 L57 19 L57 55 Q57 75 74 95 L74 185 Q50 195 26 185 L26 95 Q43 75 43 55 Z" fill="url(#alhambraGlass)" />

          {/* Glass Highlight Shine */}
          <path d="M33 98 L36 180" stroke="#86EFAC" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          <path d="M47 22 L47 50" stroke="#86EFAC" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

          {/* Golden Embossed Relief Circle on Glass */}
          <circle cx="50" cy="125" r="18" fill="none" stroke="#FDE68A" strokeWidth="1.5" opacity="0.75" />
          <text x="50" y="122" textAnchor="middle" fill="#FEF08A" fontSize="7" fontWeight="900" fontFamily="sans-serif">
            ALHAMBRA
          </text>
          <text x="50" y="132" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            1925
          </text>
          <text x="50" y="140" textAnchor="middle" fill="#86EFAC" fontSize="5" fontWeight="bold" fontFamily="sans-serif">
            RESERVA
          </text>
        </svg>
      </div>
    );
  }

  // INEDIT DAMM (Champagne style gourmet black bottle)
  if (bottleType === 'gourmet_black') {
    return (
      <div className={`relative flex flex-col items-center justify-center ${sizeClasses} select-none`}>
        <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-2xl">
          <defs>
            <linearGradient id="ineditGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0C0A09" />
              <stop offset="30%" stopColor="#292524" />
              <stop offset="50%" stopColor="#44403C" />
              <stop offset="70%" stopColor="#1C1917" />
              <stop offset="100%" stopColor="#09090B" />
            </linearGradient>
            <linearGradient id="goldStar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Champagne Cork Wire & Cap */}
          <rect x="43" y="6" width="14" height="9" rx="2" fill="#1C1917" stroke="#D97706" strokeWidth="1" />

          {/* Elegant Long Neck Champagne Bottle Body */}
          <path d="M44 15 L56 15 L56 60 Q56 85 75 105 L75 186 Q50 194 25 186 L25 105 Q44 85 44 60 Z" fill="url(#ineditGlass)" />

          {/* Glass Specular Reflection */}
          <path d="M31 108 L34 180" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" opacity="0.3" />

          {/* Minimalist Inedit Star Label */}
          <polygon points="50,118 52,124 58,124 53,128 55,134 50,130 45,134 47,128 42,124 48,124" fill="url(#goldStar)" />
          <text x="50" y="146" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" letterSpacing="2">
            INEDIT
          </text>
          <text x="50" y="154" textAnchor="middle" fill="#A8A29E" fontSize="5" fontWeight="semibold">
            DAMM • FERRAN ADRIÀ
          </text>
        </svg>
      </div>
    );
  }

  // STANDARD AMBER / CRAFT SPANISH BOTTLE (Turia, Voll-Damm, Estrella Galicia, Mahou)
  const isVollDamm = nameLower.includes('voll');
  const isTuria = nameLower.includes('turia');
  const isEstrella = nameLower.includes('estrella');
  const is1906 = nameLower.includes('1906');

  const labelBg = isTuria ? '#991B1B' : isVollDamm ? '#14532D' : isEstrella || is1906 ? '#09090B' : '#B45309';
  const labelAccent = isTuria ? '#F59E0B' : isVollDamm ? '#FDE047' : isEstrella ? '#DC2626' : '#FDE68A';

  return (
    <div className={`relative flex flex-col items-center justify-center ${sizeClasses} select-none`}>
      <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-2xl">
        <defs>
          <linearGradient id="amberGlass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#451A03" />
            <stop offset="30%" stopColor="#78350F" />
            <stop offset="55%" stopColor="#B45309" />
            <stop offset="80%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#290E02" />
          </linearGradient>
          <linearGradient id="crownCap" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
        </defs>

        {/* Crown Cap */}
        <rect x="42" y="8" width="16" height="7" rx="1" fill="url(#crownCap)" />

        {/* Neck & Body */}
        <path d="M43 15 L57 15 L57 58 Q57 78 74 96 L74 186 Q50 195 26 186 L26 96 Q43 78 43 58 Z" fill="url(#amberGlass)" />

        {/* Shine */}
        <path d="M33 98 L36 180" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />

        {/* Neck Ring Label */}
        <rect x="42" y="38" width="16" height="10" rx="1" fill={labelBg} stroke={labelAccent} strokeWidth="0.8" />

        {/* Main Body Label */}
        <rect x="30" y="105" width="40" height="52" rx="3" fill={labelBg} stroke={labelAccent} strokeWidth="1.2" />

        {/* Label Content */}
        <text x="50" y="122" textAnchor="middle" fill={labelAccent} fontSize="7" fontWeight="900" fontFamily="sans-serif">
          {beer.brewery.split(' ')[0].toUpperCase()}
        </text>
        <text x="50" y="134" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
          {beer.name.split(' ')[0]}
        </text>
        <text x="50" y="146" textAnchor="middle" fill="#FCD34D" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
          {beer.abv}% vol
        </text>
      </svg>
    </div>
  );
};
