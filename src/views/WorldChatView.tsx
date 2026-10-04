import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Flag, 
  VolumeX, 
  UserX, 
  AlertCircle, 
  Loader2,
  Users,
  Lock,
  LogIn,
  Clock,
  Trash2
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  where,
  limit, 
  onSnapshot, 
  doc,
  writeBatch,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { ChatMessage } from '../types';
import { formatTimeAgo } from '../lib/formatters';
import { RoleBadge } from '../components/RoleBadge';
import { formatRemainingTime } from '../lib/moderation';
import { stripSpoofedRoleTags, normalizeWorldMessage } from '../lib/validation';

interface WorldChatViewProps {
  onOpenAuth: () => void;
  onOpenReportModal: (targetType: 'world_message' | 'user', targetId: string, username: string) => void;
}

export const WorldChatView: React.FC<WorldChatViewProps> = ({ onOpenAuth, onOpenReportModal }) => {
  const { currentUser, userProfile, isMuted, isAdmin, isOfficer, canDeleteChats } = useAuth();
  const { blockedUserIds, blockUser } = useUserData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [mutedUsersLocal, setMutedUsersLocal] = useState<string[]>([]);
  const [spamError, setSpamError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Moderator Delete Chat Message (Admin, Officer, or JMD with deleteChats permission)
  const handleDeleteWorldMessage = async (msg: ChatMessage) => {
    if (!isAdmin && !isOfficer && !canDeleteChats) return;

    if (!isAdmin && (msg.senderUsername === 'strike' || msg.senderRole === 'admin')) {
      alert('Action Prohibited: You cannot delete messages sent by the Owner Admin.');
      return;
    }

    if (!confirm(`Delete message from @${msg.senderUsername}?`)) return;
    try {
      await deleteDoc(doc(db, 'worldMessages', msg.id));
      if (userProfile) {
        await addDoc(collection(db, 'moderationHistory'), {
          action: 'CHAT_MESSAGE_DELETED',
          targetUid: msg.senderUid,
          targetUsername: msg.senderUsername,
          performedByUid: userProfile.uid,
          performedByUsername: userProfile.username,
          performedByRole: userProfile.role,
          adminUid: userProfile.uid,
          ...(userProfile.role === 'jmd' ? { jmdUid: userProfile.uid, jmdUsername: userProfile.username } : {}),
          timestamp: Date.now(),
          reason: 'Inappropriate chat message deleted by moderator',
          details: { messageText: msg.text, messageId: msg.id }
        });
      }
    } catch (err: any) {
      console.error('Failed to delete world message:', err);
    }
  };

  // Auto-scroll when messages arrive
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // 1. Subscribe to real-time non-expired messages (30-minute logical expiration)
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    // Query only messages that expire in the future (expiresAt > now)
    // Uses single-field index on expiresAt; 0 Rs / Spark tier optimized with limit(60)
    const q = query(
      collection(db, 'worldMessages'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      limit(60)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          msgs.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
        });
        setMessages(msgs);
        setLoading(false);
        setTimeout(() => {
          scrollToBottom('smooth');
        }, 80);
      },
      (err) => {
        console.warn('World chat listener warning:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Periodic ticker every 10s: automatically disappears messages when they cross the 30-min threshold
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 2. Sync 7-second cooldown from Firestore userProfile on load/reload/device switch
  useEffect(() => {
    if (!userProfile?.lastWorldChatAt) return;
    const elapsed = Date.now() - userProfile.lastWorldChatAt;
    if (elapsed < 7000) {
      setCooldownRemaining(Math.ceil((7000 - elapsed) / 1000));
    }
  }, [userProfile?.lastWorldChatAt]);

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Handle Android keyboard visual viewport resizing
  useEffect(() => {
    const handleViewportChange = () => {
      scrollToBottom('auto');
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

  // Send message with backend cooldown, 30m TTL, and 2-time duplicate limit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpamError(null);

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!inputText.trim()) return;

    if (isMuted) {
      setSpamError('You are currently muted and cannot send chat messages.');
      return;
    }

    // 7-second cooldown check
    if (cooldownRemaining > 0) {
      setSpamError(`Please wait ${cooldownRemaining}s before sending another message.`);
      return;
    }

    const rawMessage = inputText.trim();
    if (rawMessage.length > 300) {
      setSpamError('Message must be 300 characters or fewer.');
      return;
    }

    // Normalize message ONLY for duplicate anti-spam detection
    const normalizedText = normalizeWorldMessage(rawMessage);
    const lastNorm = userProfile?.lastChatMessageNorm || '';
    const lastCount = userProfile?.sameMessageCount || 0;

    // Check duplicate limit: max 2 identical messages consecutively per user
    if (normalizedText === lastNorm && lastCount >= 2) {
      setSpamError('You can send the same message only 2 times.');
      return;
    }

    const nextCount = normalizedText === lastNorm ? lastCount + 1 : 1;
    const now = Date.now();
    setIsSending(true);

    try {
      const batch = writeBatch(db);

      // 1. Create worldMessages doc with server-verified 30-minute expiration
      const newMsgRef = doc(collection(db, 'worldMessages'));
      batch.set(newMsgRef, {
        senderUid: currentUser.uid,
        senderUsername: userProfile?.username || currentUser.displayName || 'trader',
        senderName: userProfile?.name || userProfile?.username || currentUser.displayName || 'Trader',
        senderAvatar: userProfile?.profilePhoto || userProfile?.avatarUrl || '',
        senderRole: userProfile?.role || 'user',
        text: rawMessage, // User's message preserved without modification
        normalizedText,
        sameMessageCount: nextCount,
        timestamp: now,
        createdAt: now,
        expiresAt: now + (30 * 60 * 1000), // Exactly 30 minutes
      });

      // 2. Atomically update user document with backend cooldown timestamp and duplicate state
      const userRef = doc(db, 'users', currentUser.uid);
      batch.update(userRef, {
        lastWorldChatAt: now,
        lastChatMessageNorm: normalizedText,
        sameMessageCount: nextCount,
      });

      await batch.commit();

      // Only on success: clear input and start the 7-second cooldown
      setInputText('');
      setSpamError(null);
      setCooldownRemaining(7);

      setTimeout(() => scrollToBottom('smooth'), 60);
    } catch (err: any) {
      console.error('Failed to send world message:', err);
      // Failed or cancelled messages do NOT consume the 7-second cooldown
      if (err.message && (err.message.includes('permission') || err.message.includes('PERMISSION_DENIED'))) {
        setSpamError('Message rejected by server: 7s cooldown or duplicate limit enforced.');
      } else {
        setSpamError(err.message || 'Could not send message.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // Toggle local client mute
  const handleToggleMute = (uid: string) => {
    if (mutedUsersLocal.includes(uid)) {
      setMutedUsersLocal(mutedUsersLocal.filter((id) => id !== uid));
    } else {
      setMutedUsersLocal([...mutedUsersLocal, uid]);
    }
  };

  // Filter out expired messages in real time so they automatically disappear after 30 minutes
  const activeMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (msg.expiresAt && msg.expiresAt <= currentTime) {
        return false;
      }
      return true;
    });
  }, [messages, currentTime]);

  // Filter out blocked users and locally muted users
  const visibleMessages = useMemo(() => {
    return activeMessages.filter(
      (msg) => !blockedUserIds.includes(msg.senderUid) && !mutedUsersLocal.includes(msg.senderUid)
    );
  }, [activeMessages, blockedUserIds, mutedUsersLocal]);

  if (!currentUser) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sign in to use World Chat
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              World Chat is an authenticated trading lobby for verified Skyblock players. Sign in to chat, share deals, and trade safely.
            </p>
          </div>

          <button
            onClick={onOpenAuth}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to World Chat</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-slate-950 text-slate-100 overflow-hidden">
      {/* Dedicated Full-Screen Header Bar */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide uppercase font-mono">
                Skyblock World Chat
              </h1>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Dedicated full-screen trading lobby, player deals, and live market talk.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block font-mono text-xs text-slate-400">
            <span>{visibleMessages.length} messages</span>
          </div>
          {!currentUser && (
            <button
              onClick={onOpenAuth}
              className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              Sign In to Chat
            </button>
          )}
        </div>
      </div>

      {/* Spam rate limit error notification */}
      {spamError && (
        <div className="shrink-0 px-4 py-2 bg-amber-950/80 border-b border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{spamError}</span>
        </div>
      )}

      {/* Expandable Messages Area (Full Vertical & Horizontal Space) */}
      <div 
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-3.5 overscroll-contain"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="text-xs font-mono">Connecting to World Chat stream...</p>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
            <MessageSquare className="w-12 h-12 text-slate-800 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No messages in World Chat yet.</p>
            <p className="text-xs text-slate-500 mt-1">Be the first to post a trade offer!</p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = currentUser?.uid === msg.senderUid;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 group items-start ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <img
                  src={
                    msg.senderAvatar ||
                    `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${msg.senderUsername}`
                  }
                  alt={msg.senderUsername}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5 object-cover"
                />

                <div className={`max-w-[85%] sm:max-w-xl md:max-w-2xl ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender metadata bar */}
                  <div className={`flex items-center gap-2 mb-1 flex-wrap ${isMe ? 'justify-end' : ''}`}>
                    <span className="font-bold text-xs text-slate-200">
                      {stripSpoofedRoleTags(msg.senderName || msg.senderUsername) || msg.senderUsername}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      @{msg.senderUsername}
                    </span>
                    <RoleBadge role={msg.senderRole} size="xs" />
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTimeAgo(msg.timestamp)}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Message moderation actions (Report / Mute / Block / Delete) */}
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3 mt-1 text-[10px] text-slate-500 ${isMe ? 'justify-end' : ''}`}>
                    {!isMe && (
                      <>
                        <button
                          onClick={() => onOpenReportModal('world_message', msg.id, msg.senderUsername)}
                          className="hover:text-amber-400 flex items-center gap-1 transition"
                        >
                          <Flag className="w-3 h-3" /> Report
                        </button>
                        <button
                          onClick={() => handleToggleMute(msg.senderUid)}
                          className="hover:text-blue-400 flex items-center gap-1 transition"
                        >
                          <VolumeX className="w-3 h-3" /> Mute
                        </button>
                        <button
                          onClick={() => blockUser(msg.senderUid)}
                          className="hover:text-rose-400 flex items-center gap-1 transition"
                        >
                          <UserX className="w-3 h-3" /> Block
                        </button>
                      </>
                    )}
                    {(isAdmin || isOfficer || canDeleteChats) && (
                      <button
                        onClick={() => handleDeleteWorldMessage(msg)}
                        className="hover:text-rose-400 flex items-center gap-1 transition font-bold"
                        title="Delete message (Moderation)"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Bottom Composer / Mute Notice */}
      <div className="shrink-0 p-3 sm:p-4 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-xl z-20">
        {isMuted ? (
          <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
            <VolumeX className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold uppercase tracking-wider block">You are currently muted</span>
              <span className="text-[11px] text-amber-200/80">
                You cannot send messages in World Chat while muted. {userProfile?.muteReason ? `Reason: "${userProfile.muteReason}".` : ''} Duration: {formatRemainingTime(userProfile?.mutedUntil)}.
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              maxLength={300}
              onChange={(e) => {
                setInputText(e.target.value);
                if (spamError) setSpamError(null);
              }}
              placeholder={
                currentUser
                  ? cooldownRemaining > 0
                    ? `Cooldown active... please wait ${cooldownRemaining}s`
                    : "Type a message in World Chat... (e.g. 'Buying Clean Poseidon Trident')"
                  : 'Sign in to send messages in World Chat'
              }
              disabled={!currentUser || isMuted}
              className="flex-1 pl-4 pr-24 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || cooldownRemaining > 0 || isSending}
              className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl transition shadow-sm font-bold flex items-center justify-center gap-1.5 text-xs ${
                cooldownRemaining > 0
                  ? 'bg-slate-800 text-amber-400 border border-slate-700/80 cursor-not-allowed opacity-95 shadow-none'
                  : !inputText.trim() || isSending
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-40 shadow-none'
                  : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black shadow-emerald-500/20'
              }`}
              title={cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Send Message'}
            >
              {cooldownRemaining > 0 ? (
                <span className="font-mono text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wait {cooldownRemaining}s</span>
                </span>
              ) : isSending ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
