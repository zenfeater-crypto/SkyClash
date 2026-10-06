import React from 'react';
import { 
  Home, 
  ListFilter, 
  Scale, 
  MessageSquare, 
  Users, 
  Settings, 
  Heart, 
  History, 
  ShieldAlert, 
  LogIn, 
  LogOut,
  User as UserIcon,
  Calculator as CalculatorIcon,
  ArrowLeftRight,
  Swords
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { MembershipBadge } from './MembershipBadge';
import { CircularProfileAvatar } from './CircularProfileAvatar';
import { stripSpoofedRoleTags } from '../lib/validation';

export type NavTab = 
  | 'home' 
  | 'valuelist' 
  | 'tradefeed'
  | 'calculator' 
  | 'itemdetail' 
  | 'favorites' 
  | 'history' 
  | 'worldchat' 
  | 'friends' 
  | 'settings' 
  | 'admin'
  | 'wars';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavigationProps> = ({ currentTab, onTabChange, onOpenAuth }) => {
  const { currentUser, userProfile, isAdmin, isStaff } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => onTabChange('home')} 
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition">
            <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
              <Scale className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base tracking-wider bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              SKYBLOCK VALUES
            </span>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest hidden sm:block">
              LIVE TRADING ENGINE
            </div>
          </div>
        </div>

        {/* Desktop Primary Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => onTabChange('home')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'home'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => onTabChange('valuelist')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'valuelist'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Value List</span>
          </button>

          <button
            onClick={() => onTabChange('tradefeed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'tradefeed'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Trade</span>
          </button>

          <button
            onClick={() => onTabChange('calculator')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'calculator'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <CalculatorIcon className="w-3.5 h-3.5" />
            <span>Calculator</span>
          </button>

          <button
            onClick={() => onTabChange('worldchat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'worldchat'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>World Chat</span>
          </button>

          <button
            onClick={() => onTabChange('friends')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'friends'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends</span>
          </button>

          <button
            onClick={() => onTabChange('wars')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentTab === 'wars'
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>Wars</span>
          </button>

          {isStaff && (
            <button
              onClick={() => onTabChange('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                currentTab === 'admin'
                  ? isAdmin
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : isAdmin
                    ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40'
                    : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Admin' : 'Staff'}</span>
            </button>
          )}
        </nav>

        {/* User profile / Auth buttons */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTabChange('favorites')}
                title="Favorites"
                className={`p-2 rounded-xl border transition ${
                  currentTab === 'favorites'
                    ? 'bg-pink-500/15 border-pink-500/40 text-pink-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-pink-400'
                }`}
              >
                <Heart className="w-4 h-4" />
              </button>

              <button
                onClick={() => onTabChange('history')}
                title="Trade History"
                className={`p-2 rounded-xl border transition ${
                  currentTab === 'history'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400'
                }`}
              >
                <History className="w-4 h-4" />
              </button>

              <button
                onClick={() => onTabChange('settings')}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition ${
                  currentTab === 'settings'
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <CircularProfileAvatar
                  src={userProfile?.profilePhoto || userProfile?.avatarUrl}
                  alt={userProfile?.username || 'user'}
                  size="xs"
                  role={userProfile?.role}
                  membership={userProfile?.membership}
                  isAdmin={userProfile?.role === 'admin'}
                />
                <div className="flex flex-col text-left leading-none max-w-[100px]">
                  <span className="text-xs font-semibold text-white truncate">
                    {stripSpoofedRoleTags(userProfile?.name || userProfile?.username) || 'Trader'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    @{userProfile?.username}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <RoleBadge role={userProfile?.role} size="xs" />
                  {userProfile?.membership?.level && (
                    <MembershipBadge
                      level={userProfile.membership.level}
                      title={userProfile.membership.title}
                      size="xs"
                    />
                  )}
                </div>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-white text-xs tracking-wide shadow-md shadow-cyan-500/20 flex items-center gap-1.5 active:scale-95 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC<NavigationProps> = ({ currentTab, onTabChange, onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around">
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition ${
            currentTab === 'home' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onTabChange('valuelist')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition ${
            currentTab === 'valuelist' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Values</span>
        </button>

        <button
          onClick={() => onTabChange('tradefeed')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition ${
            currentTab === 'tradefeed' 
              ? 'text-cyan-300 scale-105' 
              : 'text-slate-400'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
            <Scale className="w-4 h-4" />
          </div>
          <span>Trade</span>
        </button>

        <button
          onClick={() => onTabChange('worldchat')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition ${
            currentTab === 'worldchat' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => onTabChange('wars')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-bold transition ${
            currentTab === 'wars' ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <Swords className="w-4 h-4 text-amber-400" />
          <span>Wars</span>
        </button>

        <button
          onClick={() => onTabChange('calculator')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition ${
            currentTab === 'calculator' ? 'text-cyan-400 font-bold' : 'text-slate-400'
          }`}
        >
          <CalculatorIcon className="w-4 h-4" />
          <span>Calculator</span>
        </button>
      </div>
    </div>
  );
};
