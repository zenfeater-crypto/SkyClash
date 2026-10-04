import React, { useState, useEffect, useMemo } from 'react';
import { 
  Scale, 
  Search, 
  Plus, 
  MessageSquare, 
  Bookmark, 
  Flag, 
  Trash2, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Filter, 
  User, 
  Crown, 
  ShieldAlert, 
  ShieldCheck, 
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  Lock,
  LogIn,
  Hourglass
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  startAfter, 
  getDocs,
  DocumentSnapshot,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { usePets } from '../context/PetsContext';
import { useUserData } from '../context/UserDataContext';
import { TradePost, TradePostItem, UserRole } from '../types';
import { formatCoins, formatTimeAgo } from '../lib/formatters';
import { parseCoinStringToNumber } from '../lib/itemHelpers';
import { RoleBadge } from '../components/RoleBadge';
import { stripSpoofedRoleTags } from '../lib/validation';
import { UserProfileModal } from '../components/UserProfileModal';

function formatTradeExpiry(expiresAt?: number, createdAt?: number): string {
  const expiry = expiresAt || (createdAt ? createdAt + 24 * 60 * 60 * 1000 : 0);
  const diff = expiry - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

interface TradeFeedViewProps {
  onOpenCalculator: () => void;
  onOpenPrivateChat: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: UserRole }) => void;
  onOpenReportModal: (targetType: 'trade_post', targetId: string, targetUsername?: string) => void;
  onOpenAuth: () => void;
  onSelectItem?: (itemId: string) => void;
  onNavigateToSettings?: () => void;
}

const PAGE_SIZE = 15;

export const TradeFeedView: React.FC<TradeFeedViewProps> = ({
  onOpenCalculator,
  onOpenPrivateChat,
  onOpenReportModal,
  onOpenAuth,
  onSelectItem,
  onNavigateToSettings,
}) => {
  const { currentUser, userProfile, isAdmin, isOfficer, canDeleteChats } = useAuth();
  const { items } = useItems();
  const { pets } = usePets();
  const { isFavorite, toggleFavorite } = useUserData();

  const [posts, setPosts] = useState<TradePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BOOKMARKED' | 'MY_POSTS'>('ALL');

  // User Profile Popup state
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [selectedUserMeta, setSelectedUserMeta] = useState<{
    username: string;
    name?: string;
    avatar?: string;
    role?: UserRole | string;
  } | null>(null);

  // Deletion feedback
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Live real-time ticker for 24h expiration (updates every 10s without page reload)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Initial load with Firestore pagination (only for signed-in users)
  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'trade_posts'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TradePost[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as TradePost);
        });
        setPosts(list);
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length >= PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.warn('Trade posts listener notice:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Load next page
  const handleLoadMore = async () => {
    if (!lastVisibleDoc || loadingMore) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, 'trade_posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisibleDoc),
        limit(PAGE_SIZE)
      );

      const snap = await getDocs(q);
      const nextList: TradePost[] = [];
      snap.forEach((d) => {
        nextList.push({ id: d.id, ...d.data() } as TradePost);
      });

      setPosts((prev) => [...prev, ...nextList]);
      setLastVisibleDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more trade posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Opportunistic auto-delete of expired posts (compatible with no-cost / ₹0 goal, no Cloud Functions)
  useEffect(() => {
    if (!currentUser || posts.length === 0) return;
    const now = Date.now();
    const expiredList = posts.filter((p) => {
      const expiry = p.expiresAt || (p.createdAt ? p.createdAt + 24 * 60 * 60 * 1000 : 0);
      return expiry > 0 && expiry <= now;
    });

    expiredList.forEach(async (p) => {
      const isOwner = currentUser.uid === p.posterUid;
      if (isOwner || isAdmin || isOfficer || canDeleteChats) {
        try {
          await deleteDoc(doc(db, 'trade_posts', p.id));
        } catch {
          // ignore background cleanup errors
        }
      }
    });
  }, [posts, currentTime, currentUser, isAdmin, isOfficer, canDeleteChats]);

  // Delete trade post (Owner, Staff, or JMD with deleteChats permission)
  const handleDeletePost = async (post: TradePost) => {
    const isOwner = currentUser?.uid === post.posterUid;
    const canDelete = isOwner || isAdmin || isOfficer || canDeleteChats;

    if (!canDelete) return;

    if (!isAdmin && !isOwner && (post.posterUsername === 'strike' || (post as any).posterRole === 'admin')) {
      alert('Action Prohibited: You cannot delete posts created by the Owner Admin.');
      return;
    }

    if (!confirm('Are you sure you want to delete this trade post?')) return;

    setDeletingId(post.id);
    try {
      await deleteDoc(doc(db, 'trade_posts', post.id));
      if (!isOwner && userProfile) {
        await addDoc(collection(db, 'moderationHistory'), {
          action: 'CHAT_MESSAGE_DELETED',
          targetUid: post.posterUid,
          targetUsername: post.posterUsername,
          performedByUid: userProfile.uid,
          performedByUsername: userProfile.username,
          performedByRole: userProfile.role,
          adminUid: userProfile.uid,
          ...(userProfile.role === 'jmd' ? { jmdUid: userProfile.uid, jmdUsername: userProfile.username } : {}),
          timestamp: Date.now(),
          reason: 'Trade post removed by moderator',
          details: { postId: post.id, note: post.note || '' },
        }).catch((err) => console.warn('Audit record failed:', err));
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setActionSuccess('Trade post removed.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting trade post:', err);
      alert(err.message || 'Failed to delete trade post.');
    } finally {
      setDeletingId(null);
    }
  };

  // Start chat with poster
  const handleStartChatWithPoster = (post: TradePost) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (currentUser.uid === post.posterUid) {
      alert('This is your own trade post.');
      return;
    }

    const sortedUids = [currentUser.uid, post.posterUid].sort();
    const friendshipId = sortedUids.join('_');

    onOpenPrivateChat(friendshipId, {
      uid: post.posterUid,
      username: post.posterUsername,
      name: post.posterDisplayName,
      avatarUrl: post.posterPhotoURL,
      role: post.posterRole as UserRole,
    });
  };

  // Helper to resolve LIVE item data from Value List (single source of truth)
  const resolveLiveItem = (it: TradePostItem) => {
    // 1. Check Pet catalog
    if (it.category === 'Pet' || it.petTier) {
      const pet = pets.find((p) => p.id === it.itemId);
      if (pet) {
        const tier = (it.petTier || it.variant || 'P5').toLowerCase() as 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10';
        const displayVal = (pet as any)[tier] || it.displayValue || '';
        const numVal = parseCoinStringToNumber(displayVal) || it.unitValue || 0;
        return {
          id: pet.id,
          name: pet.name,
          image: pet.image || it.image,
          displayValue: displayVal,
          unitValue: numVal,
          category: 'Pet' as const,
        };
      }
    }

    // 2. Check Item catalog (Swords, Armour, Future categories)
    const item = items.find((i) => i.id === it.itemId);
    if (item) {
      let displayVal = it.displayValue || '';
      let numVal = it.unitValue || item.value;

      if (item.category === 'Sword') {
        const isRare = it.variant === 'rare';
        displayVal = isRare ? (item.rareValue || item.normalValue || '') : (item.normalValue || '');
        numVal = isRare ? (item.numericRareValue || item.value) : item.value;
      } else if (item.category === 'Armour') {
        const isFivePiece = it.variant === '5/5';
        displayVal = isFivePiece ? (item.fivePieceValue || '') : (item.fourPieceValue || '');
        numVal = isFivePiece ? (item.numericFivePieceValue || item.value) : item.value;
      } else {
        displayVal = item.normalValue || formatCoins(item.value);
        numVal = item.value;
      }

      return {
        id: item.id,
        name: item.name,
        image: item.image || it.image,
        displayValue: displayVal,
        unitValue: numVal,
        category: item.category,
      };
    }

    // Fallback if deleted from catalog
    return {
      id: it.itemId,
      name: it.name,
      image: it.image || 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=100&auto=format&fit=crop&q=80',
      displayValue: it.displayValue || formatCoins(it.unitValue || 0),
      unitValue: it.unitValue || 0,
      category: it.category || 'Sword',
    };
  };

  // Recalculate totals dynamically using live item values
  const computeLiveTotals = (yourItems: TradePostItem[], myItems: TradePostItem[]) => {
    const liveYour = (yourItems || []).map((it) => {
      const live = resolveLiveItem(it);
      return { ...it, live };
    });

    const liveMy = (myItems || []).map((it) => {
      const live = resolveLiveItem(it);
      return { ...it, live };
    });

    const yourTotalNum = liveYour.reduce((acc, it) => acc + (it.live.unitValue * (it.quantity || 1)), 0);
    const myTotalNum = liveMy.reduce((acc, it) => acc + (it.live.unitValue * (it.quantity || 1)), 0);

    const diff = Math.abs(yourTotalNum - myTotalNum);
    const pct = myTotalNum > 0 ? (Math.abs(yourTotalNum - myTotalNum) / myTotalNum) * 100 : (yourTotalNum > 0 ? 100 : 0);

    let direction: 'up' | 'down' | 'equal' = 'equal';
    if (yourTotalNum > myTotalNum) direction = 'up';
    else if (yourTotalNum < myTotalNum) direction = 'down';

    return {
      liveYour,
      liveMy,
      yourTotalNum,
      myTotalNum,
      diff,
      pct: Math.round(pct),
      direction,
    };
  };

  // Filter posts by active expiration (strictly <24 hours), search query & filter tab
  const filteredPosts = useMemo(() => {
    const now = currentTime;
    // 1. Exclude any post whose 24-hour expiration has passed
    let result = posts.filter((p) => {
      const expiry = p.expiresAt || (p.createdAt ? p.createdAt + 24 * 60 * 60 * 1000 : 0);
      return expiry === 0 || expiry > now;
    });

    // 2. Filter type
    if (filterType === 'BOOKMARKED') {
      result = result.filter((p) => isFavorite(p.id));
    } else if (filterType === 'MY_POSTS' && currentUser) {
      result = result.filter((p) => p.posterUid === currentUser.uid);
    }

    // 3. Search query: username, display name, item name
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => {
        const matchUser = p.posterUsername?.toLowerCase().includes(q) || p.posterDisplayName?.toLowerCase().includes(q);
        const matchYourItems = p.yourItems?.some((it) => it.name.toLowerCase().includes(q));
        const matchMyItems = p.myItems?.some((it) => it.name.toLowerCase().includes(q));
        const matchNote = p.note?.toLowerCase().includes(q);
        return matchUser || matchYourItems || matchMyItems || matchNote;
      });
    }

    return result;
  }, [posts, currentTime, searchQuery, filterType, currentUser, isFavorite]);

  // SIGN-IN REQUIRED: Block unauthenticated users from Trade Feed
  if (!currentUser) {
    return (
      <div className="w-full flex items-center justify-center p-6 py-20 animate-in fade-in duration-200">
        <div className="max-w-md w-full text-center bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sign in to view Trade Feed
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Trade Feed is an authenticated marketplace for verified Skyblock players. Sign in to browse player offers, post your own trades, and negotiate deals.
            </p>
          </div>

          <button
            onClick={onOpenAuth}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-cyan-500/20 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Trade Feed</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Community Trade Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Live Market Trades & Offers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Browse real trader offers with live valuation sync from our official Value List. Connect directly via private chat.
          </p>
        </div>

        <button
          onClick={onOpenCalculator}
          className="relative z-10 py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Post My Trade</span>
        </button>

        {/* Ambient glow decoration */}
        <div className="absolute right-0 top-0 w-72 h-72 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username, trader name, or offered item..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-400 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sub-Filters: All / Bookmarked / My Posts */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              filterType === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
            }`}
          >
            All Trades ({posts.length})
          </button>

          <button
            onClick={() => {
              if (!currentUser) onOpenAuth();
              else setFilterType('BOOKMARKED');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              filterType === 'BOOKMARKED'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved</span>
          </button>

          {currentUser && (
            <button
              onClick={() => setFilterType('MY_POSTS')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                filterType === 'MY_POSTS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
              }`}
            >
              My Posts
            </button>
          )}
        </div>
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs font-mono">Loading community trade posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto space-y-3">
          <Scale className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-white">No Trade Posts Found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery
              ? 'No trades matched your search query. Try searching for a different item or trader.'
              : filterType === 'BOOKMARKED'
              ? 'You have not saved any trade posts yet. Tap the bookmark icon on any trade to save it.'
              : 'Be the first player to publish a trade offer to the public feed!'}
          </p>
          <button
            onClick={onOpenCalculator}
            className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20"
          >
            Create Trade Offer
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post) => {
            const isOwner = currentUser?.uid === post.posterUid;
            const canDelete = isOwner || isAdmin || isOfficer;
            const bookmarked = isFavorite(post.id);
            const { liveYour, liveMy, yourTotalNum, myTotalNum, diff, pct, direction } = computeLiveTotals(post.yourItems, post.myItems);

            const posterDisplayName = stripSpoofedRoleTags(post.posterDisplayName || post.posterUsername) || post.posterUsername || 'Trader';
            const posterUsername = post.posterUsername || 'trader';
            const posterAvatar = post.posterPhotoURL || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${posterUsername}`;

            return (
              <div
                key={post.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 transition group"
              >
                {/* Header: Poster Info, Time, Badges & Action Buttons */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3 flex-wrap">
                  {/* Poster click opens profile popup */}
                  <div
                    onClick={() => {
                      setSelectedUserUid(post.posterUid);
                      setSelectedUserMeta({
                        username: posterUsername,
                        name: posterDisplayName,
                        avatar: posterAvatar,
                        role: post.posterRole,
                      });
                    }}
                    className="flex items-center gap-3 cursor-pointer group/user"
                    title="View Trader Profile"
                  >
                    <div className="relative">
                      <img
                        src={posterAvatar}
                        alt={posterUsername}
                        className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 object-cover group-hover/user:border-cyan-400 transition"
                      />
                      <div className="absolute -bottom-1 -right-1">
                        <RoleBadge role={post.posterRole} size="xs" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-white group-hover/user:text-cyan-300 transition">
                          {posterDisplayName}
                        </span>
                        <span className="text-xs text-cyan-400/90 font-mono font-normal">
                          @{posterUsername}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatTimeAgo(post.createdAt)}</span>
                        </span>
                        <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Auto-expires in 24 hours">
                          <Hourglass className="w-3 h-3 text-amber-400 animate-pulse" />
                          <span>{formatTradeExpiry(post.expiresAt, post.createdAt)}</span>
                        </span>
                        {isOwner && (
                          <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/30">
                            Your Post
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Actions: Chat, Bookmark, Report, Delete */}
                  <div className="flex items-center gap-1.5">
                    {/* Chat button */}
                    {!isOwner && (
                      <button
                        onClick={() => handleStartChatWithPoster(post)}
                        className="py-1.5 px-3 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                        title="Start Private Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    )}

                    {/* Bookmark button */}
                    <button
                      onClick={() => {
                        if (!currentUser) onOpenAuth();
                        else toggleFavorite(post.id).catch(console.error);
                      }}
                      className={`p-2 rounded-xl border transition ${
                        bookmarked
                          ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-pink-400 hover:border-pink-500/30'
                      }`}
                      title={bookmarked ? 'Remove bookmark' : 'Bookmark this trade'}
                    >
                      <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                    </button>

                    {/* Report button */}
                    {!isOwner && (
                      <button
                        onClick={() => {
                          if (!currentUser) onOpenAuth();
                          else onOpenReportModal('trade_post', post.id, posterUsername);
                        }}
                        className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 hover:text-amber-400 hover:border-amber-500/30 transition"
                        title="Report Trade Post"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete button (Owner / Admin / Officer) */}
                    {canDelete && (
                      <button
                        onClick={() => handleDeletePost(post)}
                        disabled={deletingId === post.id}
                        className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition"
                        title="Delete Trade Post"
                      >
                        {deletingId === post.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* TRADE CARD: TWO CLEARLY SEPARATED SIDES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SIDE 1: YOUR OFFER (Items from other trader) */}
                  <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-mono font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <span>YOUR OFFER</span>
                      </span>
                      <span className="text-xs font-mono font-black text-cyan-300">
                        {formatCoins(yourTotalNum)}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[70px]">
                      {liveYour.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-600 font-mono">
                          (No items listed)
                        </div>
                      ) : (
                        liveYour.map((it, idx) => (
                          <div
                            key={idx}
                            onClick={() => onSelectItem?.(it.itemId)}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={it.live.image}
                                alt={it.live.name}
                                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 object-cover shrink-0"
                              />
                              <div className="truncate">
                                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                                  <span>{it.live.name}</span>
                                  {it.quantity > 1 && (
                                    <span className="text-[10px] text-cyan-400 font-mono">
                                      x{it.quantity}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {it.variant && <span className="uppercase text-slate-500 mr-1.5">{it.variant}</span>}
                                  <span>{it.live.displayValue}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-cyan-300 ml-2 shrink-0">
                              {formatCoins(it.live.unitValue * (it.quantity || 1))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 text-[11px]">YOUR TOTAL:</span>
                      <span className="font-extrabold text-cyan-400 text-sm">
                        {formatCoins(yourTotalNum)}
                      </span>
                    </div>
                  </div>

                  {/* SIDE 2: MY OFFER (Items from post creator) */}
                  <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-mono font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <span>MY OFFER</span>
                      </span>
                      <span className="text-xs font-mono font-black text-purple-300">
                        {formatCoins(myTotalNum)}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[70px]">
                      {liveMy.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-600 font-mono">
                          (No items listed)
                        </div>
                      ) : (
                        liveMy.map((it, idx) => (
                          <div
                            key={idx}
                            onClick={() => onSelectItem?.(it.itemId)}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 cursor-pointer transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={it.live.image}
                                alt={it.live.name}
                                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 object-cover shrink-0"
                              />
                              <div className="truncate">
                                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                                  <span>{it.live.name}</span>
                                  {it.quantity > 1 && (
                                    <span className="text-[10px] text-purple-400 font-mono">
                                      x{it.quantity}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {it.variant && <span className="uppercase text-slate-500 mr-1.5">{it.variant}</span>}
                                  <span>{it.live.displayValue}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-purple-300 ml-2 shrink-0">
                              {formatCoins(it.live.unitValue * (it.quantity || 1))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 text-[11px]">MY TOTAL:</span>
                      <span className="font-extrabold text-purple-400 text-sm">
                        {formatCoins(myTotalNum)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TRADE SUMMARY BAR: DIFFERENCE & PERCENTAGE */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">DIFFERENCE</span>
                      <span className="font-extrabold text-white text-sm">
                        {formatCoins(diff)}
                      </span>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">MARGIN / DIFF %</span>
                      <div className="flex items-center gap-1 font-bold">
                        {direction === 'up' && (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <TrendingUp className="w-3.5 h-3.5" /> +{pct}% ↑
                          </span>
                        )}
                        {direction === 'down' && (
                          <span className="text-rose-400 flex items-center gap-0.5">
                            <TrendingDown className="w-3.5 h-3.5" /> -{pct}% ↓
                          </span>
                        )}
                        {direction === 'equal' && (
                          <span className="text-cyan-400">
                            0% (Fair Value)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {post.note && (
                    <div className="text-slate-400 text-xs italic bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800/60 max-w-sm truncate">
                      "{post.note}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination Load More Button */}
          {hasMore && (
            <div className="pt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="py-2.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-white transition flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Loading more trades...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-cyan-400" />
                    <span>Load More Trades</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Profile Popup Modal */}
      {selectedUserUid && (
        <UserProfileModal
          isOpen={!!selectedUserUid}
          onClose={() => {
            setSelectedUserUid(null);
            setSelectedUserMeta(null);
          }}
          uid={selectedUserUid}
          initialUsername={selectedUserMeta?.username}
          initialName={selectedUserMeta?.name}
          initialAvatar={selectedUserMeta?.avatar}
          initialRole={selectedUserMeta?.role as UserRole}
          onOpenPrivateChat={onOpenPrivateChat}
          onOpenReportModal={(targetType, targetId, username) => onOpenReportModal('trade_post', targetId, username)}
          onNavigateToSettings={onNavigateToSettings}
        />
      )}
    </div>
  );
};
