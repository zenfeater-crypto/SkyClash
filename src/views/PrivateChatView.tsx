import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Flag, 
  ShieldCheck, 
  Lock, 
  UserX, 
  Check, 
  CheckCheck,
  Loader2,
  AlertCircle 
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  setDoc,
  serverTimestamp,
  doc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { ChatMessage } from '../types';
import { formatTimeAgo } from '../lib/formatters';

import { RoleBadge } from '../components/RoleBadge';
import { stripSpoofedRoleTags } from '../lib/validation';
import { BackButton } from '../components/BackButton';
import { CircularProfileAvatar } from '../components/CircularProfileAvatar';
import { MessageTextFrame } from '../components/MessageTextFrame';

import { formatRemainingTime } from '../lib/moderation';
import { UserRole, UserMembership } from '../types';

interface PrivateChatViewProps {
  friendshipId: string;
  partnerProfile: { 
    uid: string; 
    username: string; 
    name?: string; 
    avatarUrl?: string; 
    profilePhoto?: string;
    role?: UserRole;
    membership?: UserMembership | null;
  };
  onBack: () => void;
  onOpenReportModal: (targetType: 'private_message' | 'user', targetId: string, username: string) => void;
}

export const PrivateChatView: React.FC<PrivateChatViewProps> = ({
  friendshipId,
  partnerProfile,
  onBack,
  onOpenReportModal,
}) => {
  const { currentUser, userProfile, isMuted } = useAuth();
  const { blockedUserIds, blockUser } = useUserData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBlocked = blockedUserIds.includes(partnerProfile.uid);

  // Initialize or update parent conversation doc with participants
  useEffect(() => {
    if (!currentUser || !friendshipId || !partnerProfile.uid) return;
    const convDocRef = doc(db, 'conversations', friendshipId);
    setDoc(
      convDocRef,
      {
        participants: [currentUser.uid, partnerProfile.uid],
        updatedAt: Date.now(),
      },
      { merge: true }
    ).catch((err) => {
      console.warn('Conversation init warning:', err);
    });
  }, [currentUser, friendshipId, partnerProfile.uid]);

  // Sync private messages from conversation subcollection
  useEffect(() => {
    if (!currentUser || !friendshipId) return;

    const messagesRef = collection(db, 'conversations', friendshipId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(80));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as ChatMessage);
      });
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      console.warn('Private chat listener warning:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, friendshipId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    if (!currentUser || !inputText.trim() || isBlocked || isMuted) return;

    const text = inputText.trim();
    setInputText('');

    try {
      // 1. Ensure conversation metadata document exists with participants
      const convDocRef = doc(db, 'conversations', friendshipId);
      await setDoc(
        convDocRef,
        {
          participants: [currentUser.uid, partnerProfile.uid],
          lastMessage: text,
          lastMessageTimestamp: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      // 2. Add message to subcollection
      const messagesRef = collection(db, 'conversations', friendshipId, 'messages');
      await addDoc(messagesRef, {
        senderUid: currentUser.uid,
        senderUsername: userProfile?.username || 'Trader',
        senderName: userProfile?.name || userProfile?.username || 'Trader',
        senderAvatar: userProfile?.profilePhoto || userProfile?.avatarUrl || '',
        senderRole: userProfile?.role || 'user',
        text,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error('Failed to send private message:', err);
      setSendError(err.message || 'Failed to send message.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 animate-in fade-in duration-200 flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} label="Back" />

          <CircularProfileAvatar
            src={partnerProfile.profilePhoto || partnerProfile.avatarUrl}
            alt={partnerProfile.username}
            role={partnerProfile.role}
            membership={partnerProfile.membership}
            membershipLevel={partnerProfile.membership?.level}
            isAdmin={partnerProfile.role === 'admin'}
            size="md"
          />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{stripSpoofedRoleTags(partnerProfile.name || partnerProfile.username) || partnerProfile.username}</span>
              <span className="text-xs text-amber-400 font-mono">@{partnerProfile.username}</span>
              <RoleBadge role={partnerProfile.role} size="xs" />
              <span className="text-[10px] text-emerald-400 font-mono">Friend</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" /> End-to-end participant restricted
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenReportModal('user', partnerProfile.uid, partnerProfile.username)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 text-xs transition"
            title="Report User"
          >
            <Flag className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (confirm(`Block ${partnerProfile.username}? They won't be able to message you.`)) {
                blockUser(partnerProfile.uid);
              }
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 text-xs transition"
            title="Block User"
          >
            <UserX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isBlocked && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs">
          You have blocked this user. Unblock them in Settings &gt; Blocked Users to resume messaging.
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 overflow-y-auto space-y-3 shadow-inner">
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
            <p className="text-xs font-mono">Loading private history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <Lock className="w-10 h-10 mx-auto mb-2 text-slate-700" />
            <p className="text-xs">No messages yet. Send a greeting to {partnerProfile.username}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser?.uid === msg.senderUid;
            const senderRole = isMe ? userProfile?.role : partnerProfile.role;
            const senderMembership = isMe ? userProfile?.membership : partnerProfile.membership;
            const senderLevel = senderMembership?.level;
            const senderPhoto = isMe ? (userProfile?.profilePhoto || userProfile?.avatarUrl) : (partnerProfile.profilePhoto || partnerProfile.avatarUrl);
            const senderName = isMe ? (userProfile?.username || 'me') : partnerProfile.username;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-end ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <CircularProfileAvatar
                  src={senderPhoto}
                  alt={senderName}
                  role={senderRole}
                  membership={senderMembership}
                  membershipLevel={senderLevel}
                  isAdmin={senderRole === 'admin'}
                  size="xs"
                  className="mb-1"
                />

                <div className={`max-w-[85%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
                  <MessageTextFrame
                    role={senderRole}
                    membershipLevel={senderLevel}
                    isOwnerAdmin={senderRole === 'admin'}
                    isMe={isMe}
                    text={msg.text}
                  />
                  <div className={`text-[10px] text-slate-500 font-mono mt-1 ${isMe ? 'text-right' : ''}`}>
                    {formatTimeAgo(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error notice if sending fails */}
      {sendError && (
        <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{sendError}</span>
        </div>
      )}

      {/* Input or Muted notice */}
      {isMuted ? (
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
          <span className="font-bold uppercase tracking-wider block">Muted:</span>
          <span>You cannot send private messages while muted. Duration: {formatRemainingTime(userProfile?.mutedUntil)}.</span>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            disabled={isBlocked}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${partnerProfile.username}...`}
            className="w-full pl-4 pr-12 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isBlocked || !inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-30 transition shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
