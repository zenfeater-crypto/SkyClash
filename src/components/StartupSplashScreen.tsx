import React, { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';

interface StartupSplashScreenProps {
  isReady: boolean;
  onFinish: () => void;
}

/**
 * Premium gaming-style startup intro / splash screen.
 * 
 * Layout:
 *           [APP LOGO]
 *        [LOADING CIRCLE]
 *        Founder — Strike
 *     Operators — Zulfiqar & Mehar
 */
export const StartupSplashScreen: React.FC<StartupSplashScreenProps> = ({ isReady, onFinish }) => {
  const [minTimerDone, setMinTimerDone] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Minimum presentation duration of 1.3s so the intro feels deliberate and smooth,
  // without artificially stalling startup.
  useEffect(() => {
    const minTimer = setTimeout(() => {
      setMinTimerDone(true);
    }, 1300);

    // Hard fallback timeout: ensure app NEVER gets stuck on splash even if network/auth stalls
    const maxSafetyTimer = setTimeout(() => {
      setMinTimerDone(true);
    }, 3500);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxSafetyTimer);
    };
  }, []);

  // When both min timer and initialization are ready, initiate smooth fade-out
  useEffect(() => {
    if (minTimerDone && isReady) {
      setIsFadingOut(true);
      const dismissTimer = setTimeout(() => {
        onFinish();
      }, 350);
      return () => clearTimeout(dismissTimer);
    }
  }, [minTimerDone, isReady, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-4 transition-opacity duration-300 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container - centered horizontally and vertically */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-sm sm:max-w-md w-full animate-in fade-in zoom-in-95 duration-500 ease-out">
        {/* ============================================================ */}
        {/* 1. APP LOGO                                                  */}
        {/* ============================================================ */}
        <div className="flex flex-col items-center gap-3.5">
          {/* Emblem Icon with Gradient Border */}
          <div className="relative group">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/40 via-blue-500/40 to-purple-500/40 blur-xl opacity-80" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[2px] shadow-2xl shadow-cyan-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] sm:rounded-[22px] flex items-center justify-center">
                <Scale className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
              </div>
            </div>
          </div>

          {/* Logo Typography */}
          <div className="text-center">
            <h1 className="font-black text-2xl sm:text-3xl tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-sans drop-shadow-sm">
              SKYBLOCK VALUES
            </h1>
            <div className="text-[11px] sm:text-xs text-cyan-400 font-mono font-bold tracking-[0.25em] uppercase mt-1">
              VALUE CALCULATOR
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. CIRCULAR LOADING SPINNER                                  */}
        {/* ============================================================ */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center my-7 sm:my-8 animate-in fade-in duration-700 delay-150">
          {/* Track */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-800/80" />
          {/* Smooth Continuous Spinner */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400/60 animate-spin" />
        </div>

        {/* ============================================================ */}
        {/* 3. FOUNDER & OPERATOR CREDITS                                */}
        {/* ============================================================ */}
        <div className="text-center space-y-1.5 font-mono select-none animate-in fade-in duration-700 delay-300">
          <div className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300">
            <span className="text-cyan-400 font-bold">Founder</span>
            <span className="text-slate-600 mx-2">—</span>
            <span className="text-white font-bold tracking-wide">Strike</span>
          </div>
          <div className="text-[11px] sm:text-xs font-medium tracking-wider text-slate-400">
            <span className="text-purple-400 font-semibold">Operators</span>
            <span className="text-slate-600 mx-2">—</span>
            <span className="text-slate-300 font-semibold tracking-wide">Zulfiqar & Mehar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
