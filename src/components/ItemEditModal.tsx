import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Save, 
  Sparkles, 
  AlertCircle, 
  Image as ImageIcon,
  CheckCircle,
  ShieldAlert,
  Sword,
  Shield,
  Crown,
  Layers,
  HelpCircle,
  Tag,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { SkyblockItem, SkyblockPet, ItemCategory, PetType, DemandLevel } from '../types';
import { useItems } from '../context/ItemsContext';
import { usePets } from '../context/PetsContext';
import { useAuth } from '../context/AuthContext';
import { getStatusBadge, parseCoinStringToNumber } from '../lib/itemHelpers';

interface ItemEditModalProps {
  item: SkyblockItem | null;
  pet?: SkyblockPet | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
  isNew?: boolean;
  defaultCategory?: ItemCategory;
}

const STATUS_PRESETS = [
  'Stable',
  'Increasing',
  'Decreasing',
  'Stable + Increasing',
  'Stable + Decreasing',
  'Decreasing + Stable',
  'Unstable',
  'Not specified',
];

export const ItemEditModal: React.FC<ItemEditModalProps> = ({
  item,
  pet,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
  isNew = false,
  defaultCategory = 'Sword',
}) => {
  const { updateItem, deleteItem, addItem } = useItems();
  const { updatePet, deletePet, addPet } = usePets();
  const { isAdmin, canChangeValues, userProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [category, setCategory] = useState<ItemCategory>(defaultCategory);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Stable');
  const [customStatus, setCustomStatus] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');

  // Sword-specific
  const [normalValue, setNormalValue] = useState('');
  const [rareValue, setRareValue] = useState('');

  // Armour-specific
  const [fourPieceValue, setFourPieceValue] = useState('');
  const [fivePieceValue, setFivePieceValue] = useState('');

  // Pet-specific
  const [petType, setPetType] = useState<PetType>('Normal');
  const [p5, setP5] = useState('');
  const [p6, setP6] = useState('');
  const [p7, setP7] = useState('');
  const [p8, setP8] = useState('');
  const [p9, setP9] = useState('');
  const [p10, setP10] = useState('');

  // Generic / Future category
  const [genericValue, setGenericValue] = useState('');

  // Accessories / Items specific
  const [accessoryValue, setAccessoryValue] = useState('');
  const [accessoryDemand, setAccessoryDemand] = useState<DemandLevel>('MEDIUM');
  const [accessoryDisabled, setAccessoryDisabled] = useState(false);
  const [minimumValue, setMinimumValue] = useState('');
  const [maximumValue, setMaximumValue] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form
  useEffect(() => {
    if (!isOpen) {
      setConfirmDelete(false);
      setError(null);
      setSuccess(null);
      return;
    }

    if (isNew) {
      setCategory(defaultCategory || 'Sword');
      setName('');
      setStatus('Stable');
      setCustomStatus('');
      setImage('');
      setDescription('');
      setNormalValue('');
      setRareValue('');
      setFourPieceValue('');
      setFivePieceValue('');
      setPetType('Normal');
      setP5('');
      setP6('');
      setP7('');
      setP8('');
      setP9('');
      setP10('');
      setGenericValue('');
      setAccessoryValue('');
      setAccessoryDemand('MEDIUM');
      setAccessoryDisabled(false);
      setMinimumValue('');
      setMaximumValue('');
      setConfirmDelete(false);
      setError(null);
      setSuccess(null);
      return;
    }

    if (pet) {
      setCategory('Pet');
      setName(pet.name);
      setStatus(STATUS_PRESETS.includes(pet.status) ? pet.status : 'Custom');
      setCustomStatus(STATUS_PRESETS.includes(pet.status) ? '' : pet.status);
      setImage(pet.image || '');
      setPetType(pet.type);
      setP5(pet.p5);
      setP6(pet.p6);
      setP7(pet.p7);
      setP8(pet.p8);
      setP9(pet.p9);
      setP10(pet.p10);
      setDescription(pet.description || '');
    } else if (item) {
      setCategory(item.category);
      setName(item.name);
      setStatus(STATUS_PRESETS.includes(item.status) ? item.status : 'Custom');
      setCustomStatus(STATUS_PRESETS.includes(item.status) ? '' : item.status);
      setImage(item.image || '');
      setDescription(item.description || '');

      if (item.category === 'Sword') {
        setNormalValue(item.normalValue || '');
        setRareValue(item.rareValue || '');
      } else if (item.category === 'Armour') {
        setFourPieceValue(item.fourPieceValue || '');
        setFivePieceValue(item.fivePieceValue || '');
      } else if (item.category === 'Pet') {
        const petObj = item.petData;
        setPetType(petObj?.type || item.petType || 'Normal');
        setP5(petObj?.p5 || item.p5 || '');
        setP6(petObj?.p6 || item.p6 || '');
        setP7(petObj?.p7 || item.p7 || '');
        setP8(petObj?.p8 || item.p8 || '');
        setP9(petObj?.p9 || item.p9 || '');
        setP10(petObj?.p10 || item.p10 || '');
      } else if (item.category === 'Accessories / Items') {
        setAccessoryValue(item.displayValue || item.normalValue || (item.value ? item.value.toString() : ''));
        setAccessoryDemand(item.demand || 'MEDIUM');
        setAccessoryDisabled(!!item.disabled);
        setMinimumValue(item.minimumValue !== undefined ? item.minimumValue.toString() : '');
        setMaximumValue(item.maximumValue !== undefined ? item.maximumValue.toString() : '');
      } else {
        setGenericValue(item.normalValue || item.fourPieceValue || item.value?.toString() || '');
      }
    }
  }, [item, pet, isOpen, isNew, defaultCategory]);

  if (!isOpen) return null;

  // Strict frontend security verification
  if (!isAdmin || userProfile?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Access Prohibited</h2>
          <p className="text-sm text-slate-400">
            Only the protected Owner Admin is authorized to edit, add, or delete catalog items.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Handle client-side image upload & compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImage(dataUrl);
          setError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const effectiveStatus = status === 'Custom' ? customStatus.trim() || 'Stable' : status;
  const statusBadge = getStatusBadge(effectiveStatus);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (!isAdmin && !canChangeValues) {
        throw new Error('Permission denied: You do not have permission to modify item values.');
      }
      if (isNew && !isAdmin) {
        throw new Error('Permission denied: Only the Owner Admin can create new catalog items.');
      }
      if (!name.trim()) throw new Error('Item name is required.');

      // PET CATEGORY
      if (category === 'Pet') {
        if (!p5.trim() || !p6.trim() || !p7.trim() || !p8.trim() || !p9.trim() || !p10.trim()) {
          throw new Error('All Pet tier values (P5 through P10) are required.');
        }

        const petData = {
          name: name.trim(),
          type: petType,
          status: effectiveStatus,
          p5: p5.trim(),
          p6: p6.trim(),
          p7: p7.trim(),
          p8: p8.trim(),
          p9: p9.trim(),
          p10: p10.trim(),
          image: image || undefined,
          description: description.trim() || `Skyblock ${petType} Pet: ${name.trim()}.`,
        };

        if (isNew) {
          await addPet(petData);
        } else if (pet) {
          await updatePet(pet.id, petData);
        } else if (item) {
          // If editing a pet item
          await updatePet(item.id, petData);
        }
      } else if (category === 'Sword') {
        // SWORD CATEGORY
        if (!normalValue.trim()) throw new Error('Normal tier value is required for swords.');
        if (!rareValue.trim()) throw new Error('Rare tier value is required for swords (use "Not Listed" if unlisted).');

        const numericVal = parseCoinStringToNumber(normalValue);
        const numericRare = parseCoinStringToNumber(rareValue);

        const swordData: Partial<SkyblockItem> = {
          name: name.trim(),
          category: 'Sword',
          status: effectiveStatus,
          normalValue: normalValue.trim(),
          rareValue: rareValue.trim(),
          value: numericVal,
          numericRareValue: numericRare,
          image: image || 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=200&auto=format&fit=crop&q=80',
          description: description.trim() || `Skyblock Mythical Sword: ${name.trim()}. Normal: ${normalValue.trim()}. Rare: ${rareValue.trim()}.`,
          demand: effectiveStatus.includes('Increasing') ? 'EXTREME' : effectiveStatus === 'Decreasing' ? 'LOW' : 'HIGH',
        };

        if (isNew) {
          await addItem(swordData as any);
        } else if (item) {
          await updateItem(item.id, swordData, {
            uid: userProfile.uid,
            username: userProfile.username,
            role: (userProfile.role || 'admin') as any,
          });
        }
      } else if (category === 'Armour') {
        // ARMOUR CATEGORY
        if (!fourPieceValue.trim()) throw new Error('4/4 Set value is required for armour.');
        if (!fivePieceValue.trim()) throw new Error('5/5 Full set value is required for armour.');

        const numericVal = parseCoinStringToNumber(fourPieceValue);
        const numericFive = parseCoinStringToNumber(fivePieceValue);

        const armourData: Partial<SkyblockItem> = {
          name: name.trim(),
          category: 'Armour',
          status: effectiveStatus,
          fourPieceValue: fourPieceValue.trim(),
          fivePieceValue: fivePieceValue.trim(),
          value: numericVal,
          numericFivePieceValue: numericFive,
          image: image || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80',
          description: description.trim() || `Skyblock Armour Set: ${name.trim()}. 4/4 Set: ${fourPieceValue.trim()}. 5/5 Set: ${fivePieceValue.trim()}.`,
          demand: effectiveStatus.includes('Increasing') ? 'EXTREME' : effectiveStatus === 'Decreasing' ? 'LOW' : 'HIGH',
        };

        if (isNew) {
          await addItem(armourData as any);
        } else if (item) {
          await updateItem(item.id, armourData, {
            uid: userProfile.uid,
            username: userProfile.username,
            role: (userProfile.role || 'admin') as any,
          });
        }
      } else if (category === 'Accessories / Items') {
        // ACCESSORIES / ITEMS CATEGORY
        const displayVal = accessoryValue.trim();
        let numericVal = 0;
        let parsedMin: number | undefined = minimumValue ? Number(minimumValue) : undefined;
        let parsedMax: number | undefined = maximumValue ? Number(maximumValue) : undefined;

        if (displayVal) {
          // If a value is a range, preserve the exact range (e.g. 100M-120M)
          if (displayVal.includes('-') || displayVal.includes('–')) {
            const parts = displayVal.split(/[-–]/).map((p) => p.trim());
            if (parts.length >= 2) {
              const minVal = parseCoinStringToNumber(parts[0]);
              const maxVal = parseCoinStringToNumber(parts[1]);
              if (parsedMin === undefined) parsedMin = minVal;
              if (parsedMax === undefined) parsedMax = maxVal;
              // Primary numeric value for sorting and calculations
              numericVal = minVal;
            } else {
              numericVal = parseCoinStringToNumber(displayVal);
            }
          } else {
            numericVal = parseCoinStringToNumber(displayVal);
          }
        }

        const accessoryData: Partial<SkyblockItem> = {
          name: name.trim(),
          category: 'Accessories / Items',
          status: effectiveStatus,
          displayValue: displayVal || undefined,
          normalValue: displayVal || undefined,
          value: numericVal,
          minimumValue: parsedMin,
          maximumValue: parsedMax,
          demand: accessoryDemand,
          disabled: accessoryDisabled,
          image: image || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80',
          description: description.trim() || `Skyblock Accessory / Item: ${name.trim()}.${displayVal ? ` Market Valuation: ${displayVal}.` : ' Values pending Owner Admin entry.'}`,
        };

        if (isNew) {
          (accessoryData as any).createdAt = Date.now();
          await addItem(accessoryData as any);
        } else if (item) {
          await updateItem(item.id, accessoryData, {
            uid: userProfile.uid,
            username: userProfile.username,
            role: (userProfile.role || 'admin') as any,
          });
        }
      } else {
        // FUTURE / GENERIC CATEGORY
        if (!genericValue.trim()) throw new Error('Base value is required.');
        const numericVal = parseCoinStringToNumber(genericValue);

        const genericData: Partial<SkyblockItem> = {
          name: name.trim(),
          category,
          status: effectiveStatus,
          normalValue: genericValue.trim(),
          value: numericVal,
          image: image || 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop&q=80',
          description: description.trim() || `Skyblock ${category}: ${name.trim()}. Valuation: ${genericValue.trim()}.`,
          demand: effectiveStatus.includes('Increasing') ? 'EXTREME' : effectiveStatus === 'Decreasing' ? 'LOW' : 'HIGH',
        };

        if (isNew) {
          await addItem(genericData as any);
        } else if (item) {
          await updateItem(item.id, genericData, {
            uid: userProfile.uid,
            username: userProfile.username,
            role: (userProfile.role || 'admin') as any,
          });
        }
      }

      setSuccess('Item successfully saved! Live database updated.');
      setTimeout(() => {
        setSaving(false);
        onSaved?.();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving item:', err);
      setError(err.message || 'Failed to save item changes.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);

    try {
      if (pet) {
        await deletePet(pet.id);
      } else if (item) {
        if (item.category === 'Pet') {
          await deletePet(item.id).catch(() => {});
          await deleteItem(item.id).catch(() => {});
        } else {
          await deleteItem(item.id);
        }
      }

      setSuccess('Item deleted from catalog.');
      setTimeout(() => {
        setDeleting(false);
        onDeleted?.();
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError(err.message || 'Failed to delete item.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl my-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>Owner Admin Control</span>
            </div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span>{isNew ? 'Add New Item' : 'Edit / Manage:'}</span>
              <span className="text-cyan-300 font-mono truncate max-w-xs">{isNew ? category : (pet?.name || item?.name)}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Update photos, category-specific values, and market status. Preserves exact string ranges and syncs live everywhere.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Photo Management (Section 3) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Item Photo Management</span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Preview */}
              <div className="relative w-24 h-24 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 text-[10px]">
                    <Sparkles className="w-6 h-6 mb-1 text-slate-600" />
                    <span>No Photo</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="space-y-2 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{image ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>

                  {image && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Upload screenshot or official asset. Client-side compressed for instant cloud sync. Not required.
                </p>
              </div>
            </div>
          </div>

          {/* Name & Category Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Item Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Poseidon Trident"
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Category
              </label>
              {isNew ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ItemCategory)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400 transition"
                >
                  <option value="Sword">Sword</option>
                  <option value="Armour">Armour</option>
                  <option value="Pet">Pet</option>
                  <option value="Accessories / Items">Accessories / Items</option>
                </select>
              ) : (
                <div className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm font-bold text-cyan-300 flex items-center gap-2">
                  {category === 'Sword' && <Sword className="w-4 h-4 text-amber-400" />}
                  {category === 'Armour' && <Shield className="w-4 h-4 text-blue-400" />}
                  {category === 'Pet' && <Crown className="w-4 h-4 text-pink-400" />}
                  {category === 'Accessories / Items' && <Tag className="w-4 h-4 text-emerald-400" />}
                  {!['Sword', 'Armour', 'Pet', 'Accessories / Items'].includes(category) && <Layers className="w-4 h-4 text-purple-400" />}
                  <span>{category}</span>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC CATEGORY-SPECIFIC VALUE FIELDS */}
          {/* 1. SWORD FIELDS */}
          {category === 'Sword' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sword className="w-3.5 h-3.5" />
                  <span>Sword Valuation Tiers</span>
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  Preserve exact ranges (e.g. 100–120M, 1.7–1.8B)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Normal Tier Value
                  </label>
                  <input
                    type="text"
                    value={normalValue}
                    onChange={(e) => setNormalValue(e.target.value)}
                    placeholder="e.g. 100–120M or 200M"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Rare Tier Value
                  </label>
                  <input
                    type="text"
                    value={rareValue}
                    onChange={(e) => setRareValue(e.target.value)}
                    placeholder="e.g. 1.7–1.8B or Not Listed"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. ARMOUR FIELDS */}
          {category === 'Armour' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Armour Set Valuations</span>
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  Preserve exact ranges (e.g. 450M–500M, 1B–1.1B)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    4/4 Set Value
                  </label>
                  <input
                    type="text"
                    value={fourPieceValue}
                    onChange={(e) => setFourPieceValue(e.target.value)}
                    placeholder="e.g. 450M–500M or 350M"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    5/5 Full Set Value
                  </label>
                  <input
                    type="text"
                    value={fivePieceValue}
                    onChange={(e) => setFivePieceValue(e.target.value)}
                    placeholder="e.g. 600M–650M or 450M"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-blue-300 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. PET FIELDS */}
          {category === 'Pet' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Pet Category & Tiers (P5–P10)</span>
                </span>
                <select
                  value={petType}
                  onChange={(e) => setPetType(e.target.value as PetType)}
                  className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-400 font-sans font-semibold"
                >
                  <option value="Normal">Normal Pet</option>
                  <option value="Rare">Rare Pet</option>
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">P5 Value</label>
                  <input
                    type="text"
                    value={p5}
                    onChange={(e) => setP5(e.target.value)}
                    placeholder="e.g. 300M"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">P6 Value</label>
                  <input
                    type="text"
                    value={p6}
                    onChange={(e) => setP6(e.target.value)}
                    placeholder="e.g. 450M"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">P7 Value</label>
                  <input
                    type="text"
                    value={p7}
                    onChange={(e) => setP7(e.target.value)}
                    placeholder="e.g. 650M"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-400 block mb-0.5">P8 Value</label>
                  <input
                    type="text"
                    value={p8}
                    onChange={(e) => setP8(e.target.value)}
                    placeholder="e.g. 1.3B"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-400 block mb-0.5">P9 Value</label>
                  <input
                    type="text"
                    value={p9}
                    onChange={(e) => setP9(e.target.value)}
                    placeholder="e.g. 2.5B"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-rose-400 block mb-0.5">P10 Value</label>
                  <input
                    type="text"
                    value={p10}
                    onChange={(e) => setP10(e.target.value)}
                    placeholder="e.g. 5B"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-rose-300 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. ACCESSORIES / ITEMS FIELDS */}
          {category === 'Accessories / Items' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Accessories / Items Valuation & Demand</span>
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  Preserve exact ranges (e.g. 100M–120M)
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  Valuation / Price Range (e.g. 100M–120M or 50M)
                </label>
                <input
                  type="text"
                  value={accessoryValue}
                  onChange={(e) => setAccessoryValue(e.target.value)}
                  placeholder="e.g. 100M–120M or 75M (Leave empty if pending)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  Do not invent or estimate values. If unknown, leave blank until exact values are confirmed. Exact ranges are never averaged.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Market Demand Level
                  </label>
                  <select
                    value={accessoryDemand}
                    onChange={(e) => setAccessoryDemand(e.target.value as DemandLevel)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-cyan-400 font-sans"
                  >
                    <option value="VERY LOW">VERY LOW</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="EXTREME">EXTREME</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Catalog Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setAccessoryDisabled(!accessoryDisabled)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold font-sans flex items-center justify-between transition ${
                      accessoryDisabled
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    <span>{accessoryDisabled ? 'Disabled (Hidden)' : 'Active (Visible in Catalog)'}</span>
                    {accessoryDisabled ? <ToggleLeft className="w-4 h-4 text-rose-400" /> : <ToggleRight className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* Optional min/max explicit overrides */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-900">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">
                    Optional Min Value (Coins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minimumValue}
                    onChange={(e) => setMinimumValue(e.target.value)}
                    placeholder="Auto-parsed if range"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">
                    Optional Max Value (Coins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maximumValue}
                    onChange={(e) => setMaximumValue(e.target.value)}
                    placeholder="Auto-parsed if range"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. FUTURE / GENERIC CATEGORY FIELDS */}
          {!['Sword', 'Armour', 'Pet', 'Accessories / Items'].includes(category) && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{category} Valuation</span>
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  Generic value / range
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  Valuation / Price Range
                </label>
                <input
                  type="text"
                  value={genericValue}
                  onChange={(e) => setGenericValue(e.target.value)}
                  placeholder="e.g. 50M or 100M–120M"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}

          {/* Trend / Market Status (Section 5) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">
                Market Status / Trend
              </label>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${statusBadge.badgeClass}`}>
                {statusBadge.emoji && <span>{statusBadge.emoji}</span>}
                <span>{statusBadge.label}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 transition"
              >
                {STATUS_PRESETS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                <option value="Custom">Custom status...</option>
              </select>

              {status === 'Custom' && (
                <input
                  type="text"
                  placeholder="e.g. Highly Volatile"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              )}
            </div>
          </div>

          {/* Optional Lore / Description */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Catalog Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Custom description or market lore..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Delete Item Control (Admin Only) */}
          {!isNew && isAdmin && (
            <div className="pt-2 border-t border-slate-800/80">
              {confirmDelete ? (
                <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Permanently delete "{pet?.name || item?.name}"? This cannot be undone.</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-sm"
                    >
                      {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Item</span>
                </button>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || deleting}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : isNew ? 'Create Item' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
