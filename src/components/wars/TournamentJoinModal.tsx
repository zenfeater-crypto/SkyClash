import React, { useState } from 'react';
import { 
  Trophy, 
  Coins, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Calendar, 
  Users, 
  Crown,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Tournament } from '../../types';
import { 
  getTournamentEntryFeeCoins, 
  joinTournamentWithCoins, 
  JoinTournamentResult 
} from '../../lib/tournamentService';

interface TournamentJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  onJoined?: (result: JoinTournamentResult) => void;
  onOpenAuth: () => void;
}

export const TournamentJoinModal: React.FC<TournamentJoinModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onJoined,
  onOpenAuth,
}) => {
  const { currentUser, userProfile, hasUnlimitedCoins } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<JoinTournamentResult | null>(null);

  if (!isOpen || !tournament) return null;

  const entryFeeCoins = getTournamentEntryFeeCoins(tournament);
  const currentBalance = typeof userProfile?.coinBalance === 'number' ? userProfile.coinBalance : 0;
  const isFree = entryFeeCoins === 0;

  // Remaining balance calculation
  const hasEnoughCoins = hasUnlimitedCoins || isFree || currentBalance >= entryFeeCoins;
  const remainingBalance = hasUnlimitedCoins 
    ? 'Unlimited 👑' 
    : Math.max(0, currentBalance - entryFeeCoins).toLocaleString();

  const registeredCount = tournament.registeredCount || tournament.registeredUserUids?.length || 0;
  const maxPlayers = tournament.maxPlayers || 32;
  const isFull = registeredCount >= maxPlayers;
  const slotsLeft = Math.max(0, maxPlayers - registeredCount);

  const isAlreadyRegistered = Boolean(
    currentUser && 
    Array.isArray(tournament.registeredUserUids) && 
    tournament.registeredUserUids.includes(currentUser.uid)
  );

  const handleConfirmJoin = async () => {
    if (!currentUser || !userProfile) {
      onClose();
      onOpenAuth();
      return;
    }

    if (!hasEnoughCoins) {
      setErrorMessage(`Insufficient coins. You need ${entryFeeCoins.toLocaleString()} coins, but currently have ${currentBalance.toLocaleString()} coins.`);
      return;
    }

    if (isFull) {
      setErrorMessage('Tournament roster is full. No slots left.');
      return;
    }

    if (isAlreadyRegistered) {
      setErrorMessage('You are already registered for this tournament.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await joinTournamentWithCoins(tournament.id, currentUser, userProfile);

    setIsSubmitting(false);

    if (result.success) {
      setSuccessResult(result);
      if (onJoined) {
        onJoined(result);
      }
    } else {
      setErrorMessage(result.error || 'Failed to join tournament. Please try again.');
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    setSuccessResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative h-32 sm:h-36 overflow-hidden bg-slate-950">
          {tournament.bannerUrl && (
            <img 
              src={tournament.bannerUrl} 
              alt={tournament.name}
              className="w-full h-full object-cover object-center filter brightness-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Category Tag */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
              tournament.category === 'skyblock'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {tournament.category === 'skyblock' ? 'Skyblock Arena' : 'Bedwars Combat'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
              {slotsLeft} slots available
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Tournament Title & Date */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{tournament.name}</span>
            </h3>
            {tournament.dateAndTiming && (
              <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{tournament.dateAndTiming}</span>
              </p>
            )}
          </div>

          {/* SUCCESS STATE */}
          {successResult ? (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-black text-emerald-300">Registration Confirmed!</h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                You are officially registered for <strong className="text-white">{tournament.name}</strong>.
                {successResult.entryFeeCoins > 0 ? (
                  <> Entry fee of <strong className="text-amber-400">{successResult.entryFeeCoins.toLocaleString()} coins</strong> was successfully deducted.</>
                ) : (
                  <> Free entry pass confirmed.</>
                )}
              </p>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Updated Balance:</span>
                <span className="text-amber-400 font-bold">
                  {hasUnlimitedCoins ? 'Unlimited 👑' : `${successResult.newBalance.toLocaleString()} Coins 🪙`}
                </span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* BALANCE & ENTRY FEE BREAKDOWN */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between pb-2 border-b border-slate-800">
                  <span>Registration Fee Breakdown</span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    <span>In-App Coins</span>
                  </span>
                </div>

                {/* Row 1: Entry Fee */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Tournament Entry Fee:</span>
                  <span className="font-mono font-black text-sm text-white">
                    {isFree ? (
                      <span className="text-emerald-400 uppercase">FREE ENTRY</span>
                    ) : (
                      <span className="text-amber-400">{entryFeeCoins.toLocaleString()} Coins 🪙</span>
                    )}
                  </span>
                </div>

                {/* Row 2: Current Balance */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Your Current Balance:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {currentUser ? (
                      hasUnlimitedCoins ? (
                        <span className="text-amber-400 flex items-center gap-1 font-black">
                          <span>Unlimited</span>
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] text-amber-300">(Strike Admin)</span>
                        </span>
                      ) : (
                        <span>{currentBalance.toLocaleString()} Coins 🪙</span>
                      )
                    ) : (
                      <span className="text-rose-400">Not signed in</span>
                    )}
                  </span>
                </div>

                {/* Row 3: Remaining Balance */}
                {currentUser && !isFree && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                    <span className="text-slate-400">Balance After Joining:</span>
                    <span className={`font-mono font-black ${hasEnoughCoins ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {hasUnlimitedCoins ? (
                        'Unlimited 👑'
                      ) : (
                        `${remainingBalance} Coins 🪙`
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Warnings / Errors */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Insufficient coins clear message */}
              {currentUser && !hasEnoughCoins && !errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Insufficient Coins</span>
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    You need <strong className="text-amber-400">{entryFeeCoins.toLocaleString()} coins</strong> to join this tournament, but your balance is <strong className="text-white">{currentBalance.toLocaleString()} coins</strong>. Claim your Daily Reward on Home to earn more free coins!
                  </p>
                </div>
              )}

              {/* Full Roster warning */}
              {isFull && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>The player roster for this tournament is full ({maxPlayers}/{maxPlayers}).</span>
                </div>
              )}

              {/* Already registered warning */}
              {isAlreadyRegistered && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>You are already registered for this tournament!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                  >
                    <span>SIGN IN TO JOIN TOURNAMENT</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmJoin}
                    disabled={isSubmitting || !hasEnoughCoins || isFull || isAlreadyRegistered}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg ${
                      isAlreadyRegistered
                        ? 'bg-slate-800 text-emerald-400 cursor-not-allowed border border-emerald-500/30'
                        : isFull
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : !hasEnoughCoins
                        ? 'bg-slate-800 text-rose-400/80 cursor-not-allowed border border-rose-500/30'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25 active:scale-[0.99]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>REGISTERING & DEDUCTING COINS...</span>
                      </>
                    ) : isAlreadyRegistered ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>ALREADY REGISTERED</span>
                      </>
                    ) : isFull ? (
                      <span>ROSTER FULL</span>
                    ) : !hasEnoughCoins ? (
                      <span>INSUFFICIENT COINS</span>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>
                          {isFree 
                            ? 'CONFIRM & JOIN (FREE ENTRY)' 
                            : hasUnlimitedCoins 
                            ? 'CONFIRM & JOIN (ADMIN PASS)' 
                            : `CONFIRM & JOIN (${entryFeeCoins.toLocaleString()} COINS)`}
                        </span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
