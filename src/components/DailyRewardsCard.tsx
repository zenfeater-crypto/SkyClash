import React, { useState } from 'react';
import { 
  Flame, 
  Gift, 
  Coins, 
  Check, 
  Lock, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Crown,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  DAILY_REWARDS_SCHEDULE, 
  evaluateStreakStatus, 
  claimDailyReward, 
  ClaimRewardResult 
} from '../lib/dailyRewards';
import { CircularProfileAvatar } from './CircularProfileAvatar';
import { MessageTextFrame } from './MessageTextFrame';

interface DailyRewardsCardProps {
  onOpenAuth: () => void;
}

export const DailyRewardsCard: React.FC<DailyRewardsCardProps> = ({ onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [celebrationResult, setCelebrationResult] = useState<ClaimRewardResult | null>(null);

  const status = evaluateStreakStatus(userProfile);

  const handleClaim = async () => {
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    setClaiming(true);
    setClaimError(null);

    const result = await claimDailyReward(userProfile);
    setClaiming(false);

    if (result.success) {
      setCelebrationResult(result);
    } else {
      setClaimError(result.error || 'Failed to claim reward');
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/20 p-5 sm:p-7 shadow-xl shadow-amber-500/5">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-400" /> DAILY REWARDS
            </span>
            <span className="px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              {status.currentStreak} DAY STREAK
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Daily Login Streak</span>
            <span className="text-sm font-mono font-bold text-amber-400">
              (Day {status.rewardCycleDay} of 7)
            </span>
          </h2>

          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Log in daily to claim escalating coin bonuses! Maintain your consecutive streak to unlock the 
            Day 7 Special Reward containing an official custom Profile Frame or Text Frame.
          </p>
        </div>

        {/* Today's Reward Badge */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 p-3 rounded-2xl shrink-0 self-start sm:self-center">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            {status.rewardCycleDay === 7 ? <Crown className="w-5 h-5 text-amber-300 animate-bounce" /> : <Coins className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400">Today's Reward</div>
            <div className="text-sm font-black text-amber-300 font-mono">
              {status.rewardCycleDay === 7 ? 'SPECIAL REWARD' : `+${status.nextReward.coins} Coins`}
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Progression Track */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6">
        {DAILY_REWARDS_SCHEDULE.map((tier) => {
          const isClaimedInCurrentCycle = status.isClaimedToday
            ? tier.day <= status.rewardCycleDay
            : tier.day < status.rewardCycleDay;
          const isToday = tier.day === status.rewardCycleDay;
          const isLocked = !isClaimedInCurrentCycle && !isToday;
          const isDay7 = tier.day === 7;

          return (
            <div
              key={tier.day}
              className={`relative rounded-2xl p-3 flex flex-col justify-between transition border ${
                isClaimedInCurrentCycle
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : isToday
                  ? isDay7
                    ? 'bg-gradient-to-b from-amber-500/20 to-purple-950/40 border-amber-400/80 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20'
                    : 'bg-gradient-to-b from-amber-500/20 to-slate-900 border-amber-500/60 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono font-bold uppercase ${
                  isToday ? 'text-amber-300 font-black' : isClaimedInCurrentCycle ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  Day {tier.day}
                </span>

                {isClaimedInCurrentCycle ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : isToday ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black font-mono animate-pulse">
                    TODAY
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-slate-600 flex items-center justify-center text-[10px]">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              {/* Reward Icon & Value */}
              <div className="my-2 text-center">
                {isDay7 ? (
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-purple-600/30 border border-amber-400/50 text-amber-300 mb-1">
                    <Crown className="w-5 h-5" />
                  </div>
                ) : (
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-1 ${
                    isClaimedInCurrentCycle 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : isToday 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-slate-900 text-slate-600'
                  }`}>
                    <Coins className="w-4 h-4" />
                  </div>
                )}

                <div className={`text-xs font-black font-mono tracking-tight ${
                  isClaimedInCurrentCycle 
                    ? 'text-emerald-300' 
                    : isToday 
                    ? isDay7 ? 'text-amber-200' : 'text-white' 
                    : 'text-slate-400'
                }`}>
                  {isDay7 ? 'SPECIAL' : `+${tier.coins}`}
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  {isDay7 ? 'Frame Box' : 'Coins'}
                </div>
              </div>

              {/* Bottom Tag */}
              <div className="text-center mt-1 pt-1.5 border-t border-slate-800/40 text-[9px] font-mono">
                {isClaimedInCurrentCycle ? (
                  <span className="text-emerald-400 font-bold">Claimed</span>
                ) : isToday ? (
                  <span className="text-amber-400 font-bold">Ready</span>
                ) : (
                  <span className="text-slate-600">Locked</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Claim Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>
            {status.isClaimedToday ? (
              <strong className="text-emerald-400">Claimed for today! Next reward unlocks at 00:00 UTC.</strong>
            ) : status.canClaim ? (
              <span className="text-slate-300">
                You have an unclaimed reward ready! Day {status.rewardCycleDay}: <strong>{status.nextReward.label}</strong>
              </span>
            ) : (
              <span>Sign in to save streak and collect daily coins!</span>
            )}
          </span>
        </div>

        <div>
          {!currentUser ? (
            <button
              onClick={onOpenAuth}
              className="w-full sm:w-auto py-2.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Log In to Claim</span>
            </button>
          ) : status.isClaimedToday ? (
            <button
              disabled
              className="w-full sm:w-auto py-2.5 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Claimed Today (Come back tomorrow)</span>
            </button>
          ) : (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className={`w-full sm:w-auto py-3 px-8 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition flex items-center justify-center gap-2 ${
                status.rewardCycleDay === 7
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 hover:from-amber-300 hover:to-purple-500 text-slate-950 shadow-amber-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/25'
              }`}
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Claiming Reward...</span>
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  <span>
                    {status.rewardCycleDay === 7
                      ? 'CLAIM SPECIAL DAY 7 REWARD!'
                      : `CLAIM DAY ${status.rewardCycleDay} (+${status.nextReward.coins} COINS)`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {claimError && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{claimError}</span>
        </div>
      )}

      {/* CELEBRATION MODAL */}
      {celebrationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-amber-500/50 p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20">
            {/* Close */}
            <button
              onClick={() => setCelebrationResult(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              {celebrationResult.rewardType === 'frame' ? (
                <Crown className="w-8 h-8 text-amber-300 animate-bounce" />
              ) : (
                <Coins className="w-8 h-8 text-amber-400 animate-bounce" />
              )}
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black tracking-widest uppercase">
              REWARD UNLOCKED
            </span>

            <h3 className="text-2xl font-black text-white mt-3 mb-1">
              {celebrationResult.rewardType === 'frame' ? 'Special Frame Won!' : 'Coins Added to Balance!'}
            </h3>

            <p className="text-xs text-slate-400 mb-6">
              {celebrationResult.rewardType === 'frame' 
                ? 'Congratulations on completing your 7-day streak! You have received a rare frame from the collection.'
                : `Streak maintained! You received your Day ${celebrationResult.newCycleDay} reward.`}
            </p>

            {/* Frame specific highlight */}
            {celebrationResult.rewardType === 'frame' && celebrationResult.frameAwarded && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/40 mb-6 text-center">
                <div className="flex justify-center mb-3">
                  {celebrationResult.frameAwarded.type === 'profile' ? (
                    <CircularProfileAvatar
                      src={userProfile?.profilePhoto || userProfile?.avatarUrl}
                      alt={celebrationResult.frameAwarded.name}
                      size="lg"
                      profileFrameId={celebrationResult.frameAwarded.id}
                      role={userProfile?.role}
                    />
                  ) : (
                    <div className="w-full">
                      <MessageTextFrame
                        textFrameId={celebrationResult.frameAwarded.id}
                        text={`"${celebrationResult.frameAwarded.name}" equipped!`}
                      />
                    </div>
                  )}
                </div>

                <div className="text-base font-black text-white font-mono">
                  {celebrationResult.frameAwarded.name}
                </div>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">
                  Category: {celebrationResult.frameAwarded.category} ({celebrationResult.frameAwarded.type === 'profile' ? 'Profile Frame' : 'Text Frame'})
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  {celebrationResult.frameAwarded.description}
                </div>
                <div className="mt-3 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 py-1 px-3 rounded-lg border border-emerald-500/30 inline-block">
                  ✓ Automatically equipped to your profile!
                </div>
              </div>
            )}

            {/* Coins specific highlight */}
            {celebrationResult.rewardType === 'coins' && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 mb-6">
                <div className="text-3xl font-black text-amber-300 font-mono">
                  +{celebrationResult.coinsAwarded} Coins
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Current Streak: <strong className="text-orange-400">{celebrationResult.newStreak} Days</strong>
                </div>
              </div>
            )}

            <button
              onClick={() => setCelebrationResult(null)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
            >
              Continue Trading
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
