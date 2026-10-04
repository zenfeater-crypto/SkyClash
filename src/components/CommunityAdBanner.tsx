import React from 'react';
import { Sparkles, Shield, ExternalLink, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CommunityAdBannerProps {
  variant?: 'compact' | 'standard';
  className?: string;
}

export const CommunityAdBanner: React.FC<CommunityAdBannerProps> = ({
  variant = 'standard',
  className = '',
}) => {
  const { isAdFree } = useAuth();

  // If user has VANGUARD, OVERLORD, SUPREME, or is Owner Admin, they enjoy a 100% ad-free experience!
  if (isAdFree) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={`p-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-3 shadow-md ${className}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase shrink-0">
            Sponsor
          </span>
          <p className="text-slate-300 text-[11px] truncate">
            Trade with verified members on Skyblock Value Calculator. Never get scammed!
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-amber-400 font-bold">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Vanguard / Overlord / Supreme = Ad-Free</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 shadow-lg ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                Community Partner
              </span>
              <span className="text-xs font-bold text-white tracking-wide">
                Skyblock Trading & Valuation Network
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Check live valuations before trading. Members with <span className="text-amber-300 font-semibold">VANGUARD</span>, <span className="text-cyan-300 font-semibold">OVERLORD</span>, or <span className="text-purple-300 font-semibold">SUPREME</span> enjoy an ad-free experience.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="text-[10px] font-mono text-amber-400/90 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            ✨ Ad-Free for Members
          </span>
        </div>
      </div>
    </div>
  );
};
