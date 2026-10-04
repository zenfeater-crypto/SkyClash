import React from 'react';
import { Heart, Trash2, Shield, Sword as SwordIcon, ArrowRight, Sparkles, Crown } from 'lucide-react';
import { useItems } from '../context/ItemsContext';
import { usePets } from '../context/PetsContext';
import { useUserData } from '../context/UserDataContext';
import { SkyblockItem } from '../types';
import { getStatusBadge } from '../lib/itemHelpers';
import { petToSkyblockItem } from '../data/initialPets';
import { BackButton } from '../components/BackButton';

interface FavoritesViewProps {
  onSelectItem: (itemId: string) => void;
  onAddToTradeOffer?: (
    item: SkyblockItem, 
    side: 'your' | 'their', 
    variant?: 'normal' | 'rare' | '4/4' | '5/5' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | string
  ) => void;
  onExplore: () => void;
  onBack?: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  onSelectItem,
  onAddToTradeOffer,
  onExplore,
  onBack,
}) => {
  const { items } = useItems();
  const { pets } = usePets();
  const { favorites, toggleFavorite } = useUserData();

  const allItems = React.useMemo(() => {
    const petItems = pets.map((p) => petToSkyblockItem(p, 'P5'));
    return [...items, ...petItems];
  }, [items, pets]);

  const favoriteItems = allItems.filter((it) => favorites.includes(it.id));

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {onBack && (
        <div className="mb-2">
          <BackButton onClick={onBack} label="Back" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase font-mono flex items-center gap-3">
            <Heart className="w-7 h-7 text-pink-500 fill-pink-500/20" />
            <span className="bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
              Saved Favorites
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Persisted items you track closely for pricing movements and quick calculations.
          </p>
        </div>

        <span className="text-xs font-mono font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30 px-3 py-1 rounded-full">
          {favoriteItems.length} Saved
        </span>
      </div>

      {favoriteItems.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 mx-auto mb-4">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Favorites Yet</h3>
          <p className="text-xs text-slate-400 mb-6">
            Browse the Value List and tap the heart icon on any Skyblock item to pin it here.
          </p>
          <button
            onClick={onExplore}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-pink-500/20 transition"
          >
            Explore Value List <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favoriteItems.map((item) => {
            const statusInfo = getStatusBadge(item.status);
            const isSword = item.category === 'Sword';
            const isPet = item.category === 'Pet';
            const isAccessory = item.category === 'Accessories / Items' || (item.category as string) === 'accessories_items';

            return (
              <div
                key={item.id}
                className="group relative bg-slate-900/90 border border-slate-800/90 hover:border-pink-500/40 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between"
              >
                <button
                  onClick={() => toggleFavorite(item.id)}
                  title="Remove from favorites"
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-pink-500/20 border border-pink-500/50 text-pink-400 hover:bg-rose-950 transition z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div onClick={() => onSelectItem(item.id)} className="cursor-pointer">
                  {/* Category icon and Trend Status badge */}
                  <div className="flex items-center justify-between gap-2 mb-2 pr-8">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      {isSword ? (
                        <SwordIcon className="w-3 h-3 text-amber-400" />
                      ) : isPet ? (
                        <Crown className="w-3 h-3 text-purple-400" />
                      ) : isAccessory ? (
                        <Sparkles className="w-3 h-3 text-pink-400" />
                      ) : (
                        <Shield className="w-3 h-3 text-blue-400" />
                      )}
                      {item.category}
                    </span>

                    {/* Trend / Status Badge */}
                    <span
                      title={`Market Status: ${item.status}`}
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.emoji && <span>{statusInfo.emoji}</span>}
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white group-hover:text-pink-300 transition truncate mt-1">
                    {item.name}
                  </h3>

                  {/* Valuation Display */}
                  <div className="mt-3.5 space-y-2 bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 font-mono">
                    {item.category === 'Pet' ? (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase">P5 Base:</span>
                          <span className="text-xs font-black text-white">{item.p5 || item.value}</span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[11px] text-rose-400 font-semibold uppercase">P10 Max:</span>
                          <span className="text-xs font-black text-rose-300">{item.p10 || '—'}</span>
                        </div>
                      </>
                    ) : isSword ? (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase">Normal:</span>
                          <span className="text-xs font-black text-white">{item.normalValue}</span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[11px] text-amber-400 font-semibold uppercase">Rare:</span>
                          <span className={`text-xs font-black ${item.rareValue === 'Not Listed' ? 'text-slate-500 italic' : 'text-amber-300'}`}>
                            {item.rareValue}
                          </span>
                        </div>
                      </>
                    ) : isAccessory ? (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase">Value:</span>
                          <span className="text-xs font-black text-cyan-300">
                            {item.displayValue || item.normalValue || (item.value ? item.value.toLocaleString() : 'Value Pending')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[11px] text-amber-400 font-semibold uppercase">Demand:</span>
                          <span className="text-xs font-black text-amber-300">{item.demand || 'MEDIUM'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase">4/4 Set:</span>
                          <span className="text-xs font-black text-white">{item.fourPieceValue}</span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[11px] text-cyan-400 font-semibold uppercase">5/5 Full:</span>
                          <span className="text-xs font-black text-cyan-300">{item.fivePieceValue}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {onAddToTradeOffer && (
                  <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-800/50">
                    <button
                      onClick={() => onAddToTradeOffer(item, 'your', isSword ? 'normal' : isAccessory ? 'standard' : '4/4')}
                      className="py-1 px-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold text-center transition"
                    >
                      + Your Offer
                    </button>
                    <button
                      onClick={() => onAddToTradeOffer(item, 'their', isSword ? (item.rareValue !== 'Not Listed' ? 'rare' : 'normal') : isAccessory ? 'standard' : '5/5')}
                      className="py-1 px-2 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-300 text-[11px] font-semibold text-center transition"
                    >
                      + Their Offer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
