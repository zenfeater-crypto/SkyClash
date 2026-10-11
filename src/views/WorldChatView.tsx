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
  Trash2,
  Pin,
  PinOff,
  CornerDownRight,
  X,
  Plus,
  Shield,
  Check,
  ChevronDown,
  Sparkles,
  Info,
  Swords
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
  setDoc,
  updateDoc,
  addDoc, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { 
  ChatMessage, 
  WorldChatGroup, 
  PinnedChatMessage, 
  ChatReplyInfo,
  WorldChatPresence,
  WarsGang,
  UserRole 
} from '../types';
import { formatTimeAgo } from '../lib/formatters';
import { RoleBadge } from '../components/RoleBadge';
import { formatRemainingTime } from '../lib/moderation';
import { stripSpoofedRoleTags, normalizeWorldMessage } from '../lib/validation';
import { CircularProfileAvatar } from '../components/CircularProfileAvatar';
import { MessageTextFrame } from '../components/MessageTextFrame';
import { MembershipBadge } from '../components/MembershipBadge';
import { getUserGang } from '../lib/gangHelpers';
import { GangChatModal } from '../components/wars/GangChatModal';
import { AvailableGangsModal } from '../components/wars/AvailableGangsModal';
import { PrivateChatInbox } from '../components/chat/PrivateChatInbox';
import { 
  subscribeToUserConversations, 
  formatUnreadBadge, 
  getConversationId 
} from '../lib/privateChatService';

interface WorldChatViewProps {
  onOpenAuth: () => void;
  onOpenReportModal: (targetType: 'world_message' | 'user', targetId: string, username: string) => void;
  onOpenPrivateChat?: (
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

export const WorldChatView: React.FC<WorldChatViewProps> = ({ 
  onOpenAuth, 
  onOpenReportModal,
  onOpenPrivateChat 
}) => {
  const { currentUser, userProfile, isMuted, isAdmin, isOfficer, canDeleteChats } = useAuth();
  const { blockedUserIds, blockUser } = useUserData();

  // World Chat Groups state
  const [groups, setGroups] = useState<WorldChatGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('group-1');
  const [autoGroupsEnabled, setAutoGroupsEnabled] = useState<boolean>(true);
  const [activePresences, setActivePresences] = useState<WorldChatPresence[]>([]);
  
  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [mutedUsersLocal, setMutedUsersLocal] = useState<string[]>([]);
  const [spamError, setSpamError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Replies state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Admin Modals state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<WorldChatGroup | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Admin Delete Message Confirmation Modal (Replaces window.confirm which fails in iframes)
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  // WhatsApp-style Private Chat state
  const [showPrivateInbox, setShowPrivateInbox] = useState<boolean>(false);
  const [privateInboxUnread, setPrivateInboxUnread] = useState<number>(0);

  // Gangs state for World Chat Gang shortcut and Join Gang modal
  const [gangs, setGangs] = useState<WarsGang[]>([]);
  const [gangChatModalOpen, setGangChatModalOpen] = useState(false);
  const [joinGangModalOpen, setJoinGangModalOpen] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages arrive
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Jump/scroll to a specific message and pulse-highlight it
  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2500);
    }
  };

  // 1. Subscribe to World Chat Groups
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'worldChatGroups'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedGroups: WorldChatGroup[] = [];
        snapshot.forEach((docSnap) => {
          loadedGroups.push({ id: docSnap.id, ...docSnap.data() } as WorldChatGroup);
        });

        // If no groups exist yet in the database, bootstrap default Group 1
        if (loadedGroups.length === 0) {
          const defaultGroup: WorldChatGroup = {
            id: 'group-1',
            name: 'Group 1',
            createdAt: Date.now(),
            activeUserCount: 1,
            maxActiveUsers: 75,
            status: 'active',
            lastActivity: Date.now(),
            isAutoCreated: false,
            pinnedMessage: null
          };
          if (isAdmin) {
            setDoc(doc(db, 'worldChatGroups', 'group-1'), defaultGroup).catch(() => {});
          }
          setGroups([defaultGroup]);
        } else {
          setGroups(loadedGroups);
        }
      },
      (err) => {
        console.warn('World chat groups listener warning:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  // Subscribe to Gangs to detect user's active gang and power Gang Chat shortcut / Join Gang
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'wars_gangs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WarsGang[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as WarsGang);
        });
        setGangs(list);
      },
      (err) => {
        console.warn('World chat gangs listener warning:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const userGang = useMemo(() => {
    return getUserGang(gangs, currentUser?.uid);
  }, [gangs, currentUser?.uid]);

  // Subscribe to pending gang invitations for current user
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'gangInvitations'),
      where('receiverUid', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setPendingInvitesCount(snapshot.size);
      },
      (err) => console.warn('Pending invites listener warning:', err)
    );
    return () => unsub();
  }, [currentUser]);

  // Sync real-time private conversations unread badge
  useEffect(() => {
    if (!currentUser) {
      setPrivateInboxUnread(0);
      return;
    }

    const unsub = subscribeToUserConversations(currentUser.uid, (_, unreadCount) => {
      setPrivateInboxUnread(unreadCount);
    });

    return () => unsub();
  }, [currentUser]);

  // 2. Subscribe to Auto Groups setting
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      doc(db, 'worldChatSettings', 'main'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.autoGroupsEnabled !== undefined) {
            setAutoGroupsEnabled(data.autoGroupsEnabled);
          }
        } else if (isAdmin) {
          // Initialize default setting
          setDoc(doc(db, 'worldChatSettings', 'main'), { autoGroupsEnabled: true, updatedAt: Date.now() }).catch(() => {});
        }
      },
      (err) => console.warn('Auto groups setting warning:', err)
    );
    return () => unsub();
  }, [currentUser, isAdmin]);

  // 3. World Chat Presence tracking (Live active users count, max 75 per group, ignoring offline)
  useEffect(() => {
    if (!currentUser) return;

    // Heartbeat: update active presence every 20 seconds
    const sendPresence = async () => {
      try {
        await setDoc(doc(db, 'worldChatPresence', currentUser.uid), {
          uid: currentUser.uid,
          username: userProfile?.username || 'user',
          groupId: selectedGroupId,
          lastActive: Date.now()
        });
      } catch (e) {
        // Ignored non-fatal error
      }
    };

    sendPresence();
    const presenceTimer = setInterval(sendPresence, 20000);

    // Subscribe to presence collection to calculate real-time active users per group
    const unsubPresence = onSnapshot(
      collection(db, 'worldChatPresence'),
      (snap) => {
        const presences: WorldChatPresence[] = [];
        const threshold = Date.now() - 45000; // active within last 45s only
        snap.forEach((docSnap) => {
          const data = docSnap.data() as WorldChatPresence;
          if (data.lastActive && data.lastActive > threshold) {
            presences.push(data);
          }
        });
        setActivePresences(presences);
      },
      (err) => console.warn('Presence listener warning:', err)
    );

    return () => {
      clearInterval(presenceTimer);
      unsubPresence();
      // Cleanup presence on unmount
      deleteDoc(doc(db, 'worldChatPresence', currentUser.uid)).catch(() => {});
    };
  }, [currentUser, userProfile?.username, selectedGroupId]);

  // Compute active user counts per group (IGNORING OFFLINE USERS)
  const activeCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    activePresences.forEach((p) => {
      counts[p.groupId] = (counts[p.groupId] || 0) + 1;
    });
    return counts;
  }, [activePresences]);

  // Auto Groups Placement Engine:
  // When Auto Groups is ON:
  // Dynamically place user into a group that has < 75 active users.
  // If all groups are full (>= 75 active users), automatically create another group!
  useEffect(() => {
    if (!autoGroupsEnabled || groups.length === 0 || !currentUser) return;

    const currentCount = activeCountByGroup[selectedGroupId] || 0;
    // If current group exceeds 75 active users, or user is not yet in an optimal group
    const activeGroups = groups.filter((g) => g.status === 'active');
    
    // Check if current group is valid and has space
    if (activeGroups.some((g) => g.id === selectedGroupId) && currentCount <= 75) {
      return;
    }

    // Find first group with capacity < 75
    const eligibleGroup = activeGroups.find((g) => (activeCountByGroup[g.id] || 0) < 75);
    if (eligibleGroup) {
      setSelectedGroupId(eligibleGroup.id);
    } else {
      // All existing active groups are full (>= 75 active users)! Auto-create another group
      const nextGroupNum = groups.length + 1;
      const nextGroupId = `group-${nextGroupNum}`;
      const nextGroupData: WorldChatGroup = {
        id: nextGroupId,
        name: `Group ${nextGroupNum}`,
        createdAt: Date.now(),
        activeUserCount: 1,
        maxActiveUsers: 75,
        status: 'active',
        lastActivity: Date.now(),
        isAutoCreated: true,
        pinnedMessage: null
      };

      setDoc(doc(db, 'worldChatGroups', nextGroupId), nextGroupData)
        .then(() => {
          setSelectedGroupId(nextGroupId);
        })
        .catch((err) => console.warn('Auto create group error:', err));
    }
  }, [autoGroupsEnabled, groups, activeCountByGroup, selectedGroupId, currentUser]);

  // Empty Group Auto-Cleanup:
  // If an auto-created group becomes completely empty (0 active users) and there is more than 1 active group,
  // mark it inactive so it disappears cleanly from active selection.
  useEffect(() => {
    if (!autoGroupsEnabled || groups.length <= 1) return;

    // Check empty auto-created groups
    const emptyAutoGroups = groups.filter(
      (g) => g.isAutoCreated && g.status === 'active' && g.id !== 'group-1' && (activeCountByGroup[g.id] || 0) === 0
    );

    if (emptyAutoGroups.length > 0) {
      emptyAutoGroups.forEach((eg) => {
        // Only mark inactive if created more than 1 minute ago to prevent flickering
        if (Date.now() - eg.createdAt > 60000) {
          updateDoc(doc(db, 'worldChatGroups', eg.id), {
            status: 'inactive',
            lastActivity: Date.now()
          }).catch(() => {});
        }
      });
    }
  }, [autoGroupsEnabled, groups, activeCountByGroup]);

  // 4. Real-time messages listener with 30-minute logical expiration
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    // Query messages that expire in the future (expiresAt > now)
    // Uses single-field index on expiresAt; 0 Rs / Spark tier optimized with limit(100)
    const q = query(
      collection(db, 'worldMessages'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      limit(100)
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

  // Periodic ticker every 10s: automatically disappears messages and pinned status past 30 min
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 5. Sync 7-second cooldown from Firestore userProfile
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

  // Active current group object
  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || groups[0] || {
      id: 'group-1',
      name: 'Group 1',
      createdAt: Date.now(),
      activeUserCount: 0,
      maxActiveUsers: 75,
      status: 'active',
      lastActivity: Date.now()
    };
  }, [groups, selectedGroupId]);

  // Active Pinned Message for the current group (strictly checking 30-minute expiration)
  const activePinnedMessage = useMemo(() => {
    const pin = activeGroup?.pinnedMessage;
    if (!pin) return null;
    if (pin.expiresAt && pin.expiresAt <= currentTime) {
      return null; // Expired logically after 30 minutes!
    }
    return pin;
  }, [activeGroup?.pinnedMessage, currentTime]);

  // Filter messages belonging to the selected group
  // (Legacy messages without groupId belong to 'group-1' for complete backward compatibility)
  const currentGroupMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (msg.expiresAt && msg.expiresAt <= currentTime) {
        return false;
      }
      if (msg.groupId) {
        return msg.groupId === selectedGroupId;
      }
      return selectedGroupId === 'group-1';
    });
  }, [messages, selectedGroupId, currentTime]);

  // Filter out blocked users and locally muted users
  const visibleMessages = useMemo(() => {
    return currentGroupMessages.filter(
      (msg) => !blockedUserIds.includes(msg.senderUid) && !mutedUsersLocal.includes(msg.senderUid)
    );
  }, [currentGroupMessages, blockedUserIds, mutedUsersLocal]);

  // Send message with backend cooldown, 30m TTL, duplicate protection, group binding, and optional reply
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

      // Build reply snippet if replying
      const replyData: ChatReplyInfo | null = replyingTo ? {
        messageId: replyingTo.id,
        senderUid: replyingTo.senderUid,
        senderUsername: replyingTo.senderUsername,
        senderName: replyingTo.senderName || replyingTo.senderUsername,
        senderRole: replyingTo.senderRole,
        textSnippet: replyingTo.text.slice(0, 80)
      } : null;

      // 1. Create worldMessages doc with server-verified 30-minute expiration
      const newMsgRef = doc(collection(db, 'worldMessages'));
      batch.set(newMsgRef, {
        groupId: selectedGroupId,
        senderUid: currentUser.uid,
        senderUsername: userProfile?.username || currentUser.displayName || 'trader',
        senderName: userProfile?.name || userProfile?.username || currentUser.displayName || 'Trader',
        senderAvatar: userProfile?.profilePhoto || userProfile?.avatarUrl || '',
        senderRole: userProfile?.role || 'user',
        senderMembership: userProfile?.membership || null,
        senderMembershipLevel: userProfile?.membership?.level || null,
        text: rawMessage,
        normalizedText,
        sameMessageCount: nextCount,
        timestamp: now,
        createdAt: now,
        expiresAt: now + (30 * 60 * 1000), // Exactly 30 minutes
        ...(replyData ? { replyTo: replyData } : {})
      });

      // 2. Atomically update user document with backend cooldown timestamp and duplicate state
      const userRef = doc(db, 'users', currentUser.uid);
      batch.update(userRef, {
        lastWorldChatAt: now,
        lastChatMessageNorm: normalizedText,
        sameMessageCount: nextCount,
      });

      // 3. Update group's lastActivity
      const groupRef = doc(db, 'worldChatGroups', selectedGroupId);
      batch.update(groupRef, {
        lastActivity: now
      });

      await batch.commit();

      // Clear input and reply context
      setInputText('');
      setReplyingTo(null);
      setSpamError(null);
      setCooldownRemaining(7);

      setTimeout(() => scrollToBottom('smooth'), 60);
    } catch (err: any) {
      console.error('Failed to send world message:', err);
      if (err.message && (err.message.includes('permission') || err.message.includes('PERMISSION_DENIED'))) {
        setSpamError('Message rejected by server: 7s cooldown or duplicate limit enforced.');
      } else {
        setSpamError(err.message || 'Could not send message.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // ADMIN DELETE FIX: Instant, safe in-app deletion with optimistic update and audit history
  const handleConfirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    const msg = messageToDelete;
    setIsDeletingMessage(true);

    try {
      // Optimistic local removal for instant UI feedback
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));

      await deleteDoc(doc(db, 'worldMessages', msg.id));

      // If message was pinned, remove pin as well
      if (activeGroup?.pinnedMessage?.messageId === msg.id) {
        await updateDoc(doc(db, 'worldChatGroups', selectedGroupId), {
          pinnedMessage: null
        });
      }

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
          details: { messageText: msg.text, messageId: msg.id, groupId: selectedGroupId }
        });
      }

      setMessageToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete world message:', err);
      setSpamError('Failed to delete message: ' + (err.message || 'Permission denied'));
    } finally {
      setIsDeletingMessage(false);
    }
  };

  // PIN / UNPIN MESSAGE SYSTEM (Strict 30-Minute Expiration)
  const handleTogglePinMessage = async (msg: ChatMessage) => {
    if (!isAdmin && !isOfficer) return;

    try {
      const groupRef = doc(db, 'worldChatGroups', selectedGroupId);

      // If already pinned, unpin it
      if (activeGroup?.pinnedMessage?.messageId === msg.id) {
        await updateDoc(groupRef, {
          pinnedMessage: null
        });
        return;
      }

      // Pin with STRICT 30-minute logical expiration
      const now = Date.now();
      const expiresAt = now + (30 * 60 * 1000); // 30 minutes expiration
      const pinnedPayload: PinnedChatMessage = {
        id: msg.id,
        messageId: msg.id,
        text: msg.text,
        senderUsername: msg.senderUsername,
        senderRole: msg.senderRole,
        pinnedAt: now,
        expiresAt: expiresAt,
        pinnedByUid: currentUser?.uid || '',
        pinnedByUsername: userProfile?.username || 'Staff'
      };

      await updateDoc(groupRef, {
        pinnedMessage: pinnedPayload
      });
    } catch (err: any) {
      console.error('Failed to pin/unpin message:', err);
      setSpamError('Failed to update pinned message: ' + (err.message || 'Permission denied'));
    }
  };

  // Unpin from banner
  const handleUnpinFromBanner = async () => {
    if (!isAdmin && !isOfficer) return;
    try {
      await updateDoc(doc(db, 'worldChatGroups', selectedGroupId), {
        pinnedMessage: null
      });
    } catch (err: any) {
      console.error('Failed to unpin message:', err);
    }
  };

  // Toggle Auto Groups (Owner Admin only)
  const handleToggleAutoGroups = async () => {
    if (!isAdmin) return;
    try {
      const nextVal = !autoGroupsEnabled;
      await setDoc(doc(db, 'worldChatSettings', 'main'), {
        autoGroupsEnabled: nextVal,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (err: any) {
      console.error('Failed to toggle auto groups:', err);
      setSpamError('Failed to update Auto Groups setting.');
    }
  };

  // Admin Manual Group Creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newGroupName.trim()) return;

    setIsCreatingGroup(true);
    try {
      const cleanName = newGroupName.trim();
      const newGroupId = `group-${Date.now().toString().slice(-6)}`;
      const newGroup: WorldChatGroup = {
        id: newGroupId,
        name: cleanName,
        createdAt: Date.now(),
        activeUserCount: 0,
        maxActiveUsers: 75,
        status: 'active',
        lastActivity: Date.now(),
        isAutoCreated: false,
        pinnedMessage: null
      };

      await setDoc(doc(db, 'worldChatGroups', newGroupId), newGroup);
      setNewGroupName('');
      setShowCreateGroupModal(false);
      setSelectedGroupId(newGroupId);
    } catch (err: any) {
      console.error('Failed to create group:', err);
      setSpamError('Failed to create group: ' + (err.message || 'Error'));
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Admin Manual Group Deletion (Owner Admin only)
  const handleConfirmDeleteGroup = async () => {
    if (!isAdmin || !groupToDelete) return;

    if (groupToDelete.id === 'group-1') {
      alert('Group 1 is the primary permanent lobby and cannot be deleted.');
      setGroupToDelete(null);
      return;
    }

    const activeCount = activeCountByGroup[groupToDelete.id] || 0;
    if (activeCount > 0) {
      alert(`Cannot delete group "${groupToDelete.name}": There are currently ${activeCount} active users in this group.`);
      setGroupToDelete(null);
      return;
    }

    setIsDeletingGroup(true);
    try {
      await deleteDoc(doc(db, 'worldChatGroups', groupToDelete.id));
      if (selectedGroupId === groupToDelete.id) {
        setSelectedGroupId('group-1');
      }
      setGroupToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete group:', err);
      setSpamError('Failed to delete group: ' + (err.message || 'Permission denied'));
    } finally {
      setIsDeletingGroup(false);
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

  // Render WhatsApp-Style Dedicated Private Chats Inbox
  if (showPrivateInbox) {
    return (
      <div className="w-full h-full flex flex-col min-h-0 bg-slate-950 text-slate-100 overflow-hidden relative">
        <PrivateChatInbox
          onClose={() => setShowPrivateInbox(false)}
          onOpenPrivateChat={(friendshipId, partnerProfile) => {
            onOpenPrivateChat?.(friendshipId, partnerProfile);
          }}
        />
      </div>
    );
  }

  const currentGroupActiveUsers = activeCountByGroup[selectedGroupId] || 0;

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Top Header Bar */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide uppercase font-mono">
                World Chat
              </h1>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{activeGroup.name}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                {currentGroupActiveUsers}/75 Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Grouped trade lobby • Up to 75 active traders per group • 30-min auto expiration
            </p>
          </div>
        </div>

        {/* Header Right Actions: Auto Groups Toggle & Admin Controls */}
        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1">
              <span className="text-[10px] font-bold font-mono tracking-wider text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                AUTO GROUPS
              </span>
              <button
                type="button"
                onClick={handleToggleAutoGroups}
                className={`text-[10px] font-mono font-black px-2 py-0.5 rounded transition ${
                  autoGroupsEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
                title="When ON: Automatically maintains groups of up to 75 active users"
              >
                {autoGroupsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="py-1 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 font-bold text-xs transition flex items-center gap-1 shrink-0"
              title="Admin: Create World Chat Group"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Group</span>
            </button>
          )}

          {/* Gang Chat Shortcut & Join Gang Controls beside '+' button */}
          {userGang ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Current Gang Name Badge */}
              <div 
                className="hidden xs:flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 shrink-0"
                title={`Active Gang: ${userGang.name} (${userGang.gameType || 'Skyblock'})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase shrink-0">
                  {userGang.gameType === 'bedwars' ? 'BW' : 'SB'}
                </span>
                <span className="font-extrabold text-white text-xs max-w-[80px] sm:max-w-[120px] truncate">
                  {userGang.name}
                </span>
              </div>

              {/* Gang Chat Shortcut: Opens Gang Chat Directly */}
              <button
                type="button"
                onClick={() => setGangChatModalOpen(true)}
                className="py-1 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer shrink-0"
                title={`Open ${userGang.name} Gang Chat`}
              >
                <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate max-w-[85px] sm:max-w-none">
                  {userGang.tag ? `[${userGang.tag}] ` : ''}Gang Chat
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Gang Chat Shortcut (prompts to join gang if user has none) */}
              <button
                type="button"
                onClick={() => setJoinGangModalOpen(true)}
                className="py-1 px-2 sm:px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-300 font-bold text-xs transition flex items-center gap-1.5 shrink-0"
                title="Gang Chat: Join an active gang to participate"
              >
                <Swords className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="hidden sm:inline">Gang Chat</span>
              </button>

              {/* JOIN GANG Button (Beside Gang Chat shortcut) */}
              <button
                type="button"
                onClick={() => setJoinGangModalOpen(true)}
                className="py-1 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer shrink-0"
                title="Browse available gangs and apply to join"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>JOIN GANG</span>
                {pendingInvitesCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500 text-slate-950 animate-pulse">
                    {pendingInvitesCount}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="text-right hidden md:block font-mono text-xs text-slate-400">
            <span>{visibleMessages.length} messages</span>
          </div>
        </div>
      </div>

      {/* Group Selector Bar (Tabs for groups with active user count) */}
      <div className="shrink-0 px-4 sm:px-6 py-2 bg-slate-900/60 border-b border-slate-800/60 overflow-x-auto flex items-center gap-2 scrollbar-none z-10">
        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold shrink-0 flex items-center gap-1">
          <Users className="w-3 h-3 text-slate-400" />
          Groups:
        </span>
        {groups.map((group) => {
          const isActive = group.id === selectedGroupId;
          const count = activeCountByGroup[group.id] || 0;
          const isFull = count >= 75;

          return (
            <div
              key={group.id}
              className={`shrink-0 flex items-center rounded-xl transition ${
                isActive
                  ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 text-slate-400'
              }`}
            >
              <button
                onClick={() => setSelectedGroupId(group.id)}
                className="px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-2"
              >
                <span>{group.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isFull
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                      : count > 50
                      ? 'bg-amber-950/80 text-amber-300'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {count}/75
                </span>
              </button>

              {/* Admin delete group button (cannot delete group-1) */}
              {isAdmin && group.id !== 'group-1' && (
                <button
                  onClick={() => setGroupToDelete(group)}
                  className="px-1.5 py-1 text-slate-500 hover:text-rose-400 transition"
                  title="Admin: Delete Group"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Subtle divider */}
        <div className="h-4 w-px bg-slate-800 shrink-0 mx-1 hidden xs:block" />

        {/* Dedicated PRIVATE CHAT Button beside Group 1 Selector */}
        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              onOpenAuth();
              return;
            }
            setShowPrivateInbox(true);
          }}
          className="shrink-0 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/25 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 font-bold text-xs flex items-center gap-2 transition shadow-sm active:scale-95 cursor-pointer group"
          title="Open WhatsApp-Style Private Chats Inbox"
        >
          <div className="relative">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            {privateInboxUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <span className="font-mono tracking-wider uppercase text-[11px] font-black">
            PRIVATE CHAT
          </span>
          {privateInboxUnread > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40 animate-pulse">
              {formatUnreadBadge(privateInboxUnread)}
            </span>
          )}
        </button>
      </div>

      {/* Pinned Message Sticky Banner (Strict 30-Minute Expiration) */}
      {activePinnedMessage && (
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-b border-amber-500/40 flex items-center justify-between gap-3 text-xs z-10 animate-fadeIn">
          <div 
            onClick={() => handleScrollToMessage(activePinnedMessage.messageId)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Pin className="w-3.5 h-3.5 animate-bounce" />
            </div>
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="font-bold text-amber-300 font-mono text-[11px] shrink-0">
                PINNED (@{activePinnedMessage.senderUsername}):
              </span>
              <span className="text-slate-200 truncate text-[11px]">
                {activePinnedMessage.text}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.max(1, Math.ceil((activePinnedMessage.expiresAt - currentTime) / 60000))}m left
            </span>
            {(isAdmin || isOfficer) && (
              <button
                onClick={handleUnpinFromBanner}
                className="text-[10px] text-slate-400 hover:text-rose-400 font-mono transition flex items-center gap-1 px-1.5 py-0.5"
                title="Unpin message"
              >
                <PinOff className="w-3 h-3" />
                <span>Unpin</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Spam rate limit error notification */}
      {spamError && (
        <div className="shrink-0 px-4 py-2 bg-amber-950/80 border-b border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 z-10">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="flex-1">{spamError}</span>
          <button onClick={() => setSpamError(null)} className="text-amber-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Feed Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-3.5 overscroll-contain"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="text-xs font-mono">Connecting to {activeGroup.name} stream...</p>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
            <MessageSquare className="w-12 h-12 text-slate-800 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No messages in {activeGroup.name} yet.</p>
            <p className="text-xs text-slate-500 mt-1">Be the first to post a trade offer!</p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = currentUser?.uid === msg.senderUid;
            const isHighlighted = highlightedMessageId === msg.id;

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex gap-3 group items-start transition-all duration-300 ${
                  isMe ? 'flex-row-reverse' : ''
                } ${isHighlighted ? 'p-2 rounded-2xl bg-emerald-500/10 ring-2 ring-emerald-500/40' : ''}`}
              >
                <CircularProfileAvatar
                  src={msg.senderAvatar}
                  alt={msg.senderUsername}
                  role={msg.senderRole}
                  membership={msg.senderMembership}
                  membershipLevel={msg.senderMembershipLevel || msg.senderMembership?.level}
                  isAdmin={msg.senderRole === 'admin'}
                  size="sm"
                  className="mt-1"
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
                    {(msg.senderMembershipLevel || msg.senderMembership?.level) && (
                      <MembershipBadge level={msg.senderMembershipLevel || msg.senderMembership?.level} size="xs" />
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTimeAgo(msg.timestamp)}
                    </span>
                  </div>

                  {/* Replied Message Quote Preview inside bubble */}
                  {msg.replyTo && (
                    <div 
                      onClick={() => handleScrollToMessage(msg.replyTo!.messageId)}
                      className={`mb-1.5 flex items-center gap-1.5 text-[11px] bg-slate-900/90 border border-slate-700/60 rounded-xl px-2.5 py-1 text-slate-300 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer transition max-w-full ${
                        isMe ? 'ml-auto' : ''
                      }`}
                      title="Click to view original message"
                    >
                      <CornerDownRight className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="font-bold text-emerald-300 shrink-0">@{msg.replyTo.senderUsername}:</span>
                      <span className="truncate text-slate-400">{msg.replyTo.textSnippet}</span>
                    </div>
                  )}

                  {/* Message Bubble with Official Tier Frame */}
                  <MessageTextFrame
                    role={msg.senderRole}
                    membershipLevel={msg.senderMembershipLevel || msg.senderMembership?.level}
                    isOwnerAdmin={msg.senderRole === 'admin'}
                    isMe={isMe}
                    text={msg.text}
                  />

                  {/* Message Actions Row (Reply / Pin / Report / Mute / Block / Delete) */}
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3 mt-1 text-[10px] text-slate-500 ${isMe ? 'justify-end' : ''}`}>
                    {/* Reply button */}
                    <button
                      onClick={() => {
                        setReplyingTo(msg);
                      }}
                      className="hover:text-emerald-400 flex items-center gap-1 transition"
                      title="Reply to message"
                    >
                      <CornerDownRight className="w-3 h-3" /> Reply
                    </button>

                    {/* Pin button (Admin / Staff with 30-min expiration) */}
                    {(isAdmin || isOfficer) && (
                      <button
                        onClick={() => handleTogglePinMessage(msg)}
                        className="hover:text-amber-400 flex items-center gap-1 transition font-bold"
                        title="Pin message (30 min auto-expiry)"
                      >
                        <Pin className="w-3 h-3 text-amber-400" />
                        {activeGroup?.pinnedMessage?.messageId === msg.id ? 'Unpin' : 'Pin'}
                      </button>
                    )}

                    {!isMe && (
                      <>
                        <button
                          onClick={() => {
                            if (!currentUser) {
                              onOpenAuth();
                              return;
                            }
                            const convId = getConversationId(currentUser.uid, msg.senderUid);
                            onOpenPrivateChat?.(convId, {
                              uid: msg.senderUid,
                              username: msg.senderUsername,
                              name: msg.senderName || msg.senderUsername,
                              avatarUrl: msg.senderAvatar,
                              profilePhoto: msg.senderAvatar,
                              role: msg.senderRole,
                              membership: msg.senderMembership
                            });
                          }}
                          className="hover:text-emerald-300 text-emerald-400/90 flex items-center gap-1 transition font-medium"
                          title={`Send Private Message to ${msg.senderUsername}`}
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-400" /> Chat
                        </button>
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

                    {/* Admin Delete Message */}
                    {(isAdmin || isOfficer || canDeleteChats) && (
                      <button
                        onClick={() => setMessageToDelete(msg)}
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
        {/* Reply Preview Above Input */}
        {replyingTo && (
          <div className="mb-2 p-2 px-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <CornerDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-300 font-mono text-[11px] shrink-0">
                Replying to @{replyingTo.senderUsername}:
              </span>
              <span className="text-slate-300 truncate text-[11px]">
                "{replyingTo.text}"
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
                    : replyingTo
                    ? `Replying to @${replyingTo.senderUsername}...`
                    : `Type in ${activeGroup.name}... (e.g. 'Buying Hyperion 1.4B')`
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

      {/* ADMIN CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white font-mono uppercase tracking-wide">
                  Create World Chat Group
                </h3>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Groups support up to 75 active users. Active users are counted in real-time. Offline users do not count toward this limit.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={`Group ${groups.length + 1}`}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Max Active Users:</span>
                  <span className="font-bold text-white font-mono">75</span>
                </div>
                <div className="flex justify-between">
                  <span>Message Lifetime:</span>
                  <span className="font-bold text-emerald-400 font-mono">30 minutes</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || isCreatingGroup}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingGroup ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Create Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN DELETE GROUP CONFIRMATION MODAL */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-black font-mono uppercase tracking-wide">
                Delete World Chat Group
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete <span className="font-bold text-white font-mono">"{groupToDelete.name}"</span>?
            </p>

            <p className="text-[11px] text-slate-400">
              Only empty groups with 0 active users can be deleted. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                disabled={isDeletingGroup}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingGroup ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Group</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DELETE MESSAGE CONFIRMATION MODAL (Replaces window.confirm which fails in iframes) */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-black font-mono uppercase tracking-wide">
                Delete Chat Message
              </h3>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">@{messageToDelete.senderUsername}</span>
                <RoleBadge role={messageToDelete.senderRole} size="xs" />
              </div>
              <p className="text-xs text-slate-300 italic">"{messageToDelete.text}"</p>
            </div>

            <p className="text-xs text-slate-400">
              This message will be removed immediately from World Chat for all players and logged in the moderation audit history.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMessage}
                disabled={isDeletingMessage}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingMessage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Message</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gang Chat Modal */}
      {userGang && gangChatModalOpen && (
        <GangChatModal
          gang={userGang}
          isOpen={gangChatModalOpen}
          onClose={() => setGangChatModalOpen(false)}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Available Gangs & Join Modal */}
      {joinGangModalOpen && (
        <AvailableGangsModal
          gangs={gangs}
          isOpen={joinGangModalOpen}
          onClose={() => setJoinGangModalOpen(false)}
          onOpenAuth={onOpenAuth}
          onOpenPrivateChat={onOpenPrivateChat}
        />
      )}
    </div>
  );
};
