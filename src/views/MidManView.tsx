import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Coins, 
  CreditCard, 
  UserCheck, 
  UserX, 
  Clock, 
  X,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot, 
  doc, 
  getDoc, 
  getDocs, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  DocumentSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { MidManPost, MidManCategory, UserProfile, UserRole } from '../types';
import { CircularProfileAvatar } from '../components/CircularProfileAvatar';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { RoleBadge } from '../components/RoleBadge';
import { MembershipBadge } from '../components/MembershipBadge';
import { stripSpoofedRoleTags } from '../lib/validation';
import { formatTimeAgo } from '../lib/formatters';

interface MidManViewProps {
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
  onOpenAuth: () => void;
}

const PAGE_SIZE = 12;

export const MidManView: React.FC<MidManViewProps> = ({
  onOpenPrivateChat,
  onOpenAuth,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<'all' | MidManCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Posts state & Firestore pagination
  const [posts, setPosts] = useState<MidManPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);

  // Live user profile cache to ensure posts always show current profile photo and display name
  const [liveProfiles, setLiveProfiles] = useState<Record<string, UserProfile>>({});

  // Action status feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Admin Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<MidManPost | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTargetPost, setDeleteTargetPost] = useState<MidManPost | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deletePostError, setDeletePostError] = useState<string | null>(null);

  // Modal Form Inputs
  const [formCategory, setFormCategory] = useState<MidManCategory>('account_trades');
  const [formAppUsername, setFormAppUsername] = useState('');
  const [formGameUsername, setFormGameUsername] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCharges, setFormCharges] = useState('');
  
  // Resolved Target User State
  const [searchingUser, setSearchingUser] = useState(false);
  const [resolvedUser, setResolvedUser] = useState<UserProfile | null>(null);
  const [userLookupError, setUserLookupError] = useState<string | null>(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Timeout ref for debounced user lookup
  const lookupDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load of Posts with realtime snapshot
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'midman_posts'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MidManPost[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as MidManPost);
        });
        setPosts(list);
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length >= PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.warn('Mid man posts listener warning:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Load more posts (Pagination)
  const handleLoadMore = async () => {
    if (!lastVisibleDoc || loadingMore) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, 'midman_posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisibleDoc),
        limit(PAGE_SIZE)
      );

      const snap = await getDocs(q);
      const nextList: MidManPost[] = [];
      snap.forEach((d) => {
        nextList.push({ id: d.id, ...d.data() } as MidManPost);
      });

      setPosts((prev) => [...prev, ...nextList]);
      setLastVisibleDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more mid man posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // 3. Resolve live user profiles for loaded posts
  useEffect(() => {
    if (posts.length === 0) return;

    const uidsToFetch = Array.from(
      new Set(
        posts
          .map((p) => p.targetUserUid)
          .filter((uid) => uid && !liveProfiles[uid])
      )
    );

    if (uidsToFetch.length === 0) return;

    uidsToFetch.forEach(async (uid) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setLiveProfiles((prev) => ({ ...prev, [uid]: profile }));
        }
      } catch (err) {
        console.warn('Could not fetch live profile for user:', uid, err);
      }
    });
  }, [posts, liveProfiles]);

  // 4. Handle Live App Username Lookup in Admin Form
  const triggerUserLookup = (rawUsername: string) => {
    const clean = rawUsername.replace(/^@/, '').trim().toLowerCase();
    if (!clean) {
      setResolvedUser(null);
      setUserLookupError(null);
      setSearchingUser(false);
      return;
    }

    setSearchingUser(true);
    setUserLookupError(null);

    if (lookupDebounceRef.current) {
      clearTimeout(lookupDebounceRef.current);
    }

    lookupDebounceRef.current = setTimeout(async () => {
      try {
        let foundUid: string | null = null;
        let foundProfile: UserProfile | null = null;

        // Step A: Check atomic usernames registry
        const usernameSnap = await getDoc(doc(db, 'usernames', clean));
        if (usernameSnap.exists()) {
          foundUid = usernameSnap.data().uid;
        }

        // Step B: If found, fetch user doc
        if (foundUid) {
          const uSnap = await getDoc(doc(db, 'users', foundUid));
          if (uSnap.exists()) {
            foundProfile = { ...uSnap.data(), uid: foundUid } as UserProfile;
          }
        }

        // Step C: Fallback query on users collection
        if (!foundProfile) {
          const qNorm = query(
            collection(db, 'users'),
            where('normalizedUsername', '==', clean),
            limit(1)
          );
          const snapNorm = await getDocs(qNorm);
          if (!snapNorm.empty) {
            foundProfile = snapNorm.docs[0].data() as UserProfile;
          } else {
            const qExact = query(
              collection(db, 'users'),
              where('username', '==', clean),
              limit(1)
            );
            const snapExact = await getDocs(qExact);
            if (!snapExact.empty) {
              foundProfile = snapExact.docs[0].data() as UserProfile;
            }
          }
        }

        if (foundProfile) {
          setResolvedUser(foundProfile);
          setUserLookupError(null);
        } else {
          setResolvedUser(null);
          setUserLookupError(`No app user found with username "@${clean}". Please enter an existing user.`);
        }
      } catch (err: any) {
        console.error('Error looking up username:', err);
        setUserLookupError('Error verifying username. Please try again.');
        setResolvedUser(null);
      } finally {
        setSearchingUser(false);
      }
    }, 350);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setFormCategory(selectedCategory === 'all' ? 'account_trades' : selectedCategory);
    setFormAppUsername('');
    setFormGameUsername('');
    setFormDescription('');
    setFormCharges('');
    setResolvedUser(null);
    setUserLookupError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = async (post: MidManPost) => {
    setEditingPost(post);
    setFormCategory(post.category);
    setFormAppUsername(post.appUsername);
    setFormGameUsername(post.gameUsername);
    setFormDescription(post.description);
    setFormCharges(post.charges);
    setUserLookupError(null);
    setModalOpen(true);

    // Populate existing user profile if available, or trigger lookup
    if (liveProfiles[post.targetUserUid]) {
      setResolvedUser(liveProfiles[post.targetUserUid]);
    } else {
      triggerUserLookup(post.appUsername);
    }
  };

  // Save (Create or Update) Mid Man Post
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !userProfile || !currentUser) {
      setActionError('Permission Denied: Only Owner Admin can manage Mid Man posts.');
      return;
    }

    if (!resolvedUser) {
      setUserLookupError('Please enter a valid existing app username.');
      return;
    }

    if (!formGameUsername.trim()) {
      setActionError('Game Username is required.');
      return;
    }

    if (!formDescription.trim()) {
      setActionError('Description is required.');
      return;
    }

    if (!formCharges.trim()) {
      setActionError('Charges details are required.');
      return;
    }

    setSubmittingForm(true);
    setActionError(null);

    const postPayload = {
      category: formCategory,
      targetUserUid: resolvedUser.uid,
      appUsername: resolvedUser.username,
      appDisplayName: resolvedUser.name || resolvedUser.username,
      gameUsername: formGameUsername.trim(),
      profilePhoto: resolvedUser.profilePhoto || resolvedUser.avatarUrl || '',
      description: formDescription.trim(),
      charges: formCharges.trim(),
      updatedAt: Date.now(),
    };

    try {
      if (editingPost) {
        await updateDoc(doc(db, 'midman_posts', editingPost.id), postPayload);
        setActionSuccess('Mid Man post updated successfully.');
      } else {
        await addDoc(collection(db, 'midman_posts'), {
          ...postPayload,
          createdAt: Date.now(),
          createdByAdminUid: currentUser.uid,
          createdByAdminUsername: userProfile.username,
        });
        setActionSuccess('Mid Man post created successfully.');
      }

      setModalOpen(false);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error('Error saving Mid Man post:', err);
      setActionError(err.message || 'Failed to save Mid Man post.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Delete Mid Man Post
  const handleDeletePost = (post: MidManPost) => {
    if (!isAdmin) {
      alert('Only Owner Admin can delete Mid Man posts.');
      return;
    }

    setDeleteTargetPost(post);
    setDeletePostError(null);
  };

  const handleConfirmDeletePost = async () => {
    if (!deleteTargetPost || !isAdmin) return;

    setIsDeletingPost(true);
    setDeletePostError(null);

    try {
      await deleteDoc(doc(db, 'midman_posts', deleteTargetPost.id));
      setActionSuccess('Mid Man post deleted.');
      setTimeout(() => setActionSuccess(null), 3000);
      setDeleteTargetPost(null);
    } catch (err: any) {
      console.error('Error deleting mid man post:', err);
      setDeletePostError(err.message || 'Failed to delete post.');
    } finally {
      setIsDeletingPost(false);
    }
  };

  // Start Private Chat with the target user
  const handleStartChatWithUser = (post: MidManPost) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (currentUser.uid === post.targetUserUid) {
      alert('This is your own listing.');
      return;
    }

    // Resolve current live data for target user
    const live = liveProfiles[post.targetUserUid];
    const partnerUsername = live?.username || post.appUsername;
    const partnerName = live?.name || post.appDisplayName || post.appUsername;
    const partnerPhoto = live?.profilePhoto || live?.avatarUrl || post.profilePhoto;
    const partnerRole = live?.role || 'user';
    const partnerMembership = live?.membership;

    const sortedUids = [currentUser.uid, post.targetUserUid].sort();
    const friendshipId = sortedUids.join('_');

    onOpenPrivateChat(friendshipId, {
      uid: post.targetUserUid,
      username: partnerUsername,
      name: partnerName,
      avatarUrl: partnerPhoto,
      profilePhoto: partnerPhoto,
      role: partnerRole as UserRole,
      membership: partnerMembership,
    });
  };

  // Filtered posts based on category and search query
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchAppUser = p.appUsername.toLowerCase().includes(q);
      const matchGameUser = p.gameUsername.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchCharges = p.charges.toLowerCase().includes(q);
      const matchDisplayName = (p.appDisplayName || '').toLowerCase().includes(q);

      return matchAppUser || matchGameUser || matchDesc || matchCharges || matchDisplayName;
    });
  }, [posts, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-amber-950/20 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Official Mid Man Service</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Verified Middle Man Desk</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Secure trade escrow, verified account handovers, and UPI trades. Authenticated profiles managed exclusively by Owner Admin <strong className="text-amber-400 font-bold">Strike</strong> for maximum trade safety.
          </p>
        </div>

        {/* Admin Post Action (Owner Admin Only) */}
        {isAdmin && (
          <div className="relative z-10 flex flex-col sm:items-end gap-2 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Mid Man Post</span>
            </button>
            <span className="text-[10px] text-amber-400/80 font-mono tracking-wide">
              Owner Admin Exclusive Access
            </span>
          </div>
        )}

        {/* Ambient Amber Glow Decoration */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Global Status Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Controls Bar: Category Tabs & Search */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        {/* Category Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/60'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>ALL LISTINGS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-mono">
              {posts.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('account_trades')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              selectedCategory === 'account_trades'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-cyan-300 border border-slate-800/60'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-cyan-400" />
            <span>ACCOUNT TRADES</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-mono">
              {posts.filter((p) => p.category === 'account_trades').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('upi_trade')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              selectedCategory === 'upi_trade'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-emerald-300 border border-slate-800/60'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>UPI TRADE</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-mono">
              {posts.filter((p) => p.category === 'upi_trade').length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by gamer tag, user, or details..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs text-white placeholder-slate-500 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-xs font-mono">Loading verified Mid Man listings...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Mid Man Posts Found</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {searchQuery 
              ? 'No listings matched your search criteria. Try a different query.' 
              : 'There are currently no active Mid Man listings in this category.'}
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Post</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            // Live Profile Resolution
            const live = liveProfiles[post.targetUserUid];
            const displayPhoto = live?.profilePhoto || live?.avatarUrl || post.profilePhoto;
            const displayName = stripSpoofedRoleTags(live?.name || post.appDisplayName || post.appUsername);
            const appUsername = live?.username || post.appUsername;
            const userRole = live?.role || 'user';
            const userMembership = live?.membership;

            const isOwnPost = currentUser?.uid === post.targetUserUid;
            const isDeleting = deletingId === post.id;

            return (
              <div
                key={post.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between group transition-all duration-200 hover:shadow-amber-500/5"
              >
                {/* Header: Category Badge & Admin Controls */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5">
                    {post.category === 'account_trades' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold tracking-wider uppercase">
                        <Coins className="w-3 h-3 text-cyan-400" />
                        <span>ACCOUNT TRADES</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold tracking-wider uppercase">
                        <CreditCard className="w-3 h-3 text-emerald-400" />
                        <span>UPI TRADE</span>
                      </span>
                    )}

                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 ml-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>

                  {/* Owner Admin Controls */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(post)}
                        title="Edit Post (Owner Admin)"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeletePost(post)}
                        disabled={isDeleting}
                        title="Delete Post (Owner Admin)"
                        className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/70 text-red-400 border border-red-500/30 transition disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Trader Identity Card */}
                <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-slate-800/80">
                  {/* APP PROFILE PHOTO in slightly larger size */}
                  <div className="relative group/avatar">
                    <div className="p-1 rounded-full bg-gradient-to-br from-amber-500/30 via-slate-800 to-cyan-500/30 shadow-lg">
                      <CircularProfileAvatar
                        src={displayPhoto}
                        alt={appUsername}
                        role={userRole}
                        membership={userMembership}
                        isAdmin={userRole === 'admin'}
                        size="lg"
                      />
                    </div>
                  </div>

                  {/* Display Name & @AppUsername */}
                  <div className="space-y-0.5 max-w-full">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-base text-white truncate max-w-[200px]">
                        {displayName}
                      </span>
                      <RoleBadge role={userRole} size="xs" />
                      {userMembership?.level && (
                        <MembershipBadge level={userMembership.level} size="xs" />
                      )}
                    </div>
                    <div className="text-xs text-cyan-400/90 font-mono">
                      @{appUsername}
                    </div>
                  </div>

                  {/* GAME USERNAME Box */}
                  <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      GAME USERNAME
                    </div>
                    <div className="font-mono font-black text-sm sm:text-base text-amber-300 tracking-wide select-all">
                      {post.gameUsername}
                    </div>
                  </div>

                  {/* CHAT BUTTON right below PFP / Identity Block */}
                  <div className="w-full pt-1">
                    <button
                      onClick={() => handleStartChatWithUser(post)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition group-hover:shadow-cyan-500/30"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{isOwnPost ? 'Chat with Yourself' : 'CHAT WITH TRADER'}</span>
                    </button>
                  </div>
                </div>

                {/* DESCRIPTION Section */}
                <div className="py-4 space-y-1.5 border-b border-slate-800/80">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                    <span>DESCRIPTION</span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 min-h-[50px]">
                    {post.description}
                  </div>
                </div>

                {/* CHARGES Section */}
                <div className="pt-4 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-extrabold flex items-center gap-1.5">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span>CHARGES</span>
                  </div>
                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-amber-200 font-semibold text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-inner">
                    {post.charges}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Load More Button */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="py-2.5 px-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Loading more listings...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Load More Mid Man Listings</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* OWNER ADMIN CREATE / EDIT MODAL                           */}
      {/* ========================================================= */}
      {modalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-black text-white tracking-tight">
                    {editingPost ? 'Edit Mid Man Post' : 'Create Mid Man Post'}
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Owner Admin post creation with automatic app user profile lookup.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePost} className="space-y-4">
              {/* 1. Category Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-300">
                  Select Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormCategory('account_trades')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      formCategory === 'account_trades'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>ACCOUNT TRADES</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory('upi_trade')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      formCategory === 'upi_trade'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>UPI TRADE</span>
                  </button>
                </div>
              </div>

              {/* 2. APP USERNAME with Automatic Profile Lookup */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center justify-between">
                  <span>App Username *</span>
                  <span className="text-[10px] text-slate-500 font-normal lowercase">
                    auto-resolves profile &amp; pfp
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={formAppUsername}
                    onChange={(e) => {
                      setFormAppUsername(e.target.value);
                      triggerUserLookup(e.target.value);
                    }}
                    placeholder="Enter existing app username (e.g. strike, trader1)"
                    className="w-full pl-8 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {searchingUser ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : resolvedUser ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : formAppUsername ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : null}
                  </div>
                </div>

                {/* Auto-resolved User Preview */}
                {resolvedUser && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center gap-3 animate-in fade-in">
                    <CircularProfileAvatar
                      src={resolvedUser.profilePhoto || resolvedUser.avatarUrl}
                      alt={resolvedUser.username}
                      role={resolvedUser.role}
                      membership={resolvedUser.membership}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">
                          {stripSpoofedRoleTags(resolvedUser.name || resolvedUser.username)}
                        </span>
                        <RoleBadge role={resolvedUser.role} size="xs" />
                      </div>
                      <div className="text-[10px] text-emerald-300 font-mono truncate">
                        @{resolvedUser.username} (UID: {resolvedUser.uid.slice(0, 8)}...)
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                      Verified
                    </span>
                  </div>
                )}

                {userLookupError && (
                  <div className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{userLookupError}</span>
                  </div>
                )}
              </div>

              {/* 3. GAME USERNAME */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-300">
                  Game Username *
                </label>
                <input
                  type="text"
                  required
                  value={formGameUsername}
                  onChange={(e) => setFormGameUsername(e.target.value)}
                  placeholder="Player IGN / Minecraft username / In-game handle"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>

              {/* 4. DESCRIPTION */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-300">
                  Trade / Service Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Enter details about the account, networth, items, skill levels, or exchange terms..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition resize-none"
                />
              </div>

              {/* 5. CHARGES */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Charges &amp; Payment Details *</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formCharges}
                  onChange={(e) => setFormCharges(e.target.value)}
                  placeholder="e.g. 5% Escrow Fee / ₹500 via UPI / Free for verified members..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 focus:border-amber-400 text-xs sm:text-sm text-amber-200 placeholder-amber-500/40 focus:outline-none transition resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingForm || !resolvedUser || !formGameUsername.trim()}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  {submittingForm ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{editingPost ? 'Update Post' : 'Publish Post'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Mid Man */}
      <DeleteConfirmModal
        isOpen={!!deleteTargetPost}
        title="Confirm Mid Man Listing Deletion"
        itemTypeLabel="Mid Man Escrow Listing"
        itemName={deleteTargetPost ? `@${deleteTargetPost.appUsername} (${deleteTargetPost.gameUsername})` : ''}
        warningText="Are you sure you want to permanently delete this verified Mid Man listing? This action cannot be undone."
        confirmButtonText="Confirm Delete"
        cancelButtonText="Cancel"
        isDeleting={isDeletingPost}
        errorMessage={deletePostError}
        onConfirm={handleConfirmDeletePost}
        onCancel={() => {
          setDeleteTargetPost(null);
          setDeletePostError(null);
        }}
      />
    </div>
  );
};
