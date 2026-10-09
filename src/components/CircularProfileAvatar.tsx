import React, { useState, useEffect } from 'react';
import { UserRole, UserMembership, MembershipLevel } from '../types';
import { getFrameAssets } from '../lib/frameAssets';
import { getProfileFrameById } from '../lib/frameCollection';

interface CircularProfileAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  role?: UserRole | string;
  membership?: UserMembership | MembershipLevel | string | null;
  membershipLevel?: MembershipLevel | string | null;
  profileFrameId?: string | null;
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
  profileFrameId,
  isAdmin = false,
  className = '',
  showAura = true,
  onClick,
}) => {
  const [frameAssets, setFrameAssetsState] = useState(getFrameAssets());

  useEffect(() => {
    const handleUpdate = () => setFrameAssetsState(getFrameAssets());
    window.addEventListener('frame-assets-updated', handleUpdate);
    return () => window.removeEventListener('frame-assets-updated', handleUpdate);
  }, []);
  // Determine if this user is protected Owner Admin (Admin Priority Rule)
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

  const isSupreme = !isOwnerAdmin && (levelStr === 'vip' || levelStr === 'supreme');
  const isOverlord = !isOwnerAdmin && (levelStr === 'premium' || levelStr === 'overlord');
  const isVanguard = !isOwnerAdmin && (levelStr === 'premium_lite' || levelStr === 'vanguard');

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

  // Scale multipliers for the ornate winged / decorative outer frame overlay
  const frameScaleClass = {
    xs: 'scale-[1.8]',
    sm: 'scale-[1.7]',
    md: 'scale-[1.65]',
    lg: 'scale-[1.6]',
    xl: 'scale-[1.55]',
    '2xl': 'scale-[1.5]',
    '3xl': 'scale-[1.45]',
  }[size];

  // Fallback image using dicebear seed
  const fallbackSrc = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(alt || 'trader')}`;
  const imageSrc = src || fallbackSrc;
  // Check custom assigned Profile Frame from Frame Collection
  const customProfileFrame = profileFrameId ? getProfileFrameById(profileFrameId) : null;
  if (customProfileFrame) {
    return (
      <div 
        onClick={onClick}
        title={`${customProfileFrame.name} — ${customProfileFrame.category}`}
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {showAura && (
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-md pointer-events-none animate-pulse" />
        )}

        <div className="relative z-10 w-[78%] h-[78%] rounded-full overflow-hidden border border-slate-700/80 shadow-md">
          <img
            src={imageSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-950 block select-none pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>

        <div className={`absolute inset-0 pointer-events-none z-20 flex items-center justify-center ${frameScaleClass}`}>
          <img
            src={customProfileFrame.assetUrl}
            alt={customProfileFrame.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md"
          />
        </div>
      </div>
    );
  }

  // 1. OWNER ADMIN — EXACT Gold/Black Winged Circular Admin Profile Frame
  if (isOwnerAdmin) {
    return (
      <div 
        onClick={onClick}
        title="Owner Admin — Official Winged Gold/Black Crown Frame"
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {/* Pulsing Admin Gold Aura */}
        {showAura && (
          <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-md pointer-events-none animate-pulse" />
        )}

        {/* Circular Profile Photo in exact center */}
        <div className="relative z-10 w-[78%] h-[78%] rounded-full overflow-hidden border border-amber-400/80 shadow-[0_0_12px_rgba(255,193,7,0.5)]">
          <img
            src={imageSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-950 block select-none pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>

        {/* EXACT Gold/Black Winged Circular Frame Asset Overlay */}
        <div className={`absolute inset-0 pointer-events-none z-20 flex items-center justify-center ${frameScaleClass}`}>
          <img
            src={frameAssets.admin.profileFrame}
            alt="Admin Winged Frame"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_10px_rgba(255,193,7,0.6)]"
          />
        </div>
      </div>
    );
  }

  // 2. SUPREME (VIP Members) — EXACT Purple Circular / Radiant Profile Frame Asset
  if (isSupreme) {
    return (
      <div 
        onClick={onClick}
        title="SUPREME — VIP Member Tier"
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {/* Pulsing Purple Aura */}
        {showAura && (
          <div className="absolute inset-0 rounded-full bg-purple-600/40 blur-md pointer-events-none animate-pulse" />
        )}

        {/* Circular Profile Photo */}
        <div className="relative z-10 w-[80%] h-[80%] rounded-full overflow-hidden border border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.5)]">
          <img
            src={imageSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-950 block select-none pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>

        {/* EXACT Purple Circular Frame Asset Overlay */}
        <div className={`absolute inset-0 pointer-events-none z-20 flex items-center justify-center ${frameScaleClass}`}>
          <img
            src={frameAssets.supreme.profileFrame}
            alt="Supreme Purple Frame"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
          />
        </div>
      </div>
    );
  }

  // 3. OVERLORD (Premium) — EXACT Diamond Circular Profile Frame Asset
  if (isOverlord) {
    return (
      <div 
        onClick={onClick}
        title="OVERLORD — Premium Member Tier"
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {showAura && (
          <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-md pointer-events-none" />
        )}

        {/* Circular Profile Photo */}
        <div className="relative z-10 w-[80%] h-[80%] rounded-full overflow-hidden border border-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.5)]">
          <img
            src={imageSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-950 block select-none pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>

        {/* EXACT Diamond Circular Frame Asset Overlay */}
        <div className={`absolute inset-0 pointer-events-none z-20 flex items-center justify-center ${frameScaleClass}`}>
          <img
            src={frameAssets.overlord.profileFrame}
            alt="Overlord Diamond Frame"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
          />
        </div>
      </div>
    );
  }

  // 4. VANGUARD (Premium Lite) — EXACT Golden Circular Profile Frame Asset
  if (isVanguard) {
    return (
      <div 
        onClick={onClick}
        title="VANGUARD — Premium Lite Tier"
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {showAura && (
          <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-sm pointer-events-none" />
        )}

        {/* Circular Profile Photo */}
        <div className="relative z-10 w-[82%] h-[82%] rounded-full overflow-hidden border border-amber-400/70 shadow-[0_0_10px_rgba(245,158,11,0.4)]">
          <img
            src={imageSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-950 block select-none pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>

        {/* EXACT Golden Circular Frame Asset Overlay */}
        <div className={`absolute inset-0 pointer-events-none z-20 flex items-center justify-center ${frameScaleClass}`}>
          <img
            src={frameAssets.vanguard.profileFrame}
            alt="Vanguard Gold Frame"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
          />
        </div>
      </div>
    );
  }

  // 5. Staff Roles (Officer, Trusted, JMD) — Circular Ring
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
            referrerPolicy="no-referrer"
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
            referrerPolicy="no-referrer"
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
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover aspect-square bg-slate-900 block select-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      </div>
    );
  }

  // 6. Standard Completely Circular Profile Photo for Normal Users
  return (
    <div 
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="w-full h-full rounded-full p-[1px] bg-slate-800 ring-1 ring-slate-700/60 shadow-inner overflow-hidden">
        <img
          src={imageSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full rounded-full object-cover aspect-square bg-slate-900 block select-none"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackSrc;
          }}
        />
      </div>
    </div>
  );
};
