import React, { useState, useEffect, useMemo } from 'react';
import { 
  Swords, 
  Bed, 
  Users, 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2, 
  Clock, 
  Coins, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  Flame, 
  Sparkles,
  Gamepad2,
  X,
  Filter
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { SoloDuoChallenge, SoloDuoGameType, SoloDuoMatchType } from '../../types';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { RoleBadge } from '../RoleBadge';
import { MembershipBadge } from '../MembershipBadge';
import { formatTimeAgo } from '../../lib/formatters';

interface SoloDuoWarsViewProps {
  initialGameType?: SoloDuoGameType;
  onOpenAuth: () => void;
  onOpenPrivateChat?: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: any }) => void;
  onBackToLanding: () => void;
}

const POSTING_FEE_COINS = 250;
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const EXPIRY_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

export const SoloDuoWarsView: React.FC<SoloDuoWarsViewProps> = ({
  initialGameType = 'skyblock',
  onOpenAuth,
  onOpenPrivateChat,
  onBackToLanding,
}) => {
  const { currentUser, userProfile, isAdmin, hasUnlimitedCoins } = useAuth();

  // Active filters
  const [gameType, setGameType] = useState<SoloDuoGameType>(initialGameType);
  const [matchTypeFilter, setMatchTypeFilter] = useState<'all' | SoloDuoMatchType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Challenges list
  const [challenges, setChallenges] = useState<SoloDuoChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formGameType, setFormGameType] = useState<SoloDuoGameType>(gameType);
  const [formMatchType, setFormMatchType] = useState<SoloDuoMatchType>('solo_vs_solo');
  const [formGameUsername, setFormGameUsername] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SoloDuoChallenge | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Remaining Cooldown live ticker
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastPostAt = userProfile?.lastChallengePostAt || 0;
  const timeSinceLastPost = now - lastPostAt;
  const isCooldownActive = timeSinceLastPost < COOLDOWN_DURATION_MS;
  const cooldownRemainingSeconds = isCooldownActive
    ? Math.ceil((COOLDOWN_DURATION_MS - timeSinceLastPost) / 1000)
    : 0;

  // Real-time listener for challenges
  useEffect(() => {
    const q = query(
      collection(db, 'solo_duo_challenges'),
      orderBy('createdAt', 'desc'),
      limit(40)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: SoloDuoChallenge[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as SoloDuoChallenge);
        });
        setChallenges(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching solo/duo challenges:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter challenges: Logical Expiry (expiresAt > now) + gameType + matchType + search
  const activeChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // 1. Logical Expiry: expired posts disappear from active feed
      if (c.expiresAt && c.expiresAt <= now) return false;

      // 2. Game type
      if (c.gameType !== gameType) return false;

      // 3. Match type
      if (matchTypeFilter !== 'all' && c.matchType !== matchTypeFilter) return false;

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesUsername = c.creatorUsername?.toLowerCase().includes(q);
        const matchesName = c.creatorName?.toLowerCase().includes(q);
        const matchesGameUser = c.gameUsername?.toLowerCase().includes(q);
        const matchesDesc = c.description?.toLowerCase().includes(q);
        if (!matchesUsername && !matchesName && !matchesGameUser && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [challenges, gameType, matchTypeFilter, searchQuery, now]);

  const handleOpenCreateModal = () => {
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }
    setFormGameType(gameType);
    setFormMatchType('solo_vs_solo');
    setFormGameUsername(userProfile.username || '');
    setFormDescription('');
    setSubmitError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    const trimmedGameUsername = formGameUsername.trim();
    const trimmedDesc = formDescription.trim();

    if (!trimmedGameUsername) {
      setSubmitError('Please enter your Minecraft in-game username.');
      return;
    }

    if (!trimmedDesc) {
      setSubmitError('Please enter challenge details (rules, armor, map, or conditions).');
      return;
    }

    // Check coin balance (250 coins required, except Owner Admin Strike who has unlimited coins)
    const currentBalance = userProfile.coinBalance || 0;
    if (!hasUnlimitedCoins && currentBalance < POSTING_FEE_COINS) {
      setSubmitError(`Insufficient coins. Posting a challenge costs ${POSTING_FEE_COINS} coins. You currently have ${currentBalance} coins. Claim your Daily Reward on Home to earn free coins!`);
      return;
    }

    // Check cooldown
    if (isCooldownActive) {
      const mins = Math.floor(cooldownRemainingSeconds / 60);
      const secs = cooldownRemainingSeconds % 60;
      setSubmitError(`Cooldown active. Please wait ${mins}m ${secs}s before creating another challenge.`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const currentTime = Date.now();
    const expiresAt = currentTime + EXPIRY_DURATION_MS;

    try {
      // 1. Create Challenge in Firestore
      await addDoc(collection(db, 'solo_duo_challenges'), {
        gameType: formGameType,
        matchType: formMatchType,
        creatorUid: currentUser.uid,
        creatorUsername: userProfile.username,
        creatorName: userProfile.name || userProfile.username,
        creatorAvatarUrl: userProfile.avatarUrl || '',
        creatorProfilePhoto: userProfile.profilePhoto || '',
        creatorRole: userProfile.role || 'user',
        creatorProfileFrameId: userProfile.profileFrameId || null,
        creatorTextFrameId: userProfile.textFrameId || null,
        creatorMembership: userProfile.membership || null,
        gameUsername: trimmedGameUsername,
        description: trimmedDesc,
        createdAt: currentTime,
        expiresAt: expiresAt,
      });

      // 2. Only deduct 250 coins for normal users (Owner Admin Strike has unlimited coins)
      const userDocRef = doc(db, 'users', currentUser.uid);
      if (!hasUnlimitedCoins) {
        await updateDoc(userDocRef, {
          coinBalance: increment(-POSTING_FEE_COINS),
          lastChallengePostAt: currentTime,
        });
      } else {
        await updateDoc(userDocRef, {
          lastChallengePostAt: currentTime,
        });
      }

      setIsCreateModalOpen(false);
      setActionNotice(
        hasUnlimitedCoins 
          ? 'Challenge created successfully! (Owner Admin Strike)' 
          : `Challenge created successfully! -${POSTING_FEE_COINS} Coins deducted.`
      );
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to create challenge:', err);
      // If the post fails, coins are NOT deducted
      setSubmitError(`Failed to create challenge: ${err.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChatWithCreator = (post: SoloDuoChallenge) => {
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    if (post.creatorUid === currentUser.uid) {
      setActionNotice('You cannot open a private chat with yourself.');
      setTimeout(() => setActionNotice(null), 3000);
      return;
    }

    const sortedUids = [currentUser.uid, post.creatorUid].sort();
    const friendshipId = sortedUids.join('_');

    if (onOpenPrivateChat) {
      onOpenPrivateChat(friendshipId, {
        uid: post.creatorUid,
        username: post.creatorUsername,
        name: post.creatorName || post.creatorUsername,
        avatarUrl: post.creatorProfilePhoto || post.creatorAvatarUrl || '',
        role: post.creatorRole,
      });
    }
  };

  const handleDeletePost = async () => {
    if (!deleteTarget || !isAdmin) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'solo_duo_challenges', deleteTarget.id));
      setDeleteTarget(null);
      setActionNotice('Challenge post removed successfully by Owner Admin.');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete challenge post:', err);
      alert('Failed to delete challenge: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatRemainingTime = (expiresAt: number) => {
    const diff = expiresAt - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const isBedwars = gameType === 'bedwars';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLanding}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Back to Wars Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className={`text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isBedwars ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {isBedwars ? <Bed className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
              <span>SOLO VS SOLO & DUO VS DUO ARENA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isBedwars ? 'Bedwars 1v1 & 2v2 Challenges' : 'Skyblock 1v1 & 2v2 Challenges'}
            </h1>
          </div>
        </div>

        {/* Action: Post Your Challenge button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className={`py-2.5 px-5 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition flex items-center gap-2 ${
              isBedwars
                ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/20'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>POST YOUR CHALLENGE</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 font-mono">
              250 🪙
            </span>
          </button>
        </div>
      </div>

      {/* Global Action Notification */}
      {actionNotice && (
        <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Hero Info Banner */}
      <div className={`relative rounded-3xl overflow-hidden border p-5 sm:p-6 shadow-xl ${
        isBedwars
          ? 'border-rose-500/30 bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-950'
          : 'border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-950'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className={`text-xs font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
              isBedwars ? 'text-rose-400' : 'text-amber-400'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Combat Matchmaking</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {isBedwars ? 'Fast 1v1 Scrims & 2v2 Doubles' : 'Direct Duels, Colosseum & Custom Fights'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Post your custom fight rules, gear limits, or map requirements. Challenges expire in 12 hours. 
              Click <strong>CHAT</strong> on any listing to initiate an instant private direct message!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Fee: 250 Coins</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>12h Expiration</span>
            </div>
            {isCooldownActive && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 animate-pulse">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Cooldown: {Math.floor(cooldownRemainingSeconds / 60)}m {cooldownRemainingSeconds % 60}s</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Type & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900/90 border border-slate-800">
        {/* Game Switcher Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
          <button
            onClick={() => setGameType('skyblock')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-2 ${
              gameType === 'skyblock'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>SKYBLOCK</span>
          </button>

          <button
            onClick={() => setGameType('bedwars')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-2 ${
              gameType === 'bedwars'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bed className="w-3.5 h-3.5" />
            <span>BEDWARS</span>
          </button>
        </div>

        {/* Match Type Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setMatchTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              matchTypeFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Challenges
          </button>
          <button
            onClick={() => setMatchTypeFilter('solo_vs_solo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              matchTypeFilter === 'solo_vs_solo'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Solo vs Solo (1v1)
          </button>
          <button
            onClick={() => setMatchTypeFilter('duo_vs_duo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              matchTypeFilter === 'duo_vs_duo'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Duo vs Duo (2v2)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player or rules..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Challenges Feed Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-mono">Loading active challenge feed...</p>
        </div>
      ) : activeChallenges.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900/50 border border-slate-800 p-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <Swords className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Active Challenges Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            There are currently no active {gameType === 'bedwars' ? 'Bedwars' : 'Skyblock'} challenges matching this filter.
            Be the first to post a duel!
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs shadow-lg active:scale-95 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>POST FIRST CHALLENGE</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeChallenges.map((challenge) => {
            const isSolo = challenge.matchType === 'solo_vs_solo';
            const isCreator = currentUser?.uid === challenge.creatorUid;

            return (
              <div
                key={challenge.id}
                className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 p-5 flex flex-col justify-between transition group shadow-xl relative overflow-hidden"
              >
                {/* Accent top gradient line */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  isSolo
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                }`} />

                <div>
                  {/* Card Header: Profile & Badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <CircularProfileAvatar
                        src={challenge.creatorProfilePhoto || challenge.creatorAvatarUrl}
                        alt={challenge.creatorUsername}
                        size="md"
                        profileFrameId={challenge.creatorProfileFrameId}
                        role={challenge.creatorRole}
                        membership={challenge.creatorMembership}
                        isAdmin={challenge.creatorRole === 'admin'}
                      />

                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap truncate">
                          <span className="truncate">{challenge.creatorName || challenge.creatorUsername}</span>
                          <RoleBadge role={challenge.creatorRole} size="sm" />
                          {challenge.creatorMembership?.level && (
                            <MembershipBadge
                              level={challenge.creatorMembership.level}
                              title={challenge.creatorMembership.title}
                              size="sm"
                            />
                          )}
                        </div>
                        <div className="text-xs text-cyan-400 font-mono truncate">
                          @{challenge.creatorUsername}
                        </div>
                      </div>
                    </div>

                    {/* Match Type Badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black font-mono tracking-wider uppercase border ${
                        isSolo
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                      }`}>
                        {isSolo ? '1v1 SOLO' : '2v2 DUO'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatRemainingTime(challenge.expiresAt)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Minecraft In-Game Username Row */}
                  <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-[11px] text-slate-400 font-mono">GAME USERNAME:</span>
                      <span className="text-xs font-black text-white font-mono truncate">
                        {challenge.gameUsername}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTimeAgo(challenge.createdAt)}
                    </span>
                  </div>

                  {/* Challenge Description */}
                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300 leading-relaxed mb-4 break-words">
                    <div className="text-[10px] text-slate-400 uppercase font-mono font-bold mb-1 tracking-wider">
                      CHALLENGE DETAILS:
                    </div>
                    {challenge.description}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleStartChatWithCreator(challenge)}
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/40 text-cyan-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>CHAT</span>
                  </button>

                  {/* Owner Admin Only Delete Button */}
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteTarget(challenge)}
                      className="p-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-950/60 border border-rose-500/30 transition"
                      title="Admin Delete Challenge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CHALLENGE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Post Your Challenge</h3>
                <p className="text-xs text-slate-400">Public 12-hour combat matchmaking feed</p>
              </div>
            </div>

            {/* Posting Fee Notice & Balance Check */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 mb-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Posting Fee:</span>
                <strong className="text-amber-300 font-mono">250 Coins</strong>
              </div>
              <div className="font-mono text-slate-400">
                Your Balance: <strong className="text-white">{(userProfile?.coinBalance || 0).toLocaleString()} 🪙</strong>
              </div>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              {/* Game Arena selection */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 uppercase">
                  1. Select Game Arena
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormGameType('skyblock')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
                      formGameType === 'skyblock'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Swords className="w-4 h-4" />
                    <span>Skyblock</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormGameType('bedwars')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
                      formGameType === 'bedwars'
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bed className="w-4 h-4" />
                    <span>Bedwars</span>
                  </button>
                </div>
              </div>

              {/* Match Type selection */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 uppercase">
                  2. Select Match Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormMatchType('solo_vs_solo')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
                      formMatchType === 'solo_vs_solo'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Solo vs Solo (1v1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormMatchType('duo_vs_duo')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
                      formMatchType === 'duo_vs_duo'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Duo vs Duo (2v2)</span>
                  </button>
                </div>
              </div>

              {/* Game Username */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 uppercase">
                  3. In-Game Minecraft Username
                </label>
                <input
                  type="text"
                  required
                  value={formGameUsername}
                  onChange={(e) => setFormGameUsername(e.target.value)}
                  placeholder="e.g. StrikePlayer123"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Challenge Details */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 uppercase">
                  4. Challenge Rules & Conditions
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Specify rules: gear limits, pots allowed or banned, map preference, timing..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Note on coins and cooldown */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>
                  • {hasUnlimitedCoins ? 'Owner Admin Strike has unlimited coins privilege (0 coins deducted).' : 'Exactly 250 coins are deducted ONLY upon successful post creation.'}
                </div>
                <div>• Challenge automatically vanishes after 12 hours.</div>
                <div>• 5-minute cooldown between challenge posts.</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || (!hasUnlimitedCoins && (userProfile?.coinBalance || 0) < POSTING_FEE_COINS) || isCooldownActive}
                  className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>{hasUnlimitedCoins ? 'CONFIRM & POST (ADMIN PASS)' : 'CONFIRM & POST (250 🪙)'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Delete Challenge Post?</h3>
            <p className="text-xs text-slate-300 mb-6">
              Owner Admin moderation: Remove challenge from <strong>@{deleteTarget.creatorUsername}</strong> ({deleteTarget.gameUsername})? 
              This post will be permanently deleted from the active challenge feed.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="py-2.5 px-5 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleDeletePost}
                disabled={deleting}
                className="py-2.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Post</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
