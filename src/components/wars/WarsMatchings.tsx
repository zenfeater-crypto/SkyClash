import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Plus, 
  Calendar, 
  Users, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  Crown,
  AlertCircle,
  Filter
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsMatching, WarsGang, WarsCategory, UserRole } from '../../types';
import { stripSpoofedRoleTags } from '../../lib/validation';
import { MessageSquare } from 'lucide-react';

interface WarsMatchingsProps {
  userGangs: WarsGang[];
  onOpenAuth: () => void;
  onOpenPrivateChat?: (friendshipId: string, partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: UserRole }) => void;
  gameType?: WarsCategory;
}

export const WarsMatchings: React.FC<WarsMatchingsProps> = ({ 
  userGangs, 
  onOpenAuth,
  onOpenPrivateChat,
  gameType = 'skyblock'
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [matchings, setMatchings] = useState<WarsMatching[]>([]);
  const [loading, setLoading] = useState(true);

  const isBedwars = gameType === 'bedwars';

  // Filter
  const [formatFilter, setFormatFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGangId, setSelectedGangId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFormat, setFormFormat] = useState('4v4 Scrimmage');
  const [formScheduledTime, setFormScheduledTime] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gangs where current user is Leader (or all gangs if Admin) belonging to THIS gameType
  const relevantGangs = userGangs.filter((g) => {
    const gangType = g.gameType || 'skyblock';
    return gangType === gameType;
  });
  const leadGangs = relevantGangs.filter((g) => g.leaderUid === currentUser?.uid || isAdmin);

  useEffect(() => {
    const q = query(collection(db, 'wars_matchings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WarsMatching[] = [];
        snapshot.forEach((d) => {
          const item = { ...d.data(), id: d.id } as WarsMatching;
          const itemGameType = item.gameType || 'skyblock';
          if (itemGameType === gameType) {
            list.push(item);
          }
        });
        setMatchings(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching matchings:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [gameType]);

  const openCreateModal = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (leadGangs.length === 0) {
      alert('Only designated Gang Leaders (or Owner Admin) can post war matchings. Contact Owner Admin to establish or lead a gang.');
      return;
    }
    setSelectedGangId(leadGangs[0].id);
    setFormTitle('');
    setFormDescription('');
    setFormFormat('4v4 Scrimmage');
    setFormScheduledTime('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleCreateMatching = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || saving || !currentUser || !userProfile) return;

    const chosenGang = leadGangs.find((g) => g.id === selectedGangId);
    if (!chosenGang) {
      setError('Please select a valid gang you lead.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await addDoc(collection(db, 'wars_matchings'), {
        gangId: chosenGang.id,
        gangName: chosenGang.name,
        gangTag: chosenGang.tag || '',
        gangIcon: chosenGang.iconUrl || '',
        thumbnailUrl: formThumbnail.trim() || '',
        gameType: gameType,
        leaderUid: currentUser.uid,
        leaderUsername: stripSpoofedRoleTags(userProfile.username || 'Leader'),
        title: formTitle.trim(),
        description: formDescription.trim(),
        format: formFormat,
        scheduledTime: formScheduledTime.trim(),
        status: 'open',
        createdAt: Date.now()
      });

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error creating war matching:', err);
      setError(err.message || 'Failed to post challenge.');
    } finally {
      setSaving(false);
    }
  };

  const handleDMGangLeader = (item: WarsMatching) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (item.leaderUid === currentUser.uid) {
      alert('You cannot direct message yourself.');
      return;
    }

    const sortedUids = [currentUser.uid, item.leaderUid].sort();
    const friendshipId = sortedUids.join('_');

    if (onOpenPrivateChat) {
      onOpenPrivateChat(friendshipId, {
        uid: item.leaderUid,
        username: item.leaderUsername,
        name: item.leaderUsername,
        avatarUrl: item.gangIcon || '',
        role: 'user'
      });
    } else {
      alert(`Connecting to Private Chat with @${item.leaderUsername}`);
    }
  };

  const handleAcceptChallenge = async (matching: WarsMatching) => {
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    if (leadGangs.length === 0) {
      alert('Only Gang Leaders can accept war challenges on behalf of their gang.');
      return;
    }

    const myGang = leadGangs.find((g) => g.id !== matching.gangId);
    if (!myGang) {
      alert('You cannot challenge your own gang!');
      return;
    }

    if (!confirm(`Accept challenge "${matching.title}" on behalf of [${myGang.name}]?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'wars_matchings', matching.id), {
        status: 'matched',
        challengerGangId: myGang.id,
        challengerGangName: myGang.name
      });
    } catch (err: any) {
      console.error('Error accepting challenge:', err);
      alert('Failed to accept: ' + err.message);
    }
  };

  const handleDeleteMatching = async (matchingId: string) => {
    if (!confirm('Are you sure you want to delete this matching challenge?')) return;
    try {
      await deleteDoc(doc(db, 'wars_matchings', matchingId));
    } catch (err: any) {
      console.error('Error deleting matching:', err);
      alert('Failed to delete: ' + err.message);
    }
  };

  const filtered = matchings.filter((m) => {
    if (formatFilter === 'all') return true;
    return m.format?.toLowerCase().includes(formatFilter.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Swords className={`w-5 h-5 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
              {isBedwars ? 'Bedwars' : 'Skyblock'} War Matchings & Scrims
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gang Leaders post challenges, scrimmages, and arrange official guild clashes.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className={`py-2.5 px-4 rounded-xl ${isBedwars ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/20' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20'} font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition shrink-0`}
        >
          <Plus className="w-4 h-4" />
          <span>Post War Challenge</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['all', '4v4', '5v5', 'scrimmage', 'ranked'].map((fmt) => (
          <button
            key={fmt}
            onClick={() => setFormatFilter(fmt)}
            className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition ${
              formatFilter === fmt
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {fmt === 'all' ? 'All Formats' : fmt}
          </button>
        ))}
      </div>

      {/* Matchings List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono">Loading war challenges...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <Swords className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="font-bold text-white text-sm">No Open Challenges</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No gangs are currently looking for a war. Are you a Gang Leader? Click "Post War Challenge" to issue the next battle call!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const isCreator = currentUser?.uid === item.leaderUid;
            const canManage = isCreator || isAdmin;

            return (
              <div
                key={item.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-xs shrink-0 overflow-hidden">
                        {item.gangIcon ? (
                          <img src={item.gangIcon} alt={item.gangName} className="w-full h-full object-cover" />
                        ) : (
                          <span>[{item.gangTag || item.gangName.substring(0, 3).toUpperCase()}]</span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>{item.gangName}</span>
                          {item.gangTag && (
                            <span className="text-[10px] text-amber-400 font-mono">[{item.gangTag}]</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Posted by @{item.leaderUsername}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      item.status === 'open'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : item.status === 'matched'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.status === 'open' ? 'Open Challenge' : item.status === 'matched' ? 'Match Confirmed' : 'Closed'}
                    </span>
                  </div>

                  {item.thumbnailUrl && (
                    <div className="w-full h-36 rounded-2xl overflow-hidden mb-3 bg-slate-950 border border-slate-800">
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <h3 className="text-base font-extrabold text-white mb-2">{item.title}</h3>

                  {item.description && (
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed whitespace-pre-wrap">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-2">
                    {item.format && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
                        {item.format}
                      </span>
                    )}
                    {item.scheduledTime && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Calendar className={`w-3 h-3 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
                        {item.scheduledTime}
                      </span>
                    )}
                  </div>

                  {item.status === 'matched' && item.challengerGangName && (
                    <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-cyan-400" />
                      <span>Challenge accepted by <strong>{item.challengerGangName}</strong>!</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {!isCreator && (
                      <button
                        onClick={() => handleDMGangLeader(item)}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>DM GANG LEADER</span>
                      </button>
                    )}

                    {item.status === 'open' && !isCreator && (
                      <button
                        onClick={() => handleAcceptChallenge(item)}
                        className={`py-1.5 px-3.5 rounded-xl ${isBedwars ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'} font-bold text-xs flex items-center gap-1.5 transition`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Challenge</span>
                      </button>
                    )}
                  </div>

                  {canManage && (
                    <button
                      onClick={() => handleDeleteMatching(item.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Matching Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Swords className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-base">Post War Challenge</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatching} className="p-5 sm:p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Posting As Gang *
                </label>
                <select
                  value={selectedGangId}
                  onChange={(e) => setSelectedGangId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white"
                >
                  {leadGangs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} [{g.tag || 'GANG'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Looking for 4v4 Scrimmage tonight @ 8 PM UTC"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Match Format
                  </label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="4v4 Scrimmage">4v4 Scrimmage</option>
                    <option value="5v5 Full War">5v5 Full War</option>
                    <option value="Ranked Guild War">Ranked Guild War</option>
                    <option value="1v1 Leader Duel">1v1 Leader Duel</option>
                    <option value="Casual Friendly">Casual Friendly</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Target Time / Arena
                  </label>
                  <input
                    type="text"
                    value={formScheduledTime}
                    onChange={(e) => setFormScheduledTime(e.target.value)}
                    placeholder="e.g. Tonight 8 PM EST"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Rules & Match Notes
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Specific rules: No God Pots, Best of 3, Nether Fortress arena, discord voice..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formTitle.trim()}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
                >
                  {saving ? 'Posting...' : 'Post War Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
