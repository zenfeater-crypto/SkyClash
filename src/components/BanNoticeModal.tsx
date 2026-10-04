import React from 'react';
import { Ban, ShieldAlert, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRemainingTime } from '../lib/moderation';

export const BanNoticeModal: React.FC = () => {
  const { userProfile, isBanned, logOut } = useAuth();

  if (!isBanned || !userProfile) return null;

  const isTemporary = userProfile.banType === 'temporary';
  const remaining = isTemporary ? formatRemainingTime(userProfile.bannedUntil) : 'Permanent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-600/70 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/80 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-500 flex items-center justify-center mx-auto">
          <Ban className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold tracking-widest uppercase">
            Account Suspended
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
            Access Restricted
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Your account (@{userProfile.username}) has been {isTemporary ? 'temporarily' : 'permanently'} suspended by the system administrator.
          </p>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-left space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Suspension Type:</span>
            <span className={`font-bold uppercase ${isTemporary ? 'text-amber-400' : 'text-rose-400'}`}>
              {isTemporary ? 'Temporary Ban' : 'Permanent Ban'}
            </span>
          </div>

          {isTemporary && (
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Duration Remaining:
              </span>
              <span className="font-bold text-cyan-400">{remaining}</span>
            </div>
          )}

          <div>
            <span className="text-slate-400 block mb-1">Reason:</span>
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs leading-relaxed">
              {userProfile.banReason || 'Violation of community trading rules or terms of service.'}
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => logOut()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
