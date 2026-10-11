import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Calendar, 
  Clock, 
  Users, 
  Coins, 
  Gift, 
  Swords, 
  Bed, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Tournament, TournamentCategory } from '../../types';
import { parseEntryFeeCoins } from '../../lib/tournamentService';

interface AdminTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentToEdit?: Tournament | null;
  onSaved?: (tournament: Tournament) => void;
}

// Default high-quality dark gaming presets
const BANNER_PRESETS = [
  {
    name: 'Skyblock Mythic Arena',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    category: 'skyblock',
  },
  {
    name: 'Bedwars Rush Crimson',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    category: 'bedwars',
  },
  {
    name: 'Cyber Combat Colosseum',
    url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
    category: 'skyblock',
  },
  {
    name: 'Neon Bed Defense',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    category: 'bedwars',
  },
];

export const AdminTournamentModal: React.FC<AdminTournamentModalProps> = ({
  isOpen,
  onClose,
  tournamentToEdit,
  onSaved,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TournamentCategory>('skyblock');
  const [bannerUrl, setBannerUrl] = useState(BANNER_PRESETS[0].url);
  const [dateAndTiming, setDateAndTiming] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(32);
  const [winningAmount, setWinningAmount] = useState('1,000,000 Coins');
  const [entryFee, setEntryFee] = useState('Free');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (!isOpen) return;

    if (tournamentToEdit) {
      setName(tournamentToEdit.name || '');
      setCategory(tournamentToEdit.category || 'skyblock');
      setBannerUrl(tournamentToEdit.bannerUrl || BANNER_PRESETS[0].url);
      setDateAndTiming(tournamentToEdit.dateAndTiming || '');
      setMaxPlayers(tournamentToEdit.maxPlayers || 32);
      setWinningAmount(tournamentToEdit.winningAmount || '1,000,000 Coins');
      setEntryFee(tournamentToEdit.entryFee || 'Free');
      setDescription(tournamentToEdit.description || '');
      setIsPublished(tournamentToEdit.isPublished ?? true);
    } else {
      setName('');
      setCategory('skyblock');
      setBannerUrl(BANNER_PRESETS[0].url);
      setDateAndTiming('');
      setMaxPlayers(32);
      setWinningAmount('1,000,000 Coins');
      setEntryFee('Free');
      setDescription('');
      setIsPublished(true);
    }
    setError(null);
  }, [isOpen, tournamentToEdit]);

  // Handle banner image file upload (converts to base64 data URL)
  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selected file must be an image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setBannerUrl(result);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      setError('Permission Denied: Only Owner Admin Strike can manage tournaments.');
      return;
    }

    if (!name.trim()) {
      setError('Please provide a Tournament Name.');
      return;
    }

    if (!bannerUrl.trim()) {
      setError('Please upload or select a Tournament Banner.');
      return;
    }

    if (!dateAndTiming.trim()) {
      setError('Please specify Tournament Date and Timing (e.g. "Oct 25, 2026 • 7:00 PM IST").');
      return;
    }

    if (maxPlayers <= 0 || isNaN(maxPlayers)) {
      setError('Maximum Players must be at least 1.');
      return;
    }

    if (!winningAmount.trim()) {
      setError('Please provide the Winning Amount (e.g. "1,000,000 Coins" or "₹5,000").');
      return;
    }

    if (!entryFee.trim()) {
      setError('Please specify the Entry Fee (e.g. "Free" or "500 Coins").');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = Date.now();
      const adminUid = currentUser?.uid || 'admin';
      const adminUsername = userProfile?.username || 'Strike';

      const parsedCoins = parseEntryFeeCoins(entryFee.trim());

      if (tournamentToEdit) {
        // Edit existing tournament
        const docRef = doc(db, 'tournaments', tournamentToEdit.id);
        const updatedData: Partial<Tournament> = {
          name: name.trim(),
          category,
          bannerUrl: bannerUrl.trim(),
          dateAndTiming: dateAndTiming.trim(),
          maxPlayers: Number(maxPlayers),
          winningAmount: winningAmount.trim(),
          entryFee: entryFee.trim(),
          entryFeeCoins: parsedCoins,
          description: description.trim(),
          isPublished,
          updatedAt: now,
        };

        await updateDoc(docRef, updatedData);

        if (onSaved) {
          onSaved({
            ...tournamentToEdit,
            ...updatedData,
          });
        }
      } else {
        // Create new tournament
        const newTournamentData: Omit<Tournament, 'id'> = {
          name: name.trim(),
          category,
          bannerUrl: bannerUrl.trim(),
          dateAndTiming: dateAndTiming.trim(),
          registeredCount: 0,
          maxPlayers: Number(maxPlayers),
          winningAmount: winningAmount.trim(),
          entryFee: entryFee.trim(),
          entryFeeCoins: parsedCoins,
          description: description.trim(),
          isPublished,
          registeredUserUids: [],
          createdAt: now,
          updatedAt: now,
          createdByAdminUid: adminUid,
          createdByUsername: adminUsername,
        };

        const docRef = await addDoc(collection(db, 'tournaments'), newTournamentData);

        if (onSaved) {
          onSaved({
            ...newTournamentData,
            id: docRef.id,
          });
        }
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving tournament:', err);
      setError(err.message || 'Failed to save tournament. Check Firebase permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
                  OWNER ADMIN STRIKE
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {tournamentToEdit ? 'EDIT TOURNAMENT' : 'CREATE TOURNAMENT'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {tournamentToEdit ? 'Modify Tournament Details' : 'Publish Sanctioned Tournament'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* 1. Tournament Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>1. Tournament Name *</span>
              <span className="text-[10px] text-slate-400 font-normal">Displayed at top of card</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hypixel Skyblock Nether Championship 2026"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500/60"
              required
            />
          </div>

          {/* 2. Tournament Banner Upload & Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>2. Tournament Banner *</span>
              <span className="text-[10px] text-slate-400 font-normal">Upload custom file or pick preset</span>
            </label>

            {/* Banner Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[21/9] sm:aspect-[24/9] flex items-center justify-center group">
              {bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt="Tournament Banner Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">No banner image selected</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 text-[11px] font-mono text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-slate-700/60">
                Banner Live Preview
              </div>
            </div>

            {/* Upload Button + File Input */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload Banner Image</span>
              </button>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="Or paste external image URL..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60 font-mono"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase shrink-0">Presets:</span>
              {BANNER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setBannerUrl(preset.url);
                    if (preset.category) setCategory(preset.category as TournamentCategory);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition shrink-0 border ${
                    bannerUrl === preset.url
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Game/Category: Skyblock or Bedwars */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              3. Game / Category *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCategory('skyblock')}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  category === 'skyblock'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Swords className="w-4 h-4 text-amber-400" />
                <span>SKYBLOCK TOURNAMENT</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('bedwars')}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  category === 'bedwars'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Bed className="w-4 h-4 text-rose-400" />
                <span>BEDWARS TOURNAMENT</span>
              </button>
            </div>
          </div>

          {/* 4. Tournament Date and Timing */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>4. Tournament Date & Timing *</span>
              <span className="text-[10px] text-slate-400 font-normal">e.g. Oct 24, 2026 • 8:00 PM IST</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dateAndTiming}
                onChange={(e) => setDateAndTiming(e.target.value)}
                placeholder="e.g. Saturday, Oct 24, 2026 • 8:00 PM IST"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500/60"
                required
              />
            </div>
          </div>

          {/* 5. Maximum Players & Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                5. Max Players *
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="2"
                  max="512"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500/60 font-mono"
                  required
                />
              </div>
            </div>

            {/* 6. Winning Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                6. Winning Amount *
              </label>
              <div className="relative">
                <Gift className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={winningAmount}
                  onChange={(e) => setWinningAmount(e.target.value)}
                  placeholder="e.g. 1,000,000 Coins"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500/60"
                  required
                />
              </div>
            </div>

            {/* 7. Entry Fee */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                7. Entry Fee *
              </label>
              <div className="relative">
                <Coins className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  placeholder="e.g. Free or 500 Coins"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500/60"
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Optional Description / Rules</span>
              <span className="text-[10px] text-slate-400 font-normal">Bracket format, gear rules, prize breakdown</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Single-elimination 1v1 bracket. Standard Nether armor, god potions allowed. Winner takes first place grand prize."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60 resize-none leading-relaxed"
            />
          </div>

          {/* Publication Status (Only published appear in public feed) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {isPublished ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-black text-white uppercase tracking-wide">
                  {isPublished ? 'Published (Visible in Public Feed)' : 'Draft (Admin Only / Hidden)'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isPublished 
                    ? 'This tournament will be displayed in the public Wars Tournament feed.' 
                    : 'Only Owner Admin Strike can view or edit this tournament while in draft.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition font-mono border ${
                isPublished 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {isPublished ? 'PUBLISHED' : 'DRAFT'}
            </button>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Tournament...</span>
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                <span>{tournamentToEdit ? 'Save Changes' : 'Create & Publish'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
