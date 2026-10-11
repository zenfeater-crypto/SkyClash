import { useState, useEffect } from 'react';
import { doc, collection, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { sanitizeForFirestore } from './validation';

/** Strict 7-minute (420-second) cooldown for publishing trade posts */
export const TRADE_POST_COOLDOWN_SECONDS = 420; // 7 minutes
export const TRADE_POST_COOLDOWN_MS = TRADE_POST_COOLDOWN_SECONDS * 1000; // 420,000 ms

/** Get local storage key scoped per authenticated Firebase UID */
export function getCooldownStorageKey(uid: string): string {
  return `skyclash_trade_post_cooldown_${uid}`;
}

/**
 * Retrieve the latest known persistent trade post timestamp for a specific Firebase UID.
 * Cross-checks both Firestore profile data and local storage cache.
 */
export function getPersistedTradePostTimestamp(
  uid: string | null | undefined,
  profileTimestamp?: number | null
): number {
  if (!uid) return 0;

  let localTs = 0;
  try {
    const raw = localStorage.getItem(getCooldownStorageKey(uid));
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && parsed > 0) {
        localTs = parsed;
      }
    }
  } catch {
    // Ignore localStorage access restrictions if any
  }

  const firestoreTs = typeof profileTimestamp === 'number' && profileTimestamp > 0 ? profileTimestamp : 0;
  return Math.max(localTs, firestoreTs);
}

/**
 * Persistently save the successful trade post timestamp for the authenticated Firebase UID in local cache.
 */
export function persistTradePostTimestamp(uid: string, timestamp: number): void {
  if (!uid) return;
  try {
    localStorage.setItem(getCooldownStorageKey(uid), String(timestamp));
  } catch {
    // Ignore localStorage restrictions
  }
}

/**
 * Format remaining seconds into standard "MM:SS" format.
 */
export function formatCooldownTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * React hook to manage live trade post cooldown state and 1-second countdown timer.
 */
export function useTradeCooldown(
  currentUserUid: string | null | undefined,
  profileLastTradePostAt?: number | null
) {
  const calculateRemainingSeconds = (): number => {
    if (!currentUserUid) return 0;
    const lastTimestamp = getPersistedTradePostTimestamp(currentUserUid, profileLastTradePostAt);
    if (!lastTimestamp) return 0;

    const elapsed = Date.now() - lastTimestamp;
    const remainingMs = TRADE_POST_COOLDOWN_MS - elapsed;
    if (remainingMs <= 0) return 0;

    return Math.ceil(remainingMs / 1000);
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemainingSeconds);

  useEffect(() => {
    // Immediate recalculation upon UID or profile change
    setRemainingSeconds(calculateRemainingSeconds());

    if (!currentUserUid) return;

    const intervalId = window.setInterval(() => {
      const remaining = calculateRemainingSeconds();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        // Automatically enabled
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentUserUid, profileLastTradePostAt]);

  const isOnCooldown = remainingSeconds > 0;
  const formattedRemaining = formatCooldownTimer(remainingSeconds);

  return {
    isOnCooldown,
    remainingSeconds,
    formattedRemaining,
    cooldownMessage: isOnCooldown ? `Next trade post available in ${formattedRemaining}` : null,
  };
}

/**
 * Atomically create a trade post and record the user's cooldown timestamp in a Firestore transaction.
 * Prevents concurrent or duplicate posts and enforces database-level eligibility.
 */
export async function createTradePostWithCooldownTransaction({
  tradePostData,
  currentUserUid,
}: {
  tradePostData: Record<string, any>;
  currentUserUid: string;
}): Promise<string> {
  if (!currentUserUid) {
    throw new Error('You must be signed in to post a trade.');
  }

  const userDocRef = doc(db, 'users', currentUserUid);
  const newPostDocRef = doc(collection(db, 'trade_posts'));
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    // 1. Transactional read must occur before any writes
    const userSnap = await transaction.get(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const lastPost = userData?.lastTradePostAt;

      if (typeof lastPost === 'number' && lastPost > 0) {
        const elapsed = now - lastPost;
        if (elapsed < TRADE_POST_COOLDOWN_MS) {
          const remainingSecs = Math.ceil((TRADE_POST_COOLDOWN_MS - elapsed) / 1000);
          const formatted = formatCooldownTimer(remainingSecs);
          throw new Error(`Next trade post available in ${formatted}`);
        }
      }

      // Update the user's persistent trade post timestamp
      transaction.update(userDocRef, {
        lastTradePostAt: now,
      });
    } else {
      // Create or merge user document with lastTradePostAt
      transaction.set(
        userDocRef,
        {
          lastTradePostAt: now,
        },
        { merge: true }
      );
    }

    // 2. Transactional write to create the trade post
    transaction.set(newPostDocRef, sanitizeForFirestore(tradePostData));
  });

  // 3. Update persistent local storage cache for this UID on successful commit
  persistTradePostTimestamp(currentUserUid, now);

  return newPostDocRef.id;
}
