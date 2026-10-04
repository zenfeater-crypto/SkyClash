import React from 'react';
import { Crown, Shield, ShieldCheck, Sliders } from 'lucide-react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role?: UserRole | string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ 
  role, 
  size = 'xs',
  showIcon = true 
}) => {
  if (!role || role === 'user') return null;

  // Normalized check strictly against verified server roles
  const validRole = (role === 'admin' || role === 'officer' || role === 'trusted' || role === 'jmd') ? role : null;
  if (!validRole) return null;

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1 tracking-wider',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 gap-1.5 tracking-wide',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  if (validRole === 'admin') {
    return (
      <span
        title="App Owner & System Administrator"
        className={`inline-flex items-center font-mono font-black uppercase rounded-md border select-none transition-all shadow-sm ${sizeStyles} bg-gradient-to-r from-amber-950/90 via-yellow-900/60 to-amber-950/90 text-amber-300 border-amber-500/60 shadow-amber-950/50 ring-1 ring-amber-400/20`}
      >
        {showIcon && <Crown className={`${iconSizes} text-amber-300 drop-shadow fill-amber-300/20`} />}
        <span>[ADMIN]</span>
      </span>
    );
  }

  if (validRole === 'officer') {
    return (
      <span
        title="Staff Officer — Value Moderator"
        className={`inline-flex items-center font-mono font-extrabold uppercase rounded-md border select-none transition-all shadow-sm ${sizeStyles} bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 text-slate-200 border-slate-400/60 shadow-slate-900/50 ring-1 ring-slate-400/20`}
      >
        {showIcon && <Shield className={`${iconSizes} text-slate-300 drop-shadow fill-slate-300/20`} />}
        <span>[OFFICER]</span>
      </span>
    );
  }

  if (validRole === 'trusted') {
    return (
      <span
        title="Trusted Member — Verified Reporter"
        className={`inline-flex items-center font-mono font-bold uppercase rounded-md border select-none transition-all shadow-sm ${sizeStyles} bg-gradient-to-r from-blue-950/90 via-sky-900/60 to-indigo-950/90 text-sky-300 border-sky-500/50 shadow-blue-950/40 ring-1 ring-sky-400/20`}
      >
        {showIcon && <ShieldCheck className={`${iconSizes} text-sky-300 drop-shadow fill-sky-300/20`} />}
        <span>[TRUSTED]</span>
      </span>
    );
  }

  if (validRole === 'jmd') {
    return (
      <span
        title="JMD — Special Staff Member"
        className={`inline-flex items-center font-mono font-extrabold uppercase rounded-md border select-none transition-all shadow-sm ${sizeStyles} bg-gradient-to-r from-purple-950/90 via-violet-900/60 to-purple-950/90 text-purple-300 border-purple-500/60 shadow-purple-950/50 ring-1 ring-purple-400/20`}
      >
        {showIcon && <Sliders className={`${iconSizes} text-purple-300 drop-shadow fill-purple-300/20`} />}
        <span>[JMD]</span>
      </span>
    );
  }

  return null;
};
