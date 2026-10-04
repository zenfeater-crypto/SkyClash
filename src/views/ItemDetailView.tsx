import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Calendar, 
  TrendingUp, 
  ShieldCheck, 
  Scale, 
  Check, 
  Info,
  Tag,
  Shield,
  Sword as SwordIcon,
  Crown,
  Sparkles,
  Edit3
} from 'lucide-react';
import { useItems } from '../context/ItemsContext';
import { usePets } from '../context/PetsContext';
import { useUserData } from '../context/UserDataContext';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo, formatCoins } from '../lib/formatters';
import { SkyblockItem, PetTier, SkyblockPet } from '../types';
import { getStatusBadge } from '../lib/itemHelpers';
import { PET_DISCLAIMER_NOTE, petToSkyblockItem } from '../data/initialPets';
import { ItemEditModal } from '../components/ItemEditModal';

import { BackButton } from '../components/BackButton';

interface ItemDetailViewProps {
  itemId: string;
  onBack: () => void;
  onAddToTradeOffer?: (
    item: SkyblockItem, 
    side: 'your' | 'their', 
    variant?: 'normal' | 'rare' | '4/4' | '5/5' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | string
  ) => void;
}

export const ItemDetailView: React.FC<ItemDetailViewProps> = ({ itemId, onBack, onAddToTradeOffer }) => {
  const { getItemById } = useItems();
  const { getPetById } = usePets();
  const { isFavorite, toggleFavorite } = useUserData();
  const { isAdmin, canChangeValues } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Check items collection first, then pets collection
  const item = getItemById(itemId);
  const pet = !item ? getPetById(itemId) : undefined;

  if (!item && !pet) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-slate-400">Item or Pet not found in catalog.</p>
        <BackButton onClick={onBack} label="Back" />
      </div>
    );
  }

  const id = item?.id || pet?.id || '';
  const fav = isFavorite(id);
  const statusStr = item?.status || pet?.status || 'Stable';
  const statusInfo = getStatusBadge(statusStr);
  const isSword = item?.category === 'Sword';
  const isArmour = item?.category === 'Armour';
  const isAccessory = item?.category === 'Accessories / Items';
  const isPet = !!pet;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top back navigation & actions */}
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} label="Back" />

        <div className="flex items-center gap-2">
          {(isAdmin || canChangeValues) && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
              title="Edit / Manage item details and image"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit / Manage</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>

          <button
            onClick={() => toggleFavorite(id).catch(console.error)}
            className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold ${
              fav
                ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-pink-400 hover:border-pink-500/30'
            }`}
          >
            <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
            <span>{fav ? 'Favorited' : 'Favorite'}</span>
          </button>
        </div>
      </div>

      {/* Main Item / Pet Detail Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Visual Presentation Card */}
          <div className="relative aspect-square max-h-[380px] w-full rounded-2xl bg-slate-950 border border-slate-800/90 p-8 flex flex-col items-center justify-center overflow-hidden group">
            <div className="w-28 h-28 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden mb-4 shadow-xl">
              {pet ? (
                <img
                  src={pet.image}
                  alt={pet.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              ) : item?.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : isSword ? (
                <SwordIcon className="w-14 h-14 text-amber-400" />
              ) : isArmour ? (
                <Shield className="w-14 h-14 text-blue-400" />
              ) : (
                <Tag className="w-14 h-14 text-emerald-400" />
              )}
            </div>

            <div className="text-center space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                {pet ? `Skyblock ${pet.type} Pet` : `Skyblock ${item?.category}`}
              </span>
              <h2 className="text-2xl font-black text-white">{pet ? pet.name : item?.name}</h2>
            </div>

            <span
              className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider border flex items-center gap-1.5 ${statusInfo.badgeClass}`}
            >
              {statusInfo.emoji && <span>{statusInfo.emoji}</span>}
              <span>{statusInfo.label}</span>
            </span>

            {/* If Owner Admin or authorized Value editor, show quick change photo button on hover */}
            {(isAdmin || canChangeValues) && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="absolute bottom-4 right-4 py-1.5 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-amber-300 text-[11px] font-bold flex items-center gap-1 shadow-lg transition"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>Edit / Manage</span>
              </button>
            )}
          </div>

          {/* Details & Specs */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono mb-1">
                {isSword && <SwordIcon className="w-3.5 h-3.5 text-amber-400" />}
                {isArmour && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                {isAccessory && <Tag className="w-3.5 h-3.5 text-emerald-400" />}
                {pet && (
                  pet.type === 'Rare' ? (
                    <span className="text-amber-400 flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> Rare Pet</span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Normal Pet</span>
                  )
                )}
                {!pet && <span>Skyblock {item?.category}</span>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {pet ? pet.name : item?.name}
              </h1>
            </div>

            {/* Disclaimer for Pets */}
            {pet && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Valuation Notice:</strong> {PET_DISCLAIMER_NOTE}
                </span>
              </div>
            )}

            {/* Valuation Stats */}
            <div className="space-y-3 p-5 rounded-2xl bg-slate-950 border border-slate-800/80 font-mono">
              <div className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center justify-between">
                <span>{pet ? 'Tier Valuations (P5 – P10)' : 'Market Tier Valuations'}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${statusInfo.badgeClass}`}>
                  {statusInfo.emoji} {statusInfo.label}
                </span>
              </div>

              {pet ? (
                /* Pet 6-Tier Cards */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">P5 Level</div>
                    <div className="text-base font-black text-white mt-0.5">{pet.p5}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">P6 Level</div>
                    <div className="text-base font-black text-white mt-0.5">{pet.p6}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">P7 Level</div>
                    <div className="text-base font-black text-white mt-0.5">{pet.p7}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-900/40">
                    <div className="text-[10px] text-amber-400 uppercase">P8 Level</div>
                    <div className="text-base font-black text-amber-300 mt-0.5">{pet.p8}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-900/40">
                    <div className="text-[10px] text-amber-400 uppercase">P9 Level</div>
                    <div className="text-base font-black text-amber-300 mt-0.5">{pet.p9}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-rose-900/40">
                    <div className="text-[10px] text-rose-400 uppercase">P10 Level</div>
                    <div className="text-base font-black text-rose-300 mt-0.5">{pet.p10}</div>
                  </div>
                </div>
              ) : isSword ? (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Normal Tier</div>
                    <div className="text-lg font-black text-white mt-1">{item?.normalValue}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-900/40">
                    <div className="text-[10px] text-amber-400 uppercase tracking-wider">Rare Tier</div>
                    <div className={`text-lg font-black mt-1 ${item?.rareValue === 'Not Listed' ? 'text-slate-500 italic' : 'text-amber-300'}`}>
                      {item?.rareValue}
                    </div>
                  </div>
                </div>
              ) : isAccessory ? (
                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-900/40">
                    <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
                      Current Valuation / Price Range
                    </div>
                    <div className="text-xl font-black text-emerald-300 mt-1">
                      {item?.displayValue || item?.normalValue || (item?.value ? formatCoins(item.value) : 'Values pending entry by Owner Admin')}
                    </div>
                    {(item?.minimumValue || item?.maximumValue) && (
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        {item.minimumValue && <span>Min: <strong>{formatCoins(item.minimumValue)}</strong></span>}
                        {item.maximumValue && <span>Max: <strong>{formatCoins(item.maximumValue)}</strong></span>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Market Demand</div>
                      <div className={`text-sm font-black mt-1 ${
                        item?.demand === 'EXTREME' ? 'text-rose-400' :
                        item?.demand === 'HIGH' ? 'text-amber-300' :
                        item?.demand === 'LOW' || item?.demand === 'VERY LOW' ? 'text-slate-400' :
                        'text-blue-300'
                      }`}>
                        {item?.demand || 'MEDIUM'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Market Status</div>
                      <div className="text-sm font-black text-white mt-1">
                        {item?.status || 'Stable'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : isArmour ? (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">4/4 Armour Set</div>
                    <div className="text-lg font-black text-white mt-1">{item?.fourPieceValue}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-cyan-900/40">
                    <div className="text-[10px] text-cyan-400 uppercase tracking-wider">5/5 Full Set</div>
                    <div className="text-lg font-black text-cyan-300 mt-1">{item?.fivePieceValue}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Valuation</div>
                  <div className="text-lg font-black text-white mt-1">
                    {item?.normalValue || (item?.value ? formatCoins(item.value) : '—')}
                  </div>
                </div>
              )}
            </div>

            {/* Description / Lore */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" /> Catalog Information
              </h3>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
                {pet ? pet.description : item?.description}
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Last updated: {formatTimeAgo(pet ? pet.updatedAt : (item?.updatedAt || Date.now()))}</span>
              </div>
            </div>

            {/* Trade Calculator Actions */}
            {onAddToTradeOffer && (
              <div className="pt-2 space-y-2">
                <div className="text-xs text-slate-400 font-semibold">Add directly to trade calculator:</div>
                {pet ? (
                  <div className="space-y-2">
                    <div className="text-[11px] text-cyan-400 font-mono font-bold">Add to Your Offer:</div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono">
                      {(['P5', 'P6', 'P7', 'P8', 'P9', 'P10'] as PetTier[]).map((tier) => (
                        <button
                          key={`your-${tier}`}
                          onClick={() => {
                            const rep = petToSkyblockItem(pet, tier);
                            onAddToTradeOffer(rep, 'your', tier);
                          }}
                          className="py-1.5 px-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex flex-col items-center transition"
                        >
                          <span>{tier}</span>
                          <span className="text-[10px] text-cyan-400/80">
                            {pet[tier.toLowerCase() as keyof SkyblockPet] as string}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-purple-400 font-mono font-bold pt-1">Add to Their Offer:</div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono">
                      {(['P5', 'P6', 'P7', 'P8', 'P9', 'P10'] as PetTier[]).map((tier) => (
                        <button
                          key={`their-${tier}`}
                          onClick={() => {
                            const rep = petToSkyblockItem(pet, tier);
                            onAddToTradeOffer(rep, 'their', tier);
                          }}
                          className="py-1.5 px-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-xs flex flex-col items-center transition"
                        >
                          <span>{tier}</span>
                          <span className="text-[10px] text-purple-400/80">
                            {pet[tier.toLowerCase() as keyof SkyblockPet] as string}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : isSword ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => item && onAddToTradeOffer(item, 'your', 'normal')}
                      className="py-2.5 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex flex-col items-center gap-0.5 transition"
                    >
                      <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Normal to Your Offer</div>
                      <span className="text-[10px] font-mono text-cyan-400/80">{item?.normalValue}</span>
                    </button>

                    {item?.rareValue !== 'Not Listed' ? (
                      <button
                        onClick={() => item && onAddToTradeOffer(item, 'their', 'rare')}
                        className="py-2.5 px-3 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-bold text-xs flex flex-col items-center gap-0.5 transition"
                      >
                        <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Rare to Their Offer</div>
                        <span className="text-[10px] font-mono text-amber-400/80">{item?.rareValue}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => item && onAddToTradeOffer(item, 'their', 'normal')}
                        className="py-2.5 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-xs flex flex-col items-center gap-0.5 transition"
                      >
                        <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Normal to Their Offer</div>
                        <span className="text-[10px] font-mono text-purple-400/80">{item?.normalValue}</span>
                      </button>
                    )}
                  </div>
                ) : isAccessory ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => item && onAddToTradeOffer(item, 'your', 'standard')}
                      className="py-2.5 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex flex-col items-center gap-0.5 transition"
                    >
                      <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Add to Your Offer</div>
                      <span className="text-[10px] font-mono text-cyan-400/80">
                        {item?.displayValue || item?.normalValue || (item?.value ? formatCoins(item.value) : '0')}
                      </span>
                    </button>

                    <button
                      onClick={() => item && onAddToTradeOffer(item, 'their', 'standard')}
                      className="py-2.5 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-xs flex flex-col items-center gap-0.5 transition"
                    >
                      <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Add to Their Offer</div>
                      <span className="text-[10px] font-mono text-purple-400/80">
                        {item?.displayValue || item?.normalValue || (item?.value ? formatCoins(item.value) : '0')}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => item && onAddToTradeOffer(item, 'your', '4/4')}
                      className="py-2.5 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex flex-col items-center gap-0.5 transition"
                    >
                      <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> 4/4 Set to Your Offer</div>
                      <span className="text-[10px] font-mono text-cyan-400/80">{item?.fourPieceValue}</span>
                    </button>

                    <button
                      onClick={() => item && onAddToTradeOffer(item, 'their', '5/5')}
                      className="py-2.5 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-xs flex flex-col items-center gap-0.5 transition"
                    >
                      <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> 5/5 Set to Their Offer</div>
                      <span className="text-[10px] font-mono text-purple-400/80">{item?.fivePieceValue}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Owner Admin Edit / Manage Modal for Swords, Armour, Pets & all catalog items */}
      {isEditModalOpen && (
        <ItemEditModal
          item={item || null}
          pet={pet || null}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onDeleted={() => {
            setIsEditModalOpen(false);
            onBack();
          }}
        />
      )}
    </div>
  );
};
