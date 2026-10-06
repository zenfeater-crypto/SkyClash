import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Crown, 
  Shield, 
  Users, 
  Heart, 
  Layers, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Eye, 
  Filter, 
  RefreshCw,
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  doc, 
  updateDoc, 
  collection, 
  getDocs, 
  getDoc, 
  query, 
  limit, 
  addDoc,
  setDoc,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, FrameItem, FrameType, FrameAuditLog } from '../../types';
import { 
  getAllProfileFrames, 
  getAllTextFrames, 
  getProfileFrameById, 
  getTextFrameById, 
  setFrameActiveState 
} from '../../lib/frameCollection';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { MessageTextFrame } from '../MessageTextFrame';
import { RoleBadge } from '../RoleBadge';
import { MembershipBadge } from '../MembershipBadge';
import { formatTimeAgo } from '../../lib/formatters';
import { sanitizeForFirestore } from '../../lib/validation';

export const FrameCollectionAdminView: React.FC = () => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  // Top Sub-tabs
  type FrameTab = 'profile_frames' | 'text_frames' | 'favorites' | 'manage_user_frames';
  const [activeTab, setActiveTab] = useState<FrameTab>('profile_frames');

  // Favorites sub-tab
  const [favType, setFavType] = useState<FrameType>('profile');
  const [favoriteFrameIds, setFavoriteFrameIds] = useState<string[]>([]);

  // Search & Filters for frame browsing
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Feedback notifications
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manage User Frames state
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Selection Modal State for Give / Change / Replace Frame
  const [pickerModal, setPickerModal] = useState<{
    isOpen: boolean;
    type: FrameType;
    selectedFrame: FrameItem | null;
  }>({
    isOpen: false,
    type: 'profile',
    selectedFrame: null,
  });
  const [savingFrameAssignment, setSavingFrameAssignment] = useState(false);

  // Remove confirmation modal
  const [removeConfirmModal, setRemoveConfirmModal] = useState<{
    isOpen: boolean;
    type: FrameType;
    targetUser: UserProfile | null;
  }>({
    isOpen: false,
    type: 'profile',
    targetUser: null,
  });
  const [removingFrame, setRemovingFrame] = useState(false);

  // Frame preview modal (for inspecting frame closely)
  const [previewModalFrame, setPreviewModalFrame] = useState<FrameItem | null>(null);

  // 1. Subscribe to Admin Favorites in Firestore
  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    const favDocRef = doc(db, 'adminFavorites', currentUser.uid);
    const unsub = onSnapshot(
      favDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.favoriteIds)) {
            setFavoriteFrameIds(data.favoriteIds);
          }
        }
      },
      (err) => console.warn('Admin favorites listener warning:', err)
    );

    return () => unsub();
  }, [currentUser, isAdmin]);

  // Toggle favorite helper
  const handleToggleFavorite = async (frameId: string) => {
    if (!currentUser || !isAdmin) return;

    const isFav = favoriteFrameIds.includes(frameId);
    const updated = isFav
      ? favoriteFrameIds.filter((id) => id !== frameId)
      : [...favoriteFrameIds, frameId];

    setFavoriteFrameIds(updated);

    try {
      await setDoc(doc(db, 'adminFavorites', currentUser.uid), {
        favoriteIds: updated,
        updatedAt: Date.now(),
        adminUid: currentUser.uid,
      }, { merge: true });
    } catch (e) {
      console.error('Failed to save favorites to Firestore:', e);
    }
  };

  // Frames lists
  const allProfileFrames = useMemo(() => getAllProfileFrames(), []);
  const allTextFrames = useMemo(() => getAllTextFrames(), []);

  // Unique categories for filtering
  const profileCategories = useMemo(() => {
    const set = new Set<string>();
    allProfileFrames.forEach((f) => set.add(f.category));
    return ['ALL', ...Array.from(set)];
  }, [allProfileFrames]);

  const textCategories = useMemo(() => {
    const set = new Set<string>();
    allTextFrames.forEach((f) => set.add(f.category));
    return ['ALL', ...Array.from(set)];
  }, [allTextFrames]);

  // Filtered frames for the current view
  const displayedProfileFrames = useMemo(() => {
    return allProfileFrames.filter((f) => {
      const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchQuery = !searchQuery.trim() || 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [allProfileFrames, selectedCategory, searchQuery]);

  const displayedTextFrames = useMemo(() => {
    return allTextFrames.filter((f) => {
      const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchQuery = !searchQuery.trim() || 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [allTextFrames, selectedCategory, searchQuery]);

  const displayedFavoriteFrames = useMemo(() => {
    const source = favType === 'profile' ? allProfileFrames : allTextFrames;
    return source.filter((f) => favoriteFrameIds.includes(f.id));
  }, [favType, allProfileFrames, allTextFrames, favoriteFrameIds]);

  // Toggle active state for a frame (isActive = false prevents new assignments)
  const handleToggleFrameActive = (frame: FrameItem) => {
    const nextState = !frame.isActive;
    setFrameActiveState(frame.id, nextState);
    setStatusMessage(`Frame "${frame.name}" is now ${nextState ? 'Active' : 'Inactive'}.`);
  };

  // Search users for Manage User Frames
  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;

    setSearchingUsers(true);
    setErrorMessage(null);

    try {
      const term = userSearchTerm.trim();
      const usersRef = collection(db, 'users');
      const snap = await getDocs(query(usersRef, limit(60)));
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as UserProfile);
      });

      // Direct UID lookup fallback
      if (term.length >= 20) {
        try {
          const directSnap = await getDoc(doc(db, 'users', term));
          if (directSnap.exists() && !list.some((u) => u.uid === directSnap.id)) {
            list.unshift({ uid: directSnap.id, ...directSnap.data() } as UserProfile);
          }
        } catch {
          // Ignore
        }
      }

      if (term) {
        const lower = term.toLowerCase();
        const filtered = list.filter(
          (u) =>
            u.uid.toLowerCase() === lower ||
            (u.username && u.username.toLowerCase().includes(lower)) ||
            (u.name && u.name.toLowerCase().includes(lower))
        );
        setSearchResults(filtered);
      } else {
        setSearchResults(list);
      }
    } catch (err: any) {
      console.error('Failed to search users:', err);
      setErrorMessage(err.message || 'Failed to search users.');
    } finally {
      setSearchingUsers(false);
    }
  };

  // Assign or Replace Frame
  const handleConfirmAssignFrame = async () => {
    if (!selectedUser || !pickerModal.selectedFrame || !currentUser || !isAdmin) return;

    setSavingFrameAssignment(true);
    setErrorMessage(null);

    const target = selectedUser;
    const frame = pickerModal.selectedFrame;
    const isProfile = frame.type === 'profile';
    const previousFrameId = isProfile ? (target.profileFrameId || null) : (target.textFrameId || null);
    const isReplacing = !!previousFrameId;

    try {
      const userRef = doc(db, 'users', target.uid);
      const updatePayload = isProfile
        ? { profileFrameId: frame.id }
        : { textFrameId: frame.id };

      await updateDoc(userRef, updatePayload);

      // Audit Record
      const actionType = isProfile
        ? (isReplacing ? 'REPLACE_PROFILE_FRAME' : 'GIVE_PROFILE_FRAME')
        : (isReplacing ? 'REPLACE_TEXT_FRAME' : 'GIVE_TEXT_FRAME');

      const auditData: FrameAuditLog = {
        action: actionType,
        targetUserUid: target.uid,
        targetUsername: target.username,
        frameId: frame.id,
        frameType: frame.type,
        previousFrameId,
        adminUid: currentUser.uid,
        adminUsername: userProfile?.username || 'Strike',
        timestamp: Date.now(),
      };

      await addDoc(collection(db, 'frameAudit'), sanitizeForFirestore(auditData));
      await addDoc(collection(db, 'moderationHistory'), sanitizeForFirestore({
        action: actionType,
        targetUid: target.uid,
        targetUsername: target.username,
        performedByUid: currentUser.uid,
        performedByUsername: userProfile?.username || 'Strike',
        performedByRole: 'admin',
        adminUid: currentUser.uid,
        timestamp: Date.now(),
        reason: `${isProfile ? 'Profile Frame' : 'Text Frame'} ${isReplacing ? 'replaced' : 'assigned'} by Owner Admin`,
        details: { frameId: frame.id, previousFrameId }
      }));

      // Update local state
      const updatedUser: UserProfile = {
        ...target,
        ...(isProfile ? { profileFrameId: frame.id } : { textFrameId: frame.id }),
      };
      setSelectedUser(updatedUser);
      setSearchResults((prev) => prev.map((u) => (u.uid === updatedUser.uid ? updatedUser : u)));

      setStatusMessage(`${isProfile ? 'Profile Frame' : 'Text Frame'} successfully given to @${target.username}.`);
      setPickerModal({ isOpen: false, type: 'profile', selectedFrame: null });
    } catch (err: any) {
      console.error('Failed to assign frame:', err);
      setErrorMessage(err.message || 'Failed to assign frame.');
    } finally {
      setSavingFrameAssignment(false);
    }
  };

  // Remove Frame
  const handleConfirmRemoveFrame = async () => {
    if (!removeConfirmModal.targetUser || !currentUser || !isAdmin) return;

    setRemovingFrame(true);
    setErrorMessage(null);

    const target = removeConfirmModal.targetUser;
    const isProfile = removeConfirmModal.type === 'profile';
    const previousFrameId = isProfile ? (target.profileFrameId || null) : (target.textFrameId || null);

    try {
      const userRef = doc(db, 'users', target.uid);
      const updatePayload = isProfile
        ? { profileFrameId: null }
        : { textFrameId: null };

      await updateDoc(userRef, updatePayload);

      // Audit Record
      const actionType = isProfile ? 'REMOVE_PROFILE_FRAME' : 'REMOVE_TEXT_FRAME';
      const auditData: FrameAuditLog = {
        action: actionType,
        targetUserUid: target.uid,
        targetUsername: target.username,
        frameId: null,
        frameType: removeConfirmModal.type,
        previousFrameId,
        adminUid: currentUser.uid,
        adminUsername: userProfile?.username || 'Strike',
        timestamp: Date.now(),
      };

      await addDoc(collection(db, 'frameAudit'), sanitizeForFirestore(auditData));
      await addDoc(collection(db, 'moderationHistory'), sanitizeForFirestore({
        action: actionType,
        targetUid: target.uid,
        targetUsername: target.username,
        performedByUid: currentUser.uid,
        performedByUsername: userProfile?.username || 'Strike',
        performedByRole: 'admin',
        adminUid: currentUser.uid,
        timestamp: Date.now(),
        reason: `${isProfile ? 'Profile Frame' : 'Text Frame'} removed by Owner Admin`,
        details: { previousFrameId }
      }));

      // Update local state
      const updatedUser: UserProfile = {
        ...target,
        ...(isProfile ? { profileFrameId: null } : { textFrameId: null }),
      };
      setSelectedUser(updatedUser);
      setSearchResults((prev) => prev.map((u) => (u.uid === updatedUser.uid ? updatedUser : u)));

      setStatusMessage(`${isProfile ? 'Profile Frame' : 'Text Frame'} successfully removed from @${target.username}.`);
      setRemoveConfirmModal({ isOpen: false, type: 'profile', targetUser: null });
    } catch (err: any) {
      console.error('Failed to remove frame:', err);
      setErrorMessage(err.message || 'Failed to remove frame.');
    } finally {
      setRemovingFrame(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-black text-white uppercase font-mono">Access Restricted</h2>
        <p className="text-xs text-slate-400 mt-1">
          Only the protected Owner Admin (Strike) can manage the Frame Collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
              OWNER ADMIN EXCLUSIVE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              120+ Unique Master Assets (60+ Profile · 60+ Text)
            </span>
          </div>
          <h2 className="text-2xl font-black text-white font-mono uppercase tracking-wide flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <span>Frame Collection System</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Manage global gaming frames, inspect high-fidelity vector assets, pin favorites, and assign custom Profile or Text Frames to any user account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right font-mono text-xs text-slate-400 bg-slate-950/70 border border-slate-800 rounded-2xl px-4 py-2">
            <div className="text-white font-black text-sm">{allProfileFrames.length + allTextFrames.length} Frames</div>
            <div className="text-[10px] text-emerald-400">{allProfileFrames.length} Profile · {allTextFrames.length} Text</div>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Frame Collection Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => { setActiveTab('profile_frames'); setSelectedCategory('ALL'); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition flex items-center gap-2 ${
            activeTab === 'profile_frames'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg'
              : 'text-slate-400 hover:text-white bg-slate-900/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Profile Frames ({allProfileFrames.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('text_frames'); setSelectedCategory('ALL'); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition flex items-center gap-2 ${
            activeTab === 'text_frames'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg'
              : 'text-slate-400 hover:text-white bg-slate-900/40'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Text Frames ({allTextFrames.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition flex items-center gap-2 ${
            activeTab === 'favorites'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg'
              : 'text-slate-400 hover:text-white bg-slate-900/40'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-400" />
          <span>Favorites ({favoriteFrameIds.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('manage_user_frames');
            if (searchResults.length === 0) handleSearchUsers();
          }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition flex items-center gap-2 ${
            activeTab === 'manage_user_frames'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg'
              : 'text-slate-400 hover:text-white bg-slate-900/40'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span>Manage User Frames</span>
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━ SECTION 1: PROFILE FRAMES ━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'profile_frames' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search profile frames by name, category, or ID..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {profileCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold shrink-0 transition ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Frames Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {displayedProfileFrames.map((frame) => {
              const isFav = favoriteFrameIds.includes(frame.id);

              return (
                <div
                  key={frame.id}
                  className="group relative p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-850 border border-slate-800/90 hover:border-amber-500/50 transition flex flex-col items-center text-center shadow-lg"
                >
                  {/* Action Badges Top */}
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono font-bold text-slate-500 truncate max-w-[80px]">
                      {frame.category}
                    </span>
                    <button
                      onClick={() => handleToggleFavorite(frame.id)}
                      className={`p-1 rounded-lg transition ${
                        isFav ? 'text-rose-400 hover:text-rose-300' : 'text-slate-600 hover:text-rose-400'
                      }`}
                      title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  {/* Circular Avatar Preview with Frame */}
                  <div className="w-16 h-16 relative flex items-center justify-center my-2">
                    <CircularProfileAvatar
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                      alt={frame.name}
                      size="lg"
                      profileFrameId={frame.id}
                    />
                  </div>

                  <div className="w-full mt-2">
                    <h4 className="text-xs font-black text-white truncate font-mono" title={frame.name}>
                      {frame.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5" title={frame.id}>
                      {frame.id}
                    </p>
                  </div>

                  {/* Hover Buttons */}
                  <div className="w-full flex items-center justify-between gap-1 mt-3 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => setPreviewModalFrame(frame)}
                      className="flex-1 py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center justify-center gap-1 transition"
                      title="Inspect Frame"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => handleToggleFrameActive(frame)}
                      className={`px-1.5 py-1 rounded-lg text-[9px] font-mono font-bold transition ${
                        frame.isActive
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                      }`}
                      title={frame.isActive ? 'Active (Click to de-activate)' : 'Inactive (Click to activate)'}
                    >
                      {frame.isActive ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━ SECTION 2: TEXT FRAMES ━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'text_frames' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text frames by name, category, or ID..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {textCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold shrink-0 transition ${
                    selectedCategory === cat
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Text Frames Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {displayedTextFrames.map((frame) => {
              const isFav = favoriteFrameIds.includes(frame.id);

              return (
                <div
                  key={frame.id}
                  className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-850 border border-slate-800/90 hover:border-cyan-500/50 transition flex flex-col justify-between shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white font-mono">{frame.name}</h4>
                      <span className="text-[10px] font-mono text-cyan-400">{frame.category}</span>
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(frame.id)}
                      className={`p-1.5 rounded-lg transition ${
                        isFav ? 'text-rose-400 hover:text-rose-300' : 'text-slate-600 hover:text-rose-400'
                      }`}
                      title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Render message sample in text frame */}
                  <div className="py-2">
                    <MessageTextFrame textFrameId={frame.id} text="Buying Hyperion 1.4B • Clean • DM fast trade" />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                    <span className="text-[10px] text-slate-500 font-mono truncate">{frame.id}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewModalFrame(frame)}
                        className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                      <button
                        onClick={() => handleToggleFrameActive(frame)}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold ${
                          frame.isActive
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {frame.isActive ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━ SECTION 3: FAVORITES ━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2 bg-slate-900/60 border border-slate-800 rounded-2xl w-fit">
            <button
              onClick={() => setFavType('profile')}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                favType === 'profile'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Profile Frames ({favoriteFrameIds.filter((id) => id.startsWith('pf_')).length})
            </button>
            <button
              onClick={() => setFavType('text')}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                favType === 'text'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Text Frames ({favoriteFrameIds.filter((id) => id.startsWith('tf_')).length})
            </button>
          </div>

          {displayedFavoriteFrames.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-2">
              <Heart className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-xs font-mono">No favorites added yet in this category.</p>
              <p className="text-[11px] text-slate-600">
                Click the heart icon on any frame in Profile Frames or Text Frames to pin it to Favorites.
              </p>
            </div>
          ) : favType === 'profile' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {displayedFavoriteFrames.map((frame) => (
                <div
                  key={frame.id}
                  className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 transition flex flex-col items-center text-center shadow-lg"
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono text-slate-500">{frame.category}</span>
                    <button
                      onClick={() => handleToggleFavorite(frame.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                      title="Remove from Favorites"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                  <div className="w-16 h-16 relative flex items-center justify-center my-2">
                    <CircularProfileAvatar
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                      alt={frame.name}
                      size="lg"
                      profileFrameId={frame.id}
                    />
                  </div>
                  <h4 className="text-xs font-black text-white truncate font-mono w-full">{frame.name}</h4>
                  <div className="w-full mt-3 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => setPreviewModalFrame(frame)}
                      className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {displayedFavoriteFrames.map((frame) => (
                <div
                  key={frame.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white font-mono">{frame.name}</h4>
                      <span className="text-[10px] font-mono text-cyan-400">{frame.category}</span>
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(frame.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                      title="Remove from Favorites"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  <div className="py-2">
                    <MessageTextFrame textFrameId={frame.id} text="Pinned Favorite Message Frame" />
                  </div>
                  <button
                    onClick={() => setPreviewModalFrame(frame)}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━ SECTION 4: MANAGE USER FRAMES ━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'manage_user_frames' && (
        <div className="space-y-6">
          {/* User Search Form */}
          <form onSubmit={handleSearchUsers} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="block text-xs font-mono font-bold text-slate-300">
              SEARCH USER (BY USERNAME, DISPLAY NAME, OR FIREBASE UID)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Enter username (e.g. strike), display name, or exact Firebase UID..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={searchingUsers}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {searchingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Search Results List */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800 overflow-hidden">
              <div className="p-3 bg-slate-950 text-slate-400 font-mono text-[11px] font-bold">
                Select a user to manage their custom frames:
              </div>
              {searchResults.slice(0, 15).map((user) => {
                const hasProfileFrame = !!user.profileFrameId;
                const hasTextFrame = !!user.textFrameId;

                return (
                  <div
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-850 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CircularProfileAvatar
                        src={user.profilePhoto || user.avatarUrl}
                        alt={user.username}
                        size="md"
                        role={user.role}
                        membership={user.membership}
                        profileFrameId={user.profileFrameId}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{user.name || user.username}</span>
                          <span className="text-xs text-cyan-400 font-mono">@{user.username}</span>
                          <RoleBadge role={user.role} size="xs" />
                          {user.membership?.level && (
                            <MembershipBadge level={user.membership.level} size="xs" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                          UID: {user.uid}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasProfileFrame && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Profile Frame
                        </span>
                      )}
                      {hasTextFrame && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Text Frame
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected User Management Card */}
          {selectedUser && (
            <div className="space-y-6 animate-in fade-in">
              {/* Back to search results button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs text-purple-400 hover:text-purple-300 font-mono font-bold flex items-center gap-1"
              >
                ← Back to search results
              </button>

              {/* User Overview Profile Box */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <CircularProfileAvatar
                      src={selectedUser.profilePhoto || selectedUser.avatarUrl}
                      alt={selectedUser.username}
                      size="xl"
                      role={selectedUser.role}
                      membership={selectedUser.membership}
                      profileFrameId={selectedUser.profileFrameId}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-white">{selectedUser.name || selectedUser.username}</h3>
                      <span className="text-sm font-mono text-cyan-400">@{selectedUser.username}</span>
                      <RoleBadge role={selectedUser.role} size="sm" />
                      {selectedUser.membership?.level && (
                        <MembershipBadge level={selectedUser.membership.level} size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Firebase UID: <span className="text-slate-300">{selectedUser.uid}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs font-mono text-slate-400">
                  Joined: {formatTimeAgo(selectedUser.createdAt)}
                </div>
              </div>

              {/* Two Column Grid: Profile Frame & Text Frame Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Profile Frame Control */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-black text-white font-mono uppercase tracking-wide">
                          PROFILE FRAME
                        </h4>
                      </div>
                      {selectedUser.profileFrameId ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                          ASSIGNED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          NONE (DEFAULT)
                        </span>
                      )}
                    </div>

                    {/* Current Frame Preview */}
                    <div className="my-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-4">
                      <div className="w-16 h-16 relative flex items-center justify-center shrink-0">
                        <CircularProfileAvatar
                          src={selectedUser.profilePhoto || selectedUser.avatarUrl}
                          alt={selectedUser.username}
                          size="lg"
                          role={selectedUser.role}
                          membership={selectedUser.membership}
                          profileFrameId={selectedUser.profileFrameId}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white font-mono truncate">
                          {selectedUser.profileFrameId
                            ? getProfileFrameById(selectedUser.profileFrameId)?.name || selectedUser.profileFrameId
                            : 'No Custom Profile Frame Assigned'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                          {selectedUser.profileFrameId
                            ? `Category: ${getProfileFrameById(selectedUser.profileFrameId)?.category || 'Custom'}`
                            : 'Using standard role/membership avatar styling.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setPickerModal({ isOpen: true, type: 'profile', selectedFrame: null })}
                      className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{selectedUser.profileFrameId ? 'CHANGE PROFILE FRAME' : 'GIVE PROFILE FRAME'}</span>
                    </button>

                    {selectedUser.profileFrameId && (
                      <button
                        onClick={() => setRemoveConfirmModal({ isOpen: true, type: 'profile', targetUser: selectedUser })}
                        className="py-3 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition"
                        title="Remove Profile Frame"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Text Frame Control */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-sm font-black text-white font-mono uppercase tracking-wide">
                          TEXT FRAME
                        </h4>
                      </div>
                      {selectedUser.textFrameId ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                          ASSIGNED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          NONE (DEFAULT)
                        </span>
                      )}
                    </div>

                    {/* Current Frame Preview */}
                    <div className="my-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-white font-mono truncate">
                        {selectedUser.textFrameId
                          ? getTextFrameById(selectedUser.textFrameId)?.name || selectedUser.textFrameId
                          : 'No Custom Text Frame Assigned'}
                      </div>
                      <div className="py-1">
                        <MessageTextFrame
                          textFrameId={selectedUser.textFrameId}
                          role={selectedUser.role}
                          membershipLevel={selectedUser.membership?.level}
                          text="Sample trade dialogue and chat message."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setPickerModal({ isOpen: true, type: 'text', selectedFrame: null })}
                      className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-mono transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{selectedUser.textFrameId ? 'CHANGE TEXT FRAME' : 'GIVE TEXT FRAME'}</span>
                    </button>

                    {selectedUser.textFrameId && (
                      <button
                        onClick={() => setRemoveConfirmModal({ isOpen: true, type: 'text', targetUser: selectedUser })}
                        className="py-3 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition"
                        title="Remove Text Frame"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━ MODAL: SELECT & GIVE / REPLACE FRAME ━━━━━━━━━━━━━━━━━━━━ */}
      {pickerModal.isOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase">
                    Select {pickerModal.type === 'profile' ? 'Profile Frame' : 'Text Frame'} for @{selectedUser.username}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {pickerModal.type === 'profile'
                      ? (selectedUser.profileFrameId ? 'Replace existing Profile Frame' : 'Assign new Profile Frame')
                      : (selectedUser.textFrameId ? 'Replace existing Text Frame' : 'Assign new Text Frame')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPickerModal({ isOpen: false, type: 'profile', selectedFrame: null })}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Live Preview Box if frame selected */}
              {pickerModal.selectedFrame && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
                  <div className="flex items-center gap-4">
                    {pickerModal.type === 'profile' ? (
                      <div className="w-16 h-16 relative flex items-center justify-center shrink-0">
                        <CircularProfileAvatar
                          src={selectedUser.profilePhoto || selectedUser.avatarUrl}
                          alt={selectedUser.username}
                          size="lg"
                          profileFrameId={pickerModal.selectedFrame.id}
                        />
                      </div>
                    ) : (
                      <div className="w-72 max-w-full">
                        <MessageTextFrame textFrameId={pickerModal.selectedFrame.id} text="Preview of user's new message frame." />
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-amber-400 font-mono font-bold">
                        NEW SELECTED: {pickerModal.selectedFrame.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Category: {pickerModal.selectedFrame.category} · ID: {pickerModal.selectedFrame.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {pickerModal.type === 'profile' && selectedUser.profileFrameId && (
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                        Replaces: {selectedUser.profileFrameId}
                      </span>
                    )}
                    {pickerModal.type === 'text' && selectedUser.textFrameId && (
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                        Replaces: {selectedUser.textFrameId}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Frame Grid to Choose From */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(pickerModal.type === 'profile' ? allProfileFrames : allTextFrames)
                  .filter((f) => f.isActive) // Only active frames can be assigned
                  .map((frame) => {
                    const isSelected = pickerModal.selectedFrame?.id === frame.id;
                    const isCurrent = pickerModal.type === 'profile'
                      ? selectedUser.profileFrameId === frame.id
                      : selectedUser.textFrameId === frame.id;

                    return (
                      <div
                        key={frame.id}
                        onClick={() => setPickerModal((prev) => ({ ...prev, selectedFrame: frame }))}
                        className={`p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center relative ${
                          isSelected
                            ? 'bg-amber-500/15 border-2 border-amber-400 shadow-lg shadow-amber-500/20'
                            : isCurrent
                            ? 'bg-slate-950 border-2 border-emerald-500/60'
                            : 'bg-slate-950/60 hover:bg-slate-850 border border-slate-800'
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute top-2 left-2 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            Current
                          </span>
                        )}

                        {pickerModal.type === 'profile' ? (
                          <div className="w-14 h-14 relative flex items-center justify-center my-2">
                            <CircularProfileAvatar
                              src={selectedUser.profilePhoto || selectedUser.avatarUrl}
                              alt={frame.name}
                              size="md"
                              profileFrameId={frame.id}
                            />
                          </div>
                        ) : (
                          <div className="w-full my-2">
                            <MessageTextFrame textFrameId={frame.id} text="Text" />
                          </div>
                        )}

                        <div className="w-full mt-1">
                          <div className="text-xs font-bold text-white font-mono truncate">{frame.name}</div>
                          <div className="text-[9px] text-slate-500 font-mono truncate">{frame.category}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
              <button
                type="button"
                onClick={() => setPickerModal({ isOpen: false, type: 'profile', selectedFrame: null })}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAssignFrame}
                disabled={!pickerModal.selectedFrame || savingFrameAssignment}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {savingFrameAssignment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>
                  {pickerModal.type === 'profile'
                    ? (selectedUser.profileFrameId ? 'REPLACE PROFILE FRAME' : 'GIVE PROFILE FRAME')
                    : (selectedUser.textFrameId ? 'REPLACE TEXT FRAME' : 'GIVE TEXT FRAME')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━ MODAL: CONFIRM REMOVE FRAME ━━━━━━━━━━━━━━━━━━━━ */}
      {removeConfirmModal.isOpen && removeConfirmModal.targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black font-mono uppercase text-white">
                  Remove {removeConfirmModal.type === 'profile' ? 'Profile Frame' : 'Text Frame'}?
                </h3>
                <span className="text-xs text-rose-400 font-mono">@{removeConfirmModal.targetUser.username}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove the assigned {removeConfirmModal.type === 'profile' ? 'Profile Frame' : 'Text Frame'} from <span className="font-bold text-white font-mono">@{removeConfirmModal.targetUser.username}</span>?
              They will return to standard visual display. The global frame asset will remain available in the Frame Collection.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemoveConfirmModal({ isOpen: false, type: 'profile', targetUser: null })}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveFrame}
                disabled={removingFrame}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {removingFrame ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Remove Frame</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━ MODAL: FULLSCREEN FRAME PREVIEW ━━━━━━━━━━━━━━━━━━━━ */}
      {previewModalFrame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white font-mono uppercase">{previewModalFrame.name}</h3>
              </div>
              <button
                onClick={() => setPreviewModalFrame(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 flex flex-col items-center justify-center bg-slate-950 rounded-2xl border border-slate-800">
              {previewModalFrame.type === 'profile' ? (
                <div className="w-32 h-32 relative flex items-center justify-center">
                  <CircularProfileAvatar
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                    alt={previewModalFrame.name}
                    size="3xl"
                    profileFrameId={previewModalFrame.id}
                  />
                </div>
              ) : (
                <div className="w-full max-w-sm px-4">
                  <MessageTextFrame textFrameId={previewModalFrame.id} text="Previewing rich high-fidelity text frame border styling." />
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="text-white font-bold">{previewModalFrame.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="text-white font-bold uppercase">{previewModalFrame.type} Frame</span>
              </div>
              <div className="flex justify-between">
                <span>Frame ID:</span>
                <span className="text-amber-400">{previewModalFrame.id}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-2 leading-relaxed">{previewModalFrame.description}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalFrame(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
