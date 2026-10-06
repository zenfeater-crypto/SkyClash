import React from 'react';
import { 
  Swords, 
  Bed, 
  Trophy, 
  Radio, 
  Users, 
  Sparkles, 
  Flame, 
  ChevronRight, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { WarsCategory } from '../types';

interface HomeWarsBannerProps {
  onEnterWars: (category?: WarsCategory) => void;
}

export const HomeWarsBanner: React.FC<HomeWarsBannerProps> = ({ onEnterWars }) => {
  return (
    <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 group">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/25 transition duration-500" />
      <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Info Column */}
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 text-xs font-black tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> WARS ARENA LOBBY
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
              LIVE SYSTEM
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
            GANG BATTLES & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
              COMPETITIVE WARFARE
            </span>
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 max-w-lg">
            Form your gang, communicate in private 30-minute auto-vanishing chats, climb the official Admin leaderboard, issue scrimmage matchings, and track live war scoreboards!
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-amber-300">
              <Trophy className="w-3.5 h-3.5" /> Official Leaderboard
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Users className="w-3.5 h-3.5 text-slate-400" /> Admin Sanctioned Gangs
            </span>
          </div>
        </div>

        {/* Right Action Cards: TWO OPTIONS (SKYBLOCK & BEDWARS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full lg:w-auto shrink-0">
          {/* Option 1: SKYBLOCK WARS */}
          <div
            onClick={() => onEnterWars('skyblock')}
            className="p-5 rounded-2xl bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/50 hover:border-amber-400 hover:scale-[1.02] cursor-pointer transition shadow-xl group/card flex flex-col justify-between min-w-[220px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold group-hover/card:scale-110 transition">
                  <Swords className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  ONLINE NOW
                </span>
              </div>

              <div className="text-base font-black text-white group-hover/card:text-amber-300 transition">
                SKYBLOCK WARS
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Gangs · Announcements · Leaderboard · Matchings · Live Wars
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400">
              <span>Enter Arena</span>
              <ArrowRight className="w-4 h-4 group-hover/card:translate-x-1 transition" />
            </div>
          </div>

          {/* Option 2: BEDWARS */}
          <div
            onClick={() => onEnterWars('bedwars')}
            className="p-5 rounded-2xl bg-gradient-to-b from-rose-500/10 via-slate-900 to-slate-950 border border-rose-500/30 hover:border-rose-400/60 hover:scale-[1.02] cursor-pointer transition shadow-xl group/bedwars flex flex-col justify-between min-w-[220px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold group-hover/bedwars:scale-110 transition">
                  <Bed className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                  ONLINE NOW
                </span>
              </div>

              <div className="text-base font-black text-white group-hover/bedwars:text-rose-300 transition">
                BEDWARS WARS
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Gangs · Announcements · Leaderboard · Matchings · Live Wars
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-rose-400">
              <span>Enter Arena</span>
              <ArrowRight className="w-4 h-4 group-hover/bedwars:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
