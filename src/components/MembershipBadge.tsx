import React from 'react';
import { Sparkles, Diamond, Flame } from 'lucide-react';
import { MembershipLevel, MembershipTitle } from '../types';

interface MembershipBadgeProps {
  level?: MembershipLevel | string | null;
  title?: MembershipTitle | string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({
  level,
  title,
  size = 'xs',
  showIcon = true,
  className = '',
}) => {
  // Normalize membership level or title
  const normLevel = (level || '').toLowerCase();
  const normTitle = (title || '').toUpperCase();

  const isVanguard = normLevel === 'premium_lite' || normTitle === 'VANGUARD';
  const isOverlord = normLevel === 'premium' || normTitle === 'OVERLORD';
  const isSupreme = normLevel === 'vip' || normTitle === 'SUPREME';

  if (!isVanguard && !isOverlord && !isSupreme) return null;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1 tracking-wider',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 gap-1.5 tracking-wide',
    lg: 'text-sm px-3 py-1.5 gap-2 tracking-wide font-black',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  // 1. SUPREME (VIP Members) — Dark-Purple Crystal Aura & Glint
  if (isSupreme) {
    return (
      <span
        title="SUPREME — VIP Member Tier"
        className={`inline-flex items-center font-mono font-black uppercase rounded-md border select-none transition-all duration-300 shadow-md ${sizeClasses} bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-purple-200 border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.45)] ring-1 ring-purple-400/50 hover:shadow-[0_0_18px_rgba(168,85,247,0.7)] ${className}`}
      >
        {showIcon && <Flame className={`${iconSizes} text-purple-300 fill-purple-400/30 animate-pulse`} />}
        <span className="bg-gradient-to-r from-purple-200 via-violet-100 to-purple-300 bg-clip-text text-transparent font-extrabold drop-shadow">
          [SUPREME]
        </span>
      </span>
    );
  }

  // 2. OVERLORD (Premium) — Diamond-Style Shiny Gold & Metallic Platinum
  if (isOverlord) {
    return (
      <span
        title="OVERLORD — Premium Member Tier"
        className={`inline-flex items-center font-mono font-black uppercase rounded-md border select-none transition-all duration-300 shadow-md ${sizeClasses} bg-gradient-to-r from-amber-950 via-yellow-900/90 to-cyan-950 text-cyan-200 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.4),0_0_8px_rgba(34,211,238,0.3)] ring-1 ring-cyan-300/50 hover:shadow-[0_0_18px_rgba(251,191,36,0.65)] ${className}`}
      >
        {showIcon && <Diamond className={`${iconSizes} text-cyan-300 fill-cyan-300/30 drop-shadow`} />}
        <span className="bg-gradient-to-r from-amber-200 via-cyan-100 to-amber-300 bg-clip-text text-transparent font-extrabold drop-shadow">
          [OVERLORD]
        </span>
      </span>
    );
  }

  // 3. VANGUARD (Premium Lite) — Golden Crystal Gemstone Styling
  if (isVanguard) {
    return (
      <span
        title="VANGUARD — Premium Lite Tier"
        className={`inline-flex items-center font-mono font-black uppercase rounded-md border select-none transition-all duration-300 shadow-md ${sizeClasses} bg-gradient-to-r from-amber-950/90 via-yellow-950/80 to-amber-900 text-amber-200 border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.55)] ${className}`}
      >
        {showIcon && <Sparkles className={`${iconSizes} text-amber-300 fill-amber-300/30`} />}
        <span className="bg-gradient-to-r from-yellow-200 via-amber-100 to-yellow-300 bg-clip-text text-transparent font-extrabold drop-shadow">
          [VANGUARD]
        </span>
      </span>
    );
  }

  return null;
};
