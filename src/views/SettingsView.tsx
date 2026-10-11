import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  LogOut, 
  UserX, 
  Trash2, 
  Info, 
  CheckCircle2, 
  Bell, 
  Wifi, 
  WifiOff,
  Camera,
  Edit3,
  X,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  Heart,
  History,
  Users,
  Crown,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { formatJoinedDate } from '../lib/formatters';
import { countWords, validateBio, processProfileImageFile } from '../lib/validation';
import { RoleBadge } from '../components/RoleBadge';
import { MembershipBadge } from '../components/MembershipBadge';
import { CircularProfileAvatar } from '../components/CircularProfileAvatar';
import { BackButton } from '../components/BackButton';

interface SettingsViewProps {
  onOpenAuth: () => void;
  onOpenAdminPanel: () => void;
  onOpenAdminTalk?: () => void;
  onBack?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  onOpenAuth, 
  onOpenAdminPanel, 
  onOpenAdminTalk,
  onBack 
}) => {
  const { 
    currentUser, 
    userProfile, 
    isAdmin, 
    isOfficer, 
    isStaff, 
    isJMD, 
    hasAdminTalk, 
    isAdFree, 
    isVanguard, 
    isOverlord, 
    isSupreme, 
    logOut, 
    updateUserProfileData 
  } = useAuth();

  const { blockedUserIds, unblockUser, favorites, tradeHistory } = useUserData();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync edit fields when opening modal or on profile load
  const openEditModal = () => {
    if (!userProfile) return;
    setEditName(userProfile.name || userProfile.username);
    setEditBio(userProfile.bio || '');
    setEditPhotoPreview(userProfile.profilePhoto || null);
    setEditError(null);
    setEditSuccess(null);
    setIsEditingProfile(true);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditError(null);
    try {
      const dataUrl = await processProfileImageFile(file);
      setEditPhotoPreview(dataUrl);
    } catch (err: any) {
      setEditError(err.message || 'Could not load chosen photo.');
    }
  };

  const handleRemovePhoto = () => {
    setEditPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setEditSuccess(null);

    // Validate Name
    if (!editName.trim()) {
      setEditError('Display Name cannot be empty.');
      return;
    }

    // Validate Bio (max 100 words)
    const bioError = validateBio(editBio);
    if (bioError) {
      setEditError(bioError);
      return;
    }

    setEditLoading(true);
    try {
      const photoChanged = editPhotoPreview !== (userProfile?.profilePhoto || null);
      await updateUserProfileData({
        name: editName.trim(),
        bio: editBio,
        ...(photoChanged ? { profilePhoto: editPhotoPreview } : {}),
      });
      setEditSuccess('Profile updated successfully!');
      setTimeout(() => {
        setIsEditingProfile(false);
        setEditSuccess(null);
      }, 1200);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="py-20 text-center max-w-md mx-auto p-8 bg-slate-900 border border-slate-800 rounded-3xl">
        <User className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Account Settings</h2>
        <p className="text-xs text-slate-400 mb-6">
          Sign in to manage your trading profile, security settings, and blocked users.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white text-xs shadow-lg shadow-cyan-500/20"
        >
          Sign In
        </button>
      </div>
    );
  }

  const bioWordCount = countWords(editBio);
  const currentAvatar = userProfile?.profilePhoto || userProfile?.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${userProfile?.username || 'user'}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {onBack && (
        <div className="mb-2">
          <BackButton onClick={onBack} label="Back" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase font-mono flex items-center gap-3">
            <User className="w-7 h-7 text-cyan-400" />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Settings & Profile
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your Skyblock trading identity, avatar, and account preferences.
          </p>
        </div>

        <button
          onClick={openEditModal}
          className="py-2 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-2 transition"
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit Profile
        </button>
      </div>

      {/* Network / Offline Status Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <span>{isOnline ? 'Online Sync Active' : 'Offline Mode (Local Cache Active)'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>
            <p className="text-xs text-slate-400">
              {isOnline
                ? 'Firestore real-time listeners synchronizing values, trades, and messages.'
                : 'Browsing cached items and trade values with persistent local cache.'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Card (Parts 5, 6, 8, 10) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
        {/* Ambient glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer" onClick={openEditModal}>
              <CircularProfileAvatar
                src={currentAvatar}
                alt="Profile Photo"
                size="2xl"
                role={userProfile?.role}
                membership={userProfile?.membership}
                isAdmin={userProfile?.role === 'admin'}
              />
              <div
                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition"
                title="Change Photo"
              >
                <Camera className="w-5 h-5 text-cyan-300" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {userProfile?.name || userProfile?.username}
                </h2>
                <RoleBadge role={userProfile?.role} size="sm" />
                {userProfile?.membership?.level && (
                  <MembershipBadge
                    level={userProfile.membership.level}
                    title={userProfile.membership.title}
                    size="sm"
                  />
                )}
              </div>

              {/* Unique Handle (@username) */}
              <div className="text-sm font-mono text-cyan-400 font-semibold mt-0.5">
                @{userProfile?.username}
              </div>

              <div className="text-xs text-slate-400 font-mono mt-1">
                {userProfile?.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openEditModal}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" /> Edit Profile
            </button>

            <button
              onClick={() => logOut()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-rose-400 flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </div>

        {/* Bio Section */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
            Bio
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans">
            {userProfile?.bio?.trim() ? (
              userProfile.bio
            ) : (
              <span className="text-slate-500 italic">
                No bio added yet. Click "Edit Profile" to tell fellow Skyblock traders about your playstyle, guild, or trade interests.
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid: Favorites, Trade History */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Favorites Pinned</div>
              <div className="text-sm font-bold text-white font-mono">{favorites.length} items</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Trades Logged</div>
              <div className="text-sm font-bold text-white font-mono">{tradeHistory.length} trades</div>
            </div>
          </div>
        </div>

        {/* VIP Membership & Admin Talk Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-purple-950/30 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500/20 via-purple-500/20 to-cyan-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Membership Status:</span>
                  {userProfile?.membership?.level ? (
                    <MembershipBadge
                      level={userProfile.membership.level}
                      title={userProfile.membership.title}
                      size="sm"
                    />
                  ) : (
                    <span className="text-slate-400 font-mono text-xs">Standard Member (Free Tier)</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {userProfile?.membership?.level === 'vip'
                    ? 'SUPREME VIP tier active: Purple circular profile frame, purple text frame, ad-free, and exclusive Admin Talk.'
                    : userProfile?.membership?.level === 'premium'
                    ? 'OVERLORD Premium tier active: Silver metallic circular profile frame, silver text frame, ad-free, and exclusive Admin Talk.'
                    : userProfile?.membership?.level === 'premium_lite'
                    ? 'VANGUARD Premium Lite tier active: Golden circular profile frame, golden text frame, and ad-free experience.'
                    : 'Upgrade tiers: VANGUARD, OVERLORD, and SUPREME are assigned exclusively by the Owner Admin.'}
                </div>
              </div>
            </div>

            {/* Admin Talk Button for Overlord, Supreme, or Owner Admin */}
            {hasAdminTalk && onOpenAdminTalk && (
              <button
                type="button"
                onClick={onOpenAdminTalk}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs shadow-lg shadow-purple-950/50 flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                <span>OPEN ADMIN TALK</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] font-mono">
            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${isAdFree ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Ad-Free Experience</span>
            </div>
            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${userProfile?.membership?.level ? 'bg-amber-950/30 border-amber-500/40 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Circular Frame & Aura</span>
            </div>
            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${hasAdminTalk ? 'bg-purple-950/30 border-purple-500/40 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Direct Admin Talk</span>
            </div>
          </div>
        </div>

        {/* Staff & JMD Shortcut */}
        {(isStaff || isJMD) && (
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <span>{isAdmin ? 'Admin Owner Privileges Verified' : isOfficer ? 'Officer Moderation Privileges' : 'JMD Staff Tools Authorized'}</span>
                <RoleBadge role={userProfile?.role} size="xs" />
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {isAdmin 
                  ? 'Full system access: role promotion, user moderation, value editing, and reports.'
                  : isOfficer
                  ? 'Staff moderation access: value adjustments, report triage, and user muting.'
                  : 'Authorized custom staff access granted by Owner Admin.'}
              </div>
            </div>
            <button
              onClick={onOpenAdminPanel}
              className={`py-2 px-3.5 text-white rounded-xl text-xs font-bold transition ${
                isAdmin ? 'bg-amber-600 hover:bg-amber-500' : isOfficer ? 'bg-slate-700 hover:bg-slate-600' : 'bg-purple-600 hover:bg-purple-500'
              }`}
            >
              {isAdmin ? 'Open Admin Panel' : isOfficer ? 'Open Officer Tools' : 'Open JMD Tools'}
            </button>
          </div>
        )}

        {/* PART 5: JOINED TIME AT VERY BOTTOM OF PROFILE */}
        {/* Subtle, normal font, low visual emphasis */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-normal">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatJoinedDate(userProfile?.createdAt || currentUser.metadata.creationTime || Date.now())}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            UID: {userProfile?.uid?.slice(0, 12)}...
          </span>
        </div>
      </div>

      {/* EDIT PROFILE MODAL (Parts 3, 4, 7) */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white uppercase font-mono">
                  Edit Trading Profile
                </h3>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Photo Picker & Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={
                        editPhotoPreview ||
                        userProfile?.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${userProfile?.username || 'user'}`
                      }
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <Camera className="w-3.5 h-3.5" /> Add Profile Photo
                      </button>

                      {editPhotoPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Choose from your device Gallery or Photos. Auto-compressed (under 10MB JPEG/PNG/WebP).
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoSelect}
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Display Name (Part 2) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Name (Display Name)
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Raj 🔥 or Shadow X"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Visible display name across the app. Uppercase letters, spaces, and emojis are allowed!
                </p>
              </div>

              {/* Username (Part 7: Read-only handle) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Username (@handle)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={userProfile?.username || ''}
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-8 pr-4 py-2.5 text-slate-400 font-mono text-sm cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Globally unique permanent trading handle.
                </p>
              </div>

              {/* Bio with Live Word Counter (Part 4) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Bio
                  </label>
                  <span
                    className={`text-xs font-mono font-bold ${
                      bioWordCount > 100 ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                    }`}
                  >
                    {bioWordCount}/100 words
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write a brief trading bio (max 100 words). Emojis and multiline text supported..."
                  className={`w-full bg-slate-950 border rounded-xl p-3 text-white text-xs sm:text-sm focus:outline-none transition ${
                    bioWordCount > 100 ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-cyan-500'
                  }`}
                />
                {bioWordCount > 100 && (
                  <p className="text-xs text-rose-400 mt-1 font-semibold">
                    Bio must be 100 words or less. (Currently {bioWordCount} words)
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || bioWordCount > 100}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5 transition"
                >
                  {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blocked Users Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white uppercase font-mono flex items-center gap-2">
          <UserX className="w-4 h-4 text-rose-400" /> Blocked Users ({blockedUserIds.length})
        </h3>
        <p className="text-xs text-slate-400">
          Blocked users cannot direct message you and their messages in World Chat are hidden.
        </p>

        {blockedUserIds.length === 0 ? (
          <div className="text-xs text-slate-500 italic py-2">
            No blocked users. You can block any disruptive trader in World Chat or Direct Messages.
          </div>
        ) : (
          <div className="space-y-2">
            {blockedUserIds.map((uid) => (
              <div
                key={uid}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
              >
                <span className="text-xs text-slate-300 font-mono">UID: {uid}</span>
                <button
                  onClick={() => unblockUser(uid)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg transition"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* App Information */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="font-bold text-white uppercase font-mono">Skyblock Value Calculator v2.0</div>
        <p>Original implementation with real-time Firestore database and persistent offline cache.</p>
        <div className="pt-2 text-[11px] text-slate-500">
          All Hypixel Skyblock equipment data, stats, and coin calculations are community valuations.
        </div>
      </div>
    </div>
  );
};
