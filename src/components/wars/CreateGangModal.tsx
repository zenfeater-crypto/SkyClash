import React, { useState } from 'react';
import { X, ShieldAlert, Crown, Users, Sparkles, AlertCircle } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, WarsGangMember, WarsCategory } from '../../types';
import { stripSpoofedRoleTags } from '../../lib/validation';

interface CreateGangModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newGangId: string) => void;
  gameType?: WarsCategory;
}

export const CreateGangModal: React.FC<CreateGangModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  gameType = 'skyblock'
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [leaderUsername, setLeaderUsername] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !leaderUsername.trim() || loading) return;

    if (!isAdmin) {
      setError('Only the Owner Admin is authorized to create gang groups.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanLeader = leaderUsername.trim().toLowerCase();
      // Look up target leader in users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('normalizedUsername', '==', cleanLeader), limit(1));
      const userSnap = await getDocs(q);

      if (userSnap.empty) {
        setError(`Designated leader @${cleanLeader} was not found. Please ensure the user has signed in and registered.`);
        setLoading(false);
        return;
      }

      const leaderDoc = userSnap.docs[0];
      const leaderData = leaderDoc.data();
      const leaderUid = leaderDoc.id;

      // 1. Backend validation: check if leader already belongs to ANY gang
      const membershipRef = doc(db, 'gangMemberships', leaderUid);
      const membershipSnap = await getDoc(membershipRef);
      if (membershipSnap.exists()) {
        setError(`@${cleanLeader} already belongs to a gang. A player can belong to only ONE gang across Skyblock and Bedwars.`);
        setLoading(false);
        return;
      }

      const initialMember: WarsGangMember = {
        uid: leaderUid,
        username: stripSpoofedRoleTags(leaderData.username || cleanLeader),
        displayName: stripSpoofedRoleTags(leaderData.name || leaderData.username || cleanLeader),
        role: 'leader',
        joinedAt: Date.now(),
        avatarUrl: leaderData.profilePhoto || leaderData.avatarUrl || '',
        userRole: leaderData.role || 'user',
        membership: leaderData.membership || undefined
      };

      const gangDocRef = await addDoc(collection(db, 'wars_gangs'), {
        name: name.trim(),
        tag: tag.trim().toUpperCase() || name.substring(0, 3).toUpperCase(),
        gameType: gameType,
        iconUrl: iconUrl.trim() || '',
        leaderUid: leaderUid,
        leaderUsername: cleanLeader,
        members: [initialMember],
        memberUids: [leaderUid],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active',
        bio: bio.trim(),
        stats: {
          wins: 0,
          losses: 0,
          rating: 1000,
          kills: 0
        }
      });

      // 2. Set atomic membership lock for the leader
      await setDoc(membershipRef, {
        uid: leaderUid,
        gangId: gangDocRef.id,
        gangName: name.trim(),
        gameType: gameType,
        role: 'leader',
        joinedAt: Date.now()
      });

      onSuccess(gangDocRef.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to create gang:', err);
      setError(err.message || 'Failed to create gang.');
    } finally {
      setLoading(false);
    }
  };

  const isBedwars = gameType === 'bedwars';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg bg-slate-900 border ${isBedwars ? 'border-rose-500/40' : 'border-amber-500/40'} rounded-3xl shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-5 bg-gradient-to-r from-slate-950 via-slate-900 ${isBedwars ? 'to-rose-950/30' : 'to-amber-950/30'} border-b border-slate-800 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${isBedwars ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400'} border flex items-center justify-center`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                Create {isBedwars ? 'Bedwars' : 'Skyblock'} Gang
              </h3>
              <div className={`text-[11px] ${isBedwars ? 'text-rose-400' : 'text-amber-400'} font-mono`}>
                Owner Admin Exclusive Authorization
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Gang Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bloodlust, Celestial, Void Walkers"
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Gang Tag (2-5 Letters)
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. BLST, VOID"
                maxLength={5}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Designated Leader *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={leaderUsername}
                  onChange={(e) => setLeaderUsername(e.target.value)}
                  placeholder="Leader username"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
                />
                <Crown className="w-4 h-4 text-amber-400 absolute right-3 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Gang Icon / Emblem Image URL (optional)
            </label>
            <input
              type="url"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Gang Bio / Motto
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Official guild war description, focus, recruitment rules..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !leaderUsername.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              {loading ? 'Creating Gang...' : 'Create Gang Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
