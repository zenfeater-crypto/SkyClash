import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Shield, AlertCircle, Loader2, Camera, X } from 'lucide-react';
import { validateUsername, processProfileImageFile } from '../lib/validation';

export const UsernameModal: React.FC = () => {
  const { needsUsernameModal, claimGoogleUsername, currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!needsUsernameModal) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const dataUrl = await processProfileImageFile(file);
      setProfilePhoto(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Could not process profile photo.');
    }
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate username strictly according to Part 1 rules
    const valError = validateUsername(username);
    if (valError) {
      setError(valError);
      return;
    }

    setLoading(true);
    try {
      // profilePhoto is optional: null or string dataUrl
      await claimGoogleUsername(username, displayName, profilePhoto);
    } catch (err: any) {
      setError(err.message || 'Failed to claim username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl shadow-cyan-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Set Up Your Profile</h3>
            <p className="text-xs text-slate-400">Choose your unique handle and display name</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Optional Profile Photo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Profile Photo</span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Selected photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-600 text-[10px] font-mono text-center">No Photo</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{profilePhoto ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-300 text-xs transition"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/png, image/jpeg, image/webp, image/gif"
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Raj 🔥 or Shadow X"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Your visible name. Capital letters, spaces, and emojis are allowed!
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Unique Username (@handle)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="raj123 or shadowx"
                required
                minLength={3}
                maxLength={20}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-slate-500 font-mono text-sm focus:outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                3-20 characters. Must start with a-z and use lowercase letters & numbers only. No spaces, emojis, or uppercase.
              </span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-white text-sm tracking-wide shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim Username & Enter'}
          </button>
        </form>
      </div>
    </div>
  );
};
