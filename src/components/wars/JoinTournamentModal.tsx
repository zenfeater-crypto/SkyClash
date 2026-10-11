import React, { useState } from 'react';
import { 
  X, 
  Coins, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Clock, 
  Trophy, 
  Crown, 
  ShieldCheck, 
  ArrowRight,
  Flame
} from 'lucide-react';
import { Tournament } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  getTournamentEntryFeeCoins, 
  joinTournamentWithCoins, 
  isOwnerAdminProfile 
} from '../../lib/tournamentService';

interface JoinTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  onSuccess?: (updatedTournament: Tournament) => void;
  onOpenAuth?: () => void;
}

export const JoinTournamentModal: React.FC<JoinTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSuccess,
  onOpenAuth,
}) => {
  const { currentUser, userProfile, hasUnlimitedCoins, isOwnerAdmin, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    entryFeeCoins: number;
    newBalance: number;
    tournamentName: string;
  } | null>(null);

  if (!isOpen || !tournament) return null;

  // Determine Owner Admin Strike status
  const isStrikeOwnerAdmin = Boolean(
    hasUnlimitedCoins || 
    isOwnerAdmin || 
    isOwnerAdminProfile(userProfile)
  );

  // Player coin calculation
  const currentBalance = typeof userProfile?.coinBalance === 'number' ? userProfile.coinBalance : 0;
  const entryFeeCoins = getTournamentEntryFeeCoins(tournament);
  const remainingBalance = isStrikeOwnerAdmin 
    ? currentBalance 
    : Math.max(0, currentBalance - entryFeeCoins);
  
  // Roster checks
  const registeredUids = Array.isArray(tournament.registeredUserUids) 
    ? tournament.registeredUserUids 
    : [];
  const currentRegistered = typeof tournament.registeredCount === 'number'
    ? tournament.registeredCount
    : registeredUids.length;
  const maxPlayers = tournament.maxPlayers || 32;
  const isRosterFull = currentRegistered >= maxPlayers;
  const isAlreadyRegistered = currentUser ? registeredUids.includes(currentUser.uid) : false;

  // Eligibility
  const hasSufficientCoins = isStrikeOwnerAdmin || entryFeeCoins === 0 || currentBalance >= entryFeeCoins;
  const canJoin = currentUser && !isAlreadyRegistered && !isRosterFull && hasSufficientCoins && !isSubmitting;

  const handleConfirmJoin = async () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!userProfile) {
      setErrorMessage('User profile is not loaded yet. Please wait a moment.');
      return;
    }

    if (isAlreadyRegistered) {
      setErrorMessage('You are already registered for this tournament.');
      return;
    }

    if (isRosterFull) {
      setErrorMessage(`Tournament roster is full (${currentRegistered}/${maxPlayers} players).`);
      return;
    }

    if (!hasSufficientCoins) {
      setErrorMessage(
        `Insufficient coins: Entry fee is ${entryFeeCoins.toLocaleString()} coins, but your current balance is ${currentBalance.toLocaleString()} coins.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await joinTournamentWithCoins(tournament.id, currentUser, userProfile);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to join tournament. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Refresh auth profile state to sync latest balance across app
      if (refreshProfile) {
        await refreshProfile().catch(() => {});
      }

      setSuccessResult({
        entryFeeCoins: res.entryFeeCoins,
        newBalance: res.newBalance,
        tournamentName: res.tournamentName || tournament.name,
      });

      // Update parent component state
      if (onSuccess) {
        onSuccess({
          ...tournament,
          registeredCount: currentRegistered + 1,
          registeredUserUids: [...registeredUids, currentUser.uid],
        });
      }
    } catch (err: any) {
      console.error('Error during tournament join:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while joining the tournament.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    setSuccessResult(null);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Join Tournament
              </h2>
              <p className="text-xs text-slate-400 line-clamp-1">
                {tournament.name}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {successResult ? (
            /* Success View */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 animate-in zoom-in-75 duration-300">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">
                  Registration Confirmed!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  You are officially registered for <span className="text-amber-400 font-bold">{successResult.tournamentName}</span>.
                </p>
              </div>

              {/* Deduction Summary */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono max-w-sm mx-auto text-left">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Entry Fee Paid:</span>
                  <span className="font-bold text-amber-400">
                    {isStrikeOwnerAdmin ? '0 Coins (Owner Admin Strike)' : `${successResult.entryFeeCoins.toLocaleString()} Coins`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>New Coin Balance:</span>
                  <span className="font-black text-emerald-400">
                    {isStrikeOwnerAdmin ? 'Unlimited Coins' : `${successResult.newBalance.toLocaleString()} Coins`}
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/20"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Confirmation Form */
            <>
              {/* Tournament Details Banner */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Tournament
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                    tournament.category === 'bedwars'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}>
                    {tournament.category === 'bedwars' ? 'Bedwars Arena' : 'Skyblock Arena'}
                  </span>
                </div>
                <div className="text-sm font-black text-white">
                  {tournament.name}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{tournament.dateAndTiming}</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold text-white font-mono">
                      {currentRegistered} / {maxPlayers} Players
                    </span>
                  </div>
                </div>
              </div>

              {/* COIN FINANCIAL SUMMARY BREAKDOWN */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">
                      Coin Balance & Entry Fee
                    </span>
                  </div>
                  {isStrikeOwnerAdmin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Strike Unlimited
                    </span>
                  )}
                </div>

                <div className="divide-y divide-slate-800/80 text-xs">
                  {/* Current Balance */}
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-400">Current Balance:</span>
                    <span className="font-bold text-white font-mono flex items-center gap-1.5">
                      {isStrikeOwnerAdmin ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          <span>Unlimited Coins</span>
                        </span>
                      ) : (
                        <span>{currentBalance.toLocaleString()} coins</span>
                      )}
                    </span>
                  </div>

                  {/* Tournament Entry Fee */}
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-400">Tournament Entry Fee:</span>
                    <span className="font-black text-amber-400 font-mono">
                      {entryFeeCoins === 0 ? 'Free (0 coins)' : `${entryFeeCoins.toLocaleString()} coins`}
                    </span>
                  </div>

                  {/* Remaining Balance */}
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-400">Remaining Balance:</span>
                    <span className={`font-black font-mono ${
                      hasSufficientCoins ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isStrikeOwnerAdmin ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          <span>Unlimited Coins</span>
                        </span>
                      ) : (
                        <span>{remainingBalance.toLocaleString()} coins</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status / Warnings */}
              {!currentUser && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    Please sign in or create an account to register for this tournament with your coin balance.
                  </div>
                </div>
              )}

              {isAlreadyRegistered && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Already Registered:</strong> You have already secured your spot in this tournament. Duplicate registrations and duplicate fee charges are strictly prevented.
                  </div>
                </div>
              )}

              {isRosterFull && !isAlreadyRegistered && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Tournament Full:</strong> The roster capacity of {maxPlayers} players has been reached. No slots remaining.
                  </div>
                </div>
              )}

              {currentUser && !isAlreadyRegistered && !isRosterFull && !hasSufficientCoins && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Insufficient Coins:</strong> You need <span className="font-bold text-white">{entryFeeCoins.toLocaleString()} coins</span> to enter this tournament, but your current balance is <span className="font-bold text-white">{currentBalance.toLocaleString()} coins</span>. Claim your Daily Rewards or win challenges to earn more coins!
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{errorMessage}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition disabled:opacity-50"
                >
                  Cancel
                </button>

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition"
                  >
                    Sign In to Join
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmJoin}
                    disabled={!canJoin}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying & Joining...</span>
                      </>
                    ) : isAlreadyRegistered ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Already Registered</span>
                      </>
                    ) : isRosterFull ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Roster Full</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>
                          {entryFeeCoins > 0 ? `Pay ${entryFeeCoins.toLocaleString()} Coins & Join` : 'Confirm Free Entry'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
