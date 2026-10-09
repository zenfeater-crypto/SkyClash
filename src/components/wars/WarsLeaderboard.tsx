import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  Sparkles, 
  X, 
  ArrowUp, 
  ArrowDown,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsLeaderboardEntry, WarsCategory } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface WarsLeaderboardProps {
  gameType?: WarsCategory;
}

export const WarsLeaderboard: React.FC<WarsLeaderboardProps> = ({ gameType = 'skyblock' }) => {
  const { currentUser, isAdmin } = useAuth();
  const [entries, setEntries] = useState<WarsLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRank, setFormRank] = useState<number>(1);
  const [formGangName, setFormGangName] = useState('');
  const [formGangTag, setFormGangTag] = useState('');
  const [formScore, setFormScore] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<WarsLeaderboardEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isBedwars = gameType === 'bedwars';

  useEffect(() => {
    const q = query(collection(db, 'wars_leaderboard'), orderBy('rank', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WarsLeaderboardEntry[] = [];
        snapshot.forEach((d) => {
          const item = { ...d.data(), id: d.id } as WarsLeaderboardEntry;
          const itemGameType = item.gameType || 'skyblock';
          if (itemGameType === gameType) {
            list.push(item);
          }
        });
        setEntries(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching leaderboard:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [gameType]);

  const openAddModal = () => {
    setEditingId(null);
    setFormRank(entries.length + 1);
    setFormGangName('');
    setFormGangTag('');
    setFormScore('1500 PTS');
    setFormNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: WarsLeaderboardEntry) => {
    setEditingId(item.id);
    setFormRank(item.rank);
    setFormGangName(item.gangName);
    setFormGangTag(item.gangTag || '');
    setFormScore(item.score || '');
    setFormNotes(item.notes || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = (entry: WarsLeaderboardEntry) => {
    if (!isAdmin) return;
    setDeleteTarget(entry);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !isAdmin) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDoc(doc(db, 'wars_leaderboard', deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Failed to delete leaderboard entry:', err);
      setDeleteError(err.message || 'Failed to delete leaderboard entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGangName.trim() || saving) return;

    if (!isAdmin) {
      setError('Only the Owner Admin is authorized to edit the official leaderboard.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = Date.now();
      const rankNum = Number(formRank) || 1;
      const payload = {
        rank: rankNum,
        order: rankNum,
        gameType: gameType,
        gangName: formGangName.trim(),
        gangTag: formGangTag.trim().toUpperCase(),
        score: formScore.trim(),
        notes: formNotes.trim(),
        updatedAt: now
      };

      if (editingId) {
        await updateDoc(doc(db, 'wars_leaderboard', editingId), payload);
      } else {
        await addDoc(collection(db, 'wars_leaderboard'), payload);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving leaderboard entry:', err);
      setError(err.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const topThree = entries.slice(0, 3);
  const remainingEntries = entries.slice(3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className={`w-5 h-5 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
              {isBedwars ? 'Bedwars' : 'Skyblock'} Wars Official Leaderboard
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official competitive rankings personally audited and assigned by the Owner Admin.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className={`py-2.5 px-4 rounded-xl ${isBedwars ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/20' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20'} font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition shrink-0`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Ranked Gang</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono">Loading official rankings...</div>
      ) : entries.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="font-bold text-white text-sm">Leaderboard In Calibration</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The Owner Admin is currently setting up the official gang rankings for the active season.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {/* #2 Rank (Silver) */}
              {topThree[1] && (
                <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-850 to-slate-900 border border-slate-700/80 shadow-xl flex flex-col items-center text-center relative order-2 sm:order-1 sm:mt-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-400/20 border border-slate-400/40 text-slate-200 flex items-center justify-center font-black text-xl mb-3 shadow-md">
                    #2
                  </div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5 flex-wrap justify-center">
                    <span>{topThree[1].gangName}</span>
                    {topThree[1].gangTag && (
                      <span className="text-[10px] text-slate-400 font-mono">[{topThree[1].gangTag}]</span>
                    )}
                  </div>
                  <div className="text-xs text-cyan-400 font-bold font-mono mt-1">
                    {topThree[1].score || 'Elite Division'}
                  </div>
                  {topThree[1].notes && (
                    <div className="text-[11px] text-slate-400 mt-2 italic max-w-[200px]">
                      "{topThree[1].notes}"
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 w-full justify-center">
                      <button
                        onClick={() => openEditModal(topThree[1])}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Edit
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => handleDelete(topThree[1])}
                        className="text-[11px] text-rose-400 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* #1 Rank (Gold - Center & Elevated) */}
              {topThree[0] && (
                <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10 flex flex-col items-center text-center relative order-1 sm:order-2">
                  <div className="absolute -top-4 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] tracking-widest uppercase flex items-center gap-1 shadow-md">
                    <Crown className="w-3.5 h-3.5" /> REIGNING CHAMPION
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center font-black text-2xl mb-3 shadow-lg shadow-amber-500/25 mt-2">
                    #1
                  </div>
                  <div className="text-base font-black text-white flex items-center gap-1.5 flex-wrap justify-center">
                    <span>{topThree[0].gangName}</span>
                    {topThree[0].gangTag && (
                      <span className="text-xs text-amber-400 font-mono">[{topThree[0].gangTag}]</span>
                    )}
                  </div>
                  <div className="text-sm text-amber-300 font-extrabold font-mono mt-1">
                    {topThree[0].score || 'Grandmaster 1st'}
                  </div>
                  {topThree[0].notes && (
                    <div className="text-xs text-slate-300 mt-2 italic max-w-[220px]">
                      "{topThree[0].notes}"
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 w-full justify-center">
                      <button
                        onClick={() => openEditModal(topThree[0])}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Edit
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => handleDelete(topThree[0])}
                        className="text-[11px] text-rose-400 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* #3 Rank (Bronze) */}
              {topThree[2] && (
                <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-850 to-slate-900 border border-amber-900/60 shadow-xl flex flex-col items-center text-center relative order-3 sm:mt-8">
                  <div className="w-12 h-12 rounded-2xl bg-amber-700/20 border border-amber-700/40 text-amber-500 flex items-center justify-center font-black text-xl mb-3 shadow-md">
                    #3
                  </div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5 flex-wrap justify-center">
                    <span>{topThree[2].gangName}</span>
                    {topThree[2].gangTag && (
                      <span className="text-[10px] text-amber-600 font-mono">[{topThree[2].gangTag}]</span>
                    )}
                  </div>
                  <div className="text-xs text-cyan-400 font-bold font-mono mt-1">
                    {topThree[2].score || 'Master Division'}
                  </div>
                  {topThree[2].notes && (
                    <div className="text-[11px] text-slate-400 mt-2 italic max-w-[200px]">
                      "{topThree[2].notes}"
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 w-full justify-center">
                      <button
                        onClick={() => openEditModal(topThree[2])}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Edit
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => handleDelete(topThree[2])}
                        className="text-[11px] text-rose-400 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Full Ranked Table */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              <span>All Official Rankings</span>
              <span>{entries.length} Gangs Ranked</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-850/50 transition group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                        : entry.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : entry.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-300'
                    }`}>
                      #{entry.rank}
                    </div>

                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        <span>{entry.gangName}</span>
                        {entry.gangTag && (
                          <span className="text-[11px] text-slate-400 font-mono">[{entry.gangTag}]</span>
                        )}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-slate-400 line-clamp-1">{entry.notes}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-amber-400">
                        {entry.score || 'Ranked'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Audited by Admin
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => openEditModal(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Rank"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete Rank"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Admin Add/Edit Leaderboard Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-base">
                  {editingId ? 'Edit Leaderboard Rank' : 'Add Gang to Leaderboard'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Rank # *</label>
                  <input
                    type="number"
                    min={1}
                    value={formRank}
                    onChange={(e) => setFormRank(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Gang Name *</label>
                  <input
                    type="text"
                    value={formGangName}
                    onChange={(e) => setFormGangName(e.target.value)}
                    placeholder="e.g. Celestial"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Gang Tag</label>
                  <input
                    type="text"
                    value={formGangTag}
                    onChange={(e) => setFormGangTag(e.target.value)}
                    placeholder="e.g. CLST"
                    maxLength={5}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-sm text-white uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Score / Display Info</label>
                  <input
                    type="text"
                    value={formScore}
                    onChange={(e) => setFormScore(e.target.value)}
                    placeholder="e.g. 2,450 PTS (18W - 2L)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Notes / Accolades</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Winner of Tournament 1, Undefeated streak..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formGangName.trim()}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Rank' : 'Add to Leaderboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Leaderboard */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Confirm Leaderboard Removal"
        itemTypeLabel="Leaderboard Ranking"
        itemName={deleteTarget ? `#${deleteTarget.rank} ${deleteTarget.gangName}` : ''}
        warningText="Are you sure you want to remove this guild from the official rankings leaderboard? This action cannot be undone."
        confirmButtonText="Confirm Remove"
        cancelButtonText="Cancel"
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
