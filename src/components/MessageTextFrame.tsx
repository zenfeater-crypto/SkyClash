import React, { useState, useEffect } from 'react';
import { UserRole, MembershipLevel } from '../types';
import { getFrameAssets } from '../lib/frameAssets';
import { getTextFrameById } from '../lib/frameCollection';

interface MessageTextFrameProps {
  role?: UserRole | string;
  membershipLevel?: MembershipLevel | string | null;
  textFrameId?: string | null;
  isOwnerAdmin?: boolean;
  isMe?: boolean;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

export const MessageTextFrame: React.FC<MessageTextFrameProps> = ({
  role,
  membershipLevel,
  textFrameId,
  isOwnerAdmin = false,
  isMe = false,
  text,
  className = '',
  children,
}) => {
  const [frameAssets, setFrameAssetsState] = useState(getFrameAssets());

  useEffect(() => {
    const handleUpdate = () => setFrameAssetsState(getFrameAssets());
    window.addEventListener('frame-assets-updated', handleUpdate);
    return () => window.removeEventListener('frame-assets-updated', handleUpdate);
  }, []);

  const content = children || text;

  // Check custom assigned Text Frame from Frame Collection
  const customTextFrame = textFrameId ? getTextFrameById(textFrameId) : null;
  if (customTextFrame) {
    return (
      <div 
        className={`relative max-w-full rounded-xl overflow-hidden p-[2px] transition-all shadow-md select-text ${className}`}
        style={{
          backgroundImage: `url(${customTextFrame.assetUrl})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 px-5 py-3 text-xs sm:text-sm font-medium text-slate-100 leading-relaxed break-words">
          {content}
        </div>
      </div>
    );
  }

  // Determine protected Owner Admin priority
  const isAdminUser = isOwnerAdmin || role === 'admin';
  const normLevel = (membershipLevel || '').toLowerCase();

  const isSupreme = !isAdminUser && (normLevel === 'vip' || normLevel === 'supreme');
  const isOverlord = !isAdminUser && (normLevel === 'premium' || normLevel === 'overlord');
  const isVanguard = !isAdminUser && (normLevel === 'premium_lite' || normLevel === 'vanguard');

  // 1. OWNER ADMIN — EXACT Gold/Black Rectangular Admin Text/Message Frame
  if (isAdminUser) {
    return (
      <div 
        className={`relative max-w-full rounded-xl overflow-hidden p-[2px] transition-all shadow-[0_0_18px_rgba(255,193,7,0.35)] select-text ${className}`}
        style={{
          backgroundImage: `url(${frameAssets.admin.messageFrame})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 px-5 py-3 text-xs sm:text-sm font-medium text-amber-100/95 leading-relaxed break-words">
          {content}
        </div>
      </div>
    );
  }

  // 2. SUPREME (VIP Members) — EXACT Purple Decorative Rectangular Message Frame
  if (isSupreme) {
    return (
      <div 
        className={`relative max-w-full rounded-xl overflow-hidden p-[2px] transition-all shadow-[0_0_16px_rgba(168,85,247,0.35)] select-text ${className}`}
        style={{
          backgroundImage: `url(${frameAssets.supreme.messageFrame})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 px-5 py-3 text-xs sm:text-sm font-medium text-purple-100 leading-relaxed break-words">
          {content}
        </div>
      </div>
    );
  }

  // 3. OVERLORD (Premium) — EXACT Silver Metallic Rectangular Message Frame
  if (isOverlord) {
    return (
      <div 
        className={`relative max-w-full rounded-xl overflow-hidden p-[2px] transition-all shadow-[0_0_16px_rgba(226,232,240,0.35)] select-text ${className}`}
        style={{
          backgroundImage: `url(${frameAssets.overlord.messageFrame})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 px-5 py-3 text-xs sm:text-sm font-medium text-slate-100 leading-relaxed break-words">
          {content}
        </div>
      </div>
    );
  }

  // 4. VANGUARD (Premium Lite) — EXACT Golden Decorative Rectangular Message Frame
  if (isVanguard) {
    return (
      <div 
        className={`relative max-w-full rounded-xl overflow-hidden p-[2px] transition-all shadow-[0_0_14px_rgba(245,158,11,0.3)] select-text ${className}`}
        style={{
          backgroundImage: `url(${frameAssets.vanguard.messageFrame})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 px-5 py-3 text-xs sm:text-sm font-medium text-amber-100 leading-relaxed break-words">
          {content}
        </div>
      </div>
    );
  }

  // 5. Standard / Default Message Bubble for Normal users
  return (
    <div
      className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-md select-text ${
        isMe
          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
      } ${className}`}
    >
      {content}
    </div>
  );
};
