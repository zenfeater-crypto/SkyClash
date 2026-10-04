import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  UserPlus, 
  Check, 
  Calendar, 
  ShieldCheck, 
  Crown, 
  Sparkles, 
  Flag, 
  ExternalLink,
  Loader2,
  Clock
} from 'lucide-react';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile, UserRole } from '../types';
import { RoleBadge } from './RoleBadge';
import { MembershipBadge } from './MembershipBadge';
import { CircularProfileAvatar } from './CircularProfileAvatar';
import { stripSpoofedRoleTags } from '../lib/validation';
import { formatJoinedDate } from '../lib/formatters';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  initialUsername?: string;
  initialName?: string;
  initialAvatar?: string;
  initialRole?: UserRole | string;
  onOpenPrivateChat?: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: UserRole }) => void;
  onOpenReportModal?: (targetType: 'user', targetId: string, username: string) => void;
  onNavigateToSettings?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  uid,
  initialUsername,
  initialName,
  initialAvatar,
  initialRole,
  onOpenPrivateChat,
  onOpenReportModal,
  onNavigateToSettings,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !uid) return;

    let isMounted = true;
    setLoading(true);

    const loadProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists() && isMounted) {
          setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        } else if (isMounted) {
          // Fallback to initial provided data
          setProfile({
            uid,
            username: initialUsername || 'trader',
            name: initialName || initialUsername || 'Trader',
            avatarUrl: initialAvatar || '',
            role: (initialRole as UserRole) || 'user',
            createdAt: Date.now(),
            normalizedUsername: (initialUsername || 'trader').toLowerCase(),
            email: '',
          });
        }

        // Check friendship status if signed in
        if (currentUser && currentUser.uid !== uid) {
          const sorted = [currentUser.uid, uid].sort().join('_');
          const friendSnap = await getDoc(doc(db, 'friendships', sorted));
          if (friendSnap.exists() && isMounted) {
            setFriendStatus('friends');
          } else {
            // Check pending request
            const reqQ = query(
              collection(db, 'friendRequests'),
              where('senderUid', '==', currentUser.uid),
              where('receiverUid', '==', uid),
              where('status', '==', 'pending')
            );
            const reqSnap = await getDocs(reqQ);
            if (!reqSnap.empty && isMounted) {
              setFriendStatus('pending');
            }
          }
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, uid, currentUser, initialUsername, initialName, initialAvatar, initialRole]);

  if (!isOpen) return null;

  const isMe = currentUser?.uid === uid;
  const username = profile?.username || initialUsername || 'trader';
  const displayName = stripSpoofedRoleTags(profile?.name || initialName || username) || username;
  const role = profile?.role || (initialRole as UserRole) || 'user';
  const avatar = profile?.profilePhoto || profile?.avatarUrl || initialAvatar || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}`;
  const joinedText = formatJoinedDate(profile?.createdAt || Date.now());

  const handleStartChat = () => {
    if (!currentUser) return;
    const sorted = [currentUser.uid, uid].sort().join('_');
    onOpenPrivateChat?.(sorted, {
      uid,
      username,
      name: displayName,
      avatarUrl: avatar,
      role,
    });
    onClose();
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || isMe || friendStatus !== 'none' || actionLoading) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'friendRequests'), {
        senderUid: currentUser.uid,
        senderUsername: userProfile?.username || 'trader',
        senderAvatar: userProfile?.profilePhoto || userProfile?.avatarUrl || '',
        receiverUid: uid,
        receiverUsername: username,
        status: 'pending',
        createdAt: Date.now(),
      });
      setFriendStatus('pending');
      setActionSuccess('Friend request sent!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error sending friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-xs font-mono">Loading trader profile...</p>
          </div>
        ) : (
          <>
            {/* Header / Avatar */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className="relative mb-3 flex items-center justify-center">
                <CircularProfileAvatar
                  src={avatar}
                  alt={username}
                  size="2xl"
                  role={role}
                  membership={profile?.membership}
                  isAdmin={role === 'admin'}
                />
              </div>

              <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5 flex-wrap justify-center">
                <span>{displayName}</span>
              </h3>

              <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
                <RoleBadge role={role} size="sm" />
                {profile?.membership?.level && (
                  <MembershipBadge
                    level={profile.membership.level}
                    title={profile.membership.title}
                    size="sm"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-cyan-400 font-mono">@{username}</span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {role === 'admin' ? 'Owner Admin' : role === 'officer' ? 'Staff Officer' : role === 'trusted' ? 'Trusted Trader' : 'Verified Trader'}
                </span>
              </div>

              {/* Joined Date */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{joinedText}</span>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-300 italic leading-relaxed text-center">
                "{profile.bio}"
              </div>
            )}

            {actionSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs text-center font-semibold">
                {actionSuccess}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {isMe ? (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToSettings?.();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View & Edit My Profile</span>
                </button>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleStartChat}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Start Chat</span>
                    </button>

                    {friendStatus === 'friends' ? (
                      <div className="py-2.5 px-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Friends</span>
                      </div>
                    ) : friendStatus === 'pending' ? (
                      <div className="py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sent</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSendFriendRequest}
                        disabled={actionLoading}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span>Add Friend</span>
                      </button>
                    )}
                  </div>

                  {/* Report user option */}
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenReportModal?.('user', uid, username);
                      }}
                      className="text-[11px] text-slate-500 hover:text-amber-400 transition flex items-center justify-center gap-1 mx-auto"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Report User</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
