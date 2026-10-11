import { 
  doc, 
  runTransaction, 
  collection, 
  getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { Tournament, TournamentRegistration, UserProfile } from '../types';

/**
 * Parses numeric coin amount from arbitrary entry fee text.
 * Examples:
 *  - "700 Coins" -> 700
 *  - "1,000 Coins" -> 1000
 *  - "Free" / "Free Entry" -> 0
 *  - 500 -> 500
 */
export function parseEntryFeeCoins(entryFee: string | number | undefined | null): number {
  if (entryFee === undefined || entryFee === null) return 0;
  if (typeof entryFee === 'number') {
    return isNaN(entryFee) ? 0 : Math.max(0, Math.floor(entryFee));
  }

  const str = String(entryFee).trim();
  if (!str) return 0;

  if (/free/i.test(str)) {
    return 0;
  }

  // Remove commas, e.g. "1,700 Coins" -> "1700 Coins"
  const cleaned = str.replace(/,/g, '');
  const match = cleaned.match(/\d+/);
  if (match) {
    const parsed = parseInt(match[0], 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  return 0;
}

/**
 * Returns the exact numeric entry fee in coins for a tournament.
 */
export function getTournamentEntryFeeCoins(tournament: { entryFeeCoins?: number; entryFee?: string } | null | undefined): number {
  if (!tournament) return 0;
  if (typeof tournament.entryFeeCoins === 'number' && !isNaN(tournament.entryFeeCoins)) {
    return Math.max(0, Math.floor(tournament.entryFeeCoins));
  }
  return parseEntryFeeCoins(tournament.entryFee);
}

/**
 * Securely verifies if a profile represents the permanent Owner Admin "Strike".
 * Matches role === 'admin' AND Strike username / normalized identifier.
 */
export function isOwnerAdminProfile(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  const isStrikeUsername = 
    profile.username?.toLowerCase() === 'strike' || 
    profile.normalizedUsername === 'strike';
  return profile.role === 'admin' && isStrikeUsername;
}

export interface JoinTournamentResult {
  success: boolean;
  error?: string;
  entryFeeCoins: number;
  previousBalance: number;
  newBalance: number;
  tournamentName: string;
  registrationId: string;
}

/**
 * Atomically registers a player for a tournament using their saved coin balance.
 *
 * Enforces:
 * 1. User authenticated & exists in database.
 * 2. Permanent Owner Admin Strike unlimited coins privilege (never runs out, never blocked).
 * 3. Normal users must have sufficient coin balance >= entry fee.
 * 4. Deducts exact entry fee from database user document atomically.
 * 5. Tournament roster limit enforcement (cannot exceed maxPlayers).
 * 6. Duplicate registration and duplicate charge prevention.
 * 7. In case of failure/rejection at any stage, no coins are deducted.
 */
export async function joinTournamentWithCoins(
  tournamentId: string,
  currentUser: { uid: string },
  userProfile: UserProfile
): Promise<JoinTournamentResult> {
  if (!currentUser?.uid) {
    return {
      success: false,
      error: 'You must be signed in to join a tournament.',
      entryFeeCoins: 0,
      previousBalance: 0,
      newBalance: 0,
      tournamentName: '',
      registrationId: '',
    };
  }

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. READ Tournament document
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      const tourneySnap = await transaction.get(tourneyRef);

      if (!tourneySnap.exists()) {
        throw new Error('Tournament not found or has been removed.');
      }

      const tourneyData = tourneySnap.data() as Tournament;

      // 2. READ Registration document to prevent duplicate registration
      const regId = `${tournamentId}_${currentUser.uid}`;
      const regRef = doc(db, 'tournament_registrations', regId);
      const regSnap = await transaction.get(regRef);

      if (regSnap.exists()) {
        throw new Error(`You are already registered for "${tourneyData.name}".`);
      }

      // Check registeredUserUids array in tournament
      const existingRegisteredUids: string[] = Array.isArray(tourneyData.registeredUserUids)
        ? tourneyData.registeredUserUids
        : [];

      if (existingRegisteredUids.includes(currentUser.uid)) {
        throw new Error(`You are already registered for "${tourneyData.name}".`);
      }

      // 3. Enforce maximum player limit
      const currentCount = typeof tourneyData.registeredCount === 'number'
        ? tourneyData.registeredCount
        : existingRegisteredUids.length;
      const maxPlayers = tourneyData.maxPlayers || 32;

      if (currentCount >= maxPlayers) {
        throw new Error(`Tournament roster is full (${currentCount}/${maxPlayers} players). No slots remaining.`);
      }

      // 4. READ User Profile document to verify exact database coin balance
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile record not found in database.');
      }

      const userData = userSnap.data() as UserProfile;
      const currentBalance = typeof userData.coinBalance === 'number' ? userData.coinBalance : 0;
      const entryFeeCoins = getTournamentEntryFeeCoins(tourneyData);

      // Check Owner Admin Strike unlimited coins privilege
      const isStrikeAdmin = isOwnerAdminProfile(userData);

      let newBalance = currentBalance;

      if (!isStrikeAdmin && entryFeeCoins > 0) {
        if (currentBalance < entryFeeCoins) {
          throw new Error(
            `Insufficient coins: Entry fee is ${entryFeeCoins.toLocaleString()} coins, but your current balance is ${currentBalance.toLocaleString()} coins. Claim Daily Rewards or win challenges to earn more coins!`
          );
        }
        newBalance = currentBalance - entryFeeCoins;

        // Atomically deduct entry fee from user's saved coin balance
        transaction.update(userRef, {
          coinBalance: newBalance,
        });
      }

      // 5. Create Tournament Registration document
      const registrationData: TournamentRegistration = {
        id: regId,
        tournamentId,
        tournamentName: tourneyData.name,
        userUid: currentUser.uid,
        appUsername: userData.username || userProfile.username || 'Player',
        displayName: userData.name || userData.username || userProfile.name || 'Player',
        avatarUrl: userData.profilePhoto || userData.avatarUrl || userProfile.avatarUrl || '',
        profilePhoto: userData.profilePhoto || userData.avatarUrl || userProfile.avatarUrl || '',
        role: userData.role || 'user',
        membership: userData.membership || null,
        profileFrameId: userData.profileFrameId || null,
        textFrameId: userData.textFrameId || null,
        registeredAt: Date.now(),
        registeredByAdminUid: isStrikeAdmin ? currentUser.uid : 'self_service',
        registeredByUsername: userData.username || userProfile.username || 'Player',
        entryFeeCoinsPaid: isStrikeAdmin ? 0 : entryFeeCoins,
        entryFeeString: tourneyData.entryFee || (entryFeeCoins > 0 ? `${entryFeeCoins} Coins` : 'Free'),
        feePolicy: isStrikeAdmin ? 'free' : (entryFeeCoins > 0 ? 'paid' : 'free'),
        notes: isStrikeAdmin 
          ? 'Owner Admin Unlimited Coins Registration' 
          : `Self-service entry (Paid: ${entryFeeCoins} coins)`,
      };

      transaction.set(regRef, registrationData);

      // 6. Update Tournament registeredCount and registeredUserUids
      const updatedUserUids = Array.from(new Set([...existingRegisteredUids, currentUser.uid]));
      transaction.update(tourneyRef, {
        registeredCount: currentCount + 1,
        registeredUserUids: updatedUserUids,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        entryFeeCoins: isStrikeAdmin ? 0 : entryFeeCoins,
        previousBalance: currentBalance,
        newBalance,
        tournamentName: tourneyData.name,
        registrationId: regId,
      };
    });

    return result;
  } catch (err: any) {
    console.error('[tournamentService] Error joining tournament:', err);
    return {
      success: false,
      error: err.message || 'Failed to join tournament. Please try again.',
      entryFeeCoins: 0,
      previousBalance: userProfile.coinBalance || 0,
      newBalance: userProfile.coinBalance || 0,
      tournamentName: '',
      registrationId: '',
    };
  }
}

export interface AdminRegisterPlayerOptions {
  chargePlayerFee: boolean; // Explicit choice: charge player or grant complimentary admin pass
}

/**
 * Allows Admin to register any player by username.
 * If chargePlayerFee is true, atomically checks player's coins and deducts the entry fee.
 * If false (default), grants a complimentary Admin Pass with 0 coins deducted.
 * Never silently deducts coins!
 */
export async function adminRegisterPlayerWithCoins(
  tournamentId: string,
  targetPlayer: UserProfile,
  adminUser: { uid: string },
  adminProfile: UserProfile,
  options: AdminRegisterPlayerOptions
): Promise<{ success: boolean; error?: string; coinsDeducted: number }> {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Read Tournament
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      const tourneySnap = await transaction.get(tourneyRef);
      if (!tourneySnap.exists()) {
        throw new Error('Tournament does not exist.');
      }
      const tourneyData = tourneySnap.data() as Tournament;

      // 2. Read Registration doc
      const regId = `${tournamentId}_${targetPlayer.uid}`;
      const regRef = doc(db, 'tournament_registrations', regId);
      const regSnap = await transaction.get(regRef);
      if (regSnap.exists()) {
        throw new Error(`Player @${targetPlayer.username} is already registered for this tournament.`);
      }

      const existingRegisteredUids: string[] = Array.isArray(tourneyData.registeredUserUids)
        ? tourneyData.registeredUserUids
        : [];
      if (existingRegisteredUids.includes(targetPlayer.uid)) {
        throw new Error(`Player @${targetPlayer.username} is already registered.`);
      }

      // Check max players
      const currentCount = typeof tourneyData.registeredCount === 'number'
        ? tourneyData.registeredCount
        : existingRegisteredUids.length;
      if (currentCount >= (tourneyData.maxPlayers || 32)) {
        throw new Error(`Maximum player capacity (${tourneyData.maxPlayers}) has been reached.`);
      }

      // 3. Read Player Document
      const playerRef = doc(db, 'users', targetPlayer.uid);
      const playerSnap = await transaction.get(playerRef);
      if (!playerSnap.exists()) {
        throw new Error(`Player record for @${targetPlayer.username} not found.`);
      }

      const playerData = playerSnap.data() as UserProfile;
      const entryFeeCoins = getTournamentEntryFeeCoins(tourneyData);
      let coinsDeducted = 0;

      if (options.chargePlayerFee && entryFeeCoins > 0) {
        const currentBalance = typeof playerData.coinBalance === 'number' ? playerData.coinBalance : 0;
        if (currentBalance < entryFeeCoins) {
          throw new Error(
            `Player @${playerData.username} has insufficient coins. Required: ${entryFeeCoins.toLocaleString()} coins, but player only has ${currentBalance.toLocaleString()} coins. Register with a Complimentary Admin Pass instead.`
          );
        }
        coinsDeducted = entryFeeCoins;
        transaction.update(playerRef, {
          coinBalance: currentBalance - entryFeeCoins,
        });
      }

      // 4. Create Registration
      const regData: TournamentRegistration = {
        id: regId,
        tournamentId,
        tournamentName: tourneyData.name,
        userUid: targetPlayer.uid,
        appUsername: playerData.username || targetPlayer.username || 'unknown',
        displayName: playerData.name || playerData.username || 'Player',
        avatarUrl: playerData.profilePhoto || playerData.avatarUrl || '',
        profilePhoto: playerData.profilePhoto || playerData.avatarUrl || '',
        role: playerData.role || 'user',
        membership: playerData.membership || null,
        profileFrameId: playerData.profileFrameId || null,
        textFrameId: playerData.textFrameId || null,
        registeredAt: Date.now(),
        registeredByAdminUid: adminUser.uid,
        registeredByUsername: adminProfile.username || 'Strike',
        entryFeeCoinsPaid: coinsDeducted,
        entryFeeString: tourneyData.entryFee || 'Free',
        feePolicy: options.chargePlayerFee && coinsDeducted > 0 ? 'paid' : 'complimentary_admin',
        notes: options.chargePlayerFee && coinsDeducted > 0 
          ? `Admin registration with fee deducted: ${coinsDeducted} coins`
          : 'Complimentary Admin Pass (0 coins deducted)',
      };
      transaction.set(regRef, regData);

      // 5. Update Tournament
      const updatedUserUids = Array.from(new Set([...existingRegisteredUids, targetPlayer.uid]));
      transaction.update(tourneyRef, {
        registeredCount: currentCount + 1,
        registeredUserUids: updatedUserUids,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        coinsDeducted,
      };
    });

    return result;
  } catch (err: any) {
    console.error('[tournamentService] Admin registration error:', err);
    return {
      success: false,
      error: err.message || 'Failed to register player.',
      coinsDeducted: 0,
    };
  }
}
