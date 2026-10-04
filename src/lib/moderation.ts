import { UserProfile, UserRole } from '../types';

export interface DetailedBanStatus {
  isBanned: boolean;
  statusLabel: 'ACTIVE TEMPORARY BAN' | 'ACTIVE PERMANENT BAN' | 'ACTIVE';
  banType?: 'temporary' | 'permanent';
  banReason?: string;
  expiresText?: string;
  bannedUntil?: number | null;
}

/**
 * Evaluates whether a user is currently banned.
 * If temporary ban has expired (bannedUntil <= now), automatically treated as not banned.
 */
export function isUserBanned(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  const isMarkedBanned = profile.banned === true || profile.isBanned === true;
  if (!isMarkedBanned) return false;

  if (profile.banType === 'temporary') {
    if (!profile.bannedUntil) return true;
    return profile.bannedUntil > Date.now();
  }

  // Permanent ban default
  return true;
}

/**
 * Returns comprehensive ban status information including exact label and expiration formatting.
 */
export function getDetailedBanStatus(profile?: UserProfile | null): DetailedBanStatus {
  if (!profile) {
    return { isBanned: false, statusLabel: 'ACTIVE' };
  }
  const isMarkedBanned = profile.banned === true || profile.isBanned === true;
  if (!isMarkedBanned) {
    return { isBanned: false, statusLabel: 'ACTIVE' };
  }

  if (profile.banType === 'temporary') {
    const isStillActive = profile.bannedUntil ? profile.bannedUntil > Date.now() : true;
    if (isStillActive) {
      const dateStr = profile.bannedUntil ? new Date(profile.bannedUntil).toLocaleString() : 'Indefinite';
      const timeLeft = profile.bannedUntil ? formatRemainingTime(profile.bannedUntil) : '';
      return {
        isBanned: true,
        statusLabel: 'ACTIVE TEMPORARY BAN',
        banType: 'temporary',
        banReason: profile.banReason,
        bannedUntil: profile.bannedUntil,
        expiresText: `Expires: ${dateStr} (${timeLeft})`,
      };
    } else {
      // Temporary ban has expired automatically
      return { isBanned: false, statusLabel: 'ACTIVE' };
    }
  }

  return {
    isBanned: true,
    statusLabel: 'ACTIVE PERMANENT BAN',
    banType: 'permanent',
    banReason: profile.banReason,
    expiresText: 'Permanent',
  };
}

/**
 * Evaluates whether a user is currently muted.
 * If temporary mute has expired (mutedUntil <= now), automatically treated as not muted.
 */
export function isUserMuted(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  const isMarkedMuted = profile.muted === true || profile.isMuted === true;
  if (!isMarkedMuted) return false;

  if (profile.muteType === 'temporary') {
    if (!profile.mutedUntil) return true;
    return profile.mutedUntil > Date.now();
  }

  return true;
}

/**
 * Format remaining ban or mute duration
 */
export function formatRemainingTime(targetTimestamp?: number | null): string {
  if (!targetTimestamp) return 'Permanent';
  const diff = targetTimestamp - Date.now();
  if (diff <= 0) return 'Expired';

  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    const remHours = hours % 24;
    return `${days}d ${remHours}h left`;
  }
  if (hours > 0) {
    const remMins = mins % 60;
    return `${hours}h ${remMins}m left`;
  }
  return `${Math.max(1, mins)}m left`;
}

/**
 * Staff permission gates
 */
export function isAdminRole(role?: UserRole): boolean {
  return role === 'admin';
}

export function isOfficerRole(role?: UserRole): boolean {
  return role === 'officer';
}

export function isTrustedRole(role?: UserRole): boolean {
  return role === 'trusted';
}

export function isStaffMember(role?: UserRole): boolean {
  return role === 'admin' || role === 'officer';
}

export function canManageValues(role?: UserRole): boolean {
  return role === 'admin' || role === 'officer';
}

export function canManageFullCatalog(role?: UserRole): boolean {
  return role === 'admin';
}

export function canManageRoles(role?: UserRole): boolean {
  return role === 'admin';
}

export function canBanUsers(role?: UserRole): boolean {
  return role === 'admin';
}

export function canMuteUsers(role?: UserRole): boolean {
  return role === 'admin' || role === 'officer';
}

export function canReviewReports(role?: UserRole): boolean {
  return role === 'admin' || role === 'officer';
}
