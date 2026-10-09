import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Clock, 
  ShieldAlert, 
  Sparkles, 
  Users, 
  MessageSquare,
  Crown,
  Info,
  ArrowLeft
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, WarsGangMessage } from '../../types';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { MessageTextFrame } from '../MessageTextFrame';
import { stripSpoofedRoleTags } from '../../lib/validation';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface GangChatModalProps {
  gang: WarsGang;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const GangChatModal: React.FC<GangChatModalProps> = ({
  gang,
  isOpen,
  onClose,
  onOpenAuth
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [messages, setMessages] = useState<WarsGangMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Delete message confirmation modal state
  const [deleteTargetMsg, setDeleteTargetMsg] = useState<WarsGangMessage | null>(null);
  const [isDeletingMsg, setIsDeletingMsg] = useState(false);
  const [deleteMsgError, setDeleteMsgError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check membership
  const isMember = currentUser && (
    gang.memberUids?.includes(currentUser.uid) || 
    gang.leaderUid === currentUser.uid ||
    gang.members?.some((m) => m.uid === currentUser.uid)
  );
  const canAccess = isMember || isAdmin;
  const isGangLeader = currentUser && gang.leaderUid === currentUser.uid;

  // Real-time listener for gang messages (₹0 friendly: limit 50, ordered by createdAt desc)
  useEffect(() => {
    if (!isOpen || !gang.id) return;

    const messagesRef = collection(db, 'wars_gangs', gang.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WarsGangMessage[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as WarsGangMessage;
          list.push({ ...data, id: d.id });
        });
        // Sort ascending for chat flow
        list.sort((a, b) => a.createdAt - b.createdAt);
        setMessages(list);
      },
      (err) => {
        console.error('Gang chat snapshot error:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, gang.id]);

  // Client-side 30-minute auto-expiry ticker (runs every 5 seconds to prune expired messages from view at ₹0 cost)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Scroll to bottom on new visible messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Filter messages strictly obeying the ₹0 30-minute rule
  const visibleMessages = messages.filter((msg) => {
    // If expiresAt is set, must be in the future
    if (msg.expiresAt) {
      return msg.expiresAt > currentTime;
    }
    // Fallback: createdAt + 30 mins
    return (msg.createdAt + 30 * 60 * 1000) > currentTime;
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    if (!canAccess) {
      return;
    }

    const trimmed = inputText.trim();
    if (trimmed.length > 500) return;

    setSending(true);
    try {
      const now = Date.now();
      const expiresAt = now + 30 * 60 * 1000; // Exact 30 minutes expiration rule

      const newMsg: Omit<WarsGangMessage, 'id'> = {
        gangId: gang.id,
        senderUid: currentUser.uid,
        senderUsername: stripSpoofedRoleTags(userProfile.username || 'User'),
        senderDisplayName: stripSpoofedRoleTags(userProfile.name || userProfile.username || 'User'),
        senderAvatar: userProfile.profilePhoto || userProfile.avatarUrl || '',
        senderRole: userProfile.role || 'user',
        senderMembership: userProfile.membership || undefined,
        senderMembershipLevel: userProfile.membership?.level || undefined,
        text: trimmed,
        createdAt: now,
        expiresAt: expiresAt,
        isPinned: false
      };

      await addDoc(collection(db, 'wars_gangs', gang.id, 'messages'), newMsg);
      setInputText('');
    } catch (err) {
      console.error('Failed to send gang message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (msg: WarsGangMessage) => {
    if (!isAdmin) return;
    setDeleteTargetMsg(msg);
    setDeleteMsgError(null);
  };

  const handleConfirmDeleteMessage = async () => {
    if (!deleteTargetMsg || !isAdmin) return;

    setIsDeletingMsg(true);
    setDeleteMsgError(null);

    try {
      await deleteDoc(doc(db, 'wars_gangs', gang.id, 'messages', deleteTargetMsg.id));
      setDeleteTargetMsg(null);
    } catch (err: any) {
      console.error('Failed to delete gang message:', err);
      setDeleteMsgError(err.message || 'Failed to delete message.');
    } finally {
      setIsDeletingMsg(false);
    }
  };

  const formatRemainingMinutes = (expiresAt: number) => {
    const diff = expiresAt - currentTime;
    if (diff <= 0) return 'Expiring...';
    const mins = Math.ceil(diff / (60 * 1000));
    return `${mins}m left`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 ${
          gang.gameType === 'bedwars'
            ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/30'
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30'
        } border-b border-slate-800 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition flex items-center justify-center shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className={`w-10 h-10 rounded-2xl ${
              gang.gameType === 'bedwars'
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/10'
            } border flex items-center justify-center font-extrabold text-sm shadow-md`}>
              {gang.iconUrl ? (
                <img src={gang.iconUrl} alt={gang.name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <span>[{gang.tag || gang.name.substring(0, 3).toUpperCase()}]</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-1.5">
                  <span>{gang.name}</span>
                  <span className={`${gang.gameType === 'bedwars' ? 'text-rose-400' : 'text-amber-400'} text-xs font-mono font-bold`}>Gang Chat</span>
                </h3>
                {isGangLeader && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    gang.gameType === 'bedwars'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  } border flex items-center gap-1 font-semibold`}>
                    <Crown className="w-3 h-3 text-amber-400" /> Leader
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {gang.members?.length || 1} members
                </span>
                <span>·</span>
                <span className={`flex items-center gap-1 ${gang.gameType === 'bedwars' ? 'text-rose-400/90' : 'text-amber-400/90'} font-mono text-[11px]`}>
                  <Clock className="w-3 h-3" />
                  30m Auto-Vanish Active (₹0 Free Tier)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 30-Minute Disappearing Notice Banner */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>All gang chat messages automatically vanish after 30 minutes to protect confidentiality and zero costs.</span>
          </div>
          <span className="text-[11px] font-mono text-amber-400/80 shrink-0 ml-2">₹0 Ephemeral</span>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-[300px]">
          {!canAccess ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-3">
              <ShieldAlert className="w-12 h-12 text-amber-500/50" />
              <div className="font-bold text-white text-base">Restricted Gang Territory</div>
              <p className="text-xs max-w-sm text-slate-400">
                This private communications room is exclusive to verified members of <span className="text-amber-400 font-semibold">{gang.name}</span> and the Owner Admin.
              </p>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-600 mb-2" />
              <div className="font-semibold text-white text-sm">No Active Messages</div>
              <p className="text-xs text-slate-500 max-w-xs">
                Messages vanish after 30 minutes. Send a message to coordinate tactics with your gang!
              </p>
            </div>
          ) : (
            visibleMessages.map((msg) => {
              const isOwn = currentUser?.uid === msg.senderUid;
              const isSenderAdmin = msg.senderRole === 'admin';
              const isSenderLeader = msg.senderUid === gang.leaderUid;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 group items-start ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <div className="shrink-0 pt-0.5">
                    <CircularProfileAvatar
                      src={msg.senderAvatar}
                      alt={msg.senderUsername}
                      size="sm"
                      role={msg.senderRole}
                      membership={msg.senderMembership}
                      isAdmin={isSenderAdmin}
                    />
                  </div>

                  <div className={`max-w-[78%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 flex-wrap">
                      <span className="font-bold text-white">
                        {msg.senderDisplayName || msg.senderUsername}
                      </span>
                      {isSenderLeader && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                          Leader
                        </span>
                      )}
                      {isSenderAdmin && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          ADMIN
                        </span>
                      )}
                      <span className="text-[10px] text-amber-400/80 font-mono flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRemainingMinutes(msg.expiresAt)}
                      </span>
                    </div>

                    <MessageTextFrame
                      role={msg.senderRole}
                      membershipLevel={msg.senderMembershipLevel || msg.senderMembership?.level}
                      isOwnerAdmin={isSenderAdmin}
                      isMe={isOwn}
                      className="text-sm leading-relaxed"
                    >
                      <div className="break-words whitespace-pre-wrap">{msg.text}</div>
                    </MessageTextFrame>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteMessage(msg)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition mt-1"
                      >
                        Delete as Admin
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        {canAccess && (
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send message to gang (vanishes in 30m)..."
              maxLength={500}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        )}
      </div>

      {/* Delete Confirmation Modal for Gang Chat Messages */}
      <DeleteConfirmModal
        isOpen={!!deleteTargetMsg}
        title="Confirm Message Deletion"
        itemTypeLabel="Gang Chat Message"
        itemName={deleteTargetMsg ? `"${deleteTargetMsg.text.slice(0, 40)}${deleteTargetMsg.text.length > 40 ? '...' : ''}" by @${deleteTargetMsg.senderUsername}` : ''}
        warningText="Are you sure you want to delete this gang chat message? This action cannot be undone."
        confirmButtonText="Confirm Delete"
        cancelButtonText="Cancel"
        isDeleting={isDeletingMsg}
        errorMessage={deleteMsgError}
        onConfirm={handleConfirmDeleteMessage}
        onCancel={() => {
          setDeleteTargetMsg(null);
          setDeleteMsgError(null);
        }}
      />
    </div>
  );
};
