import React, { useState } from 'react';
import { 
  ArrowLeft, 
  X, 
  Users, 
  Crown, 
  UserPlus, 
  LogOut, 
  AlertTriangle, 
  ChevronRight, 
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, WarsGangMember } from '../../types';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { RoleBadge } from '../RoleBadge';
import { MembershipBadge } from '../MembershipBadge';

interface GangMenuModalProps {
  gang: WarsGang;
  isOpen: boolean;
  onBack: () => void;
  onClose: () => void;
  onViewAllMembers: () => void;
  onInviteFriend: () => void;
  onLeaveGangSuccess: () => void;
  onUpdateGang?: (updatedGang: WarsGang) => void;
}

export const GangMenuModal: React.FC<GangMenuModalProps> = ({
  gang,
  isOpen,
  onBack,
  onClose,
  onViewAllMembers,
  onInviteFriend,
  onLeaveGangSuccess,
  onUpdateGang
}) => {
  const { currentUser, isAdmin } = useAuth();
  
  // Destructive Leave Confirmation dialog state
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaderBlockModalOpen, setLeaderBlockModalOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isBedwars = gang.gameType === 'bedwars';
  const isLeader = currentUser && gang.leaderUid === currentUser.uid;
  const isMember = currentUser && (
    gang.memberUids?.includes(currentUser.uid) ||
    gang.members?.some((m) => m.uid === currentUser.uid) ||
    isLeader
  );

  // Take only the first 10 members for the preview
  const allMembers: WarsGangMember[] = gang.members || [];
  const previewMembers = allMembers.slice(0, 10);
  const hasMoreMembers = allMembers.length > 10;

  const handleInitiateLeave = () => {
    if (!currentUser) return;

    // Gang Leader Protection:
    // If the Leader tries to leave, prevent and explain they must first transfer leadership or contact Admin
    if (isLeader) {
      setLeaderBlockModalOpen(true);
      return;
    }

    if (!isMember) {
      alert("You are not currently a member of this gang.");
      return;
    }

    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = async () => {
    if (!currentUser || isLeader || leaving) return;

    setLeaving(true);
    setLeaveError(null);

    try {
      // Remove current user from memberUids and members array
      const updatedMembers = allMembers.filter((m) => m.uid !== currentUser.uid);
      const updatedMemberUids = (gang.memberUids || []).filter((u) => u !== currentUser.uid);

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

      setShowLeaveConfirm(false);
      onLeaveGangSuccess();
    } catch (err: any) {
      console.error('Failed to leave gang:', err);
      setLeaveError(err.message || 'Failed to leave gang. Please try again.');
      setLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Top-Left Back Arrow */}
        <div className={`p-4 sm:p-5 ${
          isBedwars 
            ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/30' 
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30'
        } border-b border-slate-800 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center justify-center shrink-0"
              title="Back to Gang Page"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Gang Menu
                </h2>
                {gang.tag && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg ${
                    isBedwars 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  } border font-mono font-bold`}>
                    [{gang.tag}]
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {gang.name} · Community Hub
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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* MEMBERS SECTION HEADER */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
                  MEMBERS
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  ({allMembers.length})
                </span>
              </div>

              {allMembers.length > 10 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Showing first 10
                </span>
              )}
            </div>

            {/* PREVIEW FIRST 10 MEMBERS */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 divide-y divide-slate-800/60 overflow-hidden">
              {previewMembers.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No members registered in this gang yet.
                </div>
              ) : (
                previewMembers.map((member) => {
                  const isMemberLeader = member.uid === gang.leaderUid;
                  return (
                    <div
                      key={member.uid}
                      className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-900/50 transition"
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
                    </div>
                  );
                })
              )}
            </div>

            {/* VIEW ALL MEMBERS BUTTON */}
            <button
              onClick={onViewAllMembers}
              className={`w-full mt-3 py-3 px-4 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.99]`}
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>VIEW ALL MEMBERS ({allMembers.length})</span>
              <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
            </button>
          </div>

          {/* ACTION BUTTONS: INVITE FRIEND & LEAVE GROUP */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            {/* INVITE FRIEND */}
            <button
              onClick={onInviteFriend}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg active:scale-[0.99] ${
                isBedwars
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/15'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/15'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>+ INVITE FRIEND</span>
            </button>

            {/* LEAVE GROUP (Safe Destructive Style Button) */}
            {isMember && (
              <button
                onClick={handleInitiateLeave}
                className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/50 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.99]"
              >
                <LogOut className="w-4 h-4" />
                <span>LEAVE GROUP</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL: LEAVE GROUP */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">
                Leave Gang
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to leave this Gang? You will lose access to its private chat and member roster.
              </p>
            </div>

            {leaveError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {leaveError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                CANCEL
              </button>

              <button
                onClick={handleConfirmLeave}
                disabled={leaving}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {leaving ? 'LEAVING...' : 'LEAVE GROUP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GANG LEADER PROTECTION MODAL */}
      {leaderBlockModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Crown className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">
                Gang Leader Protection
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                As the designated Gang Leader, you cannot leave the gang without transferring leadership to another member, or having the Owner Admin reassign the leader. A gang must always have a valid leader.
              </p>
            </div>

            <button
              onClick={() => setLeaderBlockModalOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
            >
              UNDERSTOOD
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
