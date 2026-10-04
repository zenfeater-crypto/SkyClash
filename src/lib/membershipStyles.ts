import { UserRole, MembershipLevel } from '../types';

/**
 * Returns Tailwind classes for message card containers according to user membership & Owner Admin tier.
 *
 * Requirements:
 * - VANGUARD: Golden frame + golden glow
 * - OVERLORD: Shiny diamond-style message frame + shine
 * - SUPREME: Purple message frame + dark-purple aura
 * - OWNER ADMIN: Dark-purple SUPREME-style message frame + aura while still showing ADMIN
 */
export function getMessageStyleClass(
  role?: UserRole | string,
  membershipLevel?: MembershipLevel | string | null,
  isOwnerAdmin?: boolean
): string {
  const isAdminUser = isOwnerAdmin || role === 'admin';
  const level = (membershipLevel || '').toLowerCase();

  // 1. OWNER ADMIN & SUPREME (VIP Members)
  // Dark-purple message frame + dark-purple aura + crystal shine
  if (isAdminUser || level === 'vip' || level === 'supreme') {
    return 'bg-gradient-to-r from-purple-950/70 via-slate-900/90 to-purple-950/50 border-2 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/40';
  }

  // 2. OVERLORD (Premium)
  // Diamond-style shiny message frame + shine reflection
  if (level === 'premium' || level === 'overlord') {
    return 'bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-cyan-950/40 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3),0_0_10px_rgba(34,211,238,0.2)] ring-1 ring-cyan-300/40';
  }

  // 3. VANGUARD (Premium Lite)
  // Golden frame + golden glow
  if (level === 'premium_lite' || level === 'vanguard') {
    return 'bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/25 border-2 border-amber-500/70 shadow-[0_0_16px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30';
  }

  // 4. Default / Standard user message styling
  return 'bg-slate-900/90 border border-slate-800 hover:border-slate-700/80';
}
