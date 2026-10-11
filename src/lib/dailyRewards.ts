import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, FrameItem, DailyRewardHistoryEntry } from '../types';
import { getAllProfileFrames, getAllTextFrames } from './frameCollection';

export interface DailyRewardTier {
  day: number;
  type: 'coins' | 'special_frame';
  coins: number;
  label: string;
  description: string;
}

export const DAILY_REWARDS_SCHEDULE: DailyRewardTier[] = [
  { day: 1, type: 'coins', coins: 100, label: '100 Coins', description: 'Day 1 starter bonus' },
  { day: 2, type: 'coins', coins: 150, label: '150 Coins', description: 'Day 2 streak bonus' },
  { day: 3, type: 'coins', coins: 200, label: '200 Coins', description: 'Day 3 momentum reward' },
  { day: 4, type: 'coins', coins: 300, label: '300 Coins', description: 'Day 4 dedicated trader' },
  { day: 5, type: 'coins', coins: 400, label: '400 Coins', description: 'Day 5 veteran streak' },
  { day: 6, type: 'coins', coins: 500, label: '500 Coins', description: 'Day 6 ultimate coin reward' },
  { day: 7, type: 'special_frame', coins: 0, label: 'SPECIAL REWARD', description: 'Random Profile Frame OR Text Frame' },
];

export const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000; // Exactly 24 hours (86,400,000 ms)
export const STREAK_WINDOW_MS = 48 * 60 * 60 * 1000;  // 48 hours (172,800,000 ms) - 24h claim window after cooldown

const RESTRICTED_FRAME_IDS = new Set([
  'pf_admin_winged',
  'pf_supreme_purple',
  'pf_overlord_diamond',
  'pf_vanguard_gold',
  'tf_admin_winged',
  'tf_supreme_purple',
  'tf_overlord_diamond',
  'tf_vanguard_gold',
]);

const RESTRICTED_KEYWORDS = [
  'admin',
  'vanguard',
  'overlord',
  'supreme',
  'monarch',
  'imperial',
  'sovereign',
  'owner',
  'vip',
  'membership'
];

/**
 * Filter for eligible non-restricted frames
 */
export function isEligibleRewardFrame(frame: FrameItem): boolean {
  if (RESTRICTED_FRAME_IDS.has(frame.id)) return false;
  if (frame.isActive === false) return false;

  const idLower = frame.id.toLowerCase();
  const nameLower = frame.name.toLowerCase();
  const catLower = (frame.category || '').toLowerCase();
  const descLower = (frame.description || '').toLowerCase();

  for (const word of RESTRICTED_KEYWORDS) {
    if (
      idLower.includes(word) ||
      nameLower.includes(word) ||
      catLower.includes(word) ||
      descLower.includes(word)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Gets a random eligible frame (either Profile Frame or Text Frame)
 */
export function getRandomEligibleFrame(): FrameItem | null {
  const eligibleProfileFrames = getAllProfileFrames(true).filter(isEligibleRewardFrame);
  const eligibleTextFrames = getAllTextFrames(true).filter(isEligibleRewardFrame);

  const allEligible = [...eligibleProfileFrames, ...eligibleTextFrames];
  if (allEligible.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * allEligible.length);
  return allEligible[randomIndex];
}

/**
 * Calculates current UTC date string YYYY-MM-DD
 */
export function getUtcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Safely parses timestamp numbers, Firestore Timestamps, or ISO strings to milliseconds
 */
export function parseTimestampMs(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  if (typeof val.toMillis === 'function') {
    return val.toMillis();
  }
  if (typeof val.seconds === 'number') {
    return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Formats remaining milliseconds into "HH:MM:SS" format
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

// Trusted server time offset tracking to resist client clock tampering
let cachedServerTimeOffset = 0;
let lastSyncTime = 0;

export async function syncServerTimeOffset(): Promise<number> {
  const now = Date.now();
  if (lastSyncTime > 0 && now - lastSyncTime < 60000) {
    return cachedServerTimeOffset;
  }

  try {
    const fetchStart = Date.now();
    const res = await fetch('/api/time', { cache: 'no-store' });
    const fetchEnd = Date.now();
    const rtt = fetchEnd - fetchStart;

    if (res.ok) {
      const data = await res.json();
      if (typeof data.serverTime === 'number') {
        const estimatedServerNow = data.serverTime + Math.round(rtt / 2);
        cachedServerTimeOffset = estimatedServerNow - fetchEnd;
        lastSyncTime = fetchEnd;
        return cachedServerTimeOffset;
      }
    }

    // Fallback: examine HTTP Date header
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const serverDateMs = new Date(dateHeader).getTime();
      if (!isNaN(serverDateMs)) {
        const estimatedServerNow = serverDateMs + Math.round(rtt / 2);
        cachedServerTimeOffset = estimatedServerNow - fetchEnd;
        lastSyncTime = fetchEnd;
        return cachedServerTimeOffset;
      }
    }
  } catch (err) {
    console.warn('[dailyRewards] Trusted server time sync notice:', err);
  }

  return cachedServerTimeOffset;
}

export function getTrustedServerTime(): number {
  return Date.now() + cachedServerTimeOffset;
}

export interface StreakStatus {
  canClaim: boolean;
  isClaimedToday: boolean; // True when within 24h cooldown of last claim
  timeRemainingMs: number;
  timeRemainingFormatted: string; // "HH:MM:SS"
  currentStreak: number;
  rewardCycleDay: number; // 1 through 7 for the current/next eligible reward tier
  nextReward: DailyRewardTier;
  daysClaimedInCycle: number;
  lastClaimTimestamp: number | null;
  isStreakBroken: boolean;
  reason?: string;
}

/**
 * Evaluates user streak state strictly based on 24-hour elapsed duration from last claim
 */
export function evaluateStreakStatus(
  profile: UserProfile | null, 
  currentTrustedTime: number = getTrustedServerTime()
): StreakStatus {
  if (!profile) {
    return {
      canClaim: false,
      isClaimedToday: false,
      timeRemainingMs: 0,
      timeRemainingFormatted: '00:00:00',
      currentStreak: 0,
      rewardCycleDay: 1,
      nextReward: DAILY_REWARDS_SCHEDULE[0],
      daysClaimedInCycle: 0,
      lastClaimTimestamp: null,
      isStreakBroken: false,
      reason: 'Please log in to claim daily rewards',
    };
  }

  // Parse last claim timestamp
  const lastClaimMs = parseTimestampMs(profile.lastRewardClaimTimestamp);

  // Case 1: User has never claimed a daily reward
  if (lastClaimMs === null) {
    return {
      canClaim: true,
      isClaimedToday: false,
      timeRemainingMs: 0,
      timeRemainingFormatted: '00:00:00',
      currentStreak: 0,
      rewardCycleDay: 1,
      nextReward: DAILY_REWARDS_SCHEDULE[0],
      daysClaimedInCycle: 0,
      lastClaimTimestamp: null,
      isStreakBroken: false,
    };
  }

  const elapsedMs = Math.max(0, currentTrustedTime - lastClaimMs);
  const existingCycleDay = profile.rewardCycleDay || 1;
  const existingStreak = profile.loginStreak || 0;

  // Case 2: Cooldown active (< 24 hours elapsed since last claim)
  if (elapsedMs < CLAIM_COOLDOWN_MS) {
    const timeRemainingMs = CLAIM_COOLDOWN_MS - elapsedMs;
    // Determine the next tier that unlocks when timer reaches 0
    const nextCycleDay = existingCycleDay >= 7 ? 1 : existingCycleDay + 1;
    const upcomingReward = DAILY_REWARDS_SCHEDULE.find((t) => t.day === nextCycleDay) || DAILY_REWARDS_SCHEDULE[0];

    return {
      canClaim: false,
      isClaimedToday: true,
      timeRemainingMs,
      timeRemainingFormatted: formatCountdown(timeRemainingMs),
      currentStreak: existingStreak,
      rewardCycleDay: existingCycleDay,
      nextReward: upcomingReward,
      daysClaimedInCycle: existingCycleDay,
      lastClaimTimestamp: lastClaimMs,
      isStreakBroken: false,
      reason: `Already claimed! Next reward unlocks in ${formatCountdown(timeRemainingMs)}.`,
    };
  }

  // Case 3: Cooldown ended, within consecutive streak claim window (24h <= elapsed <= 48h)
  if (elapsedMs <= STREAK_WINDOW_MS) {
    const nextCycleDay = existingCycleDay >= 7 ? 1 : existingCycleDay + 1;
    const tier = DAILY_REWARDS_SCHEDULE.find((t) => t.day === nextCycleDay) || DAILY_REWARDS_SCHEDULE[0];

    return {
      canClaim: true,
      isClaimedToday: false,
      timeRemainingMs: 0,
      timeRemainingFormatted: '00:00:00',
      currentStreak: existingStreak,
      rewardCycleDay: nextCycleDay,
      nextReward: tier,
      daysClaimedInCycle: existingCycleDay >= 7 ? 0 : existingCycleDay,
      lastClaimTimestamp: lastClaimMs,
      isStreakBroken: false,
    };
  }

  // Case 4: Missed full daily claim window (> 48 hours elapsed) -> Streak resets to Day 1
  return {
    canClaim: true,
    isClaimedToday: false,
    timeRemainingMs: 0,
    timeRemainingFormatted: '00:00:00',
    currentStreak: 0, // Will become 1 upon claiming
    rewardCycleDay: 1,
    nextReward: DAILY_REWARDS_SCHEDULE[0],
    daysClaimedInCycle: 0,
    lastClaimTimestamp: lastClaimMs,
    isStreakBroken: true,
    reason: 'Streak was broken due to inactivity (missed daily claim window). Resetting to Day 1.',
  };
}

export interface ClaimRewardResult {
  success: boolean;
  rewardType: 'coins' | 'frame';
  coinsAwarded: number;
  frameAwarded?: FrameItem;
  newStreak: number;
  newCycleDay: number;
  newBalance: number;
  error?: string;
}

/**
 * Claims today's daily reward in Firestore using an atomic transaction.
 * Enforces 24-hour cooldown using trusted time and updates balance, streak, timestamp, and history.
 */
export async function claimDailyReward(profile: UserProfile): Promise<ClaimRewardResult> {
  if (!profile || !profile.uid) {
    return {
      success: false,
      rewardType: 'coins',
      coinsAwarded: 0,
      newStreak: 0,
      newCycleDay: 1,
      newBalance: 0,
      error: 'User profile not found. Please log in.',
    };
  }

  // Synchronize with server time before committing claim
  await syncServerTimeOffset().catch(() => {});
  const trustedNow = getTrustedServerTime();

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userDocRef = doc(db, 'users', profile.uid);
      const userSnap = await transaction.get(userDocRef);

      if (!userSnap.exists()) {
        throw new Error('User profile record not found in database.');
      }

      const userData = userSnap.data() as UserProfile;
      const lastClaimMs = parseTimestampMs(userData.lastRewardClaimTimestamp);

      // Enforce strict 24-hour cooldown on database document state
      if (lastClaimMs !== null) {
        const elapsed = trustedNow - lastClaimMs;
        if (elapsed < CLAIM_COOLDOWN_MS) {
          const remainingMs = CLAIM_COOLDOWN_MS - elapsed;
          throw new Error(
            `Reward cooldown active. Please wait ${formatCountdown(remainingMs)} before claiming again.`
          );
        }
      }

      // Determine streak progression and cycle day
      let targetCycleDay = 1;
      let newStreak = 1;

      if (lastClaimMs === null) {
        // First claim ever
        targetCycleDay = 1;
        newStreak = 1;
      } else {
        const elapsed = trustedNow - lastClaimMs;
        if (elapsed > STREAK_WINDOW_MS) {
          // Missed 48-hour window: Reset streak to Day 1
          targetCycleDay = 1;
          newStreak = 1;
        } else {
          // Consecutive claim within 24h - 48h window
          const prevCycleDay = userData.rewardCycleDay || 1;
          targetCycleDay = prevCycleDay >= 7 ? 1 : prevCycleDay + 1;
          newStreak = (userData.loginStreak || 0) + 1;
        }
      }

      // Permanent saved balance: never reset or initialize to 0 if existing balance is present
      const currentBalance = typeof userData.coinBalance === 'number' ? userData.coinBalance : 0;
      const todayStr = getUtcDateString(new Date(trustedNow));

      if (targetCycleDay === 7) {
        // Day 7: SPECIAL FRAME REWARD
        const awardedFrame = getRandomEligibleFrame();

        if (!awardedFrame) {
          // Fallback safety if no frame active
          const coinsAwarded = 1000;
          const newBalance = currentBalance + coinsAwarded;
          const historyEntry: DailyRewardHistoryEntry = {
            claimedAt: trustedNow,
            rewardCycleDay: 7,
            streak: newStreak,
            rewardType: 'coins',
            coinsAwarded,
          };

          const prevHistory = Array.isArray(userData.rewardHistory) ? userData.rewardHistory : [];
          const updatedHistory = [...prevHistory.slice(-49), historyEntry];

          transaction.update(userDocRef, {
            coinBalance: newBalance,
            loginStreak: newStreak,
            rewardCycleDay: 7,
            lastRewardClaimDate: todayStr,
            lastRewardClaimTimestamp: trustedNow,
            rewardHistory: updatedHistory,
          });

          return {
            success: true,
            rewardType: 'coins' as const,
            coinsAwarded,
            newStreak,
            newCycleDay: 7,
            newBalance,
          };
        }

        // Equip awarded frame
        const historyEntry: DailyRewardHistoryEntry = {
          claimedAt: trustedNow,
          rewardCycleDay: 7,
          streak: newStreak,
          rewardType: 'frame',
          coinsAwarded: 0,
          frameId: awardedFrame.id,
          frameName: awardedFrame.name,
        };

        const prevHistory = Array.isArray(userData.rewardHistory) ? userData.rewardHistory : [];
        const updatedHistory = [...prevHistory.slice(-49), historyEntry];

        const updatePayload: Record<string, any> = {
          loginStreak: newStreak,
          rewardCycleDay: 7,
          lastRewardClaimDate: todayStr,
          lastRewardClaimTimestamp: trustedNow,
          rewardHistory: updatedHistory,
        };

        if (awardedFrame.type === 'profile') {
          updatePayload.profileFrameId = awardedFrame.id;
        } else {
          updatePayload.textFrameId = awardedFrame.id;
        }

        transaction.update(userDocRef, updatePayload);

        return {
          success: true,
          rewardType: 'frame' as const,
          coinsAwarded: 0,
          frameAwarded: awardedFrame,
          newStreak,
          newCycleDay: 7,
          newBalance: currentBalance,
        };
      } else {
        // Days 1 through 6: Coins reward
        const tier = DAILY_REWARDS_SCHEDULE.find((t) => t.day === targetCycleDay) || DAILY_REWARDS_SCHEDULE[0];
        const coinsAwarded = tier.coins;
        const newBalance = currentBalance + coinsAwarded;

        const historyEntry: DailyRewardHistoryEntry = {
          claimedAt: trustedNow,
          rewardCycleDay: targetCycleDay,
          streak: newStreak,
          rewardType: 'coins',
          coinsAwarded,
        };

        const prevHistory = Array.isArray(userData.rewardHistory) ? userData.rewardHistory : [];
        const updatedHistory = [...prevHistory.slice(-49), historyEntry];

        transaction.update(userDocRef, {
          coinBalance: newBalance,
          loginStreak: newStreak,
          rewardCycleDay: targetCycleDay,
          lastRewardClaimDate: todayStr,
          lastRewardClaimTimestamp: trustedNow,
          rewardHistory: updatedHistory,
        });

        return {
          success: true,
          rewardType: 'coins' as const,
          coinsAwarded,
          newStreak,
          newCycleDay: targetCycleDay,
          newBalance,
        };
      }
    });

    return result;
  } catch (err: any) {
    console.error('[dailyRewards] Error claiming daily reward in transaction:', err);
    const fallbackStatus = evaluateStreakStatus(profile, trustedNow);
    return {
      success: false,
      rewardType: 'coins',
      coinsAwarded: 0,
      newStreak: fallbackStatus.currentStreak,
      newCycleDay: fallbackStatus.rewardCycleDay,
      newBalance: profile.coinBalance || 0,
      error: err.message || 'Failed to claim reward. Please try again.',
    };
  }
}
