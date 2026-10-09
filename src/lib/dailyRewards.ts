import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, FrameItem } from '../types';
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

export interface StreakStatus {
  canClaim: boolean;
  isClaimedToday: boolean;
  currentStreak: number;
  rewardCycleDay: number; // 1 through 7 for today's eligible claim
  nextReward: DailyRewardTier;
  daysClaimedInCycle: number;
  reason?: string;
}

/**
 * Evaluates user streak state strictly based on UTC calendar day differences
 */
export function evaluateStreakStatus(profile: UserProfile | null): StreakStatus {
  if (!profile) {
    return {
      canClaim: false,
      isClaimedToday: false,
      currentStreak: 0,
      rewardCycleDay: 1,
      nextReward: DAILY_REWARDS_SCHEDULE[0],
      daysClaimedInCycle: 0,
      reason: 'Please log in to claim daily rewards',
    };
  }

  const todayStr = getUtcDateString();
  const lastClaimDate = profile.lastRewardClaimDate;

  // Case 1: Never claimed before
  if (!lastClaimDate) {
    return {
      canClaim: true,
      isClaimedToday: false,
      currentStreak: 0,
      rewardCycleDay: 1,
      nextReward: DAILY_REWARDS_SCHEDULE[0],
      daysClaimedInCycle: 0,
    };
  }

  // Calculate day difference
  const todayMs = Date.parse(todayStr + 'T00:00:00Z');
  const lastMs = Date.parse(lastClaimDate + 'T00:00:00Z');
  const diffDays = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));

  const existingCycleDay = profile.rewardCycleDay || 1;
  const existingStreak = profile.loginStreak || 1;

  // Case 2: Claimed today
  if (diffDays === 0) {
    const tier = DAILY_REWARDS_SCHEDULE.find((t) => t.day === existingCycleDay) || DAILY_REWARDS_SCHEDULE[0];
    return {
      canClaim: false,
      isClaimedToday: true,
      currentStreak: existingStreak,
      rewardCycleDay: existingCycleDay,
      nextReward: tier,
      daysClaimedInCycle: existingCycleDay,
      reason: 'Already claimed today! Next reward unlocks tomorrow at 00:00 UTC.',
    };
  }

  // Case 3: Consecutive day (diffDays === 1)
  if (diffDays === 1) {
    // If previous claim was Day 7, cycle restarts at Day 1
    const nextCycleDay = existingCycleDay >= 7 ? 1 : existingCycleDay + 1;
    const tier = DAILY_REWARDS_SCHEDULE.find((t) => t.day === nextCycleDay) || DAILY_REWARDS_SCHEDULE[0];
    return {
      canClaim: true,
      isClaimedToday: false,
      currentStreak: existingStreak,
      rewardCycleDay: nextCycleDay,
      nextReward: tier,
      daysClaimedInCycle: existingCycleDay >= 7 ? 0 : existingCycleDay,
    };
  }

  // Case 4: Missed a day or more (diffDays > 1) -> Reset to Day 1
  return {
    canClaim: true,
    isClaimedToday: false,
    currentStreak: 0, // Will become 1 upon claiming
    rewardCycleDay: 1,
    nextReward: DAILY_REWARDS_SCHEDULE[0],
    daysClaimedInCycle: 0,
    reason: 'Streak was broken due to inactivity. Resetting to Day 1.',
  };
}

export interface ClaimRewardResult {
  success: boolean;
  rewardType: 'coins' | 'frame';
  coinsAwarded: number;
  frameAwarded?: FrameItem;
  newStreak: number;
  newCycleDay: number;
  error?: string;
}

/**
 * Claims today's daily reward in Firestore atomically
 */
export async function claimDailyReward(profile: UserProfile): Promise<ClaimRewardResult> {
  if (!profile || !profile.uid) {
    return { success: false, rewardType: 'coins', coinsAwarded: 0, newStreak: 0, newCycleDay: 1, error: 'User profile not found' };
  }

  const status = evaluateStreakStatus(profile);
  if (!status.canClaim) {
    return {
      success: false,
      rewardType: 'coins',
      coinsAwarded: 0,
      newStreak: status.currentStreak,
      newCycleDay: status.rewardCycleDay,
      error: status.reason || 'Cannot claim today',
    };
  }

  const targetDay = status.rewardCycleDay;
  const todayStr = getUtcDateString();
  const nowMs = Date.now();
  const newStreak = status.currentStreak + 1;

  const userDocRef = doc(db, 'users', profile.uid);

  try {
    if (targetDay === 7) {
      // Day 7: SPECIAL FRAME REWARD
      const awardedFrame = getRandomEligibleFrame();
      if (!awardedFrame) {
        // Fallback safety in rare case no active frame is configured
        await updateDoc(userDocRef, {
          coinBalance: increment(1000),
          loginStreak: newStreak,
          rewardCycleDay: 7,
          lastRewardClaimDate: todayStr,
          lastRewardClaimTimestamp: nowMs,
        });
        return {
          success: true,
          rewardType: 'coins',
          coinsAwarded: 1000,
          newStreak,
          newCycleDay: 7,
        };
      }

      // Equip awarded frame
      const updatePayload: Record<string, any> = {
        loginStreak: newStreak,
        rewardCycleDay: 7,
        lastRewardClaimDate: todayStr,
        lastRewardClaimTimestamp: nowMs,
      };

      if (awardedFrame.type === 'profile') {
        updatePayload.profileFrameId = awardedFrame.id;
      } else {
        updatePayload.textFrameId = awardedFrame.id;
      }

      await updateDoc(userDocRef, updatePayload);

      return {
        success: true,
        rewardType: 'frame',
        coinsAwarded: 0,
        frameAwarded: awardedFrame,
        newStreak,
        newCycleDay: 7,
      };
    } else {
      // Days 1 through 6: Coins reward
      const coins = status.nextReward.coins;
      await updateDoc(userDocRef, {
        coinBalance: increment(coins),
        loginStreak: newStreak,
        rewardCycleDay: targetDay,
        lastRewardClaimDate: todayStr,
        lastRewardClaimTimestamp: nowMs,
      });

      return {
        success: true,
        rewardType: 'coins',
        coinsAwarded: coins,
        newStreak,
        newCycleDay: targetDay,
      };
    }
  } catch (err: any) {
    console.error('Error claiming daily reward:', err);
    return {
      success: false,
      rewardType: 'coins',
      coinsAwarded: 0,
      newStreak: status.currentStreak,
      newCycleDay: targetDay,
      error: err.message || 'Failed to claim reward. Please try again.',
    };
  }
}
