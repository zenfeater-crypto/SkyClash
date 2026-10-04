import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Save, 
  Sparkles, 
  AlertCircle, 
  Image as ImageIcon,
  CheckCircle,
  ShieldAlert
} from 'lucide-react';
import { SkyblockPet, PetType } from '../types';
import { usePets } from '../context/PetsContext';
import { useAuth } from '../context/AuthContext';
import { getStatusBadge } from '../lib/itemHelpers';

interface PetEditModalProps {
  pet: SkyblockPet | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const STATUS_OPTIONS = [
  'Stable',
  'Increasing',
  'Decreasing',
  'Stable + Decreasing',
  'Stable + Increasing',
  'Decreasing + Stable',
  'Unstable',
];

export const PetEditModal: React.FC<PetEditModalProps> = ({
  pet,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { updatePet } = usePets();
  const { isAdmin, userProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<PetType>('Normal');
  const [status, setStatus] = useState('Stable');
  const [customStatus, setCustomStatus] = useState('');
  const [p5, setP5] = useState('');
  const [p6, setP6] = useState('');
  const [p7, setP7] = useState('');
  const [p8, setP8] = useState('');
  const [p9, setP9] = useState('');
  const [p10, setP10] = useState('');
  const [image, setImage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form when pet changes or opens
  React.useEffect(() => {
    if (pet && isOpen) {
      setName(pet.name);
      setType(pet.type);
      setStatus(STATUS_OPTIONS.includes(pet.status) ? pet.status : 'Custom');
      setCustomStatus(STATUS_OPTIONS.includes(pet.status) ? '' : pet.status);
      setP5(pet.p5);
      setP6(pet.p6);
      setP7(pet.p7);
      setP8(pet.p8);
      setP9(pet.p9);
      setP10(pet.p10);
      setImage(pet.image || '');
      setError(null);
      setSuccess(false);
    }
  }, [pet, isOpen]);

  if (!isOpen || !pet) return null;

  // Strict frontend security verification
  if (!isAdmin || userProfile?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Access Prohibited</h2>
          <p className="text-sm text-slate-400">
            Only the protected Owner Admin is authorized to edit and manage Pet values.
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

  // Handle image file upload with client-side compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 400x400 for crisp thumbnail without exceeding Firestore doc limits
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const finalStatus = status === 'Custom' ? customStatus.trim() || 'Stable' : status;

      if (!p5.trim() || !p6.trim() || !p7.trim() || !p8.trim() || !p9.trim() || !p10.trim()) {
        throw new Error('All tier values (P5 through P10) are required.');
      }

      await updatePet(pet.id, {
        name: name.trim() || pet.name,
        type,
        status: finalStatus,
        p5: p5.trim(),
        p6: p6.trim(),
        p7: p7.trim(),
        p8: p8.trim(),
        p9: p9.trim(),
        p10: p10.trim(),
        image: image || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        setSaving(false);
        onSaved?.();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to update pet:', err);
      setError(err.message || 'Failed to save pet changes.');
      setSaving(false);
    }
  };

  const previewStatus = status === 'Custom' ? customStatus || 'Stable' : status;
  const statusBadge = getStatusBadge(previewStatus);

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
              <span>Edit / Manage Pet:</span>
              <span className="text-cyan-300 font-mono">{pet.name}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Modify values, tiers P5–P10, market status, or pet photo. Live updates across all views.
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
            <span>Pet updated successfully! Reflecting live...</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Pet Photo Management */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pet Photo Management</span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Image Preview Box */}
              <div className="relative w-24 h-24 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner group">
                {image ? (
                  <img
                    src={image}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 text-[10px]">
                    <Sparkles className="w-6 h-6 mb-1 text-slate-600" />
                    <span>No Photo</span>
                  </div>
                )}
              </div>

              {/* Photo Controls */}
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
                    className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm shadow-cyan-600/20"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{image ? 'Change Photo' : 'Upload Pet Photo'}</span>
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
                  Upload custom screenshot or official Skyblock pet render. Auto-compressed for instant loading.
                </p>
              </div>
            </div>
          </div>

          {/* Name & Pet Category (Normal vs Rare) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Pet Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Pet Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PetType)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400 transition"
              >
                <option value="Normal">Normal Pet</option>
                <option value="Rare">Rare Pet</option>
              </select>
            </div>
          </div>

          {/* Trend / Market Status */}
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
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                <option value="Custom">Custom status...</option>
              </select>

              {status === 'Custom' && (
                <input
                  type="text"
                  placeholder="e.g. Volatile, High Demand"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              )}
            </div>
          </div>

          {/* Values Grid: P5 through P10 */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Pet Tier Valuations (P5 – P10)
              </span>
              <span className="text-[10px] text-slate-500 font-sans">
                Preserve exact formats (e.g. 300M, 1.4B–1.5B)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  P5 Value
                </label>
                <input
                  type="text"
                  value={p5}
                  onChange={(e) => setP5(e.target.value)}
                  placeholder="e.g. 300M"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  P6 Value
                </label>
                <input
                  type="text"
                  value={p6}
                  onChange={(e) => setP6(e.target.value)}
                  placeholder="e.g. 450M"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  P7 Value
                </label>
                <input
                  type="text"
                  value={p7}
                  onChange={(e) => setP7(e.target.value)}
                  placeholder="e.g. 650M"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  P8 Value
                </label>
                <input
                  type="text"
                  value={p8}
                  onChange={(e) => setP8(e.target.value)}
                  placeholder="e.g. 1.3B"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  P9 Value
                </label>
                <input
                  type="text"
                  value={p9}
                  onChange={(e) => setP9(e.target.value)}
                  placeholder="e.g. 2.5B"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  P10 Value
                </label>
                <input
                  type="text"
                  value={p10}
                  onChange={(e) => setP10(e.target.value)}
                  placeholder="e.g. 5B"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-rose-300 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          </div>

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
              disabled={saving}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
