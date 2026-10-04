import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  title?: string;
}

/**
 * Polished gaming-style BackButton for secondary and full-screen pages.
 * Features touch-friendly dimensions, dark high-contrast styling, subtle hover/press feedback,
 * and standard arrow iconography.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Back',
  className = '',
  title = 'Return to previous screen',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      className={`group inline-flex items-center gap-2 py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 active:bg-slate-750 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold font-mono tracking-wide shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-150 active:scale-95 touch-manipulation shrink-0 select-none ${className}`}
    >
      <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform duration-150" />
      <span>{label}</span>
    </button>
  );
};
