import React from 'react';
import { Beer, BarChart3, Trophy, Dice5, Settings } from 'lucide-react';
import { AccentColor } from '../types';
import { haptic } from '../utils/haptics';

interface BottomNavBarProps {
  activeTab: 'tasting' | 'beers' | 'players' | 'minigames' | 'setup';
  setActiveTab: (tab: 'tasting' | 'beers' | 'players' | 'minigames' | 'setup') => void;
  accentColor: AccentColor;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  setActiveTab,
  accentColor
}) => {
  const activeColor = {
    amber: 'text-amber-400 font-bold',
    sunset: 'text-orange-400 font-bold',
    emerald: 'text-emerald-400 font-bold',
    cyan: 'text-cyan-400 font-bold'
  }[accentColor];

  const tabs: { id: 'tasting' | 'beers' | 'players' | 'minigames' | 'setup'; label: string; icon: React.ReactNode }[] = [
    { id: 'tasting', label: 'Verkosten', icon: <Beer className="w-5 h-5" /> },
    { id: 'beers', label: 'Biere', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'players', label: 'Rangliste', icon: <Trophy className="w-5 h-5" /> },
    { id: 'minigames', label: 'Spiele', icon: <Dice5 className="w-5 h-5" /> },
    { id: 'setup', label: 'Setup', icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-40 bg-[#0d0f17]/95 backdrop-blur-lg border-t border-stone-800/90 py-1.5 px-3">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                haptic.tap();
                setActiveTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? `${activeColor} bg-stone-900/90`
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className={isActive ? 'scale-110 transition-transform' : ''}>
                {tab.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
