import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Swords, 
  Bed, 
  Calendar, 
  Clock, 
  Users, 
  Gift, 
  Coins, 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  ArrowLeft, 
  Filter, 
  Sparkles, 
  AlertCircle, 
  Crown,
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  Flame,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  getDocs, 
  where, 
  limit 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Tournament, TournamentCategory } from '../../types';
import { AdminTournamentModal } from './AdminTournamentModal';
import { AdminTournamentRegistrationModal } from './AdminTournamentRegistrationModal';
import { TournamentJoinModal } from './TournamentJoinModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { getTournamentEntryFeeCoins } from '../../lib/tournamentService';

interface TournamentsViewProps {
  initialCategory?: TournamentCategory;
  onOpenAuth: () => void;
  onOpenPrivateChat?: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: any }) => void;
  onBackToLanding: () => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({
  initialCategory,
  onOpenAuth,
  onOpenPrivateChat,
  onBackToLanding,
}) => {
  const { currentUser, userProfile, isAdmin, hasUnlimitedCoins } = useAuth();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<'all' | TournamentCategory>(
    initialCategory || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Tournaments state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tournamentToEdit, setTournamentToEdit] = useState<Tournament | null>(null);
  const [registrationTarget, setRegistrationTarget] = useState<Tournament | null>(null);
  const [joinTarget, setJoinTarget] = useState<Tournament | null>(null);

  // Delete tournament confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast / notification
  const [notification, setNotification] = useState<string | null>(null);

  // Real-time listener for tournaments
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Tournament[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Tournament);
        });
        setTournaments(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching tournaments:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter tournaments:
  // - Public users only see published tournaments (`isPublished !== false`)
  // - Owner Admin can see both published and unpublished draft tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      // Visibility check
      if (!isAdmin && t.isPublished === false) {
        return false;
      }

      // Category check
      if (selectedCategory !== 'all' && t.category !== selectedCategory) {
        return false;
      }

      // Search query check
      if (searchQuery.trim()) {
        const queryTerm = searchQuery.toLowerCase().trim();
        const matchesName = t.name?.toLowerCase().includes(queryTerm);
        const matchesDesc = t.description?.toLowerCase().includes(queryTerm);
        const matchesDate = t.dateAndTiming?.toLowerCase().includes(queryTerm);
        if (!matchesName && !matchesDesc && !matchesDate) {
          return false;
        }
      }

      return true;
    });
  }, [tournaments, selectedCategory, searchQuery, isAdmin]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. CHAT TO REGISTER
  // When a user taps the button, open existing Private Chat with Owner Admin "Strike"
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleChatToRegister = async (tournament: Tournament) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!onOpenPrivateChat) {
      alert('Private chat is currently unavailable.');
      return;
    }

    try {
      // Find Owner Admin Strike's profile in Firestore
      const usersRef = collection(db, 'users');
      // Try finding user with username 'strike' or normalizedUsername 'strike' or role 'admin'
      const qStrike = query(usersRef, where('normalizedUsername', '==', 'strike'), limit(1));
      let snap = await getDocs(qStrike);

      let strikeUid = '';
      let strikeUsername = 'strike';
      let strikeName = 'Strike (Owner Admin)';
      let strikeAvatar: string | undefined = undefined;
      let strikeRole = 'admin';

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        strikeUid = docSnap.id;
        strikeUsername = data.username || 'strike';
        strikeName = data.name || data.displayName || 'Strike';
        strikeAvatar = data.profilePhoto || data.avatarUrl;
        strikeRole = data.role || 'admin';
      } else {
        // Fallback search by role == 'admin'
        const qAdmin = query(usersRef, where('role', '==', 'admin'), limit(1));
        const adminSnap = await getDocs(qAdmin);
        if (!adminSnap.empty) {
          const docSnap = adminSnap.docs[0];
          const data = docSnap.data();
          strikeUid = docSnap.id;
          strikeUsername = data.username || 'strike';
          strikeName = data.name || 'Strike (Owner Admin)';
          strikeAvatar = data.profilePhoto || data.avatarUrl;
          strikeRole = 'admin';
        } else {
          // Fallback constant admin uid
          strikeUid = 'admin_strike_official';
          strikeUsername = 'strike';
          strikeName = 'Strike (Owner Admin)';
        }
      }

      // If user is Strike themselves, inform them or open registrations
      if (currentUser.uid === strikeUid || userProfile?.username?.toLowerCase() === 'strike') {
        setRegistrationTarget(tournament);
        return;
      }

      // Generate friendship ID with Owner Admin Strike
      const sortedUids = [currentUser.uid, strikeUid].sort();
      const friendshipId = sortedUids.join('_');

      // Open existing Private Chat with Owner Admin Strike
      onOpenPrivateChat(friendshipId, {
        uid: strikeUid,
        username: strikeUsername,
        name: strikeName,
        avatarUrl: strikeAvatar,
        role: strikeRole as any,
      });
    } catch (err: any) {
      console.error('Error opening chat with Strike:', err);
      // Fallback open chat
      const fallbackAdminUid = 'admin_strike_official';
      const sortedUids = [currentUser.uid, fallbackAdminUid].sort();
      const friendshipId = sortedUids.join('_');
      onOpenPrivateChat(friendshipId, {
        uid: fallbackAdminUid,
        username: 'strike',
        name: 'Strike (Owner Admin)',
        role: 'admin' as any,
      });
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. DELETE CONFIRMATION & DELETION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleConfirmDeleteTournament = async () => {
    if (!deleteTarget) return;

    if (!isAdmin) {
      setDeleteError('Permission Denied: Only Owner Admin Strike can delete tournaments.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Delete tournament document from Firestore
      await deleteDoc(doc(db, 'tournaments', deleteTarget.id));

      // Clean up local list immediately
      setTournaments((prev) => prev.filter((t) => t.id !== deleteTarget.id));

      setNotification(`Tournament "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Error deleting tournament:', err);
      setDeleteError(err.message || 'Failed to delete tournament. Please check permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLanding}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Return to Wars Arena Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>OFFICIAL SANCTIONED COMPETITION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              TOURNAMENTS HUB
            </h1>
          </div>
        </div>

        {/* Right Admin Action: Create Tournament (Visible ONLY to Owner Admin Strike) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setTournamentToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>CREATE TOURNAMENT</span>
          </button>
        )}
      </div>

      {/* Hero Tournament Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-6 sm:p-7 shadow-2xl shadow-amber-500/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> OFFICIAL ADMIN BRACKETS
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Competitive Skyblock & Bedwars Tournaments
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Curated competitive brackets, high-stakes prize pools, and live player rosters managed exclusively by Owner Admin <strong className="text-amber-400">Strike</strong>. 
              Tap <strong className="text-amber-400">CHAT TO REGISTER</strong> on any tournament to request your official registration slot.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {currentUser && (
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-center shadow-lg shadow-amber-500/10">
                <div className="text-lg font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                  <span>🪙</span>
                  <span>{hasUnlimitedCoins ? '∞' : (userProfile?.coinBalance || 0).toLocaleString()}</span>
                  {hasUnlimitedCoins && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[10px] text-amber-300/80 uppercase font-mono font-bold">
                  {hasUnlimitedCoins ? 'Unlimited 👑' : 'Your Balance'}
                </div>
              </div>
            )}

            <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="text-lg font-black text-amber-400 font-mono">
                {filteredTournaments.length}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Active Events</div>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="text-lg font-black text-cyan-400 font-mono">
                Strike
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Owner Admin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-emerald-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Tabs: ALL | SKYBLOCK | BEDWARS */}
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 self-start sm:self-auto shadow-md">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>ALL TOURNAMENTS</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('skyblock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'skyblock'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>SKYBLOCK</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('bedwars')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'bedwars'
                ? 'bg-rose-500 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bed className="w-3.5 h-3.5" />
            <span>BEDWARS</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournaments by name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOURNAMENT FEED CARDS
          Each tournament card MUST display in this exact order:
          1. Tournament Name
          2. Tournament Banner
          3. Game/Category: Skyblock or Bedwars
          4. Tournament Date and Timing
          5. Registered Players / Maximum Players (e.g. 12/32)
          6. Winning Amount
          7. Entry Fee
          8. CHAT TO REGISTER button
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-slate-900/50 border border-slate-800 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-xs text-slate-400 font-mono">Loading tournaments...</span>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-black text-white">No Tournaments Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {searchQuery 
              ? `No tournaments matching "${searchQuery}". Try a different search term.` 
              : 'There are currently no scheduled tournaments in this category. Check back soon or message Owner Admin Strike!'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setTournamentToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Tournament</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTournaments.map((tournament) => {
            const isSkyblock = tournament.category === 'skyblock';
            const currentRegistered = tournament.registeredCount || 0;
            const max = tournament.maxPlayers || 32;
            const percentFilled = Math.min(100, Math.round((currentRegistered / max) * 100));
            const isFull = currentRegistered >= max;
            const entryFeeCoins = getTournamentEntryFeeCoins(tournament);
            const isUserRegistered = Boolean(
              currentUser &&
              Array.isArray(tournament.registeredUserUids) &&
              tournament.registeredUserUids.includes(currentUser.uid)
            );

            return (
              <div
                key={tournament.id}
                className="rounded-3xl bg-slate-900/95 border border-slate-800 hover:border-amber-500/40 p-5 sm:p-6 transition shadow-2xl flex flex-col justify-between gap-5 relative overflow-hidden group"
              >
                {/* Admin Status Pill & Management Bar (Visible only to Strike/Admin) */}
                {isAdmin && (
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 -mt-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${
                        tournament.isPublished 
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {tournament.isPublished ? '● PUBLISHED' : '○ DRAFT'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Admin Controls
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Manage Registrations */}
                      <button
                        type="button"
                        onClick={() => setRegistrationTarget(tournament)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold transition flex items-center gap-1"
                        title="Manage tournament roster"
                      >
                        <Users className="w-3 h-3" />
                        <span>Roster</span>
                      </button>

                      {/* Edit Tournament */}
                      <button
                        type="button"
                        onClick={() => {
                          setTournamentToEdit(tournament);
                          setIsCreateModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Edit tournament details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Tournament (Opens DeleteConfirmModal) */}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(tournament)}
                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 hover:border-red-500/40 transition"
                        title="Delete tournament"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    EXACT SPECIFIED DISPLAY ORDER:
                    1. Tournament Name
                    2. Tournament Banner
                    3. Game/Category: Skyblock or Bedwars
                    4. Tournament Date and Timing
                    5. Registered Players / Maximum Players (e.g. 12/32)
                    6. Winning Amount
                    7. Entry Fee
                    8. CHAT TO REGISTER button
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

                {/* 1. TOURNAMENT NAME */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug group-hover:text-amber-300 transition">
                    {tournament.name}
                  </h3>
                  {tournament.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {tournament.description}
                    </p>
                  )}
                </div>

                {/* 2. TOURNAMENT BANNER */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-800/90 aspect-[21/9] bg-slate-950 shadow-inner">
                  <img
                    src={tournament.bannerUrl}
                    alt={tournament.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                  {/* Corner Badge */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase backdrop-blur-md border ${
                      isSkyblock 
                        ? 'bg-amber-500/80 text-slate-950 border-amber-400' 
                        : 'bg-rose-500/80 text-white border-rose-400'
                    }`}>
                      {isSkyblock ? 'SKYBLOCK TOURNAMENT' : 'BEDWARS TOURNAMENT'}
                    </span>
                  </div>
                </div>

                {/* 3. GAME / CATEGORY: Skyblock or Bedwars */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Category:</span>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                    isSkyblock
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}>
                    {isSkyblock ? <Swords className="w-3.5 h-3.5 text-amber-400" /> : <Bed className="w-3.5 h-3.5 text-rose-400" />}
                    <span>{isSkyblock ? 'Skyblock Arena' : 'Bedwars Arena'}</span>
                  </div>
                </div>

                {/* 4. TOURNAMENT DATE AND TIMING */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Tournament Date and Timing
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{tournament.dateAndTiming}</span>
                    </div>
                  </div>
                </div>

                {/* 5. REGISTERED PLAYERS / MAXIMUM PLAYERS (e.g. 12/32) */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Registered Players / Maximum Players:</span>
                    </span>
                    <span className="font-black text-white text-sm">
                      {currentRegistered} / {max}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isFull 
                          ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                          : 'bg-gradient-to-r from-cyan-500 to-amber-400'
                      }`}
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                    <span>{percentFilled}% Filled</span>
                    <span>
                      {isFull ? (
                        <strong className="text-rose-400">Roster Full</strong>
                      ) : (
                        <strong className="text-emerald-400">{max - currentRegistered} Slots Available</strong>
                      )}
                    </span>
                  </div>
                </div>

                {/* 6. WINNING AMOUNT & 7. ENTRY FEE */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 6. Winning Amount */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30">
                    <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span>Winning Amount</span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-amber-400 tracking-tight">
                      {tournament.winningAmount}
                    </div>
                  </div>

                  {/* 7. Entry Fee */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Coins className="w-3.5 h-3.5 text-slate-400" />
                      <span>Entry Fee</span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-white tracking-tight">
                      {tournament.entryFee}
                    </div>
                  </div>
                </div>

                {/* USER AVAILABLE BALANCE PILL */}
                {currentUser && (
                  <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Available Balance:</span>
                    </span>
                    <span className="font-mono font-bold">
                      {hasUnlimitedCoins ? (
                        <span className="text-amber-400 flex items-center gap-1 font-black">
                          <span>Unlimited</span>
                          <Crown className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-white">
                          {(userProfile?.coinBalance ?? 0).toLocaleString()} coins
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* 8. REGISTRATION ACTIONS */}
                <div className="space-y-2 pt-1">
                  {/* Primary: JOIN TOURNAMENT Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        onOpenAuth();
                      } else {
                        setJoinTarget(tournament);
                      }
                    }}
                    disabled={isUserRegistered}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide uppercase shadow-xl flex items-center justify-center gap-2.5 transition active:scale-[0.99] group/btn ${
                      isUserRegistered
                        ? 'bg-slate-800/90 border border-emerald-500/40 text-emerald-400 cursor-default'
                        : isFull
                        ? 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25'
                    }`}
                  >
                    {isUserRegistered ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>REGISTERED</span>
                      </>
                    ) : isFull ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                        <span>ROSTER FULL (VIEW)</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 text-slate-950 group-hover/btn:scale-110 transition" />
                        <span>JOIN TOURNAMENT</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition" />
                      </>
                    )}
                  </button>

                  {/* Secondary: CHAT TO REGISTER */}
                  <button
                    type="button"
                    onClick={() => handleChatToRegister(tournament)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-mono text-xs flex items-center justify-center gap-2 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chat Strike (Owner Admin)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Tournament Modal */}
      {joinTarget && (
        <TournamentJoinModal
          isOpen={!!joinTarget}
          onClose={() => setJoinTarget(null)}
          tournament={joinTarget}
          onOpenAuth={onOpenAuth}
          onJoined={(res) => {
            setNotification(`Successfully registered for "${res.tournamentName}"!`);
            setTournaments((prev) =>
              prev.map((t) =>
                t.id === joinTarget.id
                  ? {
                      ...t,
                      registeredCount: (t.registeredCount || 0) + 1,
                      registeredUserUids: [...(t.registeredUserUids || []), currentUser?.uid || ''],
                    }
                  : t
              )
            );
            setJoinTarget(null);
          }}
        />
      )}

      {/* Admin Tournament Create / Edit Modal */}
      <AdminTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTournamentToEdit(null);
        }}
        tournamentToEdit={tournamentToEdit}
        onSaved={(saved) => {
          setNotification(`Tournament "${saved.name}" saved successfully.`);
        }}
      />

      {/* Admin Registration Manager Modal */}
      {registrationTarget && (
        <AdminTournamentRegistrationModal
          isOpen={!!registrationTarget}
          onClose={() => setRegistrationTarget(null)}
          tournament={registrationTarget}
          onTournamentUpdated={(updated) => {
            setTournaments((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          }}
        />
      )}

      {/* Universal Delete Confirmation Modal for Tournaments */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Confirm Tournament Deletion"
        itemTypeLabel="Competitive Tournament"
        itemName={deleteTarget?.name || ''}
        warningText="Are you sure you want to permanently delete this tournament? This will remove the tournament listing from the public feed. This action cannot be undone."
        confirmButtonText="Confirm Delete"
        cancelButtonText="Cancel"
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDeleteTournament}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
