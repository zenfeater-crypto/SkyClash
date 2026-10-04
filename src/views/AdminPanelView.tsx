import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Shield, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Search,
  MessageSquare,
  Users,
  Flag,
  RotateCcw,
  Ban,
  VolumeX,
  Volume2,
  Clock,
  UserCheck,
  UserX,
  History,
  CheckCircle2,
  Loader2,
  Crown,
  Eye,
  Sliders,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Key,
  Check
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  getDoc,
  where,
  addDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { 
  SkyblockItem, 
  ItemCategory, 
  ItemRarity, 
  DemandLevel, 
  UserProfile, 
  UserRole, 
  ReportItem, 
  ValueAuditLog,
  ModerationHistoryItem,
  ModerationActionType,
  JMDPermissions,
  PermissionAuditLog,
  UserMembership,
  MembershipLevel,
  MembershipTitle,
  MembershipAuditLog
} from '../types';
import { formatCoins, formatTimeAgo, formatJoinedDate } from '../lib/formatters';
import { RoleBadge } from '../components/RoleBadge';
import { MembershipBadge } from '../components/MembershipBadge';
import { CircularProfileAvatar } from '../components/CircularProfileAvatar';
import { UserDisplay } from '../components/UserDisplay';
import { formatRemainingTime, isUserBanned, isUserMuted, getDetailedBanStatus } from '../lib/moderation';
import { sanitizeForFirestore, stripSpoofedRoleTags } from '../lib/validation';
import { BackButton } from '../components/BackButton';

interface AdminPanelViewProps {
  onBack?: () => void;
}

const CATEGORIES: ItemCategory[] = [
  'Sword',
  'Armour',
  'Accessories / Items',
];

const RARITIES: ItemRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'MYTHIC',
  'DIVINE',
  'SPECIAL',
];

const DEMANDS: DemandLevel[] = ['VERY LOW', 'LOW', 'MEDIUM', 'HIGH', 'EXTREME'];

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onBack }) => {
  const { currentUser, userProfile, isAdmin, isOfficer, isJMD, canChangeValues, canBanUnban, canDeleteChats, canChooseTrusted } = useAuth();
  const { items, addItem, updateItem, deleteItem, seedInitialDatabase } = useItems();

  // Admin tabs vs Officer vs JMD tabs
  type AdminTab = 'dashboard' | 'jmd_permissions' | 'memberships' | 'users' | 'reports' | 'moderation' | 'roles' | 'values' | 'history';
  const [activeTab, setActiveTab] = useState<AdminTab>(
    isAdmin 
      ? 'dashboard' 
      : isJMD 
      ? (canChangeValues ? 'values' : (canBanUnban || canChooseTrusted) ? 'users' : 'values')
      : 'values'
  );

  // Membership & Badges State (Exclusive to Owner Admin)
  const [membershipSearchTerm, setMembershipSearchTerm] = useState('');
  const [membershipUsersList, setMembershipUsersList] = useState<UserProfile[]>([]);
  const [searchingMembershipUsers, setSearchingMembershipUsers] = useState(false);
  const [membershipAuditLogs, setMembershipAuditLogs] = useState<MembershipAuditLog[]>([]);
  const [membershipModal, setMembershipModal] = useState<{
    isOpen: boolean;
    user: UserProfile | null;
    targetLevel: MembershipLevel | null;
    action: 'grant_premium_lite' | 'grant_premium' | 'grant_vip' | 'remove_membership' | 'change_membership';
  }>({
    isOpen: false,
    user: null,
    targetLevel: null,
    action: 'grant_premium_lite',
  });
  const [savingMembership, setSavingMembership] = useState(false);

  // JMD Permissions State (Owner Admin only)
  const [jmdSearchTerm, setJmdSearchTerm] = useState('');
  const [selectedJmdUser, setSelectedJmdUser] = useState<UserProfile | null>(null);
  const [jmdPermissions, setJmdPermissions] = useState<JMDPermissions>({
    changeValues: false,
    banUnban: false,
    deleteChats: false,
    chooseTrusted: false,
  });
  const [savingJmdPermissions, setSavingJmdPermissions] = useState(false);
  const [jmdConfirmModalOpen, setJmdConfirmModalOpen] = useState(false);
  const [permissionAuditLogs, setPermissionAuditLogs] = useState<PermissionAuditLog[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<SkyblockItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User Management State
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState<UserProfile | null>(null);

  // Reports State
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsFilter, setReportsFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>('all');

  // Value Audit Logs State
  const [auditLogs, setAuditLogs] = useState<ValueAuditLog[]>([]);

  // Moderation History State
  const [moderationHistory, setModerationHistory] = useState<ModerationHistoryItem[]>([]);

  // Confirmation Action Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'ban' | 'unban' | 'mute' | 'unmute' | 'promote_officer' | 'remove_officer' | 'promote_trusted' | 'remove_trusted';
    user: UserProfile | null;
    banType?: 'temporary' | 'permanent';
    banDurationHours?: number;
    banReason?: string;
    muteType?: 'temporary' | 'permanent';
    muteDurationMins?: number;
    muteReason?: string;
  }>({
    isOpen: false,
    type: 'ban',
    user: null,
    banType: 'temporary',
    banDurationHours: 24,
    banReason: 'Violation of trading rules',
    muteType: 'temporary',
    muteDurationMins: 60,
    muteReason: 'Spamming in public chat',
  });

  // Item Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Sword' as ItemCategory,
    value: 1000000,
    demand: 'HIGH' as DemandLevel,
    rarity: 'LEGENDARY' as ItemRarity,
    image: '',
    description: '',
    tags: '',
  });

  // Record action to moderationHistory collection
  const logModerationAction = async (
    action: ModerationActionType | string,
    targetUid: string,
    targetUsername: string,
    reason?: string,
    previousRole?: UserRole,
    newRole?: UserRole,
    details?: Record<string, any>
  ) => {
    if (!userProfile) return;
    try {
      const historyCol = collection(db, 'moderationHistory');
      const entry = sanitizeForFirestore({
        action,
        targetUid,
        targetUsername,
        performedByUid: userProfile.uid,
        performedByUsername: userProfile.username,
        performedByRole: userProfile.role,
        adminUid: userProfile.uid,
        ...(userProfile.role === 'jmd' ? { jmdUid: userProfile.uid, jmdUsername: userProfile.username } : {}),
        timestamp: Date.now(),
        reason: reason || '',
        previousBanStatus: details?.previousBanStatus || '',
        newBanStatus: details?.newBanStatus || '',
        ...(previousRole ? { previousRole, oldRole: previousRole } : {}),
        ...(newRole ? { newRole } : {}),
        ...(details ? { details } : {}),
      });
      await addDoc(historyCol, entry);
    } catch (err) {
      console.warn('Could not record moderation log to Firestore:', err);
    }
  };

  // Load Reports Realtime (Role-Based: Strictly Officer & Trusted reports only)
  useEffect(() => {
    if (!isAdmin && !isOfficer) return;

    // Server-side query filter: only retrieve reports filed by verified Officers or Trusted users
    const reportsQ = query(
      collection(db, 'reports'),
      where('reporterRole', 'in', ['officer', 'trusted']),
      limit(100)
    );

    const unsubscribe = onSnapshot(reportsQ, (snapshot) => {
      const loaded: ReportItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        // Server-side filter applied, double-check in client memory to prevent any normal-user leakage
        if (data.reporterRole === 'officer' || data.reporterRole === 'trusted') {
          loaded.push({ id: d.id, ...data } as ReportItem);
        }
      });
      // Sort in memory by newest first
      loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setReports(loaded);
    }, (err) => {
      console.warn('Reports listener error:', err);
    });

    return () => unsubscribe();
  }, [isAdmin, isOfficer]);

  // Load Moderation History Realtime
  useEffect(() => {
    if (!isAdmin && !isOfficer) return;

    const historyQ = query(
      collection(db, 'moderationHistory'),
      orderBy('timestamp', 'desc'),
      limit(150)
    );

    const unsubscribe = onSnapshot(historyQ, (snapshot) => {
      const loaded: ModerationHistoryItem[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as ModerationHistoryItem);
      });
      setModerationHistory(loaded);
    }, (err) => {
      console.warn('Moderation history listener error:', err);
    });

    return () => unsubscribe();
  }, [isAdmin, isOfficer]);

  // Load Value Audit Logs Realtime
  useEffect(() => {
    if (!isAdmin && !isOfficer) return;

    const auditQ = query(
      collection(db, 'valueAudit'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(auditQ, (snapshot) => {
      const logs: ValueAuditLog[] = [];
      snapshot.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as ValueAuditLog);
      });
      setAuditLogs(logs);
    }, (err) => {
      console.warn('Audit logs listener error:', err);
    });

    return () => unsubscribe();
  }, [isAdmin, isOfficer]);

  // Load JMD Permission Audit Logs (Owner Admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const permAuditQ = query(
      collection(db, 'permissionAudit'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(permAuditQ, (snapshot) => {
      const loaded: PermissionAuditLog[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as PermissionAuditLog);
      });
      setPermissionAuditLogs(loaded);
    }, (err) => {
      console.warn('Permission audit listener notice:', err);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Load Membership Audit Logs Realtime (Owner Admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const membAuditQ = query(
      collection(db, 'membershipAudit'),
      orderBy('timestamp', 'desc'),
      limit(60)
    );

    const unsubscribe = onSnapshot(membAuditQ, (snapshot) => {
      const loaded: MembershipAuditLog[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as MembershipAuditLog);
      });
      setMembershipAuditLogs(loaded);
    }, (err) => {
      console.warn('Membership audit listener notice:', err);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Search users for Membership & Badges management by Username, Display Name, or Firebase UID
  const handleSearchMembershipUsers = async () => {
    if (!isAdmin || userProfile?.role !== 'admin') return;
    setSearchingMembershipUsers(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(query(usersRef, limit(120)));
      const term = membershipSearchTerm.trim().toLowerCase();
      const results: UserProfile[] = [];
      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (!term) {
          results.push(u);
        } else {
          const matchUid = (u.uid || '').toLowerCase().includes(term);
          const matchUsername = (u.username || '').toLowerCase().includes(term);
          const matchName = (u.name || '').toLowerCase().includes(term);
          if (matchUid || matchUsername || matchName) {
            results.push(u);
          }
        }
      });
      setMembershipUsersList(results);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error searching users for membership.');
    } finally {
      setSearchingMembershipUsers(false);
    }
  };

  // Open Membership confirmation modal
  const handleOpenMembershipModal = (
    user: UserProfile, 
    targetLevel: MembershipLevel | null,
    action: 'grant_premium_lite' | 'grant_premium' | 'grant_vip' | 'remove_membership' | 'change_membership'
  ) => {
    setMembershipModal({
      isOpen: true,
      user,
      targetLevel,
      action,
    });
  };

  // Execute Membership Change with Confirmation & Audit Log
  const handleApplyMembership = async () => {
    if (!isAdmin || userProfile?.role !== 'admin' || !currentUser || !membershipModal.user) {
      setErrorMessage('Access Denied: Only Owner Admin can manage memberships.');
      return;
    }

    setSavingMembership(true);
    const targetUser = membershipModal.user;
    const newLevel = membershipModal.targetLevel;
    const prevLevel = targetUser.membership?.level || null;

    let newTitle: MembershipTitle | null = null;
    if (newLevel === 'premium_lite') newTitle = 'VANGUARD';
    else if (newLevel === 'premium') newTitle = 'OVERLORD';
    else if (newLevel === 'vip') newTitle = 'SUPREME';

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      const membershipData = newLevel ? {
        level: newLevel,
        title: newTitle,
        grantedAt: Date.now(),
        grantedBy: currentUser.uid,
        grantedByUsername: userProfile?.username || 'Strike',
        status: 'active',
      } : null;

      await updateDoc(userRef, {
        membership: membershipData,
      });

      // Immutable Audit Log
      await addDoc(collection(db, 'membershipAudit'), {
        targetUid: targetUser.uid,
        targetUsername: targetUser.username,
        previousMembership: prevLevel,
        newMembership: newLevel,
        action: membershipModal.action,
        adminUid: currentUser.uid,
        adminUsername: userProfile?.username || 'Strike',
        timestamp: Date.now(),
      });

      setStatusMessage(
        newLevel
          ? `Successfully granted ${newTitle} membership to @${targetUser.username}.`
          : `Successfully removed membership from @${targetUser.username}.`
      );

      // Update local item in membershipUsersList for instant feedback
      setMembershipUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, membership: membershipData as any } : u))
      );

      setMembershipModal({ isOpen: false, user: null, targetLevel: null, action: 'grant_premium_lite' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update membership.');
    } finally {
      setSavingMembership(false);
    }
  };

  const handleSelectJmdUser = (user: UserProfile) => {
    setSelectedJmdUser(user);
    setJmdPermissions({
      changeValues: !!user.permissions?.changeValues,
      banUnban: !!user.permissions?.banUnban,
      deleteChats: !!user.permissions?.deleteChats,
      chooseTrusted: !!user.permissions?.chooseTrusted,
    });
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleSaveJmdPermissions = async () => {
    if (!isAdmin || userProfile?.role !== 'admin') {
      setErrorMessage('Access Denied: Only the protected Owner Admin can modify JMD permissions.');
      return;
    }
    if (!selectedJmdUser) return;
    if (selectedJmdUser.role === 'admin') {
      setErrorMessage('Action Prohibited: Owner Admin permissions cannot be modified.');
      return;
    }

    setSavingJmdPermissions(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const userRef = doc(db, 'users', selectedJmdUser.uid);
      const prevPerms: JMDPermissions = {
        changeValues: !!selectedJmdUser.permissions?.changeValues,
        banUnban: !!selectedJmdUser.permissions?.banUnban,
        deleteChats: !!selectedJmdUser.permissions?.deleteChats,
        chooseTrusted: !!selectedJmdUser.permissions?.chooseTrusted,
      };

      const newPerms: JMDPermissions = {
        changeValues: !!jmdPermissions.changeValues,
        banUnban: !!jmdPermissions.banUnban,
        deleteChats: !!jmdPermissions.deleteChats,
        chooseTrusted: !!jmdPermissions.chooseTrusted,
      };

      // Assign 'jmd' role if giving custom permissions and target is not officer
      const targetRole = selectedJmdUser.role === 'officer' ? 'officer' : 'jmd';

      await updateDoc(userRef, {
        permissions: newPerms,
        role: targetRole,
      });

      // Write immutable audit log
      const auditEntry: Omit<PermissionAuditLog, 'id'> = {
        adminUid: userProfile.uid,
        adminUsername: userProfile.username,
        jmdUid: selectedJmdUser.uid,
        jmdUsername: selectedJmdUser.username,
        permissionChanged: 'all',
        oldState: prevPerms,
        newState: newPerms,
        timestamp: Date.now(),
      };

      await addDoc(collection(db, 'permissionAudit'), sanitizeForFirestore(auditEntry));

      const updatedUser: UserProfile = {
        ...selectedJmdUser,
        role: targetRole,
        permissions: newPerms,
      };
      setSelectedJmdUser(updatedUser);
      setUsersList((prev) => prev.map((u) => (u.uid === updatedUser.uid ? updatedUser : u)));

      setStatusMessage('JMD permissions updated');
      setJmdConfirmModalOpen(false);
    } catch (err: any) {
      console.error('Failed to update JMD permissions:', err);
      setErrorMessage(err.message || 'Failed to save JMD permissions.');
    } finally {
      setSavingJmdPermissions(false);
    }
  };

  // Search users in Firestore (by username, display name, or Firebase UID)
  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchingUsers(true);
    setErrorMessage(null);

    try {
      const term = userSearchTerm.trim();
      const lowerTerm = term.toLowerCase();
      const usersRef = collection(db, 'users');

      // Fetch directory sample
      const querySnap = await getDocs(query(usersRef, limit(100)));
      const results: UserProfile[] = [];
      querySnap.forEach((docSnap) => {
        const u = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
        results.push(u);
      });

      if (term) {
        // Direct UID lookup if user searched for an exact UID not in the sample
        try {
          const directDoc = await getDoc(doc(db, 'users', term));
          if (directDoc.exists() && !results.some((r) => r.uid === directDoc.id)) {
            results.unshift({ uid: directDoc.id, ...directDoc.data() } as UserProfile);
          }
        } catch {
          // ignore lookup error
        }

        const filtered = results.filter(
          (u) =>
            u.uid.toLowerCase().includes(lowerTerm) ||
            u.normalizedUsername?.toLowerCase().includes(lowerTerm) ||
            u.username?.toLowerCase().includes(lowerTerm) ||
            u.name?.toLowerCase().includes(lowerTerm)
        );
        setUsersList(filtered);
      } else {
        setUsersList(results);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to search users.');
    } finally {
      setSearchingUsers(false);
    }
  };

  // Initial load of users for user management & roles tab & jmd permissions
  useEffect(() => {
    if ((activeTab === 'users' || activeTab === 'roles' || activeTab === 'dashboard' || activeTab === 'jmd_permissions') && usersList.length === 0) {
      handleSearchUsers();
    }
  }, [activeTab]);

  if (!isAdmin && !isOfficer && !isJMD) {
    return (
      <div className="py-20 text-center max-w-md mx-auto p-6 bg-slate-900 border border-rose-500/40 rounded-3xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Staff Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Your account is currently assigned the role <span className="font-mono text-cyan-300">"{userProfile?.role || 'user'}"</span>.
          Staff & moderation management requires verified Admin or Officer credentials.
        </p>
        <div className="p-3 bg-slate-950 rounded-xl text-left border border-slate-800 text-[11px] text-slate-300 font-mono space-y-1">
          <div className="text-amber-400 font-bold">Role Verification (Server-Side):</div>
          <div>Admin: App Owner / Full System Permissions</div>
          <div>Officer: Value Manager & Moderation Staff</div>
          <div>Trusted: Community Verified Reporter</div>
        </div>
      </div>
    );
  }

  // Handle Item Edit
  const handleOpenEdit = (item: SkyblockItem) => {
    setEditingItem(item);
    setIsCreating(false);
    setFormData({
      name: item.name,
      category: item.category,
      value: item.value,
      demand: item.demand || 'HIGH',
      rarity: item.rarity || 'LEGENDARY',
      image: item.image,
      description: item.description,
      tags: item.tags ? item.tags.join(', ') : '',
    });
  };

  const handleOpenCreate = () => {
    if (!isAdmin) {
      setErrorMessage('Only Admins can create new catalog items. Officers may edit existing values & demand.');
      return;
    }
    setEditingItem(null);
    setIsCreating(true);
    setFormData({
      name: '',
      category: 'Sword',
      value: 10000000,
      demand: 'HIGH',
      rarity: 'LEGENDARY',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      description: '',
      tags: '',
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    const parsedTags = formData.tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (isCreating) {
        if (!isAdmin) throw new Error('Permission denied: Only Admin can create items.');
        await addItem({
          name: formData.name.trim(),
          normalizedName: formData.name.trim().toLowerCase(),
          category: formData.category,
          status: 'Stable',
          value: Number(formData.value) || 0,
          demand: formData.demand,
          rarity: formData.rarity,
          image: formData.image.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
          description: formData.description.trim(),
          tags: parsedTags,
        });
        setStatusMessage(`Item "${formData.name}" added successfully.`);
      } else if (editingItem) {
        await updateItem(
          editingItem.id, 
          {
            name: isAdmin ? formData.name.trim() : editingItem.name,
            category: isAdmin ? formData.category : editingItem.category,
            value: Number(formData.value) || 0,
            demand: formData.demand,
            rarity: isAdmin ? formData.rarity : editingItem.rarity,
            image: isAdmin ? formData.image.trim() : editingItem.image,
            description: isAdmin ? formData.description.trim() : editingItem.description,
            tags: isAdmin ? parsedTags : editingItem.tags,
          },
          userProfile ? {
            uid: userProfile.uid,
            username: userProfile.username,
            role: userProfile.role as 'admin' | 'officer',
          } : undefined
        );

        // Also record to moderation history
        await logModerationAction(
          'VALUE_CHANGED',
          editingItem.id,
          editingItem.name,
          `Adjusted value from ${formatCoins(editingItem.value)} to ${formatCoins(formData.value)} (Demand: ${formData.demand})`,
          undefined,
          undefined,
          { oldValue: editingItem.value, newValue: formData.value, oldDemand: editingItem.demand, newDemand: formData.demand }
        );

        setStatusMessage(`Item "${formData.name}" updated. Value audit log saved.`);
      }
      setEditingItem(null);
      setIsCreating(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed.');
    }
  };

  const handleDeleteItem = async (item: SkyblockItem) => {
    if (!isAdmin) {
      setErrorMessage('Permission denied: Only Admins can delete catalog items.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${item.name}" from the database?`)) return;
    try {
      await deleteItem(item.id);
      setStatusMessage(`Item "${item.name}" deleted.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not delete item.');
    }
  };

  // Execute confirmed moderation action
  const handleExecuteAction = async () => {
    const targetUser = confirmModal.user;
    if (!targetUser) return;
    setStatusMessage(null);
    setErrorMessage(null);

    // Safeguard: The Admin account cannot be modified by anyone
    if (targetUser.role === 'admin') {
      setErrorMessage('Safety Violation: The Owner Admin account is permanent and cannot be modified or suspended.');
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      const prevRole = targetUser.role || 'user';

      switch (confirmModal.type) {
        case 'promote_officer': {
          if (!isAdmin) throw new Error('Only Admin can appoint Officers.');
          await updateDoc(userRef, { role: 'officer' });
          await logModerationAction('ROLE_CHANGED', targetUser.uid, targetUser.username, 'Promoted user to Staff Officer', prevRole, 'officer');
          setStatusMessage(`@${targetUser.username} has been promoted to Officer.`);
          break;
        }
        case 'remove_officer': {
          if (!isAdmin) throw new Error('Only Admin can remove Officers.');
          await updateDoc(userRef, { role: 'user' });
          await logModerationAction('ROLE_CHANGED', targetUser.uid, targetUser.username, 'Removed Officer privileges', prevRole, 'user');
          setStatusMessage(`Officer status removed for @${targetUser.username}.`);
          break;
        }
        case 'promote_trusted': {
          const canTrusted = isAdmin || (userProfile?.role === 'jmd' && !!userProfile?.permissions?.chooseTrusted);
          if (!canTrusted) throw new Error('Access Denied: You do not have permission to appoint Trusted users.');
          if (userProfile?.role === 'jmd') {
            if (targetUser.uid === userProfile.uid) {
              throw new Error('Action Prohibited: You cannot grant Trusted status to yourself.');
            }
            if (targetUser.role === 'officer' || targetUser.role === 'jmd') {
              throw new Error('Action Prohibited: JMD cannot modify staff roles.');
            }
          }
          await updateDoc(userRef, { role: 'trusted' });
          await logModerationAction('ROLE_CHANGED', targetUser.uid, targetUser.username, 'Promoted user to Trusted Member', prevRole, 'trusted');
          setStatusMessage(`@${targetUser.username} has been granted Trusted status.`);
          break;
        }
        case 'remove_trusted': {
          const canTrusted = isAdmin || (userProfile?.role === 'jmd' && !!userProfile?.permissions?.chooseTrusted);
          if (!canTrusted) throw new Error('Access Denied: You do not have permission to remove Trusted status.');
          if (userProfile?.role === 'jmd') {
            if (targetUser.uid === userProfile.uid) {
              throw new Error('Action Prohibited: You cannot demote yourself.');
            }
            if (targetUser.role === 'officer' || targetUser.role === 'jmd') {
              throw new Error('Action Prohibited: JMD cannot modify staff roles.');
            }
          }
          await updateDoc(userRef, { role: 'user' });
          await logModerationAction('ROLE_CHANGED', targetUser.uid, targetUser.username, 'Removed Trusted status', prevRole, 'user');
          setStatusMessage(`Trusted status removed for @${targetUser.username}.`);
          break;
        }
        case 'ban': {
          const canBan = isAdmin || (userProfile?.role === 'jmd' && !!userProfile?.permissions?.banUnban);
          if (!canBan) {
            throw new Error('Access Denied: You do not have permission to ban users.');
          }
          if (userProfile?.role === 'jmd') {
            if (targetUser.uid === userProfile.uid) {
              throw new Error('Action Prohibited: You cannot ban yourself.');
            }
            if (targetUser.role === 'officer') {
              throw new Error('Action Prohibited: JMD cannot ban administrators or officers.');
            }
          }

          const isTemp = confirmModal.banType === 'temporary';
          const now = Date.now();
          const durationHours = confirmModal.banDurationHours || 24;
          const bannedUntil = isTemp
            ? now + durationHours * 60 * 60 * 1000
            : null;

          const banReason = confirmModal.banReason?.trim() || (isTemp ? `Temporary ban (${durationHours} hours)` : `Permanent ban by ${userProfile?.username}`);
          const prevStatus = getDetailedBanStatus(targetUser).statusLabel;
          const newStatus = isTemp ? 'ACTIVE TEMPORARY BAN' : 'ACTIVE PERMANENT BAN';

          await updateDoc(userRef, {
            banned: true,
            isBanned: true,
            banType: confirmModal.banType,
            bannedUntil,
            banReason,
            bannedBy: userProfile?.uid,
            bannedAt: now,
          });

          await logModerationAction(
            isTemp ? 'USER_TEMP_BANNED' : 'USER_BANNED',
            targetUser.uid,
            targetUser.username,
            banReason,
            undefined,
            undefined,
            {
              banType: confirmModal.banType,
              bannedUntil,
              bannedAt: now,
              adminUid: userProfile?.uid,
              previousBanStatus: prevStatus,
              newBanStatus: newStatus,
            }
          );

          if (profileModalUser && profileModalUser.uid === targetUser.uid) {
            setProfileModalUser({
              ...profileModalUser,
              banned: true,
              isBanned: true,
              banType: confirmModal.banType,
              bannedUntil,
              banReason,
              bannedBy: userProfile?.uid,
              bannedAt: now,
            });
          }

          setStatusMessage(`@${targetUser.username} has been placed under ${newStatus}.`);
          break;
        }
        case 'unban': {
          const canUnban = isAdmin || (userProfile?.role === 'jmd' && !!userProfile?.permissions?.banUnban);
          if (!canUnban) {
            throw new Error('Access Denied: You do not have permission to unban users.');
          }
          if ((targetUser.role as string) === 'admin') {
            throw new Error('Action Prohibited: The Owner Admin cannot be modified.');
          }

          const prevBanInfo = getDetailedBanStatus(targetUser);
          const wasTemp = targetUser.banType === 'temporary';
          const unbanReason = confirmModal.banReason?.trim() || `Suspension lifted by ${userProfile?.username}`;

          await updateDoc(userRef, {
            banned: false,
            isBanned: false,
            banType: null,
            bannedUntil: null,
            banReason: null,
            bannedAt: null,
          });

          await logModerationAction(
            wasTemp ? 'USER_TEMP_UNBANNED' : 'USER_UNBANNED',
            targetUser.uid,
            targetUser.username,
            unbanReason,
            undefined,
            undefined,
            {
              adminUid: userProfile?.uid,
              unbannedAt: Date.now(),
              previousBanStatus: prevBanInfo.statusLabel,
              newBanStatus: 'ACTIVE',
            }
          );

          if (profileModalUser && profileModalUser.uid === targetUser.uid) {
            setProfileModalUser({
              ...profileModalUser,
              banned: false,
              isBanned: false,
              banType: undefined,
              bannedUntil: null,
              banReason: undefined,
              bannedAt: undefined,
            });
          }

          setStatusMessage(`@${targetUser.username} has been unbanned. Normal account access is restored.`);
          break;
        }
        case 'mute': {
          const isTemp = confirmModal.muteType === 'temporary';
          const mutedUntil = isTemp
            ? Date.now() + (confirmModal.muteDurationMins || 60) * 60 * 1000
            : null;

          await updateDoc(userRef, {
            muted: true,
            isMuted: true,
            muteType: confirmModal.muteType,
            mutedUntil,
            mutedBy: userProfile?.username || 'staff',
            muteReason: confirmModal.muteReason || 'Muted by staff',
          });

          await logModerationAction(
            'USER_MUTED',
            targetUser.uid,
            targetUser.username,
            confirmModal.muteReason || `Muted (${confirmModal.muteDurationMins}m)`,
            undefined,
            undefined,
            { muteType: confirmModal.muteType, mutedUntil }
          );

          setStatusMessage(`@${targetUser.username} has been muted.`);
          break;
        }
        case 'unmute': {
          await updateDoc(userRef, {
            muted: false,
            isMuted: false,
            muteType: null,
            mutedUntil: null,
            muteReason: null,
          });

          await logModerationAction('USER_UNMUTED', targetUser.uid, targetUser.username, 'Mute lifted by staff');
          setStatusMessage(`@${targetUser.username} has been unmuted.`);
          break;
        }
      }

      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      handleSearchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Action failed.');
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Handle report status changes
  const handleUpdateReportStatus = async (reportId: string, status: 'reviewed' | 'resolved' | 'dismissed', actionTaken?: string) => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        status,
        actionTaken: actionTaken || status,
        reviewedByUid: userProfile?.uid,
        reviewedByUsername: userProfile?.username,
        reviewedAt: Date.now(),
      });
      setStatusMessage(`Report marked as ${status}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update report.');
    }
  };

  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const filteredReports = reports.filter((r) => {
    // Only reports submitted by verified Officer or Trusted users reach Admin
    if (r.reporterRole !== 'officer' && r.reporterRole !== 'trusted') return false;
    if (reportsFilter === 'all') return true;
    return r.status === reportsFilter;
  });

  // Calculate active bans and mutes
  const activeBans = usersList.filter((u) => isUserBanned(u));
  const activeMutes = usersList.filter((u) => isUserMuted(u));
  const officerUsers = usersList.filter((u) => u.role === 'officer');
  const trustedUsers = usersList.filter((u) => u.role === 'trusted');
  const ownerUser = usersList.find((u) => u.role === 'admin') || (isAdmin ? userProfile : null);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {onBack && (
        <div className="mb-2">
          <BackButton onClick={onBack} label="Back" />
        </div>
      )}
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <RoleBadge role={userProfile?.role} size="md" />
            <span className="text-xs text-slate-400 font-mono">
              Hierarchy Tier: {isAdmin ? 'Owner Admin (Tier 1)' : 'Staff Officer (Tier 2)'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase font-mono flex items-center gap-3">
            {isAdmin ? <Crown className="w-7 h-7 text-amber-400" /> : <Shield className="w-7 h-7 text-slate-300" />}
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              {isAdmin ? 'System Admin Control Center' : 'Officer Moderation Portal'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {isAdmin 
              ? 'Complete system authority: permanent Owner Admin management, user moderation, staff appointments, report resolution, and catalog controls.' 
              : 'Authorized staff privileges: manage item values & demand, inspect user reports, and mute disruptive traders.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" /> Add Catalog Item
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('jmd_permissions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'jmd_permissions'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-950/40'
                : 'text-purple-300/80 hover:text-purple-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>JMD Permissions</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => {
              setActiveTab('memberships');
              if (membershipUsersList.length === 0) {
                handleSearchMembershipUsers();
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'memberships'
                ? 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-cyan-500/20 text-white border border-amber-400/60 shadow-lg shadow-purple-950/40 ring-1 ring-amber-400/30'
                : 'text-amber-300/80 hover:text-amber-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Membership & Badges</span>
          </button>
        )}

        {(isAdmin || (userProfile?.role === 'jmd' && (!!userProfile?.permissions?.banUnban || !!userProfile?.permissions?.chooseTrusted))) && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Management</span>
          </button>
        )}

        {(isAdmin || isOfficer) && (
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Reports</span>
            {reports.filter((r) => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px]">
                {reports.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
        )}

        {(isAdmin || isOfficer) && (
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'moderation'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Moderation</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'roles'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Roles</span>
          </button>
        )}

        {(isAdmin || isOfficer || canChangeValues) && (
          <button
            onClick={() => setActiveTab('values')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'values'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Item Values & Demand</span>
            <span className="text-[10px] opacity-75 font-mono">({items.length})</span>
          </button>
        )}

        {(isAdmin || isOfficer || canBanUnban || canDeleteChats || canChooseTrusted) && (
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Moderation History</span>
            <span className="text-[10px] opacity-75 font-mono">({moderationHistory.length})</span>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: DASHBOARD (ADMIN ONLY)                           */}
      {/* ============================================================ */}
      {isAdmin && activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Users</div>
              <div className="text-2xl font-black text-white font-mono mt-1">{usersList.length || '—'}</div>
              <div className="text-[11px] text-emerald-400 mt-1">Registered Profiles</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold uppercase">Staff Officers</div>
              <div className="text-2xl font-black text-slate-200 font-mono mt-1">{officerUsers.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Value Moderators</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold uppercase">Trusted Members</div>
              <div className="text-2xl font-black text-sky-400 font-mono mt-1">{trustedUsers.length}</div>
              <div className="text-[11px] text-sky-400 mt-1">Verified Community</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold uppercase">Pending Reports</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                {reports.filter((r) => r.status === 'pending').length}
              </div>
              <div className="text-[11px] text-amber-400 mt-1">Action Required</div>
            </div>
          </div>

          {/* Owner Identity Showcase */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-yellow-950/40 to-slate-900 border border-amber-500/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
                <Crown className="w-6 h-6 fill-amber-300/30" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base">Strike</span>
                  <RoleBadge role="admin" size="sm" />
                  <span className="text-xs text-amber-400 font-mono font-bold">@Strike</span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Permanent Owner Admin. Role is protected and irrevocable. There is exactly one Admin.
                </div>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
              Protected Root Authority
            </div>
          </div>

          {/* Recent Moderation Activity Preview */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" /> Recent Moderation & Staff Actions
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                View All
              </button>
            </div>

            {moderationHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No moderation actions recorded yet. All staff actions will be logged here in real-time.
              </div>
            ) : (
              <div className="space-y-2">
                {moderationHistory.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-bold text-amber-300 text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-white font-bold">{log.targetUsername}</span>
                      {log.reason && <span className="text-slate-400 truncate max-w-xs">— {log.reason}</span>}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      by @{log.performedByUsername} • {formatTimeAgo(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION: JMD PERMISSIONS (OWNER ADMIN ONLY)                  */}
      {/* ============================================================ */}
      {isAdmin && activeTab === 'jmd_permissions' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/40 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-md shadow-purple-950/40">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white uppercase font-mono tracking-wide">
                    JMD Permissions
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Owner Admin Only
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Dedicated granular authorization control for JMD. Each capability can be enabled or disabled independently in real-time.
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-purple-300 bg-purple-950/80 px-3 py-1.5 rounded-xl border border-purple-500/30">
              Root Authority: Strike (Owner Admin)
            </div>
          </div>

          {/* Search JMD by username, display name, UID */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" /> Search User to Assign or Manage JMD Permissions
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Search by username, display name, or UID</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={jmdSearchTerm}
                  onChange={(e) => setJmdSearchTerm(e.target.value)}
                  placeholder="Search user by username (@username), display name, or exact UID..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchUsers()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shrink-0 cursor-pointer"
              >
                Find User
              </button>
            </div>

            {/* Quick-select: Current JMD or custom permission users */}
            {(() => {
              const jmdAndCustom = usersList.filter(
                (u) => u.role === 'jmd' || (u.permissions && (u.permissions.changeValues || u.permissions.banUnban || u.permissions.deleteChats || u.permissions.chooseTrusted))
              );
              if (jmdAndCustom.length === 0) return null;
              return (
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono uppercase font-semibold mb-2">
                    Designated JMD Users ({jmdAndCustom.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {jmdAndCustom.map((u) => {
                      const isSelected = selectedJmdUser?.uid === u.uid;
                      return (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() => handleSelectJmdUser(u)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition border cursor-pointer ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-md shadow-purple-950/40'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <RoleBadge role="jmd" size="xs" />
                          <span>@{u.username}</span>
                          {u.name && u.name !== u.username && <span className="text-slate-400 text-[10px]">({u.name})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Matching search results if search term active */}
            {jmdSearchTerm.trim().length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono uppercase font-semibold">
                  Matching Users ({usersList.filter((u) => 
                    u.username?.toLowerCase().includes(jmdSearchTerm.toLowerCase()) ||
                    u.normalizedUsername?.toLowerCase().includes(jmdSearchTerm.toLowerCase()) ||
                    u.name?.toLowerCase().includes(jmdSearchTerm.toLowerCase()) ||
                    u.uid.toLowerCase().includes(jmdSearchTerm.toLowerCase())
                  ).length}):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {usersList
                    .filter((u) =>
                      u.username?.toLowerCase().includes(jmdSearchTerm.toLowerCase()) ||
                      u.normalizedUsername?.toLowerCase().includes(jmdSearchTerm.toLowerCase()) ||
                      u.name?.toLowerCase().includes(jmdSearchTerm.toLowerCase()) ||
                      u.uid.toLowerCase().includes(jmdSearchTerm.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((user) => (
                      <div
                        key={user.uid}
                        onClick={() => handleSelectJmdUser(user)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          selectedJmdUser?.uid === user.uid
                            ? 'bg-purple-950/40 border-purple-500 text-white shadow'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={user.profilePhoto || user.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`}
                            alt={user.username}
                            className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 object-cover shrink-0"
                          />
                          <div className="truncate text-xs">
                            <div className="font-bold truncate">{user.name || user.username}</div>
                            <div className="text-[10px] text-purple-400 font-mono">@{user.username}</div>
                          </div>
                        </div>
                        <RoleBadge role={user.role} size="xs" />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Active JMD Permissions Editor for Selected User */}
          {selectedJmdUser ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-purple-500/30 shadow-2xl space-y-6">
              {/* Selected User Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedJmdUser.profilePhoto || selectedJmdUser.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${selectedJmdUser.username}`}
                    alt={selectedJmdUser.username}
                    className="w-12 h-12 rounded-xl bg-slate-800 border-2 border-purple-500/50 object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-white text-base sm:text-lg">
                        JMD: @{selectedJmdUser.username}
                      </span>
                      <RoleBadge role={selectedJmdUser.role} size="sm" />
                      {selectedJmdUser.role !== 'jmd' && selectedJmdUser.role !== 'admin' && (
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40">
                          Will receive JMD role upon save
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Display Name: <span className="text-slate-200 font-semibold">{selectedJmdUser.name || selectedJmdUser.username}</span> • UID: <span className="text-slate-300 font-mono">{selectedJmdUser.uid}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedJmdUser(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {/* 4 Granular Permissions Switches */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Permissions:
                </div>

                {/* 1. Change Values */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${jmdPermissions.changeValues ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">Change Values</div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Edit existing item values, value ranges, demand tiers, and trends across Swords, Armour, Pets, and Accessories.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJmdPermissions((p) => ({ ...p, changeValues: !p.changeValues }))}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase font-mono transition flex items-center gap-1.5 cursor-pointer ${
                      jmdPermissions.changeValues
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {jmdPermissions.changeValues ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* 2. Ban / Unban Users */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${jmdPermissions.banUnban ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">Ban / Unban Users</div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Apply temporary and permanent bans or lift suspensions on standard users. Owner Admin is strictly protected.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJmdPermissions((p) => ({ ...p, banUnban: !p.banUnban }))}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase font-mono transition flex items-center gap-1.5 cursor-pointer ${
                      jmdPermissions.banUnban
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {jmdPermissions.banUnban ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* 3. Delete Chats */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${jmdPermissions.deleteChats ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">Delete Chats</div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Remove inappropriate messages from public World Chat and community Trade Feed. No access to unauthorized private chats.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJmdPermissions((p) => ({ ...p, deleteChats: !p.deleteChats }))}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase font-mono transition flex items-center gap-1.5 cursor-pointer ${
                      jmdPermissions.deleteChats
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {jmdPermissions.deleteChats ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* 4. Choose Trusted Users */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${jmdPermissions.chooseTrusted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">Choose Trusted Users</div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Select users and assign or remove the Trusted role according to the existing Trusted system. Cannot appoint Officers or Admin.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJmdPermissions((p) => ({ ...p, chooseTrusted: !p.chooseTrusted }))}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase font-mono transition flex items-center gap-1.5 cursor-pointer ${
                      jmdPermissions.chooseTrusted
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {jmdPermissions.chooseTrusted ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setJmdConfirmModalOpen(true)}
                  disabled={savingJmdPermissions}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingJmdPermissions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>SAVE PERMISSIONS</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
              <Shield className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No JMD User Selected</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Search for an account above or select an existing JMD member to view and adjust their custom permissions.
              </p>
            </div>
          )}

          {/* Audit Log (Owner Admin Protected) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" /> JMD Permission Audit Log (Owner Admin Only)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {permissionAuditLogs.length} Records Logged
              </span>
            </div>

            {permissionAuditLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No JMD permission changes recorded yet. All modifications by the Owner Admin are logged here permanently.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {permissionAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap font-mono">
                        <span className="text-amber-400 font-bold">@{log.adminUsername}</span>
                        <span className="text-slate-500">updated permissions for</span>
                        <span className="text-purple-400 font-bold">@{log.jmdUsername}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${log.newState.changeValues ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          Values: {log.newState.changeValues ? 'ON' : 'OFF'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${log.newState.banUnban ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          Bans: {log.newState.banUnban ? 'ON' : 'OFF'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${log.newState.deleteChats ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          Chats: {log.newState.deleteChats ? 'ON' : 'OFF'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${log.newState.chooseTrusted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          Trusted: {log.newState.chooseTrusted ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {formatTimeAgo(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 1.5: MEMBERSHIP & BADGES (OWNER ADMIN ONLY)           */}
      {/* ============================================================ */}
      {isAdmin && activeTab === 'memberships' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-900 border border-amber-500/30 shadow-xl">
            <div>
              <h2 className="text-lg font-black text-white uppercase font-mono flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>Membership & Badges Management</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Assign and manage exclusive membership tiers: <strong className="text-amber-400">VANGUARD (Premium Lite)</strong>, <strong className="text-cyan-300">OVERLORD (Premium)</strong>, and <strong className="text-purple-300">SUPREME (VIP Members)</strong>. Changes apply immediately in real-time.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchMembershipUsers();
              }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Username, Display Name, or UID..."
                  value={membershipSearchTerm}
                  onChange={(e) => setMembershipSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={searchingMembershipUsers}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {searchingMembershipUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Search</span>
              </button>
            </form>
          </div>

          {/* User Membership Directory */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase font-mono">
                Community Directory ({membershipUsersList.length} members loaded)
              </span>
              <button
                type="button"
                onClick={() => {
                  setMembershipSearchTerm('');
                  handleSearchMembershipUsers();
                }}
                className="text-xs text-amber-400 hover:underline font-mono"
              >
                Refresh / Show All
              </button>
            </div>

            {membershipUsersList.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                {searchingMembershipUsers ? 'Loading user registry...' : 'No users found matching your search. Click "Search" or "Refresh / Show All".'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Membership Level</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Granted Date</th>
                      <th className="py-3 px-4">Granted By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {membershipUsersList.map((user) => {
                      const hasActiveMembership = user.membership && user.membership.status === 'active';
                      return (
                        <tr key={user.uid} className="hover:bg-slate-850/50 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <CircularProfileAvatar
                                src={user.profilePhoto || user.avatarUrl}
                                alt={user.username}
                                size="md"
                                role={user.role}
                                membership={user.membership}
                                isAdmin={user.role === 'admin'}
                              />
                              <div>
                                <div className="font-bold text-white text-xs">
                                  {user.name || user.username}
                                </div>
                                <div className="text-[11px] text-amber-400 font-mono">
                                  @{user.username}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  UID: {user.uid}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <RoleBadge role={user.role} size="xs" />
                          </td>

                          <td className="py-3 px-4">
                            {user.membership && user.membership.level ? (
                              <MembershipBadge
                                level={user.membership.level}
                                title={user.membership.title}
                                size="sm"
                              />
                            ) : (
                              <span className="text-slate-500 font-mono text-[11px]">Free / None</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {hasActiveMembership ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                                Active
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] font-mono">Inactive</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {user.membership?.grantedAt ? (
                              <span>
                                {new Date(user.membership.grantedAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {user.membership?.grantedByUsername ? (
                              <span className="text-amber-400">@{user.membership.grantedByUsername}</span>
                            ) : user.membership?.grantedBy ? (
                              <span>{user.membership.grantedBy.slice(0, 8)}...</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Grant Vanguard */}
                              <button
                                type="button"
                                onClick={() => handleOpenMembershipModal(user, 'premium_lite', 'grant_premium_lite')}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 transition cursor-pointer"
                                title="Grant VANGUARD (Premium Lite)"
                              >
                                + VANGUARD
                              </button>

                              {/* Grant Overlord */}
                              <button
                                type="button"
                                onClick={() => handleOpenMembershipModal(user, 'premium', 'grant_premium')}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30 transition cursor-pointer"
                                title="Grant OVERLORD (Premium)"
                              >
                                + OVERLORD
                              </button>

                              {/* Grant Supreme */}
                              <button
                                type="button"
                                onClick={() => handleOpenMembershipModal(user, 'vip', 'grant_vip')}
                                className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30 transition cursor-pointer"
                                title="Grant SUPREME (VIP Members)"
                              >
                                + SUPREME
                              </button>

                              {/* Remove membership */}
                              {hasActiveMembership && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenMembershipModal(user, null, 'remove_membership')}
                                  className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-mono text-[10px] font-bold border border-rose-500/30 transition cursor-pointer"
                                  title="Remove Membership"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Membership Audit Log (Owner Admin Protected) */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" /> Membership Audit Trail (Owner Admin Protected)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {membershipAuditLogs.length} Records Logged
              </span>
            </div>

            {membershipAuditLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No membership changes recorded yet. Every grant, modification, or removal is permanently logged.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {membershipAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold">@{log.targetUsername}</span>
                        <span className="text-slate-500 font-mono text-[11px]">UID: {log.targetUid}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400">Action:</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 uppercase">
                          {log.action}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Previous: <strong className="text-slate-300">{log.previousMembership || 'None'}</strong></span>
                        <span>→</span>
                        <span>New: <strong className="text-amber-400">{log.newMembership || 'None'}</strong></span>
                        <span>•</span>
                        <span>Admin: @{log.adminUsername}</span>
                      </div>
                    </div>

                    <span className="text-slate-500 text-[11px] font-mono shrink-0">
                      {formatTimeAgo(log.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 2: USER MANAGEMENT                                   */}
      {/* ============================================================ */}
      {(isAdmin || (userProfile?.role === 'jmd' && (!!userProfile?.permissions?.banUnban || !!userProfile?.permissions?.chooseTrusted))) && activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>User Directory & Moderation Controls</span>
            </h2>

            <form onSubmit={handleSearchUsers} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={searchingUsers}
                className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition"
              >
                {searchingUsers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        {searchingUsers ? 'Loading registered users...' : 'No users found.'}
                      </td>
                    </tr>
                  ) : (
                    usersList.map((user) => {
                      const banned = isUserBanned(user);
                      const muted = isUserMuted(user);
                      const isOwnerUser = user.role === 'admin';

                      return (
                        <tr key={user.uid} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <CircularProfileAvatar
                                src={user.profilePhoto || user.avatarUrl}
                                alt={user.username}
                                size="sm"
                                role={user.role}
                                membership={user.membership}
                                isAdmin={user.role === 'admin'}
                              />
                              <div>
                                <div className="font-bold text-white">{stripSpoofedRoleTags(user.name || user.username)}</div>
                                <div className="text-[11px] text-amber-400 font-mono">@{user.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <RoleBadge role={user.role} size="sm" />
                              {user.membership?.level && (
                                <MembershipBadge
                                  level={user.membership.level}
                                  title={user.membership.title}
                                  size="xs"
                                />
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px]">
                            {banned ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40">
                                Banned ({user.banType || 'perm'})
                              </span>
                            ) : muted ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40">
                                Muted ({formatRemainingTime(user.mutedUntil)})
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold">Active</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {formatJoinedDate(user.createdAt)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* View Profile */}
                              <button
                                onClick={() => setProfileModalUser(user)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                title="View Full Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {isOwnerUser ? (
                                <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">
                                  Owner Admin (Protected)
                                </span>
                              ) : (
                                <>
                                  {/* Ban / Unban (Admin or JMD with banUnban permission) */}
                                  {(isAdmin || canBanUnban) && (!isJMD || (user.uid !== userProfile?.uid && user.role !== 'admin' && user.role !== 'officer')) && (
                                    banned ? (
                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'unban', user })}
                                        className="py-1 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/40 transition"
                                      >
                                        Unban
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'ban', user, banType: 'temporary', banDurationHours: 24, banReason: 'Violation of trading rules' })}
                                        className="py-1 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold border border-rose-500/40 transition"
                                      >
                                        Ban
                                      </button>
                                    )
                                  )}

                                  {/* Mute / Unmute (Staff Only: Admin + Officer) */}
                                  {(isAdmin || isOfficer) && (
                                    muted ? (
                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'unmute', user })}
                                        className="py-1 px-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] font-bold border border-blue-500/40 transition"
                                      >
                                        Unmute
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'mute', user, muteType: 'temporary', muteDurationMins: 60, muteReason: 'Spamming in public chat' })}
                                        className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition"
                                      >
                                        Mute
                                      </button>
                                    )
                                  )}

                                  {/* Officer Promote / Demote (Protected Owner Admin Only) */}
                                  {isAdmin && (
                                    user.role === 'officer' ? (
                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'remove_officer', user })}
                                        className="py-1 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-500/30 transition"
                                        title="Revoke Officer status"
                                      >
                                        Demote
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'promote_officer', user })}
                                        className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition"
                                        title="Promote to Staff Officer"
                                      >
                                        + Officer
                                      </button>
                                    )
                                  )}

                                  {/* Trusted Promote / Demote (Admin or JMD with chooseTrusted permission) */}
                                  {(isAdmin || canChooseTrusted) && (!isJMD || (user.uid !== userProfile?.uid && user.role !== 'admin' && user.role !== 'officer' && user.role !== 'jmd')) && (
                                    user.role === 'trusted' ? (
                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'remove_trusted', user })}
                                        className="py-1 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-500/30 transition"
                                        title="Revoke Trusted status"
                                      >
                                        - Trusted
                                      </button>
                                    ) : user.role !== 'officer' && user.role !== 'admin' && user.role !== 'jmd' ? (
                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'promote_trusted', user })}
                                        className="py-1 px-2 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-300 text-[10px] font-bold border border-sky-500/30 transition"
                                        title="Promote to Trusted"
                                      >
                                        + Trusted
                                      </button>
                                    ) : null
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 3: REPORTS (ADMIN + OFFICER)                         */}
      {/* ============================================================ */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <span>Community Reports Queue ({filteredReports.length})</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Exclusive moderation queue showing verified reports submitted by <span className="text-amber-400 font-semibold">Officers</span> and <span className="text-sky-400 font-semibold">Trusted</span> users.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setReportsFilter(filter)}
                  className={`px-3 py-1 rounded-lg capitalize transition ${
                    reportsFilter === filter
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-500 text-xs">
                No reports found under the "{reportsFilter}" filter.
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="space-y-1.5">
                      {/* Reported User Information */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px]">Reported Target:</span>
                        <span className="font-bold text-white">@{report.reportedUsername || 'Trader'}</span>
                        <RoleBadge role={report.reportedRole || 'user'} size="xs" />
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-mono text-[11px]">UID: {report.reportedUid}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-mono text-[11px] capitalize">Target: {report.targetType}</span>
                      </div>

                      {/* Reporter Information (Officer / Trusted) */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-slate-400 text-[11px]">Filed by</span>
                        <span className="text-amber-400 font-bold">@{report.reporterUsername}</span>
                        <RoleBadge role={report.reporterRole} size="xs" />
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-mono text-[11px]">UID: {report.reporterUid}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(report.createdAt).toLocaleString()} ({formatTimeAgo(report.createdAt)})
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                        report.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : report.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : report.status === 'dismissed'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400 block mb-1 font-semibold uppercase text-[10px]">Reason</span>
                      <p className="text-slate-200 font-medium">{report.reason}</p>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400 block mb-1 font-semibold uppercase text-[10px]">Evidence / Details</span>
                      <p className="text-slate-300 font-mono text-[11px] break-all">
                        {report.evidence || 'No additional evidence provided.'}
                      </p>
                    </div>
                  </div>

                  {report.reviewedByUsername && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Reviewed by @{report.reviewedByUsername} ({report.actionTaken})
                    </div>
                  )}

                  {/* Staff Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleUpdateReportStatus(report.id, 'reviewed', 'Marked as reviewed')}
                      className="py-1 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleUpdateReportStatus(report.id, 'resolved', 'Infraction resolved')}
                      className="py-1 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateReportStatus(report.id, 'dismissed', 'Dismissed by staff')}
                      className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold border border-slate-700 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 4: MODERATION (ACTIVE BANS & MUTES)                  */}
      {/* ============================================================ */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Bans */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-500" /> Active Suspensions ({activeBans.length})
                </h3>
              </div>

              {activeBans.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No active banned users. All community members are in good standing.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBans.map((u) => (
                    <div key={u.uid} className="p-3.5 rounded-2xl bg-slate-950 border border-rose-900/40 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{u.name || u.username}</span>
                          <span className="text-[11px] text-amber-400 font-mono font-normal">@{u.username}</span>
                        </div>
                        <div className="text-[11px] text-rose-400 font-mono mt-0.5">
                          {u.banType === 'temporary' ? formatRemainingTime(u.bannedUntil) : 'Permanent'}
                          {u.banReason ? ` • "${u.banReason}"` : ''}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => setConfirmModal({ isOpen: true, type: 'unban', user: u })}
                          className="py-1 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition"
                        >
                          Unban
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Mutes */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                  <VolumeX className="w-4 h-4 text-amber-400" /> Active Chat Mutes ({activeMutes.length})
                </h3>
              </div>

              {activeMutes.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No currently muted traders.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMutes.map((u) => (
                    <div key={u.uid} className="p-3.5 rounded-2xl bg-slate-950 border border-amber-900/40 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{u.name || u.username}</span>
                          <span className="text-[11px] text-amber-400 font-mono font-normal">@{u.username}</span>
                        </div>
                        <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                          {formatRemainingTime(u.mutedUntil)}
                          {u.muteReason ? ` • "${u.muteReason}"` : ''}
                        </div>
                      </div>

                      <button
                        onClick={() => setConfirmModal({ isOpen: true, type: 'unmute', user: u })}
                        className="py-1 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold border border-blue-500/40 transition"
                      >
                        Unmute
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 5: ROLES MANAGEMENT (ADMIN ONLY)                     */}
      {/* ============================================================ */}
      {isAdmin && activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Owner Admin Showcase */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                <h3 className="text-base font-extrabold text-white uppercase font-mono">
                  App Owner Admin (Permanent)
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                1 Permanent Seat
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CircularProfileAvatar
                  src={ownerUser?.profilePhoto || ownerUser?.avatarUrl}
                  alt="Strike"
                  size="lg"
                  role="admin"
                  isAdmin={true}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">Strike</span>
                    <RoleBadge role="admin" size="xs" />
                    <span className="text-xs text-amber-400 font-mono">@Strike</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Authenticated Runtime UID: <span className="font-mono text-slate-300">{ownerUser?.uid || userProfile?.uid}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">Irrevocable Root Role</span>
                <div className="text-[10px] text-amber-400/80 font-mono">No "Make Admin" button exists</div>
              </div>
            </div>
          </div>

          {/* Officers Table */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-300 fill-slate-300/20" />
                <h3 className="text-base font-extrabold text-white uppercase font-mono">
                  Staff Officers ({officerUsers.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Value Editors & Chat Moderators</span>
            </div>

            {officerUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active Officers appointed. Promote trusted members from the User Management tab.
              </div>
            ) : (
              <div className="space-y-2.5">
                {officerUsers.map((officer) => (
                  <div key={officer.uid} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={officer.profilePhoto || officer.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${officer.username}`}
                        alt={officer.username}
                        className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{officer.name || officer.username}</span>
                          <RoleBadge role="officer" size="xs" />
                          <span className="text-[11px] text-amber-400 font-mono">@{officer.username}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Joined {formatJoinedDate(officer.createdAt)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setConfirmModal({ isOpen: true, type: 'remove_officer', user: officer })}
                      className="py-1 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 transition"
                    >
                      Remove Officer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trusted Members Table */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400 fill-sky-400/20" />
                <h3 className="text-base font-extrabold text-white uppercase font-mono">
                  Trusted Members ({trustedUsers.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Verified Reporters & Traders</span>
            </div>

            {trustedUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active Trusted members. Promote reputable users from User Management.
              </div>
            ) : (
              <div className="space-y-2.5">
                {trustedUsers.map((trusted) => (
                  <div key={trusted.uid} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={trusted.profilePhoto || trusted.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${trusted.username}`}
                        alt={trusted.username}
                        className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{trusted.name || trusted.username}</span>
                          <RoleBadge role="trusted" size="xs" />
                          <span className="text-[11px] text-amber-400 font-mono">@{trusted.username}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Joined {formatJoinedDate(trusted.createdAt)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setConfirmModal({ isOpen: true, type: 'remove_trusted', user: trusted })}
                      className="py-1 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 transition"
                    >
                      Remove Trusted
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 6: ITEM VALUES & DEMAND (ADMIN + OFFICER)            */}
      {/* ============================================================ */}
      {activeTab === 'values' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>Skyblock Items Value & Demand Management</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAdmin ? 'Admins can edit all properties & add new items.' : 'Officers can adjust coin values and demand levels.'}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Rarity</th>
                    <th className="py-3 px-4">Value (Coins)</th>
                    <th className="py-3 px-4">Demand</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 object-cover"
                          />
                          <div>
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                              {item.tags?.join(', ') || 'No tags'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-mono">{item.category}</td>

                      <td className="py-3 px-4 font-mono font-bold text-[11px]">
                        <span className={`px-2 py-0.5 rounded ${
                          item.rarity === 'SPECIAL' ? 'bg-rose-500/20 text-rose-300' :
                          item.rarity === 'DIVINE' ? 'bg-cyan-500/20 text-cyan-300' :
                          item.rarity === 'MYTHIC' ? 'bg-purple-500/20 text-purple-300' :
                          item.rarity === 'LEGENDARY' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {item.rarity}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {item.displayValue || (item.value ? formatCoins(item.value) : 'Value Pending')}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          item.demand === 'EXTREME' ? 'bg-rose-500/20 text-rose-400' :
                          item.demand === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                          item.demand === 'MEDIUM' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {item.demand}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
                          >
                            <Edit3 className="w-3 h-3 text-cyan-400" /> Edit
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 7: MODERATION HISTORY (ADMIN + OFFICER)              */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <span>Full Moderation Audit Trail ({moderationHistory.length})</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Immutable Server Log</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target User / Entity</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Staff Role</th>
                    <th className="py-3 px-4">Reason / Details</th>
                    <th className="py-3 px-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                  {moderationHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        No moderation history logged yet.
                      </td>
                    </tr>
                  ) : (
                    moderationHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            item.action.includes('BAN') ? 'bg-rose-500/20 text-rose-300' :
                            item.action.includes('MUTE') ? 'bg-amber-500/20 text-amber-300' :
                            item.action.includes('ROLE') ? 'bg-purple-500/20 text-purple-300' :
                            'bg-cyan-500/20 text-cyan-300'
                          }`}>
                            {item.action}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-white font-bold">
                          {item.targetUsername}
                        </td>

                        <td className="py-3 px-4 text-amber-400">
                          @{item.performedByUsername}
                        </td>

                        <td className="py-3 px-4">
                          <RoleBadge role={item.performedByRole} size="xs" />
                        </td>

                        <td className="py-3 px-4 text-slate-300 font-sans text-xs max-w-xs truncate">
                          {item.reason || 'No reason provided'}
                          {item.previousRole && item.newRole ? ` (${item.previousRole} -> ${item.newRole})` : ''}
                        </td>

                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatTimeAgo(item.timestamp)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ITEM EDIT / CREATE                                    */}
      {/* ============================================================ */}
      {(isCreating || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white uppercase font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>{isCreating ? 'Create Skyblock Item' : `Edit: ${editingItem?.name}`}</span>
              </h3>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsCreating(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin && !isCreating}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    disabled={!isAdmin && !isCreating}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rarity</label>
                  <select
                    disabled={!isAdmin && !isCreating}
                    value={formData.rarity}
                    onChange={(e) => setFormData({ ...formData, rarity: e.target.value as ItemRarity })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                  >
                    {RARITIES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-amber-300 font-bold mb-1">Value (Skyblock Coins)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-bold mb-1">Market Demand</label>
                  <select
                    value={formData.demand}
                    onChange={(e) => setFormData({ ...formData, demand: e.target.value as DemandLevel })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  >
                    {DEMANDS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Image URL</label>
                <input
                  type="url"
                  disabled={!isAdmin && !isCreating}
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  disabled={!isAdmin && !isCreating}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition"
                >
                  Save Item & Record Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRM ACTION (BAN / MUTE / ROLE)                    */}
      {/* ============================================================ */}
      {confirmModal.isOpen && confirmModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white uppercase font-mono flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span>Confirm Moderation Action</span>
              </h3>
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              <CircularProfileAvatar
                src={confirmModal.user.profilePhoto || confirmModal.user.avatarUrl}
                alt={confirmModal.user.username}
                size="md"
                role={confirmModal.user.role}
                membership={confirmModal.user.membership}
                isAdmin={confirmModal.user.role === 'admin'}
              />
              <div>
                <div className="font-bold text-white text-xs">{confirmModal.user.name || confirmModal.user.username}</div>
                <div className="text-[11px] text-amber-400 font-mono">@{confirmModal.user.username}</div>
                <RoleBadge role={confirmModal.user.role} size="xs" />
              </div>
            </div>

            {/* Custom inputs per action */}
            {confirmModal.type === 'ban' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ban Type</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmModal((prev) => ({ ...prev, banType: 'temporary' }))}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                        confirmModal.banType === 'temporary'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Temporary Ban
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmModal((prev) => ({ ...prev, banType: 'permanent' }))}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                        confirmModal.banType === 'permanent'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Permanent Ban
                    </button>
                  </div>
                </div>

                {confirmModal.banType === 'temporary' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Duration (Hours)</label>
                    <select
                      value={confirmModal.banDurationHours || 24}
                      onChange={(e) => setConfirmModal((prev) => ({ ...prev, banDurationHours: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value={1}>1 Hour</option>
                      <option value={12}>12 Hours</option>
                      <option value={24}>24 Hours (1 Day)</option>
                      <option value={72}>3 Days</option>
                      <option value={168}>7 Days (1 Week)</option>
                      <option value={720}>30 Days</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reason for Ban</label>
                  <input
                    type="text"
                    value={confirmModal.banReason || ''}
                    onChange={(e) => setConfirmModal((prev) => ({ ...prev, banReason: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    placeholder="e.g. Repeated scamming attempts, market manipulation"
                  />
                </div>
              </div>
            )}

            {confirmModal.type === 'mute' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mute Duration</label>
                  <select
                    value={confirmModal.muteDurationMins || 60}
                    onChange={(e) => setConfirmModal((prev) => ({ ...prev, muteDurationMins: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={360}>6 Hours</option>
                    <option value={1440}>24 Hours</option>
                    <option value={10080}>7 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reason for Mute</label>
                  <input
                    type="text"
                    value={confirmModal.muteReason || ''}
                    onChange={(e) => setConfirmModal((prev) => ({ ...prev, muteReason: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    placeholder="e.g. Chat spam, toxicity, false trade advertisements"
                  />
                </div>
              </div>
            )}

            {(confirmModal.type === 'promote_officer' || confirmModal.type === 'promote_trusted' || confirmModal.type === 'remove_officer' || confirmModal.type === 'remove_trusted' || confirmModal.type === 'unban' || confirmModal.type === 'unmute') && (
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to execute <strong className="text-white font-mono uppercase">{confirmModal.type.replace('_', ' ')}</strong> on <span className="text-amber-400 font-bold">@{confirmModal.user.username}</span>?
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition"
              >
                Confirm & Log Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRM JMD PERMISSIONS APPLICATION                  */}
      {/* ============================================================ */}
      {jmdConfirmModalOpen && selectedJmdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase font-mono">
                    Confirm JMD Permissions
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Owner Admin Authority Verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJmdConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              <img
                src={selectedJmdUser.profilePhoto || selectedJmdUser.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${selectedJmdUser.username}`}
                alt={selectedJmdUser.username}
                className="w-11 h-11 rounded-xl bg-slate-800 border border-purple-500/40 object-cover"
              />
              <div className="truncate flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {selectedJmdUser.name || selectedJmdUser.username}
                  </span>
                  <RoleBadge role={selectedJmdUser.role} size="xs" />
                </div>
                <div className="text-xs text-purple-400 font-mono">@{selectedJmdUser.username}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">UID: {selectedJmdUser.uid}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Permissions to Apply:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  jmdPermissions.changeValues
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-semibold text-white">Change Values</span>
                  <span className={`text-[11px] font-black uppercase mt-1 ${jmdPermissions.changeValues ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {jmdPermissions.changeValues ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  jmdPermissions.banUnban
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-semibold text-white">Ban / Unban</span>
                  <span className={`text-[11px] font-black uppercase mt-1 ${jmdPermissions.banUnban ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {jmdPermissions.banUnban ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  jmdPermissions.deleteChats
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-semibold text-white">Delete Chats</span>
                  <span className={`text-[11px] font-black uppercase mt-1 ${jmdPermissions.deleteChats ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {jmdPermissions.deleteChats ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  jmdPermissions.chooseTrusted
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-semibold text-white">Choose Trusted</span>
                  <span className={`text-[11px] font-black uppercase mt-1 ${jmdPermissions.chooseTrusted ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {jmdPermissions.chooseTrusted ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              These permissions take effect immediately in real-time across all user sessions and are permanently logged to the Firestore audit trail.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setJmdConfirmModalOpen(false)}
                disabled={savingJmdPermissions}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveJmdPermissions}
                disabled={savingJmdPermissions}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
              >
                {savingJmdPermissions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Confirm & Apply Permissions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: VIEW USER PROFILE                                     */}
      {/* ============================================================ */}
      {profileModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white uppercase font-mono flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>User Profile Details</span>
              </h3>
              <button
                onClick={() => setProfileModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <CircularProfileAvatar
                src={profileModalUser.profilePhoto || profileModalUser.avatarUrl}
                alt={profileModalUser.username}
                size="xl"
                role={profileModalUser.role}
                membership={profileModalUser.membership}
                isAdmin={profileModalUser.role === 'admin'}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-white text-base">{stripSpoofedRoleTags(profileModalUser.name || profileModalUser.username)}</h4>
                  <RoleBadge role={profileModalUser.role} size="sm" />
                  {profileModalUser.membership?.level && (
                    <MembershipBadge
                      level={profileModalUser.membership.level}
                      title={profileModalUser.membership.title}
                      size="sm"
                    />
                  )}
                </div>
                <div className="text-xs text-amber-400 font-mono font-semibold">@{profileModalUser.username}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">{profileModalUser.email || 'No email registered'}</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-500">System UID:</span>
                <span className="text-slate-300 select-all">{profileModalUser.uid}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-500">Server Role:</span>
                <span className="text-amber-400 font-bold uppercase">{profileModalUser.role || 'user'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-500">Membership Tier:</span>
                <span className="text-amber-300 font-bold uppercase">
                  {profileModalUser.membership?.title || profileModalUser.membership?.level || 'FREE / NONE'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-500">Joined Date:</span>
                <span className="text-slate-300">{formatJoinedDate(profileModalUser.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className={isUserBanned(profileModalUser) ? 'text-rose-400 font-bold' : isUserMuted(profileModalUser) ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isUserBanned(profileModalUser) ? 'BANNED' : isUserMuted(profileModalUser) ? 'MUTED' : 'ACTIVE'}
                </span>
              </div>
            </div>

            {profileModalUser.bio && (
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Trading Bio</span>
                <p className="text-slate-300 text-xs leading-relaxed">{profileModalUser.bio}</p>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setProfileModalUser(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MEMBERSHIP CONFIRMATION MODAL (OWNER ADMIN ONLY)             */}
      {/* ============================================================ */}
      {membershipModal.isOpen && membershipModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white uppercase font-mono flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>Confirm Membership Action</span>
              </h3>
              <button
                onClick={() => setMembershipModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              <CircularProfileAvatar
                src={membershipModal.user.profilePhoto || membershipModal.user.avatarUrl}
                alt={membershipModal.user.username}
                size="lg"
                role={membershipModal.user.role}
                membership={membershipModal.user.membership}
                isAdmin={membershipModal.user.role === 'admin'}
              />
              <div className="overflow-hidden">
                <div className="font-bold text-white text-sm truncate">
                  {membershipModal.user.name || membershipModal.user.username}
                </div>
                <div className="text-xs text-amber-400 font-mono">@{membershipModal.user.username}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">UID: {membershipModal.user.uid}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Current Membership:</span>
                  {membershipModal.user.membership?.level ? (
                    <MembershipBadge
                      level={membershipModal.user.membership.level}
                      title={membershipModal.user.membership.title}
                      size="sm"
                    />
                  ) : (
                    <span className="text-slate-500 font-mono text-[11px]">Free / None</span>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/80 text-slate-200">
                  <span className="font-semibold">New Membership:</span>
                  {membershipModal.targetLevel ? (
                    <MembershipBadge
                      level={membershipModal.targetLevel}
                      title={
                        membershipModal.targetLevel === 'premium_lite'
                          ? 'VANGUARD'
                          : membershipModal.targetLevel === 'premium'
                          ? 'OVERLORD'
                          : 'SUPREME'
                      }
                      size="sm"
                    />
                  ) : (
                    <span className="text-rose-400 font-bold font-mono text-[11px]">REMOVED (FREE TIER)</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                Notice: Granting or modifying membership activates the circular frame, profile glow aura, chat message styling, and ad-free experience immediately across all active sessions.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMembershipModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={savingMembership}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyMembership}
                disabled={savingMembership}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {savingMembership ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm & Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
