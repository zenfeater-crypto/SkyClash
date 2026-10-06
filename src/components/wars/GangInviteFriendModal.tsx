import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  X, 
  UserPlus, 
  Search, 
  Check, 
  Users, 
  ShieldAlert, 
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, WarsGangMember, Friendship, UserRole } from '../../types';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { stripSpoofedRoleTags } from '../../lib/validation';

interface GangInviteFriendModalProps {
  gang: WarsGang;
  isOpen: boolean;
  onBack: () => void;
  onClose: () => void;
  onUpdateGang?: (updatedGang: WarsGang) => void;
}

interface FriendItem {
  friendshipId: string;
  uid: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

export const GangInviteFriendModal: React.FC<GangInviteFriendModalProps> = ({
  gang,
  isOpen,
  onBack,
  onClose,
  onUpdateGang
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [invitingUid, setInvitingUid] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBedwars = gang.gameType === 'bedwars';
  const isLeader = currentUser && gang.leaderUid === currentUser.uid;
  const canInvite = isAdmin || isLeader;

  // Listen to current user's existing friendships from the existing Friends system
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    setLoading(true);
    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: FriendItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Friendship;
          const partnerUid = data.users.find((u) => u !== currentUser.uid);
          if (partnerUid) {
            const partnerUsername = data.usernames?.[partnerUid] || 'Friend';
            const partnerName = data.names?.[partnerUid] || partnerUsername;
            const partnerAvatar = data.avatars?.[partnerUid] || '';
            list.push({
              friendshipId: d.id,
              uid: partnerUid,
              username: partnerUsername,
              name: partnerName,
              avatarUrl: partnerAvatar
            });
          }
        });
        setFriends(list);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load friends for gang invite:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  // Filter friends by search term
  const filteredFriends = friends.filter((f) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      f.username.toLowerCase().includes(term) ||
      (f.name && f.name.toLowerCase().includes(term))
    );
  });

  const handleInviteFriend = async (friend: FriendItem) => {
    if (!canInvite || !currentUser || invitingUid) return;

    // Check if already in gang
    if (gang.memberUids?.includes(friend.uid) || gang.members?.some((m) => m.uid === friend.uid)) {
      setErrorMessage(`@${friend.username} is already a member of this gang.`);
      return;
    }

    setInvitingUid(friend.uid);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Look up friend's full user profile from users collection for accurate role/avatar
      let friendRole: UserRole = 'user';
      let friendMembership = undefined;
      let friendAvatar = friend.avatarUrl || '';
      try {
        const userDoc = await getDoc(doc(db, 'users', friend.uid));
        if (userDoc.exists()) {
          const udata = userDoc.data();
          friendRole = udata.role || 'user';
          friendMembership = udata.membership || undefined;
          friendAvatar = udata.profilePhoto || udata.avatarUrl || friendAvatar;
        }
      } catch (e) {
        console.warn('Could not fetch target user profile, using friendship cache:', e);
      }

      const newMember: WarsGangMember = {
        uid: friend.uid,
        username: stripSpoofedRoleTags(friend.username),
        displayName: stripSpoofedRoleTags(friend.name || friend.username),
        role: 'member',
        joinedAt: Date.now(),
        avatarUrl: friendAvatar,
        userRole: friendRole,
        membership: friendMembership
      };

      const updatedMembers = [...(gang.members || []), newMember];
      const updatedMemberUids = [...(gang.memberUids || []), friend.uid];

      // Update gang in Firestore
      await updateDoc(doc(db, 'wars_gangs', gang.id), {
        members: updatedMembers,
        memberUids: updatedMemberUids,
        updatedAt: Date.now()
      });

      // Also record invitation doc for history/record keeping
      const inviteId = `${gang.id}_${friend.uid}`;
      await setDoc(doc(db, 'gangInvitations', inviteId), {
        id: inviteId,
        gangId: gang.id,
        gangName: gang.name,
        gangTag: gang.tag || '',
        gangIcon: gang.iconUrl || '',
        gameType: gang.gameType || 'skyblock',
        senderUid: currentUser.uid,
        senderUsername: stripSpoofedRoleTags(userProfile?.username || 'Leader'),
        receiverUid: friend.uid,
        receiverUsername: friend.username,
        status: 'accepted',
        createdAt: Date.now()
      });

      if (onUpdateGang) {
        onUpdateGang({
          ...gang,
          members: updatedMembers,
          memberUids: updatedMemberUids
        });
      }

      setSuccessMessage(`Successfully added @${friend.username} to ${gang.name}!`);
    } catch (err: any) {
      console.error('Failed to invite friend:', err);
      setErrorMessage(err.message || 'Failed to send invitation.');
    } finally {
      setInvitingUid(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
                <UserPlus className={`w-4 h-4 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
                <h3 className="text-base sm:text-lg font-black text-white">
                  Invite Friend
                </h3>
              </div>
              <div className="text-xs text-slate-400">
                Add your friends to {gang.name}
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

        {/* Notices */}
        {!canInvite && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Only designated Gang Leaders or the Owner Admin can recruit members to this gang.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your friends by username..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Friends List from existing Friends System */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2 font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span>Loading your friends list...</span>
            </div>
          ) : friends.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="font-bold text-white">No Friends Found</div>
              <p className="text-slate-400 max-w-xs mx-auto">
                You haven't added any friends yet. Add friends via the "Friends" tab to invite them to your gang!
              </p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              No friends match "{searchTerm}".
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isAlreadyMember = 
                gang.memberUids?.includes(friend.uid) || 
                gang.members?.some((m) => m.uid === friend.uid);
              const isInviting = invitingUid === friend.uid;

              return (
                <div
                  key={friend.uid}
                  className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CircularProfileAvatar
                      src={friend.avatarUrl}
                      alt={friend.username}
                      size="md"
                    />

                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate">
                        {friend.name || friend.username}
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate">
                        @{friend.username}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isAlreadyMember ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-700">
                        In Gang
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInviteFriend(friend)}
                        disabled={!canInvite || isInviting}
                        className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          canInvite
                            ? isBedwars
                              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-sm'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isInviting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Invite</span>
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
      </div>
    </div>
  );
};
