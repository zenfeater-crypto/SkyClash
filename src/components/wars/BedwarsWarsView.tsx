import React, { useState, useEffect } from 'react';
import { 
  Bed, 
  Swords, 
  Flame, 
  Sparkles, 
  Users, 
  Megaphone, 
  Trophy, 
  Radio, 
  Clock, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, SkyblockWarsSubTab } from '../../types';
import { WarsGangsView } from './WarsGangsView';
import { WarsAnnouncements } from './WarsAnnouncements';
import { WarsLeaderboard } from './WarsLeaderboard';
import { WarsMatchings } from './WarsMatchings';
import { WarsLiveWars } from './WarsLiveWars';

interface BedwarsWarsViewProps {
  gangs?: WarsGang[];
  loading?: boolean;
  onOpenAuth: () => void;
  onSwitchToSkyblock?: () => void;
  onOpenPrivateChat?: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: any }) => void;
}

export const BedwarsWarsView: React.FC<BedwarsWarsViewProps> = ({
  gangs: propGangs,
  loading: propLoading,
  onOpenAuth,
  onSwitchToSkyblock,
  onOpenPrivateChat
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [subTab, setSubTab] = useState<SkyblockWarsSubTab>('gangs');

  // Internal listener if gangs prop isn't supplied
  const [localGangs, setLocalGangs] = useState<WarsGang[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (propGangs) {
      setLocalGangs(propGangs);
      setLocalLoading(propLoading ?? false);
      return;
    }

    const q = query(collection(db, 'wars_gangs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WarsGang[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as WarsGang);
        });
        setLocalGangs(list);
        setLocalLoading(false);
      },
      (err) => {
        console.error('Error fetching bedwars gangs:', err);
        setLocalLoading(false);
      }
    );
    return () => unsubscribe();
  }, [propGangs, propLoading]);

  const allGangs = propGangs || localGangs;
  const isLoading = propLoading !== undefined ? propLoading : localLoading;
  const bedwarsGangs = allGangs.filter((g) => g.gameType === 'bedwars');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-rose-500/30 bg-gradient-to-br from-slate-900 via-rose-950/25 to-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Bed className="w-3.5 h-3.5" /> Hypixel Bedwars Arena
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
              BEDWARS{' '}
              <span className="bg-gradient-to-r from-rose-400 via-red-400 to-amber-400 bg-clip-text text-transparent">
                CLAN WARS & RUSH
              </span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              Dedicated competitive Bedwars tournament ecosystem. Manage clan rosters, communicate in 30-minute private chats, review Admin rankings, issue 4v4 scrims, and follow live bed defense scoreboards.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>{bedwarsGangs.length} Registered Clans</span>
              </div>

              {onSwitchToSkyblock && (
                <button
                  onClick={onSwitchToSkyblock}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Swords className="w-3.5 h-3.5 text-amber-400" />
                  <span>Switch to Skyblock Wars</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Categories Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <button
          onClick={() => setSubTab('gangs')}
          className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'gangs'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4 text-rose-400" />
          <span>1. Gangs ({bedwarsGangs.length})</span>
        </button>

        <button
          onClick={() => setSubTab('announcements')}
          className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'announcements'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Megaphone className="w-4 h-4 text-rose-400" />
          <span>2. Announcements</span>
        </button>

        <button
          onClick={() => setSubTab('leaderboard')}
          className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'leaderboard'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-4 h-4 text-rose-400" />
          <span>3. Leaderboard</span>
        </button>

        <button
          onClick={() => setSubTab('matchings')}
          className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'matchings'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Swords className="w-4 h-4 text-rose-400" />
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

      {/* Category Views */}
      {subTab === 'gangs' && (
        <WarsGangsView
          gangs={allGangs}
          loading={isLoading}
          onOpenAuth={onOpenAuth}
          onNavigateToMatchings={() => setSubTab('matchings')}
          gameType="bedwars"
        />
      )}

      {subTab === 'announcements' && (
        <WarsAnnouncements gameType="bedwars" />
      )}

      {subTab === 'leaderboard' && (
        <WarsLeaderboard gameType="bedwars" />
      )}

      {subTab === 'matchings' && (
        <WarsMatchings
          userGangs={allGangs}
          onOpenAuth={onOpenAuth}
          onOpenPrivateChat={onOpenPrivateChat}
          gameType="bedwars"
        />
      )}

      {subTab === 'live' && (
        <WarsLiveWars gangs={bedwarsGangs} gameType="bedwars" />
      )}
    </div>
  );
};
