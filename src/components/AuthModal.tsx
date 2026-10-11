import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  Sparkles,
  Camera,
  X
} from 'lucide-react';
import { validateUsername, processProfileImageFile } from '../lib/validation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { 
    logInWithEmail, 
    signUpWithEmail, 
    logInWithGoogle, 
    resetPassword,
    authError, 
    clearError 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);
    try {
      const dataUrl = await processProfileImageFile(file);
      setProfilePhoto(dataUrl);
    } catch (err: any) {
      setLocalError(err.message || 'Could not process profile photo.');
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
    setLocalError(null);
    setSuccessMsg(null);
    clearError();

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      
      const valError = validateUsername(username);
      if (valError) {
        setLocalError(valError);
        return;
      }

      setLoading(true);
      try {
        await signUpWithEmail(email, password, username, displayName, profilePhoto);
        onClose();
      } catch (err: any) {
        setLocalError(err.message || 'Signup failed.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'login') {
      setLoading(true);
      try {
        await logInWithEmail(email, password);
        onClose();
      } catch (err: any) {
        setLocalError(err.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      if (!email.trim()) {
        setLocalError('Please enter your email.');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email);
        setSuccessMsg('Password reset link sent! Check your inbox.');
      } catch (err: any) {
        setLocalError(err.message || 'Could not send reset email.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setSuccessMsg(null);
    clearError();
    setLoading(true);
    try {
      await logInWithGoogle();
      onClose();
    } catch (err: any) {
      console.warn('Google sign-in caught error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLocalError('Google sign-in was closed before completing.');
      } else if (err.code === 'auth/popup-blocked') {
        setLocalError('Sign-in popup was blocked by your browser. Please allow popups.');
      } else if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('auth/unauthorized-domain'))) {
        setLocalError('This domain is not yet authorized for Google Sign-In in Firebase. Please sign in with Email or check Admin setup.');
      } else {
        setLocalError(err.message || 'Could not authenticate with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wider uppercase font-mono">
                Skyblock Values
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'login' && 'Sign in to access your account'}
                {mode === 'signup' && 'Create your trading account'}
                {mode === 'forgot' && 'Reset your password'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Display Errors / Notices */}
        {(localError || authError) && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError || authError}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode !== 'forgot' && (
          <>
            {/* GOOGLE SIGN IN BUTTON */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full mb-5 py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 font-semibold text-slate-200 text-sm flex items-center justify-center gap-3 transition shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.15C3.27 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24 0-.75.13-1.52.38-2.24V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.01-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.61l4.01 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
              )}
              <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-slate-500 text-xs uppercase tracking-wider font-mono">
                or with email
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              {/* Optional Profile Photo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Profile Photo</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Your display name. Capital letters, spaces & emojis allowed.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username (@handle)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setLocalError(null);
                    }}
                    placeholder="raj123 or shadowx"
                    required
                    minLength={3}
                    maxLength={20}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-7 pr-4 py-2.5 text-white placeholder-slate-500 font-mono text-sm focus:outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Must start with a-z, 3-20 chars. Lowercase letters and numbers only.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setLocalError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:via-blue-500 hover:to-purple-500 font-bold text-white text-sm tracking-wide shadow-lg shadow-cyan-500/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 transition"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' && 'Login'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Send Reset Link'}
          </button>
        </form>

        {/* Footer switches */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setLocalError(null);
                  setSuccessMsg(null);
                }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setLocalError(null);
                  setSuccessMsg(null);
                }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
              >
                Login
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button
              onClick={() => {
                setMode('login');
                setLocalError(null);
                setSuccessMsg(null);
              }}
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </button>
          )}

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-4 cursor-pointer"
            >
              Continue as Guest / Explore App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
