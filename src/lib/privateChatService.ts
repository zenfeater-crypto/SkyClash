/**
 * SkyClash Private Chat Service — Local-First Storage Architecture
 * 
 * - IndexedDB is used as the persistent local database for private chat history.
 * - Private messages and conversation metadata are NEVER stored in Firebase Firestore
 *   or any cloud database.
 * - Database records are partitioned per authenticated Firebase Auth UID: `skyclash_chat_db_${uid}`.
 * - Multi-account isolation: Account A cannot read or access Account B's local messages.
 * - Local-first immediate loading: Conversations and messages load instantly on app open.
 * - Logging out does NOT wipe the local IndexedDB database; signing back in restores history.
 * - Local message search, newest-conversation sorting, message previews, and unread badges.
 * - Does not silently claim messages are delivered across devices; status is 'saved_locally'.
 * - Safe input handling: script and tag injection stripped.
 * - No credentials, tokens, or passwords stored.
 */

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  PrivateConversation, 
  ConversationParticipantProfile, 
  UserProfile, 
  UserRole, 
  ChatMessage 
} from '../types';
import { 
  openLocalChatDB,
  saveLocalMessage,
  getLocalConversations,
  getLocalMessages,
  markLocalConversationAsRead,
  subscribeToLocalConversations,
  subscribeToLocalMessages,
  searchLocalMessages,
  upsertLocalConversation,
  getConversationId,
  sanitizeMessageText,
  LocalConversation,
  LocalChatMessage
} from './localChatDB';

export {
  getConversationId,
  sanitizeMessageText,
  subscribeToLocalMessages,
  getLocalMessages,
  searchLocalMessages,
  upsertLocalConversation
};

/**
 * Formats unread count badge in WhatsApp / SkyClash style:
 * 1 -> "(1)"
 * 2 -> "(2)"
 * 3 -> "(3)"
 * 4 or more -> "(4+)"
 */
export function formatUnreadBadge(count: number): string {
  if (!count || count <= 0) return '';
  if (count >= 4) return '(4+)';
  return `(${count})`;
}

/**
 * Formats message timestamp in clean WhatsApp style:
 * - Today: "3:45 PM"
 * - Yesterday: "Yesterday"
 * - Within 6 days: "Monday"
 * - Older: "Oct 10"
 */
export function formatConversationTime(timestamp?: number | string): string {
  if (!timestamp) return '';
  const numTime = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (!numTime || isNaN(numTime)) return '';

  const date = new Date(numTime);
  const now = new Date();

  const isToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = 
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Converts a LocalConversation from IndexedDB into a PrivateConversation representation.
 */
export function mapLocalToPrivateConversation(
  localConv: LocalConversation,
  currentUserId: string
): PrivateConversation {
  const partner = localConv.partnerProfile;
  const partnerUid = partner.uid;

  return {
    id: localConv.id,
    participants: [currentUserId, partnerUid].sort(),
    participantUids: [currentUserId, partnerUid].sort(),
    participantProfiles: {
      [partnerUid]: {
        uid: partner.uid,
        username: partner.username,
        name: partner.name || partner.username,
        avatarUrl: partner.avatarUrl || partner.profilePhoto,
        profilePhoto: partner.profilePhoto || partner.avatarUrl,
        role: partner.role || 'user',
        membership: partner.membership || null,
        membershipLevel: partner.membershipLevel || null
      }
    },
    usernames: {
      [partnerUid]: partner.username
    },
    names: {
      [partnerUid]: partner.name || partner.username
    },
    avatars: {
      [partnerUid]: partner.profilePhoto || partner.avatarUrl || ''
    },
    roles: {
      [partnerUid]: partner.role || 'user'
    },
    lastMessage: localConv.lastMessage,
    lastMessageSenderUid: localConv.lastMessageSenderUid,
    lastMessageSenderUsername: localConv.lastMessageSenderUsername,
    lastMessageTimestamp: localConv.lastMessageTimestamp,
    lastMessageStatus: localConv.lastMessageStatus || 'saved_locally',
    unreadCounts: {
      [currentUserId]: localConv.unreadCount || 0
    },
    updatedAt: localConv.updatedAt,
    createdAt: localConv.updatedAt
  };
}

/**
 * Resolves the other participant's profile information from a conversation doc.
 */
export function getPartnerProfileFromConversation(
  conv: PrivateConversation, 
  currentUserId: string
): ConversationParticipantProfile {
  const partnerUid = conv.participants?.find((u) => u !== currentUserId) || '';

  if (conv.participantProfiles && conv.participantProfiles[partnerUid]) {
    const p = conv.participantProfiles[partnerUid];
    return {
      uid: partnerUid,
      username: p.username || conv.usernames?.[partnerUid] || 'Trader',
      name: p.name || conv.names?.[partnerUid] || p.username || 'Trader',
      avatarUrl: p.profilePhoto || p.avatarUrl || conv.avatars?.[partnerUid] || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${partnerUid}`,
      profilePhoto: p.profilePhoto || p.avatarUrl || conv.avatars?.[partnerUid] || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${partnerUid}`,
      role: p.role || conv.roles?.[partnerUid] || 'user',
      membership: p.membership || null,
      membershipLevel: p.membershipLevel || p.membership?.level || null
    };
  }

  const username = conv.usernames?.[partnerUid] || 'Trader';
  const name = conv.names?.[partnerUid] || username;
  const avatar = conv.avatars?.[partnerUid] || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}`;
  const role = conv.roles?.[partnerUid] || 'user';

  return {
    uid: partnerUid,
    username,
    name,
    avatarUrl: avatar,
    profilePhoto: avatar,
    role,
    membership: null,
    membershipLevel: null
  };
}

/**
 * Marks conversation as read in the local IndexedDB database.
 */
export async function markConversationAsRead(
  conversationId: string, 
  currentUserId: string
): Promise<void> {
  if (!conversationId || !currentUserId) return;
  await markLocalConversationAsRead(currentUserId, conversationId);
}

/**
 * Sends a private message and saves it to local-first IndexedDB storage.
 * Does NOT persist to Firestore or any cloud database.
 */
export async function sendPrivateMessage({
  conversationId,
  senderUid,
  senderProfile,
  partnerProfile,
  text
}: {
  conversationId: string;
  senderUid: string;
  senderProfile: {
    username: string;
    name?: string;
    avatarUrl?: string;
    profilePhoto?: string;
    role?: UserRole;
    membership?: any;
    membershipLevel?: any;
  };
  partnerProfile: {
    uid: string;
    username: string;
    name?: string;
    avatarUrl?: string;
    profilePhoto?: string;
    role?: UserRole;
    membership?: any;
    membershipLevel?: any;
  };
  text: string;
}): Promise<ChatMessage> {
  if (!conversationId || !senderUid || !partnerProfile.uid || !text.trim()) {
    throw new Error('Invalid message parameters.');
  }

  const savedLocal = await saveLocalMessage({
    userUid: senderUid,
    conversationId,
    senderUid,
    senderProfile,
    partnerProfile: {
      uid: partnerProfile.uid,
      username: partnerProfile.username,
      name: partnerProfile.name || partnerProfile.username,
      avatarUrl: partnerProfile.avatarUrl || partnerProfile.profilePhoto,
      profilePhoto: partnerProfile.profilePhoto || partnerProfile.avatarUrl,
      role: partnerProfile.role,
      membership: partnerProfile.membership,
      membershipLevel: partnerProfile.membershipLevel || partnerProfile.membership?.level
    },
    text
  });

  return {
    id: savedLocal.id,
    senderUid: savedLocal.senderUid,
    senderUsername: savedLocal.senderUsername,
    senderName: savedLocal.senderName,
    senderAvatar: savedLocal.senderAvatar,
    senderRole: savedLocal.senderRole,
    senderMembership: savedLocal.senderMembership,
    senderMembershipLevel: savedLocal.senderMembershipLevel,
    text: savedLocal.text,
    timestamp: savedLocal.timestamp,
    createdAt: savedLocal.timestamp,
    status: savedLocal.status || 'saved_locally',
    read: savedLocal.read
  };
}

/**
 * Subscribes to an account's local conversations stored in IndexedDB.
 * Updates in real-time on local message dispatch, read actions, or multi-tab events.
 */
export function subscribeToUserConversations(
  userId: string,
  onUpdate: (conversations: PrivateConversation[], totalUnreadCount: number) => void
): () => void {
  if (!userId) {
    onUpdate([], 0);
    return () => {};
  }

  return subscribeToLocalConversations(userId, (localConvs, totalUnread) => {
    const mapped = localConvs.map((lc) => mapLocalToPrivateConversation(lc, userId));
    onUpdate(mapped, totalUnread);
  });
}

/**
 * Search users by username from users collection for starting a new private conversation.
 * (Only reads user profile metadata; never persists private message history to Firestore).
 */
export async function searchUsersForChat(
  searchQuery: string,
  currentUserId: string
): Promise<UserProfile[]> {
  if (!searchQuery.trim()) return [];

  const normalized = searchQuery.trim().toLowerCase();

  try {
    const q = query(
      collection(db, 'users'),
      where('normalizedUsername', '>=', normalized),
      where('normalizedUsername', '<=', normalized + '\uf8ff'),
      limit(15)
    );

    const snap = await getDocs(q);
    const results: UserProfile[] = [];

    snap.forEach((d) => {
      const u = d.data() as UserProfile;
      if (u.uid !== currentUserId) {
        results.push(u);
      }
    });

    return results;
  } catch (err) {
    console.warn('Search users for chat error:', err);
    return [];
  }
}
