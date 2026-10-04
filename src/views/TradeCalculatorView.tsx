import React, { useState, useEffect, useRef } from 'react';
import { 
  Scale, 
  Plus, 
  Trash2, 
  RotateCcw, 
  RotateCw,
  ArrowLeft,
  Search, 
  Check, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Shield,
  Sword as SwordIcon,
  Crown,
  Sparkles,
  X,
  Send,
  Loader2,
  FileText,
  Save,
  HelpCircle,
  Lock
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useItems } from '../context/ItemsContext';
import { usePets } from '../context/PetsContext';
import { useUserData } from '../context/UserDataContext';
import { useAuth } from '../context/AuthContext';
import { TradeItemSlot, SkyblockItem, PetTier, SkyblockPet, TradePostItem, UserRole } from '../types';
import { formatCoins, formatFullCoins } from '../lib/formatters';
import { getStatusBadge, parseCoinStringToNumber } from '../lib/itemHelpers';
import { petToSkyblockItem } from '../data/initialPets';
import { sanitizeForFirestore } from '../lib/validation';
import { BackButton } from '../components/BackButton';

interface TradeCalculatorViewProps {
  yourOffer: TradeItemSlot[];
  theirOffer: TradeItemSlot[];
  setYourOffer: React.Dispatch<React.SetStateAction<TradeItemSlot[]>>;
  setTheirOffer: React.Dispatch<React.SetStateAction<TradeItemSlot[]>>;
  onOpenAuth: () => void;
  onPostSuccess?: () => void;
  onBack?: () => void;
}

export const TradeCalculatorView: React.FC<TradeCalculatorViewProps> = ({
  yourOffer,
  theirOffer,
  setYourOffer,
  setTheirOffer,
  onOpenAuth,
  onPostSuccess,
  onBack,
}) => {
  const { items, refreshItems } = useItems();
  const { pets, refreshPets } = usePets();
  const { saveTrade } = useUserData();
  const { currentUser, userProfile } = useAuth();

  // Value refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const lastCalculatorRefreshRef = useRef<number>(0);

  // Manual & auto value refresh handler
  const handleRefreshValues = async (isManual = true) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (isManual) {
      setRefreshStatus('loading');
      setRefreshMessage('Refreshing values...');
    }

    try {
      // 1. Fetch the latest item/value data from the Firebase single source of truth
      const [freshItems, freshPets] = await Promise.all([
        refreshItems(),
        refreshPets(),
      ]);

      // 2. Update Your Offer and My Offer values using fresh authoritative data
      const updateSlotWithFreshData = (slot: TradeItemSlot): TradeItemSlot => {
        const isPet = slot.item.category === 'Pet';
        const freshItem = freshItems.find((it) => it.id === slot.item.id || it.normalizedName === slot.item.normalizedName) || slot.item;
        const freshPet = isPet 
          ? (freshPets.find((p) => p.id === slot.item.id || p.name.toLowerCase() === slot.item.name.toLowerCase()) || slot.petData)
          : slot.petData;

        const isSword = freshItem.category === 'Sword';
        const isArmour = freshItem.category === 'Armour';
        const isAccessory = freshItem.category === 'Accessories / Items' || (freshItem.category as string) === 'accessories_items';
        const chosenVariant = slot.variant || (isPet ? 'P5' : isSword ? 'normal' : isAccessory ? 'standard' : '4/4');

        let unitVal = freshItem.value || 0;
        let displayVal = freshItem.displayValue || freshItem.normalValue || (freshItem.value ? formatCoins(freshItem.value) : 'Value Pending');

        if (isPet && freshPet) {
          const tierKey = chosenVariant.toLowerCase() as 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10';
          if ((freshPet as any)[tierKey]) {
            displayVal = (freshPet as any)[tierKey];
            unitVal = parseCoinStringToNumber(displayVal);
          }
        } else if (isSword) {
          unitVal = chosenVariant === 'rare' 
            ? (freshItem.numericRareValue || freshItem.value) 
            : freshItem.value;
          displayVal = chosenVariant === 'rare' 
            ? (freshItem.rareValue || '') 
            : (freshItem.normalValue || '');
        } else if (isArmour) {
          unitVal = chosenVariant === '5/5' 
            ? (freshItem.numericFivePieceValue || freshItem.value) 
            : freshItem.value;
          displayVal = chosenVariant === '5/5' 
            ? (freshItem.fivePieceValue || '') 
            : (freshItem.fourPieceValue || '');
        } else if (isAccessory) {
          unitVal = freshItem.value || 0;
          displayVal = freshItem.displayValue || freshItem.normalValue || (freshItem.value ? formatCoins(freshItem.value) : 'Value Pending');
        }

        return {
          ...slot,
          item: freshItem,
          petData: freshPet,
          unitValue: unitVal,
          selectedDisplayValue: displayVal,
        };
      };

      setYourOffer((prev) => prev.map(updateSlotWithFreshData));
      setTheirOffer((prev) => prev.map(updateSlotWithFreshData));

      if (isManual) {
        setRefreshStatus('success');
        setRefreshMessage('Values updated');
        setTimeout(() => {
          setRefreshStatus('idle');
          setRefreshMessage(null);
        }, 3500);
      }
    } catch (err: any) {
      console.warn('Refresh values failed:', err);
      if (isManual) {
        setRefreshStatus('error');
        setRefreshMessage("Couldn't refresh values. Please try again.");
        setTimeout(() => {
          setRefreshStatus('idle');
          setRefreshMessage(null);
        }, 4000);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Automatic refresh when opening Calculator page (60s cache cooldown to avoid unnecessary Firebase reads)
  useEffect(() => {
    const now = Date.now();
    if (now - lastCalculatorRefreshRef.current > 60_000) {
      lastCalculatorRefreshRef.current = now;
      handleRefreshValues(false);
    }
  }, []);

  // Modal selector for adding items
  const [activeSide, setActiveSide] = useState<'your' | 'their' | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalCategory, setModalCategory] = useState<'ALL' | 'Sword' | 'Armour' | 'Pet' | 'RarePet' | 'NormalPet' | 'Accessories / Items'>('ALL');

  // Trade post preview & publishing state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [postNote, setPostNote] = useState('');

  // Trade history save notification
  const [historySaveSuccess, setHistorySaveSuccess] = useState(false);

  // YOUR OFFER TOTAL
  const yourTotal = yourOffer.reduce((acc, slot) => {
    const val = slot.unitValue !== undefined ? slot.unitValue : slot.item.value;
    return acc + val * slot.quantity;
  }, 0);

  // MY OFFER TOTAL
  const myTotal = theirOffer.reduce((acc, slot) => {
    const val = slot.unitValue !== undefined ? slot.unitValue : slot.item.value;
    return acc + val * slot.quantity;
  }, 0);

  // Difference: Absolute value between both totals
  const difference = Math.abs(yourTotal - myTotal);

  // Percentage Difference: relative to MY OFFER (if myTotal > 0)
  const percentageDiff = myTotal > 0 
    ? (Math.abs(yourTotal - myTotal) / myTotal) * 100 
    : (yourTotal > 0 ? 100 : 0);

  const roundedPercentage = Math.round(percentageDiff);

  // Direction of difference
  let differenceDirection: 'up' | 'down' | 'equal' = 'equal';
  if (yourTotal > myTotal) differenceDirection = 'up';
  else if (yourTotal < myTotal) differenceDirection = 'down';

  // Add item or pet to chosen side
  const handleAddItem = (
    item: SkyblockItem, 
    side: 'your' | 'their', 
    variant: 'normal' | 'rare' | '4/4' | '5/5' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | string
  ) => {
    const targetOffer = side === 'your' ? yourOffer : theirOffer;
    const setTargetOffer = side === 'your' ? setYourOffer : setTheirOffer;

    let unitVal = item.value;
    let displayVal = item.normalValue || '';

    if (item.category === 'Pet') {
      const petObj = item.petData || pets.find((p) => p.id === item.id);
      const tierKey = variant.toLowerCase() as 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10';
      if (petObj && (petObj as any)[tierKey]) {
        displayVal = (petObj as any)[tierKey];
        unitVal = parseCoinStringToNumber(displayVal);
      } else {
        displayVal = (item as any)[tierKey] || item.value.toString();
        unitVal = parseCoinStringToNumber(displayVal);
      }
    } else if (item.category === 'Sword') {
      unitVal = variant === 'rare' ? (item.numericRareValue || item.value) : item.value;
      displayVal = variant === 'rare' ? (item.rareValue || '') : (item.normalValue || '');
    } else if (item.category === 'Armour') {
      unitVal = variant === '5/5' ? (item.numericFivePieceValue || item.value) : item.value;
      displayVal = variant === '5/5' ? (item.fivePieceValue || '') : (item.fourPieceValue || '');
    } else {
      unitVal = item.value || 0;
      displayVal = item.displayValue || item.normalValue || (item.value ? formatCoins(item.value) : '0');
    }

    const existingIdx = targetOffer.findIndex((s) => s.item.id === item.id && s.variant === variant);
    if (existingIdx >= 0) {
      const updated = [...targetOffer];
      updated[existingIdx].quantity += 1;
      setTargetOffer(updated);
    } else {
      setTargetOffer([
        ...targetOffer, 
        { 
          item, 
          quantity: 1, 
          variant, 
          unitValue: unitVal,
          selectedDisplayValue: displayVal,
          petData: item.petData,
        }
      ]);
    }
    setActiveSide(null);
    setModalSearch('');
  };

  // Change variant of existing slot
  const handleToggleVariant = (
    side: 'your' | 'their', 
    index: number, 
    newVariant: 'normal' | 'rare' | '4/4' | '5/5' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | string
  ) => {
    const targetOffer = side === 'your' ? yourOffer : theirOffer;
    const setTargetOffer = side === 'your' ? setYourOffer : setTheirOffer;

    const currentSlot = targetOffer[index];
    const item = currentSlot.item;

    let unitVal = item.value;
    let displayVal = item.normalValue || '';

    if (item.category === 'Pet') {
      const petObj = currentSlot.petData || item.petData || pets.find((p) => p.id === item.id);
      const tierKey = newVariant.toLowerCase() as 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10';
      if (petObj && (petObj as any)[tierKey]) {
        displayVal = (petObj as any)[tierKey];
        unitVal = parseCoinStringToNumber(displayVal);
      } else {
        displayVal = (item as any)[tierKey] || item.value.toString();
        unitVal = parseCoinStringToNumber(displayVal);
      }
    } else if (item.category === 'Sword') {
      unitVal = newVariant === 'rare' ? (item.numericRareValue || item.value) : item.value;
      displayVal = newVariant === 'rare' ? (item.rareValue || '') : (item.normalValue || '');
    } else if (item.category === 'Armour') {
      unitVal = newVariant === '5/5' ? (item.numericFivePieceValue || item.value) : item.value;
      displayVal = newVariant === '5/5' ? (item.fivePieceValue || '') : (item.fourPieceValue || '');
    } else {
      unitVal = item.value || 0;
      displayVal = item.displayValue || item.normalValue || (item.value ? formatCoins(item.value) : '0');
    }

    const updated = [...targetOffer];
    updated[index] = {
      ...currentSlot,
      variant: newVariant,
      unitValue: unitVal,
      selectedDisplayValue: displayVal,
    };
    setTargetOffer(updated);
  };

  // Quantity controls
  const handleQuantityChange = (side: 'your' | 'their', index: number, newQty: number) => {
    const targetOffer = side === 'your' ? yourOffer : theirOffer;
    const setTargetOffer = side === 'your' ? setYourOffer : setTheirOffer;

    if (newQty <= 0) {
      setTargetOffer(targetOffer.filter((_, i) => i !== index));
    } else {
      const updated = [...targetOffer];
      updated[index] = { ...updated[index], quantity: newQty };
      setTargetOffer(updated);
    }
  };

  // Remove single slot
  const handleRemoveSlot = (side: 'your' | 'their', index: number) => {
    const targetOffer = side === 'your' ? yourOffer : theirOffer;
    const setTargetOffer = side === 'your' ? setYourOffer : setTheirOffer;
    setTargetOffer(targetOffer.filter((_, i) => i !== index));
  };

  // Reset entire calculator
  const handleClearAll = () => {
    setYourOffer([]);
    setTheirOffer([]);
    setPostNote('');
  };

  // Open Preview Modal with Validation
  const handleOpenPreview = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (yourOffer.length === 0 && theirOffer.length === 0) {
      alert('Please add at least one item to either Your Offer or My Offer before posting.');
      return;
    }

    setPublishError(null);
    setIsPreviewOpen(true);
  };

  // Publish to Trade Feed
  const handlePublishTradePost = async () => {
    if (!currentUser || isPublishing) return;

    if (yourOffer.length === 0 && theirOffer.length === 0) {
      setPublishError('At least one item is required in either offer.');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const mappedYourItems: TradePostItem[] = yourOffer.map((s) => ({
        itemId: s.item.id,
        name: s.item.name,
        category: s.item.category,
        variant: s.variant,
        quantity: s.quantity,
        displayValue: s.selectedDisplayValue || s.item.normalValue || formatCoins(s.unitValue || s.item.value),
        unitValue: s.unitValue !== undefined ? s.unitValue : s.item.value,
        image: s.item.image,
        petTier: s.item.category === 'Pet' ? (s.variant as PetTier) : undefined,
      }));

      const mappedMyItems: TradePostItem[] = theirOffer.map((s) => ({
        itemId: s.item.id,
        name: s.item.name,
        category: s.item.category,
        variant: s.variant,
        quantity: s.quantity,
        displayValue: s.selectedDisplayValue || s.item.normalValue || formatCoins(s.unitValue || s.item.value),
        unitValue: s.unitValue !== undefined ? s.unitValue : s.item.value,
        image: s.item.image,
        petTier: s.item.category === 'Pet' ? (s.variant as PetTier) : undefined,
      }));

      const now = Date.now();
      const expiresAt = now + 24 * 60 * 60 * 1000; // exactly 24 hours

      const tradePostData = {
        posterUid: currentUser.uid,
        posterDisplayName: userProfile?.name || userProfile?.username || 'Trader',
        posterUsername: userProfile?.username || 'trader',
        posterPhotoURL: userProfile?.profilePhoto || userProfile?.avatarUrl || '',
        posterRole: userProfile?.role || 'user',
        posterVerified: true,
        createdAt: now,
        expiresAt,
        yourItems: mappedYourItems,
        myItems: mappedMyItems,
        yourTotal,
        myTotal,
        yourTotalDisplay: formatCoins(yourTotal),
        myTotalDisplay: formatCoins(myTotal),
        difference,
        differenceDisplay: formatCoins(difference),
        differencePercentage: roundedPercentage,
        differenceDirection,
        status: 'OPEN' as const,
        note: postNote.trim() || undefined,
      };

      await addDoc(collection(db, 'trade_posts'), sanitizeForFirestore(tradePostData));

      // Also record in user trade history
      await saveTrade({
        yourItems: yourOffer.map((s) => ({
          itemId: s.item.id,
          name: `${s.item.name} (${s.variant || 'default'})`,
          value: s.unitValue !== undefined ? s.unitValue : s.item.value,
          quantity: s.quantity,
          image: s.item.image,
          rarity: s.item.rarity || 'LEGENDARY',
        })),
        theirItems: theirOffer.map((s) => ({
          itemId: s.item.id,
          name: `${s.item.name} (${s.variant || 'default'})`,
          value: s.unitValue !== undefined ? s.unitValue : s.item.value,
          quantity: s.quantity,
          image: s.item.image,
          rarity: s.item.rarity || 'LEGENDARY',
        })),
        yourTotal,
        theirTotal: myTotal,
        difference,
        percentageDiff: roundedPercentage,
        note: postNote.trim() || undefined,
      }).catch(console.warn);

      setIsPreviewOpen(false);
      // Navigate to Trade Feed
      onPostSuccess?.();
    } catch (err: any) {
      console.error('Failed to post trade:', err);
      setPublishError(err.message || 'Failed to post trade. Please check connection.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Unified items list for search modal (swords, armour, pets)
  const petItemsList: SkyblockItem[] = React.useMemo(() => {
    return pets.map((p) => petToSkyblockItem(p, 'P5'));
  }, [pets]);

  const allModalItems = React.useMemo(() => {
    return [...items, ...petItemsList];
  }, [items, petItemsList]);

  const filteredModalItems = React.useMemo(() => {
    let result = allModalItems;

    if (modalCategory === 'Sword') {
      result = result.filter((i) => i.category === 'Sword');
    } else if (modalCategory === 'Armour') {
      result = result.filter((i) => i.category === 'Armour');
    } else if (modalCategory === 'Accessories / Items') {
      result = result.filter((i) => i.category === 'Accessories / Items' || (i.category as string) === 'accessories_items');
    } else if (modalCategory === 'Pet') {
      result = result.filter((i) => i.category === 'Pet');
    } else if (modalCategory === 'RarePet') {
      result = result.filter((i) => i.category === 'Pet' && i.petType === 'Rare');
    } else if (modalCategory === 'NormalPet') {
      result = result.filter((i) => i.category === 'Pet' && i.petType === 'Normal');
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase();
      result = result.filter((i) => 
        i.name.toLowerCase().includes(q) || 
        i.category.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allModalItems, modalCategory, modalSearch]);

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="space-y-1">
          {onBack && (
            <div className="mb-2">
              <BackButton onClick={onBack} label="Back" />
            </div>
          )}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Skyblock Value Calculator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Trade & Value Calculator
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Compare Your Offer against My Offer with automatic live valuations from the authoritative Value List.
          </p>
        </div>

        {(yourOffer.length > 0 || theirOffer.length > 0) && (
          <button
            onClick={handleClearAll}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 1. YOUR OFFER (Section 6)                                    */}
      {/* ============================================================ */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 tracking-wider">
              Party A (Counterparty / Trader)
            </span>
            <h2 className="text-xl font-black text-white">YOUR OFFER</h2>
          </div>
          <div className="text-right font-mono">
            <div className="text-[11px] text-slate-400 uppercase">YOUR OFFER TOTAL</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400">
              {formatCoins(yourTotal)}
            </div>
          </div>
        </div>

        {/* Selected Items List */}
        <div className="space-y-2.5 min-h-[120px]">
          {yourOffer.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Scale className="w-8 h-8 text-slate-700" />
              <p>No items added to Your Offer yet.</p>
              <button
                onClick={() => setActiveSide('your')}
                className="mt-1 py-2 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-xl font-bold border border-cyan-500/30 transition text-xs"
              >
                + Add Item to Your Offer
              </button>
            </div>
          ) : (
            yourOffer.map((slot, idx) => {
              const isSword = slot.item.category === 'Sword';
              const isArmour = slot.item.category === 'Armour';
              const isPet = slot.item.category === 'Pet';
              const petObj = isPet ? (slot.petData || pets.find((p) => p.id === slot.item.id)) : undefined;
              const currentVariant = slot.variant || (isPet ? 'P5' : isSword ? 'normal' : '4/4');

              return (
                <div
                  key={`${slot.item.id}-${slot.variant}-${idx}`}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={slot.item.image}
                      alt={slot.item.name}
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 object-cover shrink-0"
                    />

                    <div className="space-y-0.5 truncate">
                      <div className="font-bold text-white text-xs flex items-center gap-2 truncate">
                        <span className="truncate">{petObj ? petObj.name : slot.item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{slot.item.category}]
                        </span>
                      </div>

                      {/* Variant Selection Pills */}
                      <div className="flex items-center gap-1 text-[11px] font-mono mt-1 flex-wrap">
                        {isPet && petObj ? (
                          (['P5', 'P6', 'P7', 'P8', 'P9', 'P10'] as PetTier[]).map((tier) => (
                            <button
                              key={tier}
                              onClick={() => handleToggleVariant('your', idx, tier)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                                currentVariant === tier
                                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {tier}: {(petObj as any)[tier.toLowerCase()]}
                            </button>
                          ))
                        ) : isSword ? (
                          <>
                            <button
                              onClick={() => handleToggleVariant('your', idx, 'normal')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                currentVariant === 'normal'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Normal: {slot.item.normalValue}
                            </button>
                            {slot.item.rareValue !== 'Not Listed' && (
                              <button
                                onClick={() => handleToggleVariant('your', idx, 'rare')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                  currentVariant === 'rare'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                Rare: {slot.item.rareValue}
                              </button>
                            )}
                          </>
                        ) : isArmour ? (
                          <>
                            <button
                              onClick={() => handleToggleVariant('your', idx, '4/4')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                currentVariant === '4/4'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              4/4: {slot.item.fourPieceValue}
                            </button>
                            <button
                              onClick={() => handleToggleVariant('your', idx, '5/5')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                currentVariant === '5/5'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              5/5: {slot.item.fivePieceValue}
                            </button>
                          </>
                        ) : (
                          <span className="text-cyan-300 text-[10px]">{slot.selectedDisplayValue}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity and Remove */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() => handleQuantityChange('your', idx, slot.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-white">
                        {slot.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange('your', idx, slot.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveSlot('your', idx)}
                      className="text-slate-500 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-slate-900"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={() => setActiveSide('your')}
          className="w-full py-2.5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 bg-slate-950/60 hover:bg-cyan-500/5 text-slate-300 hover:text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Add Item to Your Offer</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 2. MY OFFER (Section 7)                                      */}
      {/* ============================================================ */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-purple-400 tracking-wider">
              Party B (You / Creator)
            </span>
            <h2 className="text-xl font-black text-white">MY OFFER</h2>
          </div>
          <div className="text-right font-mono">
            <div className="text-[11px] text-slate-400 uppercase">MY OFFER TOTAL</div>
            <div className="text-xl sm:text-2xl font-black text-purple-400">
              {formatCoins(myTotal)}
            </div>
          </div>
        </div>

        {/* Selected Items List */}
        <div className="space-y-2.5 min-h-[120px]">
          {theirOffer.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Scale className="w-8 h-8 text-slate-700" />
              <p>No items added to My Offer yet.</p>
              <button
                onClick={() => setActiveSide('their')}
                className="mt-1 py-2 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl font-bold border border-purple-500/30 transition text-xs"
              >
                + Add Item to My Offer
              </button>
            </div>
          ) : (
            theirOffer.map((slot, idx) => {
              const isSword = slot.item.category === 'Sword';
              const isArmour = slot.item.category === 'Armour';
              const isPet = slot.item.category === 'Pet';
              const petObj = isPet ? (slot.petData || pets.find((p) => p.id === slot.item.id)) : undefined;
              const currentVariant = slot.variant || (isPet ? 'P5' : isSword ? 'normal' : '4/4');

              return (
                <div
                  key={`${slot.item.id}-${slot.variant}-${idx}`}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={slot.item.image}
                      alt={slot.item.name}
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 object-cover shrink-0"
                    />

                    <div className="space-y-0.5 truncate">
                      <div className="font-bold text-white text-xs flex items-center gap-2 truncate">
                        <span className="truncate">{petObj ? petObj.name : slot.item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{slot.item.category}]
                        </span>
                      </div>

                      {/* Variant Selection Pills */}
                      <div className="flex items-center gap-1 text-[11px] font-mono mt-1 flex-wrap">
                        {isPet && petObj ? (
                          (['P5', 'P6', 'P7', 'P8', 'P9', 'P10'] as PetTier[]).map((tier) => (
                            <button
                              key={tier}
                              onClick={() => handleToggleVariant('their', idx, tier)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                                currentVariant === tier
                                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {tier}: {(petObj as any)[tier.toLowerCase()]}
                            </button>
                          ))
                        ) : isSword ? (
                          <>
                            <button
                              onClick={() => handleToggleVariant('their', idx, 'normal')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                currentVariant === 'normal'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Normal: {slot.item.normalValue}
                            </button>
                            {slot.item.rareValue !== 'Not Listed' && (
                              <button
                                onClick={() => handleToggleVariant('their', idx, 'rare')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                  currentVariant === 'rare'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                Rare: {slot.item.rareValue}
                              </button>
                            )}
                          </>
                        ) : isArmour ? (
                          <>
                            <button
                              onClick={() => handleToggleVariant('their', idx, '4/4')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                currentVariant === '4/4'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              4/4: {slot.item.fourPieceValue}
                            </button>
                            <button
                              onClick={() => handleToggleVariant('their', idx, '5/5')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                currentVariant === '5/5'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              5/5: {slot.item.fivePieceValue}
                            </button>
                          </>
                        ) : (
                          <span className="text-purple-300 text-[10px]">{slot.selectedDisplayValue}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity and Remove */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() => handleQuantityChange('their', idx, slot.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-white">
                        {slot.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange('their', idx, slot.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveSlot('their', idx)}
                      className="text-slate-500 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-slate-900"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={() => setActiveSide('their')}
          className="w-full py-2.5 rounded-2xl border border-slate-800 hover:border-purple-500/40 bg-slate-950/60 hover:bg-purple-500/5 text-slate-300 hover:text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-4 h-4 text-purple-400" />
          <span>Add Item to My Offer</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. TRADE CALCULATION (Section 8)                             */}
      {/* ============================================================ */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 tracking-wider">
            Automated Mathematical Comparison
          </span>
          <h2 className="text-xl font-black text-white">TRADE CALCULATION</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">YOUR OFFER TOTAL</span>
            <span className="text-base sm:text-lg font-black text-cyan-400 block">
              {formatCoins(yourTotal)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">MY OFFER TOTAL</span>
            <span className="text-base sm:text-lg font-black text-purple-400 block">
              {formatCoins(myTotal)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">DIFFERENCE</span>
            <span className="text-base sm:text-lg font-black text-white block">
              {formatCoins(difference)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">DIFFERENCE %</span>
            <div className="flex items-center gap-1 text-base sm:text-lg font-black">
              {differenceDirection === 'up' && (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-4 h-4" /> {roundedPercentage}% ↑
                </span>
              )}
              {differenceDirection === 'down' && (
                <span className="text-rose-400 flex items-center gap-0.5">
                  <TrendingDown className="w-4 h-4" /> {roundedPercentage}% ↓
                </span>
              )}
              {differenceDirection === 'equal' && (
                <span className="text-cyan-400">
                  0% (Fair)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic status note */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs text-slate-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {differenceDirection === 'up'
              ? `Your Offer provides +${formatCoins(difference)} (${roundedPercentage}% ↑) higher value than My Offer.`
              : differenceDirection === 'down'
              ? `My Offer provides +${formatCoins(difference)} (${roundedPercentage}% ↓) higher value than Your Offer.`
              : 'Both sides are precisely balanced at equal market value.'}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. POST MY TRADE (Section 9)                                 */}
      {/* ============================================================ */}
      <div className="pt-2">
        {currentUser ? (
          <button
            onClick={handleOpenPreview}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-500/25 active:scale-98 transition"
          >
            <Send className="w-5 h-5" />
            <span>POST MY TRADE</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full py-4 px-6 rounded-2xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/40 text-slate-200 font-extrabold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition group"
          >
            <Lock className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition" />
            <span>Sign in to post a trade</span>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. REFRESH VALUES DIRECTLY UNDER CALCULATOR                  */}
      {/* ============================================================ */}
      <div className="pt-2 flex flex-col items-center justify-center space-y-2">
        <button
          type="button"
          onClick={() => handleRefreshValues(true)}
          disabled={isRefreshing}
          className={`w-full py-3.5 px-6 rounded-2xl border transition-all duration-200 flex items-center justify-center gap-2.5 font-mono font-bold text-sm tracking-wide shadow-lg active:scale-98 ${
            refreshStatus === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40'
              : refreshStatus === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-300 shadow-rose-950/40'
              : isRefreshing
              ? 'bg-slate-900 border-cyan-500/50 text-cyan-300 shadow-cyan-950/30'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-cyan-500/50 text-slate-200 hover:text-white shadow-black/40'
          }`}
        >
          <RotateCw
            className={`w-4 h-4 text-cyan-400 ${
              isRefreshing ? 'animate-spin text-cyan-300' : 'transition-transform duration-300 group-hover:rotate-180'
            }`}
          />
          <span>
            {refreshStatus === 'loading'
              ? 'Refreshing values...'
              : refreshStatus === 'success'
              ? 'Values updated'
              : refreshStatus === 'error'
              ? "Couldn't refresh values. Please try again."
              : 'Refresh Values'}
          </span>
        </button>

        {/* Live sync status notice */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Single Source of Truth: Live Firebase Dataset</span>
          {refreshMessage && (
            <span
              className={`font-semibold ml-1.5 px-2 py-0.5 rounded text-[10px] ${
                refreshStatus === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : refreshStatus === 'error'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              {refreshMessage}
            </span>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TRADE PREVIEW MODAL (Section 10)                             */}
      {/* ============================================================ */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl my-8 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 tracking-wider">
                  Review & Confirmation
                </span>
                <h3 className="text-xl font-extrabold text-white">TRADE PREVIEW</h3>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {publishError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{publishError}</span>
              </div>
            )}

            {/* PREVIEW CONTENT */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 font-mono">
              {/* YOUR OFFER preview */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-1.5">
                  <span className="font-bold text-cyan-400">YOUR OFFER</span>
                  <span className="text-slate-400 font-bold">{yourOffer.length} items</span>
                </div>
                <div className="space-y-1.5">
                  {yourOffer.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic py-1">No items selected</div>
                  ) : (
                    yourOffer.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                        <span className="truncate pr-2">
                          {s.item.name} {s.quantity > 1 ? `x${s.quantity}` : ''} ({s.variant || 'default'})
                        </span>
                        <span className="font-bold text-cyan-300 shrink-0">
                          {s.selectedDisplayValue || formatCoins((s.unitValue || s.item.value) * s.quantity)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MY OFFER preview */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-1.5">
                  <span className="font-bold text-purple-400">MY OFFER</span>
                  <span className="text-slate-400 font-bold">{theirOffer.length} items</span>
                </div>
                <div className="space-y-1.5">
                  {theirOffer.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic py-1">No items selected</div>
                  ) : (
                    theirOffer.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                        <span className="truncate pr-2">
                          {s.item.name} {s.quantity > 1 ? `x${s.quantity}` : ''} ({s.variant || 'default'})
                        </span>
                        <span className="font-bold text-purple-300 shrink-0">
                          {s.selectedDisplayValue || formatCoins((s.unitValue || s.item.value) * s.quantity)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TOTALS, DIFFERENCE & PERCENTAGE */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">YOUR TOTAL:</span>
                  <span className="font-black text-cyan-400">{formatCoins(yourTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MY TOTAL:</span>
                  <span className="font-black text-purple-400">{formatCoins(myTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-slate-400">DIFFERENCE:</span>
                  <span className="font-black text-white">{formatCoins(difference)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DIFFERENCE %:</span>
                  <span className="font-black text-amber-300">
                    {roundedPercentage}% {differenceDirection === 'up' ? '↑' : differenceDirection === 'down' ? '↓' : ''}
                  </span>
                </div>
              </div>

              {/* Optional note for trader */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-semibold block">
                  Trade Note / Message (Optional)
                </label>
                <input
                  type="text"
                  value={postNote}
                  onChange={(e) => setPostNote(e.target.value)}
                  placeholder="e.g. DM on Skyblock or add me to trade!"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
            </div>

            {/* Buttons: Edit Trade & Post My Trade */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIsPreviewOpen(false)}
                disabled={isPublishing}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Edit Trade
              </button>

              <button
                onClick={handlePublishTradePost}
                disabled={isPublishing}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/25 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Post My Trade</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD ITEM SELECTION MODAL                                     */}
      {/* ============================================================ */}
      {activeSide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSide(null);
                    setModalSearch('');
                  }}
                  className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-mono font-semibold"
                  title="Back to Calculator"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Back</span>
                </button>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Add Item to</span>
                    <span className={activeSide === 'your' ? 'text-cyan-400' : 'text-purple-400'}>
                      {activeSide === 'your' ? 'YOUR OFFER' : 'MY OFFER'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select Swords, Armour Sets, Pets, or Accessories / Items from the official Value List.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveSide(null);
                  setModalSearch('');
                }}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Search items by name, tier, or status..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
              {(
                [
                  { id: 'ALL', label: 'All Items' },
                  { id: 'Sword', label: 'Swords' },
                  { id: 'Armour', label: 'Armour' },
                  { id: 'Accessories / Items', label: 'Accessories / Items' },
                  { id: 'Pet', label: 'All Pets' },
                  { id: 'RarePet', label: 'Rare Pets' },
                  { id: 'NormalPet', label: 'Normal Pets' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setModalCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                    modalCategory === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredModalItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No items matched your search.
                </div>
              ) : (
                filteredModalItems.map((it) => {
                  const isSword = it.category === 'Sword';
                  const isArmour = it.category === 'Armour';
                  const isPet = it.category === 'Pet';
                  const petObj = isPet ? (it.petData || pets.find((p) => p.id === it.id)) : undefined;

                  return (
                    <div
                      key={it.id}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={it.image}
                          alt={it.name}
                          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 object-cover shrink-0"
                        />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{it.name}</span>
                            {isPet && petObj?.type === 'Rare' && (
                              <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                                <Crown className="w-3 h-3" /> Rare
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {it.category} • Status: {it.status}
                          </div>
                        </div>
                      </div>

                      {/* Tier selection buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {isPet && petObj ? (
                          (['P5', 'P6', 'P7', 'P8', 'P9', 'P10'] as PetTier[]).map((tier) => (
                            <button
                              key={tier}
                              onClick={() => handleAddItem(it, activeSide, tier)}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-mono font-bold text-white hover:text-cyan-300 transition"
                            >
                              {tier}: {(petObj as any)[tier.toLowerCase()]}
                            </button>
                          ))
                        ) : isSword ? (
                          <>
                            <button
                              onClick={() => handleAddItem(it, activeSide, 'normal')}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-mono font-bold text-white hover:text-cyan-300 transition"
                            >
                              Normal: {it.normalValue}
                            </button>
                            {it.rareValue !== 'Not Listed' && (
                              <button
                                onClick={() => handleAddItem(it, activeSide, 'rare')}
                                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 hover:text-amber-200 transition"
                              >
                                Rare: {it.rareValue}
                              </button>
                            )}
                          </>
                        ) : isArmour ? (
                          <>
                            <button
                              onClick={() => handleAddItem(it, activeSide, '4/4')}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-mono font-bold text-white hover:text-cyan-300 transition"
                            >
                              4/4: {it.fourPieceValue}
                            </button>
                            <button
                              onClick={() => handleAddItem(it, activeSide, '5/5')}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-blue-500/20 border border-slate-800 hover:border-blue-500/40 text-[10px] font-mono font-bold text-blue-300 hover:text-blue-200 transition"
                            >
                              5/5: {it.fivePieceValue}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAddItem(it, activeSide, 'standard')}
                            className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-[10px] font-mono font-bold text-white transition"
                          >
                            Add ({it.displayValue || it.normalValue || (it.value ? formatCoins(it.value) : 'Value Pending')})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
