import React, { useState } from 'react';
import { 
  Users, 
  Crown, 
  Plus, 
  MessageSquare, 
  Swords, 
  Shield, 
  Sparkles, 
  Trophy, 
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, WarsCategory } from '../../types';
import { GangChatModal } from './GangChatModal';
import { GangDetailModal } from './GangDetailModal';
import { CreateGangModal } from './CreateGangModal';
import { GangMenuModal } from './GangMenuModal';
import { GangAllMembersModal } from './GangAllMembersModal';
import { GangInviteFriendModal } from './GangInviteFriendModal';
import { CircularProfileAvatar } from '../CircularProfileAvatar';

interface WarsGangsViewProps {
  gangs: WarsGang[];
  loading: boolean;
  onOpenAuth: () => void;
  onNavigateToMatchings: () => void;
  gameType?: WarsCategory;
}

export const WarsGangsView: React.FC<WarsGangsViewProps> = ({
  gangs,
  loading,
  onOpenAuth,
  onNavigateToMatchings,
  gameType = 'skyblock'
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'recruiting'>('all');

  // Selected gang for Detail Modal
  const [selectedGang, setSelectedGang] = useState<WarsGang | null>(null);

  // Selected gang for Gang Chat Modal
  const [chatGang, setChatGang] = useState<WarsGang | null>(null);

  // Create Gang Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Dedicated Gang Menu states
  const [menuGang, setMenuGang] = useState<WarsGang | null>(null);
  const [allMembersGang, setAllMembersGang] = useState<WarsGang | null>(null);
  const [inviteFriendGang, setInviteFriendGang] = useState<WarsGang | null>(null);

  const isBedwars = gameType === 'bedwars';

  // Filter gangs by search, status, and gameType separation
  const filteredGangs = gangs.filter((g) => {
    // If gang has gameType, must match. If gang has no gameType (legacy), treat as skyblock
    const gangGameType = g.gameType || 'skyblock';
    if (gangGameType !== gameType) return false;

    const matchesSearch = 
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.leaderUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.tag && g.tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className={`w-5 h-5 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
              {isBedwars ? 'Bedwars' : 'Skyblock'} Gangs
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Independent combat syndicates within {isBedwars ? 'Bedwars' : 'Skyblock'} Wars. Formed, verified, and sanctioned by the Owner Admin.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className={`py-2.5 px-4 rounded-xl ${isBedwars ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/20' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20'} font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition shrink-0`}
          >
            <Plus className="w-4 h-4" />
            <span>Create Gang Group (Admin)</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by gang name, tag, or leader..."
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-amber-500/50 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'active', 'recruiting'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === filter
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {filter === 'all' ? 'All Gangs' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Gangs Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono">Loading {isBedwars ? 'Bedwars' : 'Skyblock'} Gangs...</div>
      ) : filteredGangs.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="font-bold text-white text-sm">No Gangs Found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'No gangs matched your search filters.'
              : 'No gangs have been registered yet. The Owner Admin has authority to establish new gangs.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGangs.map((gang) => {
            const isUserMember = currentUser && (
              gang.memberUids?.includes(currentUser.uid) ||
              gang.members?.some((m) => m.uid === currentUser.uid) ||
              gang.leaderUid === currentUser.uid
            );
            const isUserLeader = currentUser && gang.leaderUid === currentUser.uid;

            return (
              <div
                key={gang.id}
                onClick={() => setSelectedGang(gang)}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer flex flex-col justify-between group shadow-xl hover:shadow-amber-500/5 relative overflow-hidden"
              >
                <div>
                  {/* Top Gang Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-sm shrink-0 overflow-hidden shadow-md">
                        {gang.iconUrl ? (
                          <img src={gang.iconUrl} alt={gang.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>[{gang.tag || gang.name.substring(0, 3).toUpperCase()}]</span>
                        )}
                      </div>

                      <div>
                        <div className="text-base font-black text-white group-hover:text-amber-300 transition flex items-center gap-1.5 flex-wrap">
                          <span>{gang.name}</span>
                          {gang.tag && (
                            <span className="text-[11px] text-amber-400 font-mono">[{gang.tag}]</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>@{gang.leaderUsername}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        gang.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : gang.status === 'recruiting'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                      }`}>
                        {gang.status || 'Active'}
                      </span>

                      {/* Three-dot menu button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuGang(gang);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Gang Menu"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bio */}
                  {gang.bio && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
                      {gang.bio}
                    </p>
                  )}

                  {/* Stats & Members Info */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center font-mono text-[11px]">
                    <div>
                      <div className="text-slate-500 text-[10px]">MEMBERS</div>
                      <div className="text-white font-bold">{gang.members?.length || 1}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">WINS</div>
                      <div className="text-amber-400 font-bold">{gang.stats?.wins || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">RATING</div>
                      <div className="text-cyan-400 font-bold">{gang.stats?.rating || 1000}</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition">
                    View Roster & Stats →
                  </span>

                  {(isUserMember || isAdmin) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatGang(gang);
                      }}
                      className="py-1 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Gang Chat</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gang Detail Modal */}
      {selectedGang && (
        <GangDetailModal
          gang={selectedGang}
          isOpen={true}
          onClose={() => setSelectedGang(null)}
          onOpenChat={() => {
            const target = selectedGang;
            setSelectedGang(null);
            setChatGang(target);
          }}
          onCreateMatching={() => {
            setSelectedGang(null);
            onNavigateToMatchings();
          }}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Gang Chat Modal */}
      {chatGang && (
        <GangChatModal
          gang={chatGang}
          isOpen={true}
          onClose={() => setChatGang(null)}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Standalone Gang Sub-Pages (when accessed directly via card three-dot button) */}
      {inviteFriendGang && (
        <GangInviteFriendModal
          gang={inviteFriendGang}
          isOpen={true}
          onBack={() => setInviteFriendGang(null)}
          onClose={() => setInviteFriendGang(null)}
        />
      )}

      {allMembersGang && (
        <GangAllMembersModal
          gang={allMembersGang}
          isOpen={true}
          onBack={() => setAllMembersGang(null)}
          onClose={() => setAllMembersGang(null)}
        />
      )}

      {menuGang && !allMembersGang && !inviteFriendGang && (
        <GangMenuModal
          gang={menuGang}
          isOpen={true}
          onBack={() => {
            const target = menuGang;
            setMenuGang(null);
            setSelectedGang(target);
          }}
          onClose={() => setMenuGang(null)}
          onViewAllMembers={() => setAllMembersGang(menuGang)}
          onInviteFriend={() => setInviteFriendGang(menuGang)}
          onLeaveGangSuccess={() => {
            setMenuGang(null);
            setSelectedGang(null);
          }}
        />
      )}

      {/* Create Gang Modal (Admin Only) */}
      <CreateGangModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        gameType={gameType}
        onSuccess={() => {
          // Snapshot updates state automatically
        }}
      />
    </div>
  );
};
