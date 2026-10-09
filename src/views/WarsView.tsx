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
  Clock,
  ArrowRight
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
import { TournamentsView } from '../components/wars/TournamentsView';

interface WarsViewProps {
  onOpenAuth: () => void;
  onBackToHome?: () => void;
  initialCategory?: WarsCategory;
  initialSubTab?: SkyblockWarsSubTab;
  onOpenPrivateChat?: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: any }) => void;
}

type WarsMode = 'landing' | 'tournaments' | 'gang_wars';

export const WarsView: React.FC<WarsViewProps> = ({
  onOpenAuth,
  onBackToHome,
  initialCategory = 'skyblock',
  initialSubTab = 'gangs',
  onOpenPrivateChat
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  
  // Navigation mode: defaults to 'landing' (FIRST show landing page)
  const [mode, setMode] = useState<WarsMode>('landing');
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. WARS LANDING PAGE (FIRST SHOW THIS WHEN OPENING WARS)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (mode === 'landing') {
    return (
      <div className="space-y-8 pb-16 animate-in fade-in duration-300">
        {/* Top Header */}
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
              <div className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                <span>COMPETITIVE COMBAT ARENA</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                WARS ARENA HUB
              </h1>
            </div>
          </div>
        </div>

        {/* Hero Welcome Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 p-6 sm:p-8 shadow-2xl shadow-amber-500/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> SELECT YOUR BATTLE FORMAT
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Competitive Player Challenges & Guild Warfare
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Choose your competitive format: post public 1v1 and 2v2 challenges with 12-hour expiry and instant direct messaging, 
              or enter sanctioned Gang Wars with official leaderboards, 4v4 matchings, and live scoreboards.
            </p>
          </div>
        </div>

        {/* 1. TOURNAMENTS */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                  OFFICIAL EVENTS
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide font-mono flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" /> 1. TOURNAMENTS
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Official Skyblock & Bedwars brackets · Sanctioned prize pools · Owner Admin Strike registration management
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skyblock Tournaments Card */}
            <div
              onClick={() => {
                setCategory('skyblock');
                setMode('tournaments');
              }}
              className="group cursor-pointer rounded-3xl bg-slate-900/90 border border-amber-500/40 hover:border-amber-400 hover:scale-[1.01] p-6 transition shadow-xl relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                  <Swords className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                    SKYBLOCK
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">Prize Pools</span>
                </div>
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition mb-1">
                Skyblock Tournaments
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Compete in official Hypixel Skyblock PvP trials, slayer boss races, and gear-restricted arena brackets. 
                Chat with Owner Admin Strike to register your slot.
              </p>

              <div className="flex items-center justify-between text-xs font-bold text-amber-400 pt-3 border-t border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> Official Sanctioned
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition font-mono">
                  Enter Skyblock Tournaments <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Bedwars Tournaments Card */}
            <div
              onClick={() => {
                setCategory('bedwars');
                setMode('tournaments');
              }}
              className="group cursor-pointer rounded-3xl bg-slate-900/90 border border-rose-500/40 hover:border-rose-400 hover:scale-[1.01] p-6 transition shadow-xl relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
                  <Bed className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold uppercase">
                    BEDWARS
                  </span>
                  <span className="text-[10px] text-rose-400 font-mono font-bold">Championship</span>
                </div>
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-rose-300 transition mb-1">
                Bedwars Tournaments
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                4v4 competitive clan championships, fast-bridge showdowns, and high-intensity doubles brackets. 
                Chat with Owner Admin Strike to secure your team or solo entry.
              </p>

              <div className="flex items-center justify-between text-xs font-bold text-rose-400 pt-3 border-t border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> Official Sanctioned
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition font-mono">
                  Enter Bedwars Tournaments <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. GANG WARS */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                  GUILD WARFARE
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide font-mono flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" /> 2. GANG WARS
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Sanctioned Gang rosters · 30-min auto-vanishing clan chat · Admin leaderboards · Matchings · Live Wars
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skyblock Gang Wars Card */}
            <div
              onClick={() => {
                setCategory('skyblock');
                setMode('gang_wars');
              }}
              className="group cursor-pointer rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 hover:scale-[1.01] p-6 transition shadow-xl"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                  <Crown className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase">
                  SKYBLOCK GUILDS
                </span>
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition mb-1">
                Skyblock Gang Wars
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Build your combat gang, coordinate in 30-minute private chats, climb the official Admin leaderboard, 
                and battle in live scrims.
              </p>

              <div className="flex items-center justify-between text-xs font-bold text-amber-400 pt-3 border-t border-slate-800">
                <span className="text-slate-400 font-mono text-[11px]">
                  5 Sub-Systems: Gangs · Announcements · Leaderboard · Matchings · Live
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition font-mono shrink-0">
                  Enter Skyblock Gangs <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Bedwars Gang Wars Card */}
            <div
              onClick={() => {
                setCategory('bedwars');
                setMode('gang_wars');
              }}
              className="group cursor-pointer rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 hover:scale-[1.01] p-6 transition shadow-xl"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
                  <Bed className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase">
                  BEDWARS CLANS
                </span>
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-rose-300 transition mb-1">
                Bedwars Gang Wars
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                4v4 competitive Bedwars clan combat, private clan channels, Admin tier rankings, and verified 
                scrimmage matchings.
              </p>

              <div className="flex items-center justify-between text-xs font-bold text-rose-400 pt-3 border-t border-slate-800">
                <span className="text-slate-400 font-mono text-[11px]">
                  5 Sub-Systems: Gangs · Announcements · Leaderboard · Matchings · Live
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition font-mono shrink-0">
                  Enter Bedwars Gangs <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. TOURNAMENTS SYSTEM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (mode === 'tournaments') {
    return (
      <TournamentsView
        initialCategory={category}
        onOpenAuth={onOpenAuth}
        onOpenPrivateChat={onOpenPrivateChat}
        onBackToLanding={() => setMode('landing')}
      />
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. GANG WARS SYSTEM (PRESERVED EXACTLY AS ALREADY BUILT)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Category Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode('landing')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Return to Wars Selection"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className={`text-[11px] font-mono ${isBedwars ? 'text-rose-400' : 'text-amber-400'} font-bold uppercase tracking-wider flex items-center gap-1.5`}>
              {isBedwars ? <Bed className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
              <span>{isBedwars ? 'BEDWARS GANG WARS' : 'SKYBLOCK GANG WARS'}</span>
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
