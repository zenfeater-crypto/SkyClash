import React from 'react';
import { UserRole, UserMembership, MembershipLevel } from '../types';

interface CircularProfileAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  role?: UserRole | string;
  membership?: UserMembership | MembershipLevel | string | null;
  membershipLevel?: MembershipLevel | string | null;
  isAdmin?: boolean;
  className?: string;
  showAura?: boolean;
  onClick?: () => void;
}

export const CircularProfileAvatar: React.FC<CircularProfileAvatarProps> = ({
  src,
  alt,
  size = 'md',
  role,
  membership,
  membershipLevel,
  isAdmin = false,
  className = '',
  showAura = true,
  onClick,
}) => {
  // Determine if this user is Owner Admin or has specific membership
  const isOwnerAdmin = isAdmin || role === 'admin';

  // Normalize membership level
  let levelStr: string = '';
  if (typeof membership === 'string') {
    levelStr = membership.toLowerCase();
  } else if (membership && typeof membership === 'object' && 'level' in membership) {
    levelStr = (membership.level || '').toLowerCase();
  } else if (membershipLevel) {
    levelStr = membershipLevel.toLowerCase();
  }

  const isSupreme = levelStr === 'vip' || levelStr === 'supreme';
  const isOverlord = levelStr === 'premium' || levelStr === 'overlord';
  const isVanguard = levelStr === 'premium_lite' || levelStr === 'vanguard';

  // Dimension presets for circular container
  const dimensions = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
    '3xl': 'w-24 h-24',
  }[size];

  // Fallback image using dicebear seed
  const fallbackSrc = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(alt || 'trader')}`;
  const imageSrc = src && src.trim().length > 0 ? src : fallbackSrc;

  // Circular Frame & Aura Styles
  // 1. OWNER ADMIN & SUPREME: Circular dark-purple frame + circular dark-purple aura + crystal shine
  if (isOwnerAdmin || isSupreme) {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {/* Circular Dark-Purple Aura Glow */}
        {showAura && (
          <div className="absolute inset-0 rounded-full bg-purple-600/40 blur-md pointer-events-none animate-pulse" />
        )}

        {/* Circular Premium Frame Ring */}
        <div className="relative w-full h-full rounded-full p-[2.5px] bg-gradient-to-tr from-purple-900 via-purple-500 to-indigo-400 shadow-[0_0_16px_rgba(168,85,247,0.7)] ring-2 ring-purple-500/80">
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-950 block select-none pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      </div>
    );
  }

  // 2. OVERLORD: Circular shiny golden/diamond-style profile frame + shiny circular glow
  if (isOverlord) {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {/* Circular Shiny Golden/Diamond Glow */}
        {showAura && (
          <div className="absolute inset-0 rounded-full bg-amber-400/35 blur-md pointer-events-none" />
        )}

        {/* Circular Shiny Golden/Diamond Frame */}
        <div className="relative w-full h-full rounded-full p-[2.5px] bg-gradient-to-tr from-amber-600 via-yellow-300 to-cyan-300 shadow-[0_0_16px_rgba(251,191,36,0.65),0_0_10px_rgba(34,211,238,0.5)] ring-2 ring-amber-400/80">
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-950 block select-none pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      </div>
    );
  }

  // 3. VANGUARD: Circular golden profile frame + golden circular glow
  if (isVanguard) {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {/* Circular Golden Glow */}
        {showAura && (
          <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-sm pointer-events-none" />
        )}

        {/* Circular Golden Frame */}
        <div className="relative w-full h-full rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-2 ring-amber-500/70">
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-950 block select-none pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      </div>
    );
  }

  // 4. Staff Roles (Officer, Trusted, JMD) — Circular Ring
  if (role === 'officer') {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <div className="relative w-full h-full rounded-full p-[1.5px] bg-gradient-to-tr from-slate-600 to-slate-400 ring-1 ring-slate-400/50 shadow-sm">
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-900 block select-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      </div>
    );
  }

  if (role === 'trusted') {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <div className="relative w-full h-full rounded-full p-[1.5px] bg-gradient-to-tr from-sky-600 to-blue-400 ring-1 ring-sky-400/50 shadow-sm">
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-900 block select-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      </div>
    );
  }

  if (role === 'jmd') {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <div className="relative w-full h-full rounded-full p-[1.5px] bg-gradient-to-tr from-purple-600 to-indigo-400 ring-1 ring-purple-400/50 shadow-sm">
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-900 block select-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      </div>
    );
  }

  // 5. Standard Completely Circular Profile Photo for Normal Users
  return (
    <div 
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="w-full h-full rounded-full p-[1px] bg-slate-800 ring-1 ring-slate-700/60 shadow-inner">
        <img
          src={imageSrc}
          alt={alt}
          className="w-full h-full rounded-full object-cover aspect-square bg-slate-900 block select-none"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackSrc;
          }}
        />
      </div>
    </div>
  );
};
