import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Flag, 
  ShieldCheck, 
  Lock, 
  UserX, 
  Check, 
  Loader2, 
  AlertCircle,
  Database,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { ChatMessage, UserRole, UserMembership } from '../types';
import { formatTimeAgo } from '../lib/formatters';
import { 
  sendPrivateMessage, 
  markConversationAsRead, 
  subscribeToLocalMessages 
} from '../lib/privateChatService';

import { RoleBadge } from '../components/RoleBadge';
import { stripSpoofedRoleTags } from '../lib/validation';
import { BackButton } from '../components/BackButton';
import { CircularProfileAvatar } from '../components/CircularProfileAvatar';
import { MessageTextFrame } from '../components/MessageTextFrame';
import { MessageDeliveryStatusBadge } from '../components/chat/MessageDeliveryStatusBadge';
import { formatRemainingTime } from '../lib/moderation';

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
  const [showStorageNotice, setShowStorageNotice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBlocked = blockedUserIds.includes(partnerProfile.uid);

  // Mark local conversation as read when opening
  useEffect(() => {
    if (!currentUser || !friendshipId) return;
    markConversationAsRead(friendshipId, currentUser.uid).catch((err) => {
      console.warn('Conversation read mark warning:', err);
    });
  }, [currentUser, friendshipId]);

  // Subscribe to persistent local messages from IndexedDB
  useEffect(() => {
    if (!currentUser || !friendshipId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToLocalMessages(
      currentUser.uid,
      friendshipId,
      (localMsgs) => {
        const chatMsgs: ChatMessage[] = localMsgs.map((m) => ({
          id: m.id,
          senderUid: m.senderUid,
          senderUsername: m.senderUsername,
          senderName: m.senderName,
          senderAvatar: m.senderAvatar,
          senderRole: m.senderRole,
          senderMembership: m.senderMembership,
          senderMembershipLevel: m.senderMembershipLevel,
          text: m.text,
          timestamp: m.timestamp,
          status: m.status,
          read: m.read
        }));

        setMessages(chatMsgs);
        setLoading(false);

        // Mark as read when new messages are loaded in open chat
        markConversationAsRead(friendshipId, currentUser.uid).catch(() => {});

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    );

    return () => unsubscribe();
  }, [currentUser, friendshipId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    if (!currentUser || !inputText.trim() || isBlocked || isMuted) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await sendPrivateMessage({
        conversationId: friendshipId,
        senderUid: currentUser.uid,
        senderProfile: {
          username: userProfile?.username || currentUser.displayName || 'Trader',
          name: userProfile?.name || userProfile?.username || currentUser.displayName || 'Trader',
          avatarUrl: userProfile?.profilePhoto || userProfile?.avatarUrl,
          profilePhoto: userProfile?.profilePhoto || userProfile?.avatarUrl,
          role: userProfile?.role || 'user',
          membership: userProfile?.membership,
          membershipLevel: userProfile?.membership?.level
        },
        partnerProfile: {
          uid: partnerProfile.uid,
          username: partnerProfile.username,
          name: partnerProfile.name || partnerProfile.username,
          avatarUrl: partnerProfile.profilePhoto || partnerProfile.avatarUrl,
          profilePhoto: partnerProfile.profilePhoto || partnerProfile.avatarUrl,
          role: partnerProfile.role,
          membership: partnerProfile.membership
        },
        text
      });
    } catch (err: any) {
      console.error('Failed to save private message:', err);
      setSendError(err.message || 'Failed to save message.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3 pb-20 animate-in fade-in duration-200 flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
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
              <span className="font-bold text-white text-sm">
                {stripSpoofedRoleTags(partnerProfile.name || partnerProfile.username) || partnerProfile.username}
              </span>
              <span className="text-xs text-amber-400 font-mono">@{partnerProfile.username}</span>
              <RoleBadge role={partnerProfile.role} size="xs" />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>Local Storage (IndexedDB)</span>
              <button 
                type="button"
                onClick={() => setShowStorageNotice(!showStorageNotice)}
                className="text-slate-500 hover:text-cyan-400 cursor-pointer ml-1 transition"
                title="View storage details"
              >
                <Info className="w-3 h-3" />
              </button>
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

      {/* Storage & Transport Disclosure Notice */}
      {showStorageNotice && (
        <div className="p-4 bg-slate-900/95 border border-cyan-500/30 rounded-2xl text-xs text-slate-300 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono font-bold text-cyan-300">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Private Chat Storage & Delivery Status</span>
            </div>
            <button
              type="button"
              onClick={() => setShowStorageNotice(false)}
              className="text-slate-500 hover:text-white text-xs font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400">
            Messages are preserved in your device's browser IndexedDB database, strictly isolated per Firebase UID.
          </p>

          {/* 5-State Status Guide */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 font-mono text-[11px]">
            <span className="text-white font-bold block text-xs">Delivery Status Meaning:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
              <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-300 block">Saved locally (Active)</strong>
                  <span className="text-[10px] text-slate-400">Safely written to your local IndexedDB. Stored on this device only.</span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                <Loader2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-300 block">Sending</strong>
                  <span className="text-[10px] text-slate-400">Currently in-flight transmitting through network transport.</span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-300 block">Sent (✓)</strong>
                  <span className="text-[10px] text-slate-400">Acknowledged by the messaging server.</span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                <div className="flex -space-x-1 shrink-0 mt-0.5"><Check className="w-3.5 h-3.5 text-slate-400" /><Check className="w-3.5 h-3.5 text-slate-400" /></div>
                <div>
                  <strong className="text-slate-300 block">Delivered (✓✓)</strong>
                  <span className="text-[10px] text-slate-400">Arrived on recipient player's device.</span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 col-span-1 sm:col-span-2">
                <div className="flex -space-x-1 shrink-0 mt-0.5"><Check className="w-3.5 h-3.5 text-cyan-400" /><Check className="w-3.5 h-3.5 text-cyan-400" /></div>
                <div>
                  <strong className="text-cyan-300 block">Read (✓✓ Cyan)</strong>
                  <span className="text-[10px] text-slate-400">Recipient opened and viewed the conversation.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-amber-300/95 font-mono bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/25 leading-relaxed">
            ⚠️ <strong>Delivery Limitation:</strong> Local storage alone cannot deliver messages to another player's device across the internet. Because no cross-device transport (e.g. WebSocket server relay) is currently active, messages remain safely stored on your device marked as <strong>Saved locally</strong>. Messages are never falsely marked as Sent or Delivered.
          </div>
        </div>
      )}

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
            <p className="text-xs font-mono">Loading local chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <Database className="w-10 h-10 mx-auto text-slate-700" />
            <p className="text-xs text-slate-400">No local messages yet for this conversation.</p>
            <p className="text-[11px] text-slate-500">
              Type a message below to save it to your local private chat history with {partnerProfile.username}.
            </p>
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
                  <div className={`text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span>{formatTimeAgo(msg.timestamp)}</span>
                    {isMe && (
                      <MessageDeliveryStatusBadge
                        status={msg.status || 'saved_locally'}
                        showLabel={true}
                        size="xs"
                        onClickInfo={() => setShowStorageNotice(true)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error notice if saving fails */}
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
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-30 transition shadow-sm cursor-pointer"
            title="Save message to local IndexedDB conversation"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
