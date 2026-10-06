import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Bed, 
  Users, 
  Megaphone, 
  Trophy, 
  Radio, 
  Flame, 
  Sparkles, 
  ChevronRight, 
  ArrowLeft,
  Crown,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { WarsCategory, SkyblockWarsSubTab, WarsGang } from '../types';
import { WarsGangsView } from '../components/wars/WarsGangsView';
import { WarsAnnouncements } from '../components/wars/WarsAnnouncements';
import { WarsLeaderboard } from '../components/wars/WarsLeaderboard';
import { WarsMatchings } from '../components/wars/WarsMatchings';
import { WarsLiveWars } from '../components/wars/WarsLiveWars';
import { BedwarsWarsView } from '../components/wars/BedwarsWarsView';

interface WarsViewProps {
  onOpenAuth: () => void;
  onBackToHome?: () => void;
  initialCategory?: WarsCategory;
  initialSubTab?: SkyblockWarsSubTab;
  onOpenPrivateChat?: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: any }) => void;
}

export const WarsView: React.FC<WarsViewProps> = ({
  onOpenAuth,
  onBackToHome,
  initialCategory = 'skyblock',
  initialSubTab = 'gangs',
  onOpenPrivateChat
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [category, setCategory] = useState<WarsCategory>(initialCategory);
  const [subTab, setSubTab] = useState<SkyblockWarsSubTab>(initialSubTab);

  // Sync category if initialCategory changes from parent navigation
  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  // Global Gangs listener for all Wars
  const [gangs, setGangs] = useState<WarsGang[]>([]);
  const [gangsLoading, setGangsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'wars_gangs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WarsGang[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as WarsGang);
        });
        setGangs(list);
        setGangsLoading(false);
      },
      (err) => {
        console.error('Error fetching gangs:', err);
        setGangsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const isBedwars = category === 'bedwars';
  const currentCategoryGangs = gangs.filter((g) => (g.gameType || 'skyblock') === category);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Category Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className={`text-[11px] font-mono ${isBedwars ? 'text-rose-400' : 'text-amber-400'} font-bold uppercase tracking-wider flex items-center gap-1.5`}>
              {isBedwars ? <Bed className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
              <span>{isBedwars ? 'BEDWARS COMPETITIVE ARENA' : 'SKYBLOCK COMPETITIVE COMBAT HUB'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isBedwars ? 'BEDWARS WARS' : 'SKYBLOCK WARS'}
            </h1>
          </div>
        </div>

        {/* Category Selector Cards (SKYBLOCK vs BEDWARS) */}
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 self-start sm:self-auto shadow-lg">
          <button
            onClick={() => setCategory('skyblock')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              category === 'skyblock'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>SKYBLOCK WARS</span>
          </button>

          <button
            onClick={() => setCategory('bedwars')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              category === 'bedwars'
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bed className="w-3.5 h-3.5" />
            <span>BEDWARS</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
              category === 'bedwars'
                ? 'bg-white/20 text-white'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              ONLINE
            </span>
          </button>
        </div>
      </div>

      {/* Hero Category Banner */}
      <div className={`relative rounded-3xl overflow-hidden border p-5 sm:p-6 shadow-xl ${
        isBedwars 
          ? 'border-rose-500/30 bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-950' 
          : 'border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-950'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className={`text-xs font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
              isBedwars ? 'text-rose-400' : 'text-amber-400'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isBedwars ? 'Independent Bedwars System' : 'Hypixel Skyblock GvG Warfare'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {isBedwars ? 'Bedwars Clans, 4v4 Rush & Scrims' : 'Skyblock Guilds, Matchings & Live Wars'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {isBedwars 
                ? 'Separate community gangs, 30-minute auto-expiring clan chats, official Admin rankings, and verified 4v4 Bedwars matchings.'
                : 'Form combat gangs, communicate in 30-minute private chats, challenge rival guilds, and rise on the official Admin leaderboard.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
              isBedwars 
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' 
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}>
              {currentCategoryGangs.length} {isBedwars ? 'Bedwars Gangs' : 'Skyblock Gangs'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body: 5 Categories for selected gameType */}
      <div className="space-y-6">
        {/* 5 Category Sub-Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <button
            onClick={() => setSubTab('gangs')}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              subTab === 'gangs'
                ? isBedwars
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className={`w-4 h-4 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>1. Gangs ({currentCategoryGangs.length})</span>
          </button>

          <button
            onClick={() => setSubTab('announcements')}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              subTab === 'announcements'
                ? isBedwars
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Megaphone className={`w-4 h-4 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>2. Announcements</span>
          </button>

          <button
            onClick={() => setSubTab('leaderboard')}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              subTab === 'leaderboard'
                ? isBedwars
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Trophy className={`w-4 h-4 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>3. Leaderboard</span>
          </button>

          <button
            onClick={() => setSubTab('matchings')}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              subTab === 'matchings'
                ? isBedwars
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Swords className={`w-4 h-4 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>4. Matchings</span>
          </button>

          <button
            onClick={() => setSubTab('live')}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 col-span-2 sm:col-span-1 ${
              subTab === 'live'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-400" />
            <span>5. Live Wars</span>
          </button>
        </div>

        {/* Sub-Views for selected category */}
        {subTab === 'gangs' && (
          <WarsGangsView
            gangs={gangs}
            loading={gangsLoading}
            onOpenAuth={onOpenAuth}
            onNavigateToMatchings={() => setSubTab('matchings')}
            gameType={category}
          />
        )}

        {subTab === 'announcements' && (
          <WarsAnnouncements gameType={category} />
        )}

        {subTab === 'leaderboard' && (
          <WarsLeaderboard gameType={category} />
        )}

        {subTab === 'matchings' && (
          <WarsMatchings
            userGangs={gangs}
            onOpenAuth={onOpenAuth}
            onOpenPrivateChat={onOpenPrivateChat}
            gameType={category}
          />
        )}

        {subTab === 'live' && (
          <WarsLiveWars gangs={currentCategoryGangs} gameType={category} />
        )}
      </div>
    </div>
  );
};
