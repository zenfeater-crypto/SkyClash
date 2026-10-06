import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  MessageSquare, 
  Check, 
  X, 
  UserX, 
  Clock, 
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { FriendRequest, Friendship, UserProfile, UserRole } from '../types';
import { RoleBadge } from '../components/RoleBadge';
import { CircularProfileAvatar } from '../components/CircularProfileAvatar';
import { stripSpoofedRoleTags } from '../lib/validation';
import { BackButton } from '../components/BackButton';

interface FriendsViewProps {
  onOpenAuth: () => void;
  onOpenPrivateChat: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: UserRole }) => void;
  onBack?: () => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ onOpenAuth, onOpenPrivateChat, onBack }) => {
  const { currentUser, userProfile } = useAuth();
  const { blockUser } = useUserData();

  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'requests' | 'search'>('friends');
  
  // Real-time friend requests and friendships
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  
  // Search state
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Sync incoming/outgoing friend requests
  useEffect(() => {
    if (!currentUser) return;

    const reqQuery = query(
      collection(db, 'friendRequests'),
      where('receiverUid', '==', currentUser.uid)
    );

    const unsubReqs = onSnapshot(reqQuery, (snap) => {
      const list: FriendRequest[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as FriendRequest);
      });
      setFriendRequests(list.filter((r) => r.status === 'pending'));
    });

    const friendQuery = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', currentUser.uid)
    );

    const unsubFriends = onSnapshot(friendQuery, (snap) => {
      const list: Friendship[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Friendship);
      });
      setFriendships(list);
    });

    return () => {
      unsubReqs();
      unsubFriends();
    };
  }, [currentUser]);

  // Search users in Firestore by normalized username (case-insensitive)
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setIsSearching(true);
    setSearchMessage(null);
    setSearchResults([]);

    const normalized = searchUsername.trim().toLowerCase();

    try {
      // Lookup normalized username in users collection
      const q = query(
        collection(db, 'users'),
        where('normalizedUsername', '>=', normalized),
        where('normalizedUsername', '<=', normalized + '\uf8ff')
      );
      const snap = await getDocs(q);
      const results: UserProfile[] = [];
      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.uid !== currentUser?.uid) {
          results.push(u);
        }
      });

      setSearchResults(results);
      if (results.length === 0) {
        setSearchMessage('No users found matching that username.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchMessage(err.message || 'Error searching users.');
    } finally {
      setIsSearching(false);
    }
  };

  // Send friend request
  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!currentUser || !userProfile) return;
    try {
      const reqId = `${currentUser.uid}_${targetUser.uid}`;
      await setDoc(doc(db, 'friendRequests', reqId), {
        id: reqId,
        senderUid: currentUser.uid,
        senderUsername: userProfile.username,
        senderAvatar: userProfile.avatarUrl || '',
        receiverUid: targetUser.uid,
        receiverUsername: targetUser.username,
        status: 'pending',
        createdAt: Date.now(),
      });
      setSearchMessage(`Friend request sent to ${targetUser.username}!`);
    } catch (err: any) {
      setSearchMessage(err.message || 'Failed to send request.');
    }
  };

  // Accept request
  const handleAcceptRequest = async (req: FriendRequest) => {
    if (!currentUser || !userProfile) return;
    try {
      // 1. Create or update friendship document
      const sortedUids = [currentUser.uid, req.senderUid].sort();
      const friendshipId = sortedUids.join('_');

      await setDoc(doc(db, 'friendships', friendshipId), {
        id: friendshipId,
        users: sortedUids,
        usernames: {
          [currentUser.uid]: userProfile.username,
          [req.senderUid]: req.senderUsername,
        },
        names: {
          [currentUser.uid]: userProfile.name || userProfile.username,
          [req.senderUid]: req.senderUsername,
        },
        avatars: {
          [currentUser.uid]: userProfile.profilePhoto || userProfile.avatarUrl || '',
          [req.senderUid]: req.senderAvatar || '',
        },
        createdAt: Date.now(),
      });

      // 2. Remove or mark friend request accepted
      await deleteDoc(doc(db, 'friendRequests', req.id));
    } catch (err: any) {
      console.error('Accept error:', err);
    }
  };

  // Decline request
  const handleDeclineRequest = async (req: FriendRequest) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', req.id));
    } catch (err: any) {
      console.error('Decline error:', err);
    }
  };

  // Remove friendship
  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Remove this user from your friends?')) return;
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
    } catch (err: any) {
      console.error('Remove friend error:', err);
    }
  };

  if (!currentUser) {
    return (
      <div className="py-20 text-center max-w-md mx-auto p-8 bg-slate-900 border border-slate-800 rounded-3xl">
        <Users className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Friends System</h2>
        <p className="text-xs text-slate-400 mb-6">
          Sign in to add friends, accept trade requests, and launch encrypted direct messages.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white text-xs shadow-lg shadow-cyan-500/20"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {onBack && (
        <div className="mb-2">
          <BackButton onClick={onBack} label="Back" />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase font-mono flex items-center gap-3">
            <Users className="w-7 h-7 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Trading Partners & Friends
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Connect with trusted traders, launch private chats, and coordinate trades.
          </p>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('friends')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'friends'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Friends</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono">
              {friendships.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'requests'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Requests</span>
            {friendRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono animate-pulse">
                {friendRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('search')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'search'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Find Traders</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FRIENDS LIST */}
      {activeSubTab === 'friends' && (
        <div>
          {friendships.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Friends Yet</h3>
              <p className="text-xs text-slate-400 mb-4">
                Use the "Find Traders" tab to search for other Skyblock players by username.
              </p>
              <button
                onClick={() => setActiveSubTab('search')}
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Search Traders
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friendships.map((f) => {
                const partnerUid = f.users.find((u) => u !== currentUser.uid) || '';
                const partnerUsername = f.usernames[partnerUid] || 'Trader';
                const partnerName = f.names?.[partnerUid] || partnerUsername;
                const partnerAvatar =
                  f.avatars[partnerUid] ||
                  `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${partnerUsername}`;

                return (
                  <div
                    key={f.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 flex items-center justify-between gap-3 shadow-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <CircularProfileAvatar
                        src={partnerAvatar}
                        alt={partnerUsername}
                        role={f.roles?.[partnerUid]}
                        isAdmin={f.roles?.[partnerUid] === 'admin'}
                        size="lg"
                      />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{stripSpoofedRoleTags(partnerName || partnerUsername) || partnerUsername}</span>
                          <span className="text-xs text-amber-400 font-mono font-normal">
                            @{partnerUsername}
                          </span>
                          <RoleBadge role={f.roles?.[partnerUid]} size="xs" />
                        </div>
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Friend</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onOpenPrivateChat(f.id, {
                            uid: partnerUid,
                            username: partnerUsername,
                            name: partnerName,
                            avatarUrl: partnerAvatar,
                          })
                        }
                        className="py-2 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => handleRemoveFriend(f.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Remove Friend"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUESTS */}
      {activeSubTab === 'requests' && (
        <div>
          {friendRequests.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
              <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No pending friend requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friendRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <CircularProfileAvatar
                      src={req.senderAvatar}
                      alt={req.senderUsername}
                      size="md"
                    />
                    <div>
                      <div className="font-bold text-sm text-white">{req.senderUsername}</div>
                      <div className="text-[11px] text-slate-400">
                        wants to connect with you
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req)}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER SEARCH */}
      {activeSubTab === 'search' && (
        <div className="space-y-5">
          <form onSubmit={handleSearchUsers} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Search by Skyblock username (case-insensitive)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-400 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchUsername.trim()}
              className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition flex items-center gap-2"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {searchMessage && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
              {searchMessage}
            </div>
          )}

          <div className="space-y-3">
            {searchResults.map((user) => (
              <div
                key={user.uid}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <CircularProfileAvatar
                    src={user.profilePhoto || user.avatarUrl}
                    alt={user.username}
                    role={user.role}
                    membership={user.membership}
                    membershipLevel={user.membership?.level}
                    isAdmin={user.role === 'admin'}
                    size="md"
                  />
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{stripSpoofedRoleTags(user.name || user.username) || user.username}</span>
                      <span className="text-xs text-amber-400 font-mono font-normal">
                        @{user.username}
                      </span>
                      <RoleBadge role={user.role} size="xs" />
                    </div>
                    <div className="text-[11px] text-slate-400">Skyblock Trader</div>
                  </div>
                </div>

                <button
                  onClick={() => handleSendRequest(user)}
                  className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Send Request
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
