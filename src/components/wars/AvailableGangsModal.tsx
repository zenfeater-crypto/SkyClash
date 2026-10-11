import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Crown, 
  Swords, 
  Search, 
  MessageSquare, 
  Check, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Shield, 
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, WarsCategory, UserRole, GangApplication, GangInvitation } from '../../types';
import { 
  getAvailableGangs, 
  applyToGang, 
  getUserGang,
  acceptGangInvitation,
  declineGangInvitation,
  DEFAULT_GANG_MAX_MEMBERS 
} from '../../lib/gangHelpers';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AvailableGangsModalProps {
  gangs: WarsGang[];
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenPrivateChat?: (
    friendshipId: string, 
    partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: UserRole }
  ) => void;
}

export const AvailableGangsModal: React.FC<AvailableGangsModalProps> = ({
  gangs,
  isOpen,
  onClose,
  onOpenAuth,
  onOpenPrivateChat,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | WarsCategory>('all');
  const [applyingGangId, setApplyingGangId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [userApplications, setUserApplications] = useState<Record<string, GangApplication>>({});
  const [pendingInvitations, setPendingInvitations] = useState<GangInvitation[]>([]);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Check if current user already belongs to any gang across Skyblock and Bedwars
  const userGang = getUserGang(gangs, currentUser?.uid);

  // Real-time listener for current user's submitted gang applications
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const q = query(
      collection(db, 'gangApplications'),
      where('applicantUid', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map: Record<string, GangApplication> = {};
      snapshot.forEach((d) => {
        const app = d.data() as GangApplication;
        map[app.gangId] = app;
      });
      setUserApplications(map);
    }, (err) => {
      console.warn('Error loading user applications:', err);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  // Real-time listener for pending gang invitations sent to this user
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const q = query(
      collection(db, 'gangInvitations'),
      where('receiverUid', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GangInvitation[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GangInvitation);
      });
      setPendingInvitations(list);
    }, (err) => {
      console.warn('Error loading pending invitations:', err);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  // Only show active gangs that accept members and have available space
  const availableGangs = getAvailableGangs(gangs);

  const filteredGangs = availableGangs.filter((gang) => {
    const gangGameType = gang.gameType || 'skyblock';
    if (categoryFilter !== 'all' && gangGameType !== categoryFilter) return false;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    return (
      gang.name.toLowerCase().includes(term) ||
      (gang.tag && gang.tag.toLowerCase().includes(term)) ||
      gang.leaderUsername.toLowerCase().includes(term)
    );
  });

  const handleChatAndApply = async (gang: WarsGang) => {
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    if (userGang) {
      setNotice({
        type: 'error',
        message: `You already belong to ${userGang.name}. Players can belong to only ONE gang across Skyblock and Bedwars. Leave your current gang first.`
      });
      return;
    }

    setApplyingGangId(gang.id);
    setNotice(null);

    try {
      // 1. Submit formal gang application (prevents duplicates)
      const res = await applyToGang(
        gang,
        {
          uid: currentUser.uid,
          username: userProfile.username,
          name: userProfile.name,
          avatarUrl: userProfile.avatarUrl || userProfile.profilePhoto,
        },
        `Hello @${gang.leaderUsername}, I would like to apply to join ${gang.name}!`
      );

      if (!res.success && res.error) {
        setNotice({ type: 'error', message: res.error });
        setApplyingGangId(null);
        return;
      }

      // 2. Open Private Chat with the gang leader so they can communicate directly
      if (onOpenPrivateChat) {
        const sorted = [currentUser.uid, gang.leaderUid].sort().join('_');
        onOpenPrivateChat(sorted, {
          uid: gang.leaderUid,
          username: gang.leaderUsername,
          name: gang.leaderUsername,
          avatarUrl: gang.iconUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${gang.leaderUsername}`,
          role: 'user',
        });
      }

      setNotice({
        type: 'success',
        message: res.alreadyApplied
          ? `Application already pending with @${gang.leaderUsername}. Opened private chat to communicate!`
          : `Application submitted to @${gang.leaderUsername}! Private chat opened to communicate.`
      });

      // Auto close after brief moment
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Error applying to gang:', err);
      setNotice({ type: 'error', message: err.message || 'Failed to submit application.' });
    } finally {
      setApplyingGangId(null);
    }
  };

  const handleAcceptInvite = async (invitation: GangInvitation) => {
    if (!currentUser || !userProfile || processingInviteId) return;

    if (userGang) {
      setNotice({
        type: 'error',
        message: `You already belong to ${userGang.name}. Players can belong to only ONE gang across Skyblock and Bedwars.`
      });
      return;
    }

    setProcessingInviteId(invitation.id);
    setNotice(null);

    try {
      await acceptGangInvitation(invitation, {
        uid: currentUser.uid,
        username: userProfile.username,
        name: userProfile.name,
        avatarUrl: userProfile.avatarUrl || userProfile.profilePhoto,
        role: userProfile.role,
        membership: userProfile.membership
      });

      setNotice({
        type: 'success',
        message: `Successfully joined ${invitation.gangName}! Welcome to your new gang.`
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setNotice({ type: 'error', message: err.message || 'Failed to accept invitation.' });
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    if (processingInviteId) return;
    setProcessingInviteId(invitationId);
    try {
      await declineGangInvitation(invitationId);
      setNotice({ type: 'info', message: 'Gang invitation declined.' });
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      setNotice({ type: 'error', message: 'Failed to decline invitation.' });
    } finally {
      setProcessingInviteId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">
                Join a Gang
              </h2>
              <p className="text-xs text-slate-400">
                Active combat syndicates with open member slots across Skyblock & Bedwars
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Gang Active Warning */}
        {userGang && (
          <div className="p-3 sm:p-3.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Active Membership: </span>
              You currently belong to <span className="font-extrabold text-white underline">{userGang.name}</span>. 
              Players can belong to only ONE gang across Skyblock and Bedwars. Leave your current gang before joining or applying to another.
            </div>
          </div>
        )}

        {/* Notices */}
        {notice && (
          <div className={`px-5 py-2.5 text-xs flex items-center gap-2 shrink-0 ${
            notice.type === 'success' 
              ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-500/30' 
              : notice.type === 'error'
              ? 'bg-rose-950/80 text-rose-300 border-b border-rose-500/30'
              : 'bg-amber-950/80 text-amber-300 border-b border-amber-500/30'
          }`}>
            {notice.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Pending Invitations Section (If any received from gang leaders) */}
        {pendingInvitations.length > 0 && !userGang && (
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border-b border-amber-500/30 shrink-0 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 font-mono uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Pending Gang Invitations ({pendingInvitations.length})</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingInvitations.map((invite) => {
                const isProcessing = processingInviteId === invite.id;
                return (
                  <div 
                    key={invite.id}
                    className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-white">{invite.gangName}</span>
                        {invite.gangTag && (
                          <span className="text-[10px] text-amber-400 font-mono font-bold">[{invite.gangTag}]</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full uppercase font-bold bg-amber-500/20 text-amber-300">
                          {invite.gameType || 'Skyblock'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Invited by <span className="text-slate-300 font-medium">@{invite.senderUsername}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDeclineInvite(invite.id)}
                        className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs transition"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleAcceptInvite(invite)}
                        className="py-1 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 space-y-3 bg-slate-950/50 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by gang name, tag, or leader..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {(['all', 'skyblock', 'bedwars'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                    categoryFilter === cat
                      ? cat === 'bedwars'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'all' ? 'All Gangs' : cat === 'skyblock' ? 'Skyblock' : 'Bedwars'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gangs List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {filteredGangs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No Available Gangs Found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm
                  ? 'No gangs matched your search filters.'
                  : 'All registered gangs are currently at full capacity or not accepting new members.'}
              </p>
            </div>
          ) : (
            filteredGangs.map((gang) => {
              const isBedwars = gang.gameType === 'bedwars';
              const memberCount = gang.members?.length || gang.memberUids?.length || 1;
              const maxCapacity = gang.maxMembers || DEFAULT_GANG_MAX_MEMBERS;
              const isApplying = applyingGangId === gang.id;
              const pendingApp = userApplications[gang.id];
              const isPending = pendingApp && pendingApp.status === 'pending';

              // Leader display name and app username
              const leaderMember = gang.members?.find((m) => m.role === 'leader' || m.uid === gang.leaderUid);
              const leaderDisplayName = leaderMember?.displayName || gang.leaderUsername;

              return (
                <div
                  key={gang.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl ${
                      isBedwars ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    } border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden`}>
                      {gang.iconUrl ? (
                        <img src={gang.iconUrl} alt={gang.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>[{gang.tag || gang.name.substring(0, 3).toUpperCase()}]</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-sm truncate">
                          {gang.name}
                        </span>
                        {gang.tag && (
                          <span className={`text-[10px] font-mono font-bold ${
                            isBedwars ? 'text-rose-400' : 'text-amber-400'
                          }`}>
                            [{gang.tag}]
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isBedwars 
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30' 
                            : 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {isBedwars ? 'Bedwars' : 'Skyblock'}
                        </span>
                      </div>

                      {/* Leader Display Name & App Username + Member Limit */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-white font-bold text-xs">{leaderDisplayName}</span>
                          <span className="text-slate-400 text-[11px] font-mono">@{gang.leaderUsername}</span>
                        </div>

                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{memberCount}/{maxCapacity} Members</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {userGang ? (
                      <span className="py-2 px-3.5 rounded-xl bg-slate-800/80 text-slate-500 text-xs font-semibold border border-slate-700/60">
                        In Gang
                      </span>
                    ) : isPending ? (
                      <button
                        type="button"
                        onClick={() => handleChatAndApply(gang)}
                        className="py-2 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        title="Application is pending leader review. Click to chat with leader in Private Chat."
                      >
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>Pending • Chat</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isApplying}
                        onClick={() => handleChatAndApply(gang)}
                        className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-60 ${
                          isBedwars
                            ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/20'
                            : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20'
                        }`}
                      >
                        {isApplying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Applying...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat / Apply</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info notice */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span>Rule: Players can only belong to ONE gang across both Skyblock and Bedwars.</span>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition font-medium underline underline-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
