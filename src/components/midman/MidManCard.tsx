import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  Gamepad2, 
  DollarSign, 
  FileText, 
  Copy, 
  Check, 
  Clock, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MidManPost, UserRole } from '../../types';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { RoleBadge } from '../RoleBadge';
import { formatTimeAgo } from '../../lib/formatters';
import { stripSpoofedRoleTags } from '../../lib/validation';

interface MidManCardProps {
  post: MidManPost;
  isAdmin: boolean;
  currentUserId?: string;
  onStartChat: (post: MidManPost) => void;
  onEdit: (post: MidManPost) => void;
  onDelete: (post: MidManPost) => void;
  onViewProfile?: (uid: string) => void;
}

export const MidManCard: React.FC<MidManCardProps> = ({
  post,
  isAdmin,
  currentUserId,
  onStartChat,
  onEdit,
  onDelete,
  onViewProfile,
}) => {
  const [copiedIgn, setCopiedIgn] = useState(false);
  // Live user profile state to ensure we always reflect the user's latest avatar and name if changed
  const [liveUserData, setLiveUserData] = useState<{
    name?: string;
    avatarUrl?: string;
    profilePhoto?: string;
    role?: UserRole;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (post.targetUserUid) {
      getDoc(doc(db, 'users', post.targetUserUid))
        .then((snap) => {
          if (snap.exists() && isMounted) {
            const data = snap.data();
            setLiveUserData({
              name: data.name || data.displayName || data.username,
              avatarUrl: data.avatarUrl,
              profilePhoto: data.profilePhoto,
              role: data.role,
            });
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [post.targetUserUid]);

  const handleCopyIgn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(post.gameUsername).then(() => {
        setCopiedIgn(true);
        setTimeout(() => setCopiedIgn(false), 2000);
      }).catch(() => {});
    }
  };

  const displayName = stripSpoofedRoleTags(liveUserData?.name || post.appDisplayName || post.appUsername) || post.appUsername;
  const currentPfp = liveUserData?.profilePhoto || liveUserData?.avatarUrl || post.profilePhoto || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${post.appUsername}`;
  const isMe = currentUserId === post.targetUserUid;
  const isAccountTrades = post.category === 'account_trades';

  return (
    <div className="relative bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 transition duration-200 group overflow-hidden">
      {/* Subtle ambient lighting accent */}
      <div 
        className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none ${
          isAccountTrades ? 'bg-cyan-500/10' : 'bg-emerald-500/10'
        }`} 
      />

      {/* Top Header: Category Badge + Timestamp + Admin Controls */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span 
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wider font-mono border shadow-sm ${
              isAccountTrades
                ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10'
                : 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{isAccountTrades ? 'ACCOUNT TRADES' : 'UPI TRADE'}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>Verified Escrow</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatTimeAgo(post.createdAt)}</span>
          </div>

          {/* Owner Admin Controls */}
          {isAdmin && (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
              <button
                type="button"
                onClick={() => onEdit(post)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Edit Mid Man Post (Admin Only)"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(post)}
                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 transition"
                title="Delete Post (Admin Only)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle Section: User Identity & Profile Photo (Large, Centered) */}
      <div className="flex flex-col items-center justify-center text-center pt-1 pb-2 relative z-10 space-y-3">
        {/* Large Profile Photo */}
        <div 
          onClick={() => onViewProfile?.(post.targetUserUid)}
          className="cursor-pointer transition transform hover:scale-105"
          title={`View @${post.appUsername}'s profile`}
        >
          <CircularProfileAvatar
            src={currentPfp}
            alt={post.appUsername}
            size="2xl"
            role={liveUserData?.role || 'user'}
            className="ring-4 ring-slate-800/80 shadow-2xl"
          />
        </div>

        {/* Display Name and @AppUsername */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-center gap-1.5">
            <h3 
              onClick={() => onViewProfile?.(post.targetUserUid)}
              className="text-lg font-extrabold text-white tracking-wide hover:text-cyan-300 cursor-pointer transition"
            >
              {displayName}
            </h3>
            {liveUserData?.role && <RoleBadge role={liveUserData.role} size="xs" />}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            @{post.appUsername}
          </p>
        </div>

        {/* GAME USERNAME */}
        <div className="w-full max-w-sm pt-2">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="text-left space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Gamepad2 className="w-3 h-3 text-cyan-400" />
                GAME USERNAME
              </span>
              <div className="font-mono font-bold text-sm text-cyan-300 tracking-wide select-all">
                {post.gameUsername}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyIgn}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-1 transition shrink-0"
              title="Copy Game Username"
            >
              {copiedIgn ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 💬 CHAT BUTTON below PFP / Game Username */}
        <div className="w-full max-w-sm pt-1">
          <button
            type="button"
            onClick={() => onStartChat(post)}
            disabled={isMe}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] ${
              isMe
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white shadow-cyan-500/25 border border-cyan-400/30'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>{isMe ? 'This is Your Listing' : `💬 CHAT WITH @${post.appUsername.toUpperCase()}`}</span>
          </button>
        </div>
      </div>

      {/* DESCRIPTION Section */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-slate-400" />
          <span>DESCRIPTION</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans">
          {post.description}
        </div>
      </div>

      {/* CHARGES Section (Clearly Visible) */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>CHARGES</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-950/70 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-sm sm:text-base flex items-center justify-between shadow-inner">
          <span className="select-all">{post.charges}</span>
          <span className="text-[10px] uppercase font-sans font-semibold text-emerald-400/80 tracking-wider">
            Escrow Terms
          </span>
        </div>
      </div>
    </div>
  );
};
