import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Calendar, 
  Trophy, 
  Coins,
  Crown
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  arrayUnion, 
  arrayRemove, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Tournament, TournamentRegistration, UserProfile } from '../../types';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { RoleBadge } from '../RoleBadge';
import { MembershipBadge } from '../MembershipBadge';
import { formatTimeAgo } from '../../lib/formatters';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { 
  getTournamentEntryFeeCoins, 
  adminRegisterPlayerWithCoins 
} from '../../lib/tournamentService';

interface AdminTournamentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onTournamentUpdated?: (updated: Tournament) => void;
}

export const AdminTournamentRegistrationModal: React.FC<AdminTournamentRegistrationModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onTournamentUpdated,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  // Registrations state
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(true);

  // Search player state
  const [searchUsername, setSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Registering action state
  const [chargePlayerFee, setChargePlayerFee] = useState(false);
  const entryFeeCoins = getTournamentEntryFeeCoins(tournament);
  const [isRegistering, setIsRegistering] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Delete registration confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<TournamentRegistration | null>(null);
  const [isDeletingReg, setIsDeletingReg] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Real-time listener for this tournament's registrations
  useEffect(() => {
    if (!isOpen || !tournament?.id) return;

    setLoadingRegistrations(true);
    const q = query(
      collection(db, 'tournament_registrations'),
      where('tournamentId', '==', tournament.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TournamentRegistration[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as TournamentRegistration);
        });
        // Sort newest registered first
        list.sort((a, b) => (b.registeredAt || 0) - (a.registeredAt || 0));
        setRegistrations(list);
        setLoadingRegistrations(false);
      },
      (err) => {
        console.error('Error fetching registrations:', err);
        setLoadingRegistrations(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, tournament?.id]);

  // Live registered count
  const currentCount = registrations.length;
  const isFull = currentCount >= (tournament.maxPlayers || 32);

  // Debounced search for players in `users` collection by app username
  useEffect(() => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setActionError(null);
      try {
        const term = searchUsername.trim().toLowerCase();
        // Query users with normalizedUsername prefix or get recent users
        const usersRef = collection(db, 'users');
        const qUsers = query(
          usersRef,
          where('normalizedUsername', '>=', term),
          where('normalizedUsername', '<=', term + '\uf8ff'),
          limit(8)
        );
        const snap = await getDocs(qUsers);
        const matches: UserProfile[] = [];
        snap.forEach((d) => {
          const u = { ...d.data(), uid: d.id } as UserProfile;
          matches.push(u);
        });

        // Fallback search by username if normalizedUsername returned empty
        if (matches.length === 0) {
          const qDirect = query(
            usersRef,
            where('username', '>=', term),
            where('username', '<=', term + '\uf8ff'),
            limit(8)
          );
          const snap2 = await getDocs(qDirect);
          snap2.forEach((d) => {
            if (!matches.some((m) => m.uid === d.id)) {
              matches.push({ ...d.data(), uid: d.id } as UserProfile);
            }
          });
        }

        setSearchResults(matches);
      } catch (err: any) {
        console.error('Search players error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchUsername]);

  // Official Register Action
  const handleRegisterPlayer = async () => {
    if (!selectedUser) {
      setActionError('Please select a player to register.');
      return;
    }

    if (!isAdmin) {
      setActionError('Permission Denied: Only Owner Admin Strike can officially register players.');
      return;
    }

    if (!currentUser || !userProfile) {
      setActionError('Admin user session is not available.');
      return;
    }

    // 1. Prevent duplicate registrations
    const alreadyRegistered = registrations.some(
      (r) => r.userUid === selectedUser.uid || r.appUsername?.toLowerCase() === selectedUser.username?.toLowerCase()
    );

    if (alreadyRegistered) {
      setActionError(`Duplicate Registration: @${selectedUser.username} is already registered for this tournament.`);
      return;
    }

    // 2. Enforce maximum player limit
    if (isFull) {
      setActionError(`Player limit reached: Maximum capacity of ${tournament.maxPlayers} players has been reached.`);
      return;
    }

    setIsRegistering(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await adminRegisterPlayerWithCoins(
        tournament.id,
        selectedUser,
        currentUser,
        userProfile,
        { chargePlayerFee: chargePlayerFee && entryFeeCoins > 0 }
      );

      if (!res.success) {
        setActionError(res.error || 'Failed to register player.');
        setIsRegistering(false);
        return;
      }

      // Update parent callback if provided
      if (onTournamentUpdated) {
        onTournamentUpdated({
          ...tournament,
          registeredCount: currentCount + 1,
          registeredUserUids: [...(tournament.registeredUserUids || []), selectedUser.uid],
        });
      }

      const feeNotice = res.coinsDeducted > 0
        ? ` (${res.coinsDeducted.toLocaleString()} coins deducted)`
        : ' (Complimentary Admin Pass)';

      setActionSuccess(`Player @${selectedUser.username} successfully registered for ${tournament.name}!${feeNotice}`);
      setSelectedUser(null);
      setSearchUsername('');
      setSearchResults([]);
      setChargePlayerFee(false);
    } catch (err: any) {
      console.error('Error registering player:', err);
      setActionError(err.message || 'Failed to register player. Please check permissions.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Official Remove Registration Action (Confirmed through DeleteConfirmModal)
  const handleConfirmDeleteRegistration = async () => {
    if (!deleteTarget) return;

    if (!isAdmin) {
      setDeleteError('Permission Denied: Only Owner Admin Strike can remove tournament registrations.');
      return;
    }

    setIsDeletingReg(true);
    setDeleteError(null);

    try {
      // Delete registration doc
      await deleteDoc(doc(db, 'tournament_registrations', deleteTarget.id));

      // Decrement count on tournament doc
      const tourneyRef = doc(db, 'tournaments', tournament.id);
      await updateDoc(tourneyRef, {
        registeredCount: increment(-1),
        registeredUserUids: arrayRemove(deleteTarget.userUid),
        updatedAt: Date.now(),
      });

      // Update parent callback if provided
      if (onTournamentUpdated) {
        onTournamentUpdated({
          ...tournament,
          registeredCount: Math.max(0, currentCount - 1),
          registeredUserUids: (tournament.registeredUserUids || []).filter((u) => u !== deleteTarget.userUid),
        });
      }

      setDeleteTarget(null);
      setActionSuccess(`Registration for @${deleteTarget.appUsername} removed.`);
    } catch (err: any) {
      console.error('Error removing registration:', err);
      setDeleteError(err.message || 'Failed to remove registration. Please check permissions.');
    } finally {
      setIsDeletingReg(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
                  OWNER ADMIN REGISTRATION CONTROL
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase">
                  {tournament.category.toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {tournament.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counter Summary Bar */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">Current Roster:</span>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black text-white font-mono">
                {currentCount} / {tournament.maxPlayers}
              </span>
              <span className="text-[11px] text-slate-400">Players</span>
            </div>

            {isFull ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase">
                ROSTER FULL
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                {tournament.maxPlayers - currentCount} Slots Open
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Winning: <strong className="text-amber-400">{tournament.winningAmount}</strong></span>
            <span>·</span>
            <span>Fee: <strong className="text-slate-200">{tournament.entryFee}</strong></span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Notification Alerts */}
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{actionError}</div>
              <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{actionSuccess}</div>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section 1: Search & Register Player (Admin Only) */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Register Player by App Username
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Admin Exclusive Action
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Search registered user by app username (e.g. strike, player1)..."
                disabled={isFull}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60 disabled:opacity-50"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Search Results Dropdown List */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
                {searchResults.map((user) => {
                  const isAlreadyIn = registrations.some((r) => r.userUid === user.uid);
                  return (
                    <div
                      key={user.uid}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-800/60 transition"
                    >
                      <div className="flex items-center gap-3">
                        <CircularProfileAvatar
                          src={user.profilePhoto || user.avatarUrl}
                          alt={user.username || 'user'}
                          size="sm"
                          role={user.role}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">
                              {user.name || user.username}
                            </span>
                            <span className="text-[11px] text-amber-400 font-mono">
                              @{user.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {user.role && <RoleBadge role={user.role} size="sm" />}
                            {user.membership?.level && (
                              <MembershipBadge 
                                level={user.membership.level} 
                                title={user.membership.title} 
                                size="sm" 
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {isAlreadyIn ? (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-mono">
                          Already Registered
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          disabled={isFull}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                        >
                          Select Player
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected User Confirmation Card */}
            {selectedUser && (() => {
              const playerCoins = typeof selectedUser.coinBalance === 'number' ? selectedUser.coinBalance : 0;
              const hasEnoughCoins = playerCoins >= entryFeeCoins;
              return (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CircularProfileAvatar
                        src={selectedUser.profilePhoto || selectedUser.avatarUrl}
                        alt={selectedUser.name || selectedUser.username || 'User'}
                        size="md"
                        role={selectedUser.role}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">
                            {selectedUser.name || selectedUser.username}
                          </span>
                          <span className="text-xs text-amber-300 font-mono font-bold">
                            @{selectedUser.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {selectedUser.role && <RoleBadge role={selectedUser.role} size="sm" />}
                          {selectedUser.membership && (
                            <MembershipBadge
                              level={typeof selectedUser.membership === 'object' ? selectedUser.membership.level : selectedUser.membership}
                              size="sm"
                            />
                          )}
                          <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1">
                            <Coins className="w-3 h-3 text-amber-400" />
                            <span>Balance: <strong>{playerCoins.toLocaleString()} coins</strong></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        disabled={isRegistering}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                      >
                        Change
                      </button>

                      <button
                        type="button"
                        onClick={handleRegisterPlayer}
                        disabled={isRegistering || isFull || (chargePlayerFee && !hasEnoughCoins)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-50"
                      >
                        {isRegistering ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Registering...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Confirm Registration</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Explicit Fee Deduction Choice (Never silently deduct coins) */}
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                    <div className="font-mono font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center justify-between">
                      <span>Registration Fee Policy</span>
                      <span className="text-amber-400 font-mono">Tournament Fee: {entryFeeCoins.toLocaleString()} Coins</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2.5 transition ${
                        !chargePlayerFee 
                          ? 'bg-amber-500/15 border-amber-500/50 text-white' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="adminFeePolicy"
                          checked={!chargePlayerFee}
                          onChange={() => setChargePlayerFee(false)}
                          className="mt-0.5 text-amber-500 focus:ring-0"
                        />
                        <div>
                          <div className="font-bold text-xs text-white">Complimentary Admin Pass</div>
                          <div className="text-[10px] text-slate-400">0 coins deducted from player</div>
                        </div>
                      </label>

                      <label className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition ${
                        entryFeeCoins === 0 || !hasEnoughCoins
                          ? 'opacity-50 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-500'
                          : chargePlayerFee
                          ? 'bg-amber-500/15 border-amber-500/50 text-white cursor-pointer'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                      }`}>
                        <input
                          type="radio"
                          name="adminFeePolicy"
                          checked={chargePlayerFee}
                          disabled={entryFeeCoins === 0 || !hasEnoughCoins}
                          onChange={() => setChargePlayerFee(true)}
                          className="mt-0.5 text-amber-500 focus:ring-0"
                        />
                        <div>
                          <div className="font-bold text-xs text-white">
                            Deduct Fee ({entryFeeCoins.toLocaleString()} Coins)
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {hasEnoughCoins 
                              ? `Remaining balance: ${(playerCoins - entryFeeCoins).toLocaleString()} coins`
                              : 'Insufficient balance to deduct'}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 2: Official Registered Roster (List of Registrations) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Registered Players ({registrations.length} / {tournament.maxPlayers})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Click delete icon to officially remove
              </span>
            </div>

            {loadingRegistrations ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs">Loading registered players...</span>
              </div>
            ) : registrations.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-bold text-slate-300">
                  No Players Registered Yet
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Use the player search above to officially register participants for this tournament.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {registrations.map((reg, index) => (
                  <div
                    key={reg.id}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-4 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500 w-5">
                        #{index + 1}
                      </span>
                      <CircularProfileAvatar
                        src={reg.avatarUrl || reg.profilePhoto}
                        alt={reg.displayName || reg.appUsername || 'Player'}
                        size="sm"
                        role={reg.role}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {reg.displayName}
                          </span>
                          <span className="text-[11px] text-amber-400 font-mono">
                            @{reg.appUsername}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>Registered {formatTimeAgo(reg.registeredAt)}</span>
                          <span>·</span>
                          <span>By @{reg.registeredByUsername || 'Strike'}</span>
                          <span>·</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            reg.feePolicy === 'paid' || (reg.entryFeeCoinsPaid && reg.entryFeeCoinsPaid > 0)
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {reg.feePolicy === 'paid' || (reg.entryFeeCoinsPaid && reg.entryFeeCoinsPaid > 0)
                              ? `Paid (${reg.entryFeeCoinsPaid} Coins)`
                              : 'Complimentary Pass'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Remove Registration Action (Triggers DeleteConfirmModal) */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(reg)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition"
                      title={`Remove registration for @${reg.appUsername}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-mono">
            Official Tournament Registration · Owner Admin Strike
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>

      {/* Universal Delete Confirmation Modal for Removing Player Registration */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Player Registration"
        itemTypeLabel="Tournament Participant"
        itemName={deleteTarget ? `@${deleteTarget.appUsername} (${deleteTarget.displayName})` : ''}
        warningText={`Are you sure you want to remove @${deleteTarget?.appUsername} from ${tournament.name}? This frees up 1 player slot in the roster.`}
        confirmButtonText="Confirm Remove"
        cancelButtonText="Cancel"
        isDeleting={isDeletingReg}
        errorMessage={deleteError}
        onConfirm={handleConfirmDeleteRegistration}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
