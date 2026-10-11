/**
 * SkyClash Local-First Private Chat Database (IndexedDB)
 * 
 * Persistent local storage for private conversations and message history.
 * - Stored in browser IndexedDB (never localStorage).
 * - Partitioned into separate databases per authenticated Firebase UID: `skyclash_chat_db_${uid}`
 * - Guarantees 100% account isolation on shared devices.
 * - Data persists across logout/login and browser refresh.
 * - Does NOT use Firestore or any cloud database for private message history.
 * - Safe input handling: sanitizes text, strips potential script injection.
 * - Never stores passwords, tokens, or credentials.
 * - Accurate status reporting: marks saved messages as 'Saved locally'.
 */

import type { UserRole, MessageDeliveryStatus } from '../types';

export type { MessageDeliveryStatus };

export interface LocalParticipantProfile {
  uid: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  profilePhoto?: string;
  role?: UserRole;
  membership?: any;
  membershipLevel?: any;
}

export interface LocalChatMessage {
  id: string;
  conversationId: string;
  userUid: string; // The owner UID of this local DB
  senderUid: string;
  senderUsername: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: UserRole;
  senderMembership?: any;
  senderMembershipLevel?: any;
  text: string;
  timestamp: number;
  status: MessageDeliveryStatus; // Explicit delivery status: 'saved_locally' | 'sending' | 'sent' | 'delivered' | 'read'
  read: boolean;
}

export interface LocalConversation {
  id: string; // e.g. "uid1_uid2"
  userUid: string; // Owner account UID
  partnerUid: string;
  partnerProfile: LocalParticipantProfile;
  lastMessage: string;
  lastMessageSenderUid: string;
  lastMessageSenderUsername: string;
  lastMessageTimestamp: number;
  lastMessageStatus: MessageDeliveryStatus;
  unreadCount: number;
  updatedAt: number;
}

const DB_VERSION = 1;
const DB_NAME_PREFIX = 'skyclash_chat_db_';

// In-memory listeners for reactive updates
type ConversationListener = (conversations: LocalConversation[], totalUnread: number) => void;
type MessageListener = (messages: LocalChatMessage[]) => void;

const convListenersByUid = new Map<string, Set<ConversationListener>>();
const messageListenersByKey = new Map<string, Set<MessageListener>>(); // key: `${userUid}_${convId}`
const broadcastChannelsByUid = new Map<string, BroadcastChannel>();

/**
 * Sanitizes UID for safe DB naming.
 */
function sanitizeUid(uid: string): string {
  return (uid || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Strips script tags, HTML tags, and dangerous javascript schemes to prevent script injection.
 */
export function sanitizeMessageText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Stable, deterministic conversation ID between two Firebase Auth UIDs.
 */
export function getConversationId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) return '';
  return [uid1, uid2].sort().join('_');
}

/**
 * Opens or initializes the isolated IndexedDB for a specific authenticated user.
 */
export function openLocalChatDB(userUid: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!userUid) {
      return reject(new Error('Authenticated Firebase UID is required to open private chat DB.'));
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser environment.'));
    }

    const dbName = `${DB_NAME_PREFIX}${sanitizeUid(userUid)}`;
    const request = window.indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Conversations Store
      if (!db.objectStoreNames.contains('conversations')) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
        convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        convStore.createIndex('lastMessageTimestamp', 'lastMessageTimestamp', { unique: false });
      }

      // 2. Messages Store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('conversationId', 'conversationId', { unique: false });
        msgStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open local chat IndexedDB.'));
    };
  });
}

/**
 * Retrieves the BroadcastChannel for multi-tab synchronization of the same account.
 */
function getBroadcastChannel(userUid: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || !window.BroadcastChannel) return null;
  const key = sanitizeUid(userUid);
  if (!broadcastChannelsByUid.has(key)) {
    try {
      const channel = new BroadcastChannel(`skyclash_local_chat_${key}`);
      channel.onmessage = () => {
        // Broadcast received from another tab for this account
        notifyConversationsUpdated(userUid);
      };
      broadcastChannelsByUid.set(key, channel);
    } catch {
      return null;
    }
  }
  return broadcastChannelsByUid.get(key) || null;
}

/**
 * Notifies all in-memory and tab subscribers for a specific user's conversations.
 */
async function notifyConversationsUpdated(userUid: string) {
  const listeners = convListenersByUid.get(userUid);
  if (!listeners || listeners.size === 0) return;

  try {
    const convs = await getLocalConversations(userUid);
    const unread = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    listeners.forEach((fn) => fn(convs, unread));
  } catch (err) {
    console.warn('Error notifying local conversation subscribers:', err);
  }
}

/**
 * Notifies all in-memory subscribers for a specific conversation's messages.
 */
async function notifyMessagesUpdated(userUid: string, conversationId: string) {
  const key = `${userUid}_${conversationId}`;
  const listeners = messageListenersByKey.get(key);
  if (!listeners || listeners.size === 0) return;

  try {
    const msgs = await getLocalMessages(userUid, conversationId);
    listeners.forEach((fn) => fn(msgs));
  } catch (err) {
    console.warn('Error notifying local message subscribers:', err);
  }
}

/**
 * Saves a private message locally in IndexedDB and updates the conversation entry.
 */
export async function saveLocalMessage({
  userUid,
  conversationId,
  senderUid,
  senderProfile,
  partnerProfile,
  text,
  status = 'saved_locally'
}: {
  userUid: string;
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
  partnerProfile: LocalParticipantProfile;
  text: string;
  status?: MessageDeliveryStatus;
}): Promise<LocalChatMessage> {
  if (!userUid || !conversationId || !senderUid || !partnerProfile?.uid) {
    throw new Error('Missing required parameters for local message storage.');
  }

  const sanitizedText = sanitizeMessageText(text);
  if (!sanitizedText) {
    throw new Error('Message text cannot be empty.');
  }

  const db = await openLocalChatDB(userUid);
  const now = Date.now();
  const messageId = `lmsg_${now}_${Math.random().toString(36).slice(2, 8)}`;

  const senderAvatar = senderProfile.profilePhoto || senderProfile.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${senderProfile.username}`;

  const messageDoc: LocalChatMessage = {
    id: messageId,
    conversationId,
    userUid,
    senderUid,
    senderUsername: senderProfile.username,
    senderName: senderProfile.name || senderProfile.username,
    senderAvatar,
    senderRole: senderProfile.role || 'user',
    senderMembership: senderProfile.membership || null,
    senderMembershipLevel: senderProfile.membershipLevel || senderProfile.membership?.level || null,
    text: sanitizedText,
    timestamp: now,
    status,
    read: senderUid === userUid
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['conversations', 'messages'], 'readwrite');
    const msgStore = tx.objectStore('messages');
    const convStore = tx.objectStore('conversations');

    // 1. Save message
    msgStore.add(messageDoc);

    // 2. Fetch or prepare conversation
    const getConvReq = convStore.get(conversationId);

    getConvReq.onsuccess = () => {
      const existingConv = getConvReq.result as LocalConversation | undefined;
      const isUserSender = senderUid === userUid;
      const unreadCount = isUserSender ? 0 : ((existingConv?.unreadCount || 0) + 1);

      const updatedConv: LocalConversation = {
        id: conversationId,
        userUid,
        partnerUid: partnerProfile.uid,
        partnerProfile: {
          uid: partnerProfile.uid,
          username: partnerProfile.username,
          name: partnerProfile.name || partnerProfile.username,
          avatarUrl: partnerProfile.profilePhoto || partnerProfile.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${partnerProfile.username}`,
          profilePhoto: partnerProfile.profilePhoto || partnerProfile.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${partnerProfile.username}`,
          role: partnerProfile.role || 'user',
          membership: partnerProfile.membership || null,
          membershipLevel: partnerProfile.membershipLevel || partnerProfile.membership?.level || null
        },
        lastMessage: sanitizedText,
        lastMessageSenderUid: senderUid,
        lastMessageSenderUsername: senderProfile.username,
        lastMessageTimestamp: now,
        lastMessageStatus: status,
        unreadCount,
        updatedAt: now
      };

      convStore.put(updatedConv);
    };

    tx.oncomplete = () => {
      db.close();

      // Notify local listeners
      notifyMessagesUpdated(userUid, conversationId);
      notifyConversationsUpdated(userUid);

      // Broadcast to other tabs on same device
      const bc = getBroadcastChannel(userUid);
      if (bc) {
        try {
          bc.postMessage({ type: 'NEW_MESSAGE', conversationId, messageId });
        } catch {
          // ignore
        }
      }

      resolve(messageDoc);
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to save message to IndexedDB.'));
    };
  });
}

/**
 * Initializes or updates conversation metadata in local IndexedDB (e.g., when starting chat).
 */
export async function upsertLocalConversation(
  userUid: string,
  conversationId: string,
  partnerProfile: LocalParticipantProfile
): Promise<LocalConversation> {
  const db = await openLocalChatDB(userUid);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['conversations'], 'readwrite');
    const store = tx.objectStore('conversations');
    const req = store.get(conversationId);

    req.onsuccess = () => {
      const existing = req.result as LocalConversation | undefined;
      const now = Date.now();

      const convDoc: LocalConversation = {
        id: conversationId,
        userUid,
        partnerUid: partnerProfile.uid,
        partnerProfile: {
          uid: partnerProfile.uid,
          username: partnerProfile.username,
          name: partnerProfile.name || partnerProfile.username,
          avatarUrl: partnerProfile.profilePhoto || partnerProfile.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${partnerProfile.username}`,
          profilePhoto: partnerProfile.profilePhoto || partnerProfile.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${partnerProfile.username}`,
          role: partnerProfile.role || 'user',
          membership: partnerProfile.membership || null,
          membershipLevel: partnerProfile.membershipLevel || partnerProfile.membership?.level || null
        },
        lastMessage: existing?.lastMessage || '',
        lastMessageSenderUid: existing?.lastMessageSenderUid || '',
        lastMessageSenderUsername: existing?.lastMessageSenderUsername || '',
        lastMessageTimestamp: existing?.lastMessageTimestamp || now,
        lastMessageStatus: 'saved_locally',
        unreadCount: existing?.unreadCount || 0,
        updatedAt: existing?.updatedAt || now
      };

      store.put(convDoc);
    };

    tx.oncomplete = () => {
      db.close();
      notifyConversationsUpdated(userUid);
      resolve({
        id: conversationId,
        userUid,
        partnerUid: partnerProfile.uid,
        partnerProfile,
        lastMessage: '',
        lastMessageSenderUid: '',
        lastMessageSenderUsername: '',
        lastMessageTimestamp: Date.now(),
        lastMessageStatus: 'saved_locally',
        unreadCount: 0,
        updatedAt: Date.now()
      });
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to upsert conversation in IndexedDB.'));
    };
  });
}

/**
 * Updates the delivery status of a specific local message in IndexedDB.
 * Clearly supports: 'saved_locally' | 'sending' | 'sent' | 'delivered' | 'read'
 */
export async function updateLocalMessageStatus(
  userUid: string,
  conversationId: string,
  messageId: string,
  newStatus: MessageDeliveryStatus
): Promise<void> {
  if (!userUid || !conversationId || !messageId) return;

  const db = await openLocalChatDB(userUid);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['messages', 'conversations'], 'readwrite');
    const msgStore = tx.objectStore('messages');
    const convStore = tx.objectStore('conversations');

    const getMsgReq = msgStore.get(messageId);
    getMsgReq.onsuccess = () => {
      const msg = getMsgReq.result as LocalChatMessage | undefined;
      if (msg) {
        msg.status = newStatus;
        msgStore.put(msg);
      }
    };

    const getConvReq = convStore.get(conversationId);
    getConvReq.onsuccess = () => {
      const conv = getConvReq.result as LocalConversation | undefined;
      if (conv) {
        conv.lastMessageStatus = newStatus;
        convStore.put(conv);
      }
    };

    tx.oncomplete = () => {
      db.close();
      notifyMessagesUpdated(userUid, conversationId);
      notifyConversationsUpdated(userUid);
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Gets all local conversations for an authenticated user, sorted newest first.
 * Supports filtering by username, display name, or message snippet.
 */
export async function getLocalConversations(
  userUid: string,
  searchFilter?: string
): Promise<LocalConversation[]> {
  if (!userUid) return [];

  const db = await openLocalChatDB(userUid);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['conversations'], 'readonly');
    const store = tx.objectStore('conversations');
    const req = store.getAll();

    req.onsuccess = () => {
      let list = (req.result || []) as LocalConversation[];

      // Sort newest-first by lastMessageTimestamp or updatedAt
      list.sort((a, b) => {
        const timeA = a.lastMessageTimestamp || a.updatedAt || 0;
        const timeB = b.lastMessageTimestamp || b.updatedAt || 0;
        return timeB - timeA;
      });

      // Filter locally if search query provided
      if (searchFilter && searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        list = list.filter((c) => {
          const u = c.partnerProfile.username?.toLowerCase() || '';
          const n = c.partnerProfile.name?.toLowerCase() || '';
          const m = c.lastMessage?.toLowerCase() || '';
          return u.includes(q) || n.includes(q) || m.includes(q);
        });
      }

      db.close();
      resolve(list);
    };

    req.onerror = () => {
      db.close();
      reject(req.error || new Error('Failed to retrieve conversations from IndexedDB.'));
    };
  });
}

/**
 * Gets all stored messages for a specific conversation, sorted chronologically.
 */
export async function getLocalMessages(
  userUid: string,
  conversationId: string
): Promise<LocalChatMessage[]> {
  if (!userUid || !conversationId) return [];

  const db = await openLocalChatDB(userUid);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['messages'], 'readonly');
    const store = tx.objectStore('messages');
    const index = store.index('conversationId');
    const req = index.getAll(conversationId);

    req.onsuccess = () => {
      const messages = (req.result || []) as LocalChatMessage[];
      // Sort ascending by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
      db.close();
      resolve(messages);
    };

    req.onerror = () => {
      db.close();
      reject(req.error || new Error('Failed to retrieve messages from IndexedDB.'));
    };
  });
}

/**
 * Searches stored local messages across all conversations for a specific account.
 */
export async function searchLocalMessages(
  userUid: string,
  queryText: string
): Promise<LocalChatMessage[]> {
  if (!userUid || !queryText.trim()) return [];

  const db = await openLocalChatDB(userUid);
  const q = queryText.trim().toLowerCase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['messages'], 'readonly');
    const store = tx.objectStore('messages');
    const req = store.getAll();

    req.onsuccess = () => {
      const allMsgs = (req.result || []) as LocalChatMessage[];
      const matched = allMsgs.filter((m) => m.text.toLowerCase().includes(q));
      matched.sort((a, b) => b.timestamp - a.timestamp);
      db.close();
      resolve(matched);
    };

    req.onerror = () => {
      db.close();
      reject(req.error || new Error('Failed to search messages in IndexedDB.'));
    };
  });
}

/**
 * Marks conversation as read in local storage (resets unread count to 0).
 */
export async function markLocalConversationAsRead(
  userUid: string,
  conversationId: string
): Promise<void> {
  if (!userUid || !conversationId) return;

  const db = await openLocalChatDB(userUid);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['conversations', 'messages'], 'readwrite');
    const convStore = tx.objectStore('conversations');
    const msgStore = tx.objectStore('messages');

    // 1. Reset conversation unreadCount
    const convReq = convStore.get(conversationId);
    convReq.onsuccess = () => {
      const conv = convReq.result as LocalConversation | undefined;
      if (conv) {
        conv.unreadCount = 0;
        convStore.put(conv);
      }
    };

    // 2. Mark messages as read
    const msgIndex = msgStore.index('conversationId');
    const msgsReq = msgIndex.getAll(conversationId);
    msgsReq.onsuccess = () => {
      const msgs = (msgsReq.result || []) as LocalChatMessage[];
      for (const m of msgs) {
        if (!m.read) {
          m.read = true;
          msgStore.put(m);
        }
      }
    };

    tx.oncomplete = () => {
      db.close();
      notifyConversationsUpdated(userUid);
      notifyMessagesUpdated(userUid, conversationId);
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to mark conversation read in IndexedDB.'));
    };
  });
}

/**
 * Subscribes to real-time updates for an account's local conversations list.
 * Calls immediately with cached conversations, then again whenever local changes happen.
 */
export function subscribeToLocalConversations(
  userUid: string,
  callback: ConversationListener
): () => void {
  if (!userUid) {
    callback([], 0);
    return () => {};
  }

  if (!convListenersByUid.has(userUid)) {
    convListenersByUid.set(userUid, new Set());
  }

  const set = convListenersByUid.get(userUid)!;
  set.add(callback);

  // Initialize BroadcastChannel listener for multi-tab
  getBroadcastChannel(userUid);

  // Immediate initial load
  getLocalConversations(userUid)
    .then((convs) => {
      const totalUnread = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      callback(convs, totalUnread);
    })
    .catch((err) => {
      console.warn('Initial local conversations load error:', err);
      callback([], 0);
    });

  return () => {
    set.delete(callback);
    if (set.size === 0) {
      convListenersByUid.delete(userUid);
    }
  };
}

/**
 * Subscribes to real-time updates for a specific conversation's local messages.
 */
export function subscribeToLocalMessages(
  userUid: string,
  conversationId: string,
  callback: MessageListener
): () => void {
  if (!userUid || !conversationId) {
    callback([]);
    return () => {};
  }

  const key = `${userUid}_${conversationId}`;
  if (!messageListenersByKey.has(key)) {
    messageListenersByKey.set(key, new Set());
  }

  const set = messageListenersByKey.get(key)!;
  set.add(callback);

  // Immediate initial load
  getLocalMessages(userUid, conversationId)
    .then((msgs) => {
      callback(msgs);
    })
    .catch((err) => {
      console.warn('Initial local messages load error:', err);
      callback([]);
    });

  return () => {
    set.delete(callback);
    if (set.size === 0) {
      messageListenersByKey.delete(key);
    }
  };
}
