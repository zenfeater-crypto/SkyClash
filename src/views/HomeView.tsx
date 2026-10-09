import React from 'react';
import { 
  Scale, 
  ListFilter, 
  Heart, 
  History, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  Flame,
  Search,
  Sparkles,
  Swords
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { useUserData } from '../context/UserDataContext';
import { formatCoins, formatTimeAgo } from '../lib/formatters';
import { RARITY_COLORS } from '../data/initialItems';
import { NavTab } from '../components/Navigation';
import { RoleBadge } from '../components/RoleBadge';
import { MembershipBadge } from '../components/MembershipBadge';
import { CircularProfileAvatar } from '../components/CircularProfileAvatar';
import { CommunityAdBanner } from '../components/CommunityAdBanner';
import { HomeWarsBanner } from '../components/HomeWarsBanner';
import { DailyRewardsCard } from '../components/DailyRewardsCard';
import { WarsCategory } from '../types';

interface HomeViewProps {
  onNavigate: (tab: NavTab) => void;
  onSelectItem: (itemId: string) => void;
  onOpenAuth: () => void;
  onEnterWars?: (category?: WarsCategory) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onSelectItem, onOpenAuth, onEnterWars }) => {
  const { currentUser, userProfile } = useAuth();
  const { items } = useItems();
  const { favorites, tradeHistory } = useUserData();

  // Highlight top valuable & high demand items
  const highDemandItems = items
    .filter((i) => i.demand === 'EXTREME' || i.demand === 'HIGH')
    .slice(0, 6);

  const topValueItems = [...items]
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const handleOpenWars = (cat?: WarsCategory) => {
    if (onEnterWars) {
      onEnterWars(cat);
    } else {
      onNavigate('wars');
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* User Coin Balance Badge (TOP-RIGHT corner of Home) */}
        <div className="sm:absolute sm:top-8 sm:right-8 z-20 mb-4 sm:mb-0 inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/80 border border-amber-500/40 shadow-xl shadow-amber-500/10 backdrop-blur-md">
          <span className="text-xl select-none">🪙</span>
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-400 font-mono uppercase font-black tracking-wider leading-none">
              COIN BALANCE
            </span>
            <span className="text-base sm:text-lg font-black text-white font-mono leading-tight tracking-tight">
              {userProfile?.coinBalance !== undefined ? userProfile.coinBalance.toLocaleString() : '0'}
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Skyblock Trading Intelligence
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Accurate Values. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Neutral Trade Calculations.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
            Real-time market values, automatic coin differences, multi-item trade calculations,
            public world chat, and social trading built specifically for Hypixel Skyblock players.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('calculator')}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center gap-2 active:scale-95 transition"
            >
              <Scale className="w-4 h-4" />
              <span>Launch Calculator</span>
            </button>

            <button
              onClick={() => handleOpenWars('skyblock')}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 active:scale-95 transition"
            >
              <Swords className="w-4 h-4" />
              <span>Enter Wars Arena</span>
            </button>

            <button
              onClick={() => onNavigate('tradefeed')}
              className="py-3 px-6 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-sm flex items-center gap-2 transition"
            >
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>Live Trade Feed</span>
            </button>

            <button
              onClick={() => onNavigate('valuelist')}
              className="py-3 px-6 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-sm flex items-center gap-2 transition"
            >
              <ListFilter className="w-4 h-4" />
              <span>Browse Value List</span>
            </button>
          </div>
        </div>

        {/* Quick User Stats / Mini Profile Greeting */}
        {currentUser && userProfile && (
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CircularProfileAvatar
                src={userProfile.profilePhoto || userProfile.avatarUrl}
                alt={userProfile.username}
                size="md"
                role={userProfile.role}
                membership={userProfile.membership}
                profileFrameId={userProfile.profileFrameId}
                isAdmin={userProfile.role === 'admin'}
              />
              <div>
                <div className="text-xs text-slate-400">Trading as</div>
                <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>{userProfile.name || userProfile.username}</span>
                  <span className="text-xs text-cyan-400 font-mono font-normal">
                    @{userProfile.username}
                  </span>
                  <RoleBadge role={userProfile.role} size="sm" />
                  {userProfile.membership?.level && (
                    <MembershipBadge
                      level={userProfile.membership.level}
                      title={userProfile.membership.title}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
              <div>
                Favorites: <span className="text-pink-400 font-bold">{favorites.length}</span>
              </div>
              <div>
                Trades Saved: <span className="text-cyan-400 font-bold">{tradeHistory.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DAILY LOGIN REWARDS SECTION */}
      <DailyRewardsCard onOpenAuth={onOpenAuth} />

      {/* LARGE PROMINENT WARS SECTION ON HOME */}
      <HomeWarsBanner onEnterWars={handleOpenWars} />

      {/* Community Partner / Ad Banner (Hidden for Ad-Free Members: Vanguard, Overlord, Supreme, Owner Admin) */}
      <CommunityAdBanner />

      {/* Feature Navigation Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
            <Flame className="w-5 h-5 text-cyan-400" /> Fast Navigation
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <button
            onClick={() => handleOpenWars('skyblock')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/40 hover:border-amber-400 hover:bg-slate-850 text-left transition group shadow-md shadow-amber-500/5"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition">
              <Swords className="w-5 h-5" />
            </div>
            <div className="font-bold text-amber-300 text-sm">Wars Arena</div>
            <div className="text-[11px] text-slate-400 mt-1">Skyblock & Bedwars</div>
          </button>

          <button
            onClick={() => onNavigate('calculator')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-850 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition">
              <Scale className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-sm">Calculator</div>
            <div className="text-[11px] text-slate-400 mt-1">Compare trades side-by-side</div>
          </button>

          <button
            onClick={() => onNavigate('valuelist')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-850 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition">
              <ListFilter className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-sm">Value List</div>
            <div className="text-[11px] text-slate-400 mt-1">Browse market prices & demand</div>
          </button>

          <button
            onClick={() => onNavigate('favorites')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-pink-500/40 hover:bg-slate-850 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-105 transition">
              <Heart className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-sm">Favorites</div>
            <div className="text-[11px] text-slate-400 mt-1">{favorites.length} items pinned</div>
          </button>

          <button
            onClick={() => onNavigate('history')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-850 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition">
              <History className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-sm">Trade Log</div>
            <div className="text-[11px] text-slate-400 mt-1">Review your saved trades</div>
          </button>

          <button
            onClick={() => onNavigate('worldchat')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-sm">World Chat</div>
            <div className="text-[11px] text-slate-400 mt-1">Live player trading lobby</div>
          </button>

          <button
            onClick={() => onNavigate('friends')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-sm">Friends</div>
            <div className="text-[11px] text-slate-400 mt-1">Direct message partners</div>
          </button>
        </div>
      </div>

      {/* Trending / High Demand Items Showcase */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" /> High Demand Equipment
            </h2>
            <p className="text-xs text-slate-400">Most actively traded items in the current meta</p>
          </div>

          <button
            onClick={() => onNavigate('valuelist')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            View all ({items.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {highDemandItems.map((item) => {
            const rarityStyle = (item.rarity && RARITY_COLORS[item.rarity]) || RARITY_COLORS.COMMON;
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-cyan-500/50 hover:bg-slate-850 cursor-pointer transition flex items-center gap-4 group"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    loading="lazy"
                  />
                  <span
                    className={`absolute bottom-0 inset-x-0 text-[9px] font-extrabold text-center uppercase tracking-wider py-0.5 ${rarityStyle.bg} ${rarityStyle.text}`}
                  >
                    {item.rarity}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate group-hover:text-cyan-300 transition">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-bold text-cyan-400 text-sm">
                      {formatCoins(item.value)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                      {item.demand}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-1">
                    {item.category} • Updated {formatTimeAgo(item.updatedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Highest Value Showcase */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" /> Crown Jewels (Highest Valuation)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {topValueItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-purple-500/40 cursor-pointer transition"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{item.category}</span>
                <span className="text-pink-400 font-bold font-mono">{item.rarity}</span>
              </div>
              <div className="font-bold text-sm text-white truncate">{item.name}</div>
              <div className="font-mono text-cyan-400 font-extrabold text-base mt-2">
                {formatCoins(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Home Page Credits */}
      <footer className="pt-10 pb-6 text-center space-y-1.5 border-t border-slate-900/80 select-none">
        <div className="text-xs sm:text-sm font-semibold tracking-wider font-mono text-slate-300">
          <span className="text-cyan-400 font-bold">Founder</span>
          <span className="text-slate-600 mx-2">—</span>
          <span className="text-white font-bold tracking-wide">Strike</span>
        </div>
        <div className="text-[11px] sm:text-xs font-medium tracking-wider font-mono text-slate-400">
          <span className="text-purple-400 font-semibold">Operators</span>
          <span className="text-slate-600 mx-2">—</span>
          <span className="text-slate-300 font-semibold tracking-wide">Zulfiqar & Mehar</span>
        </div>
        <div className="text-[10px] text-slate-600 font-mono tracking-widest uppercase pt-1">
          Skyblock Value Calculator • Live Trading Engine
        </div>
      </footer>
    </div>
  );
};

