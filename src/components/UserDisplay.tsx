import React from 'react';
import { UserRole, UserMembership, MembershipLevel, MembershipTitle } from '../types';
import { RoleBadge } from './RoleBadge';
import { MembershipBadge } from './MembershipBadge';
import { CircularProfileAvatar } from './CircularProfileAvatar';
import { stripSpoofedRoleTags } from '../lib/validation';

interface UserDisplayProps {
  name?: string;
  username: string;
  role?: UserRole | string;
  membership?: UserMembership | MembershipLevel | string | null;
  membershipLevel?: MembershipLevel | string | null;
  membershipTitle?: MembershipTitle | string | null;
  avatarUrl?: string;
  showAvatar?: boolean;
  avatarSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  badgeSize?: 'xs' | 'sm' | 'md';
  className?: string;
  showAtUsername?: boolean;
  onClickAvatar?: () => void;
}

export const UserDisplay: React.FC<UserDisplayProps> = ({
  name,
  username,
  role,
  membership,
  membershipLevel,
  membershipTitle,
  avatarUrl,
  showAvatar = false,
  avatarSize = 'sm',
  badgeSize = 'xs',
  className = '',
  showAtUsername = true,
  onClickAvatar,
}) => {
  // Strip any spoofed text like "[ADMIN]" or "[OFFICER]" from the user's display name string
  const cleanDisplayName = stripSpoofedRoleTags(name || username) || username;

  return (
    <div className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
      {showAvatar && (
        <CircularProfileAvatar
          src={avatarUrl}
          alt={username}
          size={avatarSize}
          role={role}
          membership={membership}
          membershipLevel={membershipLevel}
          isAdmin={role === 'admin'}
          onClick={onClickAvatar}
        />
      )}

      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <span className="font-bold text-white tracking-tight">
          {cleanDisplayName}
        </span>

        {showAtUsername && (
          <span className="text-xs text-amber-400 font-mono font-normal">
            @{username}
          </span>
        )}

        {/* Official protected role badge (ADMIN, OFFICER, TRUSTED, JMD) */}
        <RoleBadge role={role} size={badgeSize} />

        {/* Official membership badge (VANGUARD, OVERLORD, SUPREME) */}
        <MembershipBadge
          level={membershipLevel || (typeof membership === 'object' ? membership?.level : membership)}
          title={membershipTitle || (typeof membership === 'object' ? membership?.title : null)}
          size={badgeSize}
        />
      </div>
    </div>
  );
};
