import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Heart, 
  Sparkles, 
  ChevronRight,
  TrendingUp,
  Tag,
  Shield,
  Sword as SwordIcon,
  Crown,
  Info,
  Edit3,
  Scale,
  Plus
} from 'lucide-react';
import { useItems } from '../context/ItemsContext';
import { usePets } from '../context/PetsContext';
import { useUserData } from '../context/UserDataContext';
import { useAuth } from '../context/AuthContext';
import { ItemCategory, SkyblockItem, SkyblockPet, PetTier, PetType } from '../types';
import { getStatusBadge } from '../lib/itemHelpers';
import { formatCoins } from '../lib/formatters';
import { PET_DISCLAIMER_NOTE, petToSkyblockItem } from '../data/initialPets';
import { ItemEditModal } from '../components/ItemEditModal';

interface ValueListViewProps {
  onSelectItem: (itemId: string) => void;
  onAddToTradeOffer?: (
    item: SkyblockItem, 
    side: 'your' | 'their', 
    variant?: 'normal' | 'rare' | '4/4' | '5/5' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | string
  ) => void;
}

export const ValueListView: React.FC<ValueListViewProps> = ({ onSelectItem, onAddToTradeOffer }) => {
  const { items, loading: itemsLoading } = useItems();
  const { pets, rarePets, normalPets, loading: petsLoading } = usePets();
  const { isFavorite, toggleFavorite } = useUserData();
  const { isAdmin, canChangeValues } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ItemCategory>('ALL');
  const [selectedPetSubtype, setSelectedPetSubtype] = useState<'ALL' | PetType>('ALL');
  const [sortBy, setSortBy] = useState<'value_desc' | 'value_asc' | 'name_asc'>('value_desc');
  
  // Trade variant selector modal state
  const [variantSelector, setVariantSelector] = useState<{ item: SkyblockItem; pet?: SkyblockPet; side: 'your' | 'their' } | null>(null);

  // Universal Owner Admin Edit Modal state (Swords, Armour, Pets, Future Categories)
  const [editingModalTarget, setEditingModalTarget] = useState<{
    item?: SkyblockItem;
    pet?: SkyblockPet;
    isNew?: boolean;
    defaultCategory?: ItemCategory;
  } | null>(null);

  const loading = itemsLoading || petsLoading;

  // Convert pets into SkyblockItem representation for unified searching & sorting
  const petItems: SkyblockItem[] = useMemo(() => {
    return pets.map((p) => petToSkyblockItem(p, 'P5'));
  }, [pets]);

  // Combine items & pets when viewing ALL or searching
  const combinedCatalog: SkyblockItem[] = useMemo(() => {
    if (selectedCategory === 'Sword') {
      return items.filter((it) => it.category === 'Sword');
    }
    if (selectedCategory === 'Armour') {
      return items.filter((it) => it.category === 'Armour');
    }
    if (selectedCategory === 'Accessories / Items') {
      return items.filter((it) => it.category === 'Accessories / Items' || (it.category as string) === 'accessories_items');
    }
    if (selectedCategory === 'Pet') {
      let filteredPets = pets;
      if (selectedPetSubtype !== 'ALL') {
        filteredPets = filteredPets.filter((p) => p.type === selectedPetSubtype);
      }
      return filteredPets.map((p) => petToSkyblockItem(p, 'P5'));
    }
    // ALL: include swords, armour, accessories / items, and all pets
    return [...items, ...petItems];
  }, [items, pets, petItems, selectedCategory, selectedPetSubtype]);

  // Filter and sort items
  const filteredList = useMemo(() => {
    let result = [...combinedCatalog];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.status.toLowerCase().includes(q) ||
          it.petType?.toLowerCase().includes(q) ||
          it.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'value_desc') return b.value - a.value;
      if (sortBy === 'value_asc') return a.value - b.value;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [combinedCatalog, searchTerm, sortBy]);

  // Pagination / Lazy Loading (24 items per batch to optimize rendering and memory)
  const [pageLimit, setPageLimit] = useState(24);
  React.useEffect(() => {
    setPageLimit(24);
  }, [searchTerm, selectedCategory, selectedPetSubtype, sortBy]);

  const paginatedList = useMemo(() => {
    return filteredList.slice(0, pageLimit);
  }, [filteredList, pageLimit]);

  const swordsCount = items.filter((i) => i.category === 'Sword').length;
  const armourCount = items.filter((i) => i.category === 'Armour').length;
  const petsCount = pets.length;
  const accessoriesCount = items.filter((i) => i.category === 'Accessories / Items' || (i.category as string) === 'accessories_items').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase font-mono flex items-center gap-3">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Skyblock Value List
            </span>
            <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-sans font-normal">
              {filteredList.length} items
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative values: Swords (Normal & Rare), Armour Sets (4/4 & 5/5), Pets (P5–P10), and Accessories / Items.
          </p>
        </div>

        {/* Search & Admin Add input */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search swords, armour, pets, or trends..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-sm text-white placeholder-slate-500 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={() => setEditingModalTarget({ isNew: true, defaultCategory: selectedCategory !== 'ALL' ? selectedCategory : 'Sword' })}
              className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition shrink-0"
              title="Add New Catalog Item / Pet"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="space-y-3 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
        {/* Categories row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>All Items</span>
            <span className="text-[10px] font-mono opacity-80">({items.length + pets.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('Sword')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'Sword'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <SwordIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Swords</span>
            <span className="text-[10px] font-mono opacity-80">({swordsCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('Armour')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'Armour'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Armour Sets</span>
            <span className="text-[10px] font-mono opacity-80">({armourCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('Pet')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'Pet'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Pets</span>
            <span className="text-[10px] font-mono opacity-80">({petsCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('Accessories / Items')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'Accessories / Items'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accessories / Items</span>
            <span className="text-[10px] font-mono opacity-80">({accessoriesCount})</span>
          </button>
        </div>

        {/* Sub-category selector for Pets */}
        {selectedCategory === 'Pet' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Pet Type:
              </span>
              <button
                onClick={() => setSelectedPetSubtype('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedPetSubtype === 'ALL'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Pets ({pets.length})
              </button>

              <button
                onClick={() => setSelectedPetSubtype('Rare')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  selectedPetSubtype === 'Rare'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-amber-300 border border-slate-800'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Rare Pets ({rarePets.length})</span>
              </button>

              <button
                onClick={() => setSelectedPetSubtype('Normal')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  selectedPetSubtype === 'Normal'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-emerald-300 border border-slate-800'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Normal Pets ({normalPets.length})</span>
              </button>
            </div>

            {isAdmin && (
              <div className="text-xs text-cyan-400 font-mono font-semibold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Owner Admin Mode: Edit / Manage enabled on every pet</span>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer Note for Pets: Displayed whenever Pets are viewed */}
        {(selectedCategory === 'Pet' || selectedCategory === 'ALL') && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-200/90 font-medium">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Market Note:</strong> {PET_DISCLAIMER_NOTE}
            </span>
          </div>
        )}

        {/* Sorting row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/50">
          <div className="text-xs text-slate-400 font-mono">
            Showing <strong className="text-white">{filteredList.length}</strong> verified entries
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-cyan-400" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
            >
              <option value="value_desc">Highest Valuation</option>
              <option value="value_asc">Lowest Valuation</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Items & Pets */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Sparkles className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
          <p className="text-sm">Synchronizing Skyblock item & pet values...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <p className="text-base font-semibold text-slate-300">No items match your filter.</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or category filters.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
              setSelectedPetSubtype('ALL');
            }}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedList.map((item) => {
              const fav = isFavorite(item.id);
              const statusInfo = getStatusBadge(item.status);
              const isSword = item.category === 'Sword';
              const isArmour = item.category === 'Armour';
              const isPet = item.category === 'Pet';
              const isAccessory = item.category === 'Accessories / Items';
              const petObj = isPet ? (item.petData || pets.find((p) => p.id === item.id)) : undefined;

              return (
                <div
                  key={item.id}
                  className="group relative bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between hover:shadow-xl hover:shadow-cyan-500/5 hover:-translate-y-0.5"
                >
                  {/* Favorite button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id).catch(console.error);
                    }}
                    title={fav ? 'Remove from favorites' : 'Add to favorites'}
                    className={`absolute top-3 right-3 p-1.5 rounded-lg border backdrop-blur-sm z-10 transition ${
                      fav
                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-pink-400 hover:border-pink-500/30'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                  </button>

                  {/* Card clickable body */}
                  <div onClick={() => onSelectItem(item.id)} className="cursor-pointer">
                    {/* Category icon and Trend Status badge */}
                    <div className="flex items-center justify-between gap-2 mb-2 pr-8">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        {isSword && <SwordIcon className="w-3 h-3 text-amber-400" />}
                        {isArmour && <Shield className="w-3 h-3 text-blue-400" />}
                        {isAccessory && <Tag className="w-3 h-3 text-emerald-400" />}
                        {isPet && (
                          petObj?.type === 'Rare' ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <Crown className="w-3 h-3" /> Rare Pet
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Normal Pet
                            </span>
                          )
                        )}
                        {!isPet && item.category}
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

                    {/* Thumbnail and Title */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition truncate flex-1">
                        {petObj ? petObj.name : item.name}
                      </h3>
                    </div>

                    {/* Valuation Display */}
                    {isPet && petObj ? (
                      /* 6-Tier Grid for Pets */
                      <div className="mt-3.5 space-y-1.5 bg-slate-950/90 border border-slate-800/80 rounded-xl p-2.5 font-mono">
                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                          <div className="p-1 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">P5</span>
                            <span className="font-black text-white">{petObj.p5}</span>
                          </div>
                          <div className="p-1 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">P6</span>
                            <span className="font-black text-white">{petObj.p6}</span>
                          </div>
                          <div className="p-1 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">P7</span>
                            <span className="font-black text-white">{petObj.p7}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                          <div className="p-1 rounded bg-slate-900/80 border border-amber-900/30">
                            <span className="text-amber-400 block text-[9px]">P8</span>
                            <span className="font-black text-amber-300">{petObj.p8}</span>
                          </div>
                          <div className="p-1 rounded bg-slate-900/80 border border-amber-900/30">
                            <span className="text-amber-400 block text-[9px]">P9</span>
                            <span className="font-black text-amber-300">{petObj.p9}</span>
                          </div>
                          <div className="p-1 rounded bg-slate-900/80 border border-rose-900/40">
                            <span className="text-rose-400 block text-[9px]">P10</span>
                            <span className="font-black text-rose-300">{petObj.p10}</span>
                          </div>
                        </div>
                      </div>
                    ) : isAccessory ? (
                      /* Valuation Display for Accessories / Items */
                      <div className="mt-3.5 space-y-2 bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 font-mono">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase">Value:</span>
                          <span className="text-xs font-black text-emerald-300">
                            {item.displayValue || item.normalValue || (item.value ? formatCoins(item.value) : 'Value Pending')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase">Demand:</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            item.demand === 'EXTREME' ? 'bg-rose-500/20 text-rose-300' :
                            item.demand === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                            item.demand === 'LOW' || item.demand === 'VERY LOW' ? 'bg-slate-800 text-slate-400' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {item.demand || 'MEDIUM'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Dual Valuation Cards for Swords & Armour */
                      <div className="mt-3.5 space-y-2 bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 font-mono">
                        {isSword ? (
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
                    )}
                  </div>

                  {/* OWNER ADMIN & JMD (changeValues): "Edit / Manage" Button on EVERY item */}
                  {(isAdmin || canChangeValues) && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPet && petObj) {
                            setEditingModalTarget({ pet: petObj });
                          } else {
                            setEditingModalTarget({ item });
                          }
                        }}
                        className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit / Manage</span>
                      </button>
                    </div>
                  )}

                  {/* Quick Add to Trade actions */}
                  {onAddToTradeOffer && (
                    <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-800/50">
                      <button
                        onClick={() => {
                          if (isAccessory) {
                            onAddToTradeOffer(item, 'your', 'standard');
                          } else {
                            setVariantSelector({ item, pet: petObj, side: 'your' });
                          }
                        }}
                        className="py-1 px-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold text-center transition"
                      >
                        + Your Offer
                      </button>
                      <button
                        onClick={() => {
                          if (isAccessory) {
                            onAddToTradeOffer(item, 'their', 'standard');
                          } else {
                            setVariantSelector({ item, pet: petObj, side: 'their' });
                          }
                        }}
                        className="py-1 px-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-purple-300 text-[11px] font-semibold text-center transition"
                      >
                        + Their Offer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination / Lazy Load More */}
          {filteredList.length > pageLimit && (
            <div className="pt-6 text-center">
              <button
                onClick={() => setPageLimit((prev) => prev + 24)}
                className="py-2.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 font-bold text-xs shadow-lg transition active:scale-95"
              >
                Load More Items ({filteredList.length - pageLimit} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Variant Selection Modal for Trade Calculator additions */}
      {variantSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Select {variantSelector.pet ? variantSelector.pet.name : variantSelector.item.name} Tier
              </h3>
              <button
                onClick={() => setVariantSelector(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Choose the tier to add to <strong className="text-white uppercase">{variantSelector.side}'s offer</strong>:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {variantSelector.pet ? (
                /* Pet Tier Selections: P5 to P10 */
                (['P5', 'P6', 'P7', 'P8', 'P9', 'P10'] as PetTier[]).map((tier) => {
                  const key = tier.toLowerCase() as 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10';
                  const val = variantSelector.pet?.[key] || '';
                  return (
                    <button
                      key={tier}
                      onClick={() => {
                        if (variantSelector.pet) {
                          const itemRep = petToSkyblockItem(variantSelector.pet, tier);
                          onAddToTradeOffer?.(itemRep, variantSelector.side, tier);
                        }
                        setVariantSelector(null);
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-xs font-mono transition"
                    >
                      <span className="font-bold text-white">{tier} Level</span>
                      <span className="text-cyan-400 font-black">{val}</span>
                    </button>
                  );
                })
              ) : variantSelector.item.category === 'Sword' ? (
                <>
                  <button
                    onClick={() => {
                      onAddToTradeOffer?.(variantSelector.item, variantSelector.side, 'normal');
                      setVariantSelector(null);
                    }}
                    className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-xs font-mono transition"
                  >
                    <span className="font-bold text-white">Normal Tier</span>
                    <span className="text-cyan-400 font-black">{variantSelector.item.normalValue}</span>
                  </button>

                  {variantSelector.item.rareValue !== 'Not Listed' && (
                    <button
                      onClick={() => {
                        onAddToTradeOffer?.(variantSelector.item, variantSelector.side, 'rare');
                        setVariantSelector(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between text-xs font-mono transition"
                    >
                      <span className="font-bold text-amber-300">Rare Tier</span>
                      <span className="text-amber-400 font-black">{variantSelector.item.rareValue}</span>
                    </button>
                  )}
                </>
              ) : variantSelector.item.category === 'Accessories / Items' ? (
                <button
                  onClick={() => {
                    onAddToTradeOffer?.(variantSelector.item, variantSelector.side, 'standard');
                    setVariantSelector(null);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-xs font-mono transition"
                >
                  <span className="font-bold text-white">Value / Range</span>
                  <span className="text-cyan-400 font-black">
                    {variantSelector.item.displayValue || variantSelector.item.normalValue || (variantSelector.item.value ? formatCoins(variantSelector.item.value) : 'Value Pending')}
                  </span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onAddToTradeOffer?.(variantSelector.item, variantSelector.side, '4/4');
                      setVariantSelector(null);
                    }}
                    className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-xs font-mono transition"
                  >
                    <span className="font-bold text-white">4/4 Set</span>
                    <span className="text-cyan-400 font-black">{variantSelector.item.fourPieceValue}</span>
                  </button>

                  <button
                    onClick={() => {
                      onAddToTradeOffer?.(variantSelector.item, variantSelector.side, '5/5');
                      setVariantSelector(null);
                    }}
                    className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 flex items-center justify-between text-xs font-mono transition"
                  >
                    <span className="font-bold text-blue-300">5/5 Full Set</span>
                    <span className="text-blue-400 font-black">{variantSelector.item.fivePieceValue}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Universal Owner Admin Edit / Manage Modal */}
      {editingModalTarget && (
        <ItemEditModal
          item={editingModalTarget.item || null}
          pet={editingModalTarget.pet || null}
          isNew={editingModalTarget.isNew}
          defaultCategory={editingModalTarget.defaultCategory}
          isOpen={!!editingModalTarget}
          onClose={() => setEditingModalTarget(null)}
        />
      )}
    </div>
  );
};
