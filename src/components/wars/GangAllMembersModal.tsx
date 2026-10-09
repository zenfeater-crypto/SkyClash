import React, { useState } from 'react';
import { 
  ArrowLeft, 
  X, 
  Users, 
  Crown, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  UserMinus, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, WarsGangMember } from '../../types';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { RoleBadge } from '../RoleBadge';
import { MembershipBadge } from '../MembershipBadge';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface GangAllMembersModalProps {
  gang: WarsGang;
  isOpen: boolean;
  onBack: () => void;
  onClose: () => void;
  onUpdateGang?: (updatedGang: WarsGang) => void;
}

export const GangAllMembersModal: React.FC<GangAllMembersModalProps> = ({
  gang,
  isOpen,
  onBack,
  onClose,
  onUpdateGang
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  if (!isOpen) return null;

  const isBedwars = gang.gameType === 'bedwars';
  const isLeader = currentUser && gang.leaderUid === currentUser.uid;
  const canManage = isAdmin || isLeader;

  const members: WarsGangMember[] = gang.members || [];
  
  // Filter members by search term
  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      m.username?.toLowerCase().includes(term) ||
      m.displayName?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageMembers = filteredMembers.slice(startIndex, startIndex + pageSize);

  const [deleteMemberTarget, setDeleteMemberTarget] = useState<{ uid: string; username: string } | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [deleteMemberError, setDeleteMemberError] = useState<string | null>(null);

  const handleRemoveMember = (memberUid: string, memberUsername: string) => {
    if (!canManage) return;
    if (memberUid === gang.leaderUid) {
      alert("The Gang Leader cannot be removed. Only Owner Admin can change the leader.");
      return;
    }

    setDeleteMemberTarget({ uid: memberUid, username: memberUsername });
    setDeleteMemberError(null);
  };

  const handleConfirmRemoveMember = async () => {
    if (!deleteMemberTarget) return;

    setIsDeletingMember(true);
    setDeleteMemberError(null);

    try {
      const updatedMembers = members.filter((m) => m.uid !== deleteMemberTarget.uid);
      const updatedMemberUids = (gang.memberUids || []).filter((u) => u !== deleteMemberTarget.uid);

      await updateDoc(doc(db, 'wars_gangs', gang.id), {
        members: updatedMembers,
        memberUids: updatedMemberUids,
        updatedAt: Date.now()
      });

      if (onUpdateGang) {
        onUpdateGang({
          ...gang,
          members: updatedMembers,
          memberUids: updatedMemberUids
        });
      }

      setDeleteMemberTarget(null);
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      setDeleteMemberError(err.message || 'Failed to remove member.');
    } finally {
      setIsDeletingMember(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 ${
          isBedwars 
            ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/30' 
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30'
        } border-b border-slate-800 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center justify-center shrink-0"
              title="Back to Gang Menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
                <h3 className="text-base sm:text-lg font-black text-white">
                  All Members ({members.length})
                </h3>
              </div>
              <div className="text-xs text-slate-400">
                {gang.name} {gang.tag ? `[${gang.tag}]` : ''} Roster
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search members by username or display name..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              {searchTerm ? 'No members match your search.' : 'No members found in this gang.'}
            </div>
          ) : (
            pageMembers.map((member) => {
              const isMemberLeader = member.uid === gang.leaderUid;
              return (
                <div
                  key={member.uid}
                  className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CircularProfileAvatar
                      src={member.avatarUrl || member.profilePhoto}
                      alt={member.username}
                      size="md"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">
                          {member.displayName || member.username}
                        </span>

                        {isMemberLeader && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold">
                            <Crown className="w-3 h-3 text-amber-400" /> Leader
                          </span>
                        )}

                        {member.userRole && (
                          <RoleBadge role={member.userRole} size="sm" />
                        )}

                        {member.membership?.level && (
                          <MembershipBadge
                            level={member.membership.level}
                            title={member.membership.title}
                            size="sm"
                          />
                        )}
                      </div>

                      <div className="text-xs text-slate-400 font-mono truncate">
                        @{member.username}
                      </div>
                    </div>
                  </div>

                  {canManage && !isMemberLeader && (
                    <button
                      onClick={() => handleRemoveMember(member.uid, member.username)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition shrink-0"
                      title="Remove member from gang"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">
              Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filteredMembers.length)} of {filteredMembers.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-mono text-white font-bold">
                {safePage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal for Removing Member */}
      <DeleteConfirmModal
        isOpen={!!deleteMemberTarget}
        title="Remove Gang Member"
        itemTypeLabel="Gang Member"
        itemName={deleteMemberTarget ? `@${deleteMemberTarget.username}` : ''}
        warningText={`Are you sure you want to remove @${deleteMemberTarget?.username} from ${gang.name}?`}
        confirmButtonText="Confirm Remove"
        cancelButtonText="Cancel"
        isDeleting={isDeletingMember}
        errorMessage={deleteMemberError}
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => {
          setDeleteMemberTarget(null);
          setDeleteMemberError(null);
        }}
      />
    </div>
  );
};
