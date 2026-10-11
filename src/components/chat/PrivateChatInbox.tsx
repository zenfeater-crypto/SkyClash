import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  ArrowLeft, 
  UserPlus, 
  Check, 
  X, 
  Loader2, 
  Database,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserData } from '../../context/UserDataContext';
import { 
  PrivateConversation, 
  UserProfile, 
  UserRole 
} from '../../types';
import { MessageDeliveryStatusBadge } from './MessageDeliveryStatusBadge';
import { 
  subscribeToUserConversations, 
  formatUnreadBadge, 
  formatConversationTime, 
  getPartnerProfileFromConversation, 
  markConversationAsRead, 
  searchUsersForChat, 
  getConversationId,
  upsertLocalConversation,
  searchLocalMessages
} from '../../lib/privateChatService';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { RoleBadge } from '../RoleBadge';
import { MembershipBadge } from '../MembershipBadge';
import { stripSpoofedRoleTags } from '../../lib/validation';

interface PrivateChatInboxProps {
  onClose: () => void;
  onOpenPrivateChat: (
    friendshipId: string,
    partnerProfile: {
      uid: string;
      username: string;
      name?: string;
      avatarUrl?: string;
      profilePhoto?: string;
      role?: UserRole;
      membership?: any;
    }
  ) => void;
}

export const PrivateChatInbox: React.FC<PrivateChatInboxProps> = ({
  onClose,
  onOpenPrivateChat
}) => {
  const { currentUser } = useAuth();
  const { blockedUserIds } = useUserData();

  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [totalUnread, setTotalUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [showStorageNotice, setShowStorageNotice] = useState<boolean>(false);
  const [matchedConvIdsFromText, setMatchedConvIdsFromText] = useState<Set<string>>(new Set());

  // New Chat modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState<boolean>(false);
  const [newChatSearch, setNewChatSearch] = useState<string>('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 1. Subscribe to real-time local conversations from IndexedDB
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserConversations(
      currentUser.uid,
      (loadedConversations, unreadSum) => {
        setConversations(loadedConversations);
        setTotalUnread(unreadSum);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Deep local message search when searchFilter changes
  useEffect(() => {
    if (!currentUser || !searchFilter.trim()) {
      setMatchedConvIdsFromText(new Set());
      return;
    }

    let isMounted = true;
    searchLocalMessages(currentUser.uid, searchFilter.trim())
      .then((msgs) => {
        if (!isMounted) return;
        const set = new Set<string>();
        msgs.forEach((m) => set.add(m.conversationId));
        setMatchedConvIdsFromText(set);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentUser, searchFilter]);

  // 2. Filter conversations by username, display name, message snippet, or matched messages
  const filteredConversations = conversations.filter((conv) => {
    if (!currentUser) return false;
    const partner = getPartnerProfileFromConversation(conv, currentUser.uid);

    const partnerUsername = partner.username?.toLowerCase() || '';
    const partnerName = partner.name?.toLowerCase() || '';
    const lastMsg = conv.lastMessage?.toLowerCase() || '';
    const query = searchFilter.trim().toLowerCase();

    if (!query) return true;
    return (
      partnerUsername.includes(query) || 
      partnerName.includes(query) || 
      lastMsg.includes(query) ||
      matchedConvIdsFromText.has(conv.id)
    );
  });

  // 3. Handle opening a conversation
  const handleSelectConversation = async (conv: PrivateConversation) => {
    if (!currentUser) return;
    const partner = getPartnerProfileFromConversation(conv, currentUser.uid);

    // Reset local unread count
    markConversationAsRead(conv.id, currentUser.uid).catch((err) => {
      console.warn('Failed to mark read in local DB:', err);
    });

    onOpenPrivateChat(conv.id, {
      uid: partner.uid,
      username: partner.username,
      name: partner.name,
      avatarUrl: partner.avatarUrl,
      profilePhoto: partner.profilePhoto,
      role: partner.role,
      membership: partner.membership
    });
  };

  // 4. Search users for New Chat
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newChatSearch.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchUsersForChat(newChatSearch, currentUser.uid);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No players found matching that username.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Error searching players.');
    } finally {
      setIsSearching(false);
    }
  };

  // 5. Start conversation with selected player
  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    const convId = getConversationId(currentUser.uid, targetUser.uid);

    // Upsert conversation locally in IndexedDB
    try {
      await upsertLocalConversation(currentUser.uid, convId, {
        uid: targetUser.uid,
        username: targetUser.username,
        name: targetUser.name || targetUser.username,
        avatarUrl: targetUser.profilePhoto || targetUser.avatarUrl,
        profilePhoto: targetUser.profilePhoto || targetUser.avatarUrl,
        role: targetUser.role,
        membership: targetUser.membership,
        membershipLevel: targetUser.membership?.level
      });
    } catch (err) {
      console.warn('Local conversation upsert warning:', err);
    }

    setIsNewChatOpen(false);
    setNewChatSearch('');
    setSearchResults([]);

    onOpenPrivateChat(convId, {
      uid: targetUser.uid,
      username: targetUser.username,
      name: targetUser.name || targetUser.username,
      avatarUrl: targetUser.profilePhoto || targetUser.avatarUrl,
      profilePhoto: targetUser.profilePhoto || targetUser.avatarUrl,
      role: targetUser.role,
      membership: targetUser.membership
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none animate-fadeIn">
      {/* Top Header (WhatsApp / SkyClash Neon Style) */}
      <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Return to World Chat"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold hidden xs:inline">World Chat</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
                  Private Chats
                </h2>
                {totalUnread > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40 animate-pulse">
                    {formatUnreadBadge(totalUnread)}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>Local-First (IndexedDB) • Saved on device</span>
                <button
                  type="button"
                  onClick={() => setShowStorageNotice(!showStorageNotice)}
                  className="text-slate-500 hover:text-emerald-400 cursor-pointer ml-1 transition"
                  title="Storage disclosure"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action: New Chat Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewChatOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 font-mono font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
            title="Start a new chat with any player"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* Storage & Delivery Status Disclosure Banner */}
      {showStorageNotice && (
        <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-900/95 border-b border-emerald-500/30 text-xs text-slate-300 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono font-bold text-emerald-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Local-First Private Storage (IndexedDB)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              Local Storage Mode
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Private conversations are persisted directly in this browser's local IndexedDB database, strictly isolated per Firebase UID.
          </p>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 font-mono text-[10px]">
            <span className="text-white font-bold block">Delivery Status Guide:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-400">
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-cyan-400 shrink-0" />
                <span><strong className="text-cyan-300">Saved locally:</strong> Stored on this device's IndexedDB</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span><strong className="text-slate-300">Sending:</strong> In-flight transmission</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-slate-400 shrink-0" />
                <span><strong className="text-slate-300">Sent:</strong> Reached communication server</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1 shrink-0"><Check className="w-3 h-3 text-slate-400" /><Check className="w-3 h-3 text-slate-400" /></div>
                <span><strong className="text-slate-300">Delivered:</strong> Reached recipient's device</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-1 sm:col-span-2">
                <div className="flex -space-x-1 shrink-0"><Check className="w-3 h-3 text-cyan-400" /><Check className="w-3 h-3 text-cyan-400" /></div>
                <span><strong className="text-cyan-300">Read:</strong> Recipient opened conversation</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-amber-400/90 font-mono bg-amber-950/40 p-2 rounded-xl border border-amber-500/20">
            ⚠️ <strong>Notice:</strong> Local storage alone cannot deliver messages to another player. Because no cross-device transport (e.g. WebSocket server relay) is active, messages remain preserved locally as <em>Saved locally</em>. Delivery is never simulated.
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-slate-900/50 border-b border-slate-800/60 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search conversations, players, or saved message texts..."
            className="w-full pl-9 pr-9 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition shadow-inner font-sans"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp-Style Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-850/60 scrollbar-thin scrollbar-thumb-slate-800">
        {loading ? (
          <div className="py-24 text-center text-slate-500 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="text-xs font-mono text-slate-400">Loading local private chats...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400/60 shadow-inner">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-mono uppercase">
                {searchFilter ? 'No matching conversations' : 'No Local Private Chats Yet'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchFilter 
                  ? `No conversations matched "${searchFilter}". Try searching by another username or keyword.`
                  : 'Your private chats are stored locally in IndexedDB on this device. Start a conversation with any player to begin.'}
              </p>
            </div>
            {!searchFilter && (
              <button
                type="button"
                onClick={() => setIsNewChatOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 active:scale-95 inline-flex items-center gap-2 cursor-pointer font-mono"
              >
                <UserPlus className="w-4 h-4" />
                <span>START A CONVERSATION</span>
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            if (!currentUser) return null;
            const partner = getPartnerProfileFromConversation(conv, currentUser.uid);
            const unreadCount = conv.unreadCounts?.[currentUser.uid] || 0;
            const isBlocked = blockedUserIds.includes(partner.uid);
            const isMeLastSender = conv.lastMessageSenderUid === currentUser.uid;
            const timeString = formatConversationTime(conv.lastMessageTimestamp || conv.updatedAt);

            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3.5 hover:bg-slate-900/80 active:bg-slate-850 cursor-pointer transition group border-l-2 ${
                  unreadCount > 0 
                    ? 'border-emerald-400 bg-emerald-950/10' 
                    : 'border-transparent'
                }`}
              >
                {/* Left: Avatar with Status Indicator */}
                <div className="relative shrink-0">
                  <CircularProfileAvatar
                    src={partner.profilePhoto || partner.avatarUrl}
                    alt={partner.username}
                    role={partner.role}
                    membership={partner.membership}
                    membershipLevel={partner.membershipLevel}
                    isAdmin={partner.role === 'admin'}
                    size="md"
                  />
                  {unreadCount > 0 && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                  )}
                </div>

                {/* Middle: Name, Username, Message Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm truncate font-bold ${unreadCount > 0 ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                      {stripSpoofedRoleTags(partner.name || partner.username) || partner.username}
                    </span>
                    <span className="text-xs text-amber-400 font-mono truncate">
                      @{partner.username}
                    </span>
                    <RoleBadge role={partner.role} size="xs" />
                    {partner.membershipLevel && (
                      <MembershipBadge level={partner.membershipLevel} size="xs" />
                    )}
                    {isBlocked && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-rose-950/80 text-rose-400 border border-rose-500/30">
                        Blocked
                      </span>
                    )}
                  </div>

                  {/* Message Preview Row */}
                  <div className="flex items-center gap-1.5 mt-1 text-xs">
                    {/* Truth-in-status: Message Delivery Status Badge */}
                    {isMeLastSender && (
                      <span className="shrink-0 flex items-center">
                        <MessageDeliveryStatusBadge 
                          status={conv.lastMessageStatus || 'saved_locally'} 
                          showLabel={false} 
                          size="xs" 
                        />
                      </span>
                    )}

                    <p className={`truncate text-xs ${
                      unreadCount > 0 
                        ? 'font-bold text-white' 
                        : 'text-slate-400 group-hover:text-slate-300'
                    }`}>
                      {conv.lastMessage || 'Started a conversation'}
                    </p>
                  </div>
                </div>

                {/* Right: Message Time & Unread Badge */}
                <div className="shrink-0 flex flex-col items-end justify-center gap-1 text-right">
                  <span className={`text-[11px] font-mono ${
                    unreadCount > 0 
                      ? 'text-emerald-400 font-bold' 
                      : 'text-slate-500 group-hover:text-slate-400'
                  }`}>
                    {timeString}
                  </span>

                  {/* WhatsApp-Style Green Badge: (1), (2), (3), (4+) */}
                  {unreadCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30">
                      {formatUnreadBadge(unreadCount)}
                    </span>
                  ) : (
                    <span className="h-4" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NEW CHAT MODAL: Instant player search & DM launch */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white font-mono uppercase tracking-wide">
                  Start New Private Chat
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsNewChatOpen(false);
                  setNewChatSearch('');
                  setSearchResults([]);
                  setSearchError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Type any SkyClash player's username to open a direct conversation stored locally on this device.
            </p>

            <form onSubmit={handleSearchUsers} className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={newChatSearch}
                onChange={(e) => {
                  setNewChatSearch(e.target.value);
                  if (searchError) setSearchError(null);
                }}
                placeholder="Search username (e.g. Strike, trader)..."
                className="w-full pl-9 pr-20 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition"
              />
              <button
                type="submit"
                disabled={!newChatSearch.trim() || isSearching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
              </button>
            </form>

            {searchError && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono">
                {searchError}
              </div>
            )}

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2 pt-2 divide-y divide-slate-800/60">
                {searchResults.map((user) => (
                  <div
                    key={user.uid}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CircularProfileAvatar
                        src={user.profilePhoto || user.avatarUrl}
                        alt={user.username}
                        role={user.role}
                        membership={user.membership}
                        membershipLevel={user.membership?.level}
                        isAdmin={user.role === 'admin'}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-white truncate">
                            {stripSpoofedRoleTags(user.name || user.username) || user.username}
                          </span>
                          <span className="text-[11px] text-amber-400 font-mono truncate">
                            @{user.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <RoleBadge role={user.role} size="xs" />
                          {user.membership?.level && (
                            <MembershipBadge level={user.membership.level} size="xs" />
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartChatWithUser(user)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
