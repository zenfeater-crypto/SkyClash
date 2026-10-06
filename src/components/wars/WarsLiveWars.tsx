import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Plus, 
  Trash2, 
  Edit3, 
  Swords, 
  Trophy, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  X, 
  Check, 
  Send,
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
  doc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsLiveMatch, WarsLiveUpdate, WarsGang, WarsCategory } from '../../types';

interface WarsLiveWarsProps {
  gangs: WarsGang[];
  gameType?: WarsCategory;
}

export const WarsLiveWars: React.FC<WarsLiveWarsProps> = ({ gangs, gameType = 'skyblock' }) => {
  const { currentUser, isAdmin } = useAuth();
  const [matches, setMatches] = useState<WarsLiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Active match detail view
  const [activeMatch, setActiveMatch] = useState<WarsLiveMatch | null>(null);

  // Admin Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formGang1Name, setFormGang1Name] = useState('');
  const [formGang1Tag, setFormGang1Tag] = useState('');
  const [formGang1Score, setFormGang1Score] = useState(0);
  const [formGang2Name, setFormGang2Name] = useState('');
  const [formGang2Tag, setFormGang2Tag] = useState('');
  const [formGang2Score, setFormGang2Score] = useState(0);
  const [formStatus, setFormStatus] = useState<'upcoming' | 'live' | 'completed'>('live');
  const [formRoundInfo, setFormRoundInfo] = useState('Round 1 of 3');
  const [formStreamUrl, setFormStreamUrl] = useState('');
  const [formWinnerName, setFormWinnerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Update commentary input
  const [newUpdateText, setNewUpdateText] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  const isBedwars = gameType === 'bedwars';

  useEffect(() => {
    const q = query(collection(db, 'wars_live'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WarsLiveMatch[] = [];
        snapshot.forEach((d) => {
          const item = { ...d.data(), id: d.id } as WarsLiveMatch;
          const itemCategory = item.category || 'skyblock';
          if (itemCategory === gameType) {
            list.push(item);
          }
        });
        setMatches(list);
        if (activeMatch) {
          const updated = list.find((m) => m.id === activeMatch.id);
          if (updated) setActiveMatch(updated);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching live wars:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [activeMatch?.id, gameType]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle(isBedwars ? 'Bedwars Guild Championship Series' : 'Skyblock Wars Championship Series');
    setFormGang1Name(gangs[0]?.name || (isBedwars ? 'Clan Red' : 'Gang Alpha'));
    setFormGang1Tag(gangs[0]?.tag || (isBedwars ? 'RED' : 'ALPH'));
    setFormGang1Score(0);
    setFormGang2Name(gangs[1]?.name || (isBedwars ? 'Clan Blue' : 'Gang Omega'));
    setFormGang2Tag(gangs[1]?.tag || (isBedwars ? 'BLUE' : 'OMEG'));
    setFormGang2Score(0);
    setFormStatus('live');
    setFormRoundInfo(isBedwars ? 'Game 1 · Bed Rush (Best of 3)' : 'Round 1 of 3');
    setFormStreamUrl('');
    setFormWinnerName('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: WarsLiveMatch, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormGang1Name(item.gang1.name);
    setFormGang1Tag(item.gang1.tag || '');
    setFormGang1Score(item.gang1.score || 0);
    setFormGang2Name(item.gang2.name);
    setFormGang2Tag(item.gang2.tag || '');
    setFormGang2Score(item.gang2.score || 0);
    setFormStatus(item.status);
    setFormRoundInfo(item.roundInfo || 'Round 1');
    setFormStreamUrl(item.streamUrl || '');
    setFormWinnerName(item.winnerName || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this live war match?')) return;
    try {
      await deleteDoc(doc(db, 'wars_live', id));
      if (activeMatch?.id === id) setActiveMatch(null);
    } catch (err: any) {
      console.error('Failed to delete live war:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formGang1Name.trim() || !formGang2Name.trim() || saving) return;
    if (!isAdmin) {
      setError('Only the Owner Admin is authorized to control Live Wars.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = Date.now();
      const payload: Omit<WarsLiveMatch, 'id'> = {
        title: formTitle.trim(),
        category: gameType,
        gang1: {
          name: formGang1Name.trim(),
          tag: formGang1Tag.trim().toUpperCase(),
          score: Number(formGang1Score) || 0
        },
        gang2: {
          name: formGang2Name.trim(),
          tag: formGang2Tag.trim().toUpperCase(),
          score: Number(formGang2Score) || 0
        },
        status: formStatus,
        roundInfo: formRoundInfo.trim(),
        streamUrl: formStreamUrl.trim(),
        winnerName: formWinnerName.trim() || undefined,
        updatedAt: now,
        createdAt: now
      };

      if (editingId) {
        await updateDoc(doc(db, 'wars_live', editingId), {
          ...payload,
          updatedAt: now
        });
      } else {
        await addDoc(collection(db, 'wars_live'), payload);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving live war match:', err);
      setError(err.message || 'Failed to save match.');
    } finally {
      setSaving(false);
    }
  };

  const handlePostLiveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim() || !activeMatch || !isAdmin || postingUpdate) return;

    setPostingUpdate(true);
    try {
      const updateEntry: WarsLiveUpdate = {
        id: 'upd_' + Date.now(),
        timestamp: Date.now(),
        text: newUpdateText.trim(),
        author: 'Owner Admin'
      };

      const existingUpdates = activeMatch.liveUpdates || [];
      const updatedList = [updateEntry, ...existingUpdates];

      await updateDoc(doc(db, 'wars_live', activeMatch.id), {
        liveUpdates: updatedList,
        updatedAt: Date.now()
      });

      setNewUpdateText('');
    } catch (err: any) {
      console.error('Error posting update:', err);
      alert('Failed to post live update: ' + err.message);
    } finally {
      setPostingUpdate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
              {isBedwars ? 'Bedwars' : 'Skyblock'} Live Wars & Scoreboards
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isBedwars 
              ? 'Real-time Bedwars battle broadcasts, bed breaks, and official scores.'
              : 'Real-time battle scoreboard, live event commentary, and official match streams.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Live War</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono">Connecting to live warfare feed...</div>
      ) : matches.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <Radio className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="font-bold text-white text-sm">No Live Wars Scheduled</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no active live matches. When the Owner Admin initiates a battle or tournament final, live scores will broadcast here!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <div
              key={match.id}
              onClick={() => setActiveMatch(match)}
              className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer shadow-xl relative overflow-hidden group"
            >
              {/* Status Header */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {match.status === 'live' ? (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-rose-500/20">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                      LIVE NOW
                    </span>
                  ) : match.status === 'upcoming' ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                      Upcoming Match
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      Completed
                    </span>
                  )}

                  <span className="text-xs text-slate-400 font-mono">{match.roundInfo}</span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => openEditModal(match, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Match"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(match.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Match"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-base font-black text-white mb-5">{match.title}</h3>

              {/* Clash Scoreboard Arena */}
              <div className="grid grid-cols-5 items-center gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                {/* Gang 1 */}
                <div className="col-span-2 text-center">
                  <div className="text-sm sm:text-base font-black text-white truncate">
                    {match.gang1.name}
                  </div>
                  {match.gang1.tag && (
                    <div className="text-xs text-amber-400 font-mono">[{match.gang1.tag}]</div>
                  )}
                  <div className="text-2xl sm:text-4xl font-black text-white mt-1 font-mono">
                    {match.gang1.score}
                  </div>
                </div>

                {/* VS Center */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">
                    VS
                  </div>
                </div>

                {/* Gang 2 */}
                <div className="col-span-2 text-center">
                  <div className="text-sm sm:text-base font-black text-white truncate">
                    {match.gang2.name}
                  </div>
                  {match.gang2.tag && (
                    <div className="text-xs text-amber-400 font-mono">[{match.gang2.tag}]</div>
                  )}
                  <div className="text-2xl sm:text-4xl font-black text-white mt-1 font-mono">
                    {match.gang2.score}
                  </div>
                </div>
              </div>

              {/* Winner Announcement if completed */}
              {match.status === 'completed' && match.winnerName && (
                <div className="mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>VICTOR: {match.winnerName} WINS!</span>
                </div>
              )}

              {/* Latest Live Update preview */}
              {match.liveUpdates && match.liveUpdates.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-400/90 font-mono line-clamp-1">
                    <Radio className="w-3 h-3 text-rose-500 shrink-0" />
                    Latest: {match.liveUpdates[0].text}
                  </span>
                  <span className="text-[11px] text-slate-500 shrink-0 ml-2">Click to open match feed</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Match Detail / Live Stream & Commentary Modal */}
      {activeMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {activeMatch.status === 'live' && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-black text-[10px] tracking-wider uppercase border border-rose-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                      LIVE
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">{activeMatch.roundInfo}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">{activeMatch.title}</h2>
              </div>
              <button
                onClick={() => setActiveMatch(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6">
              {/* Big Score Arena */}
              <div className="grid grid-cols-5 items-center gap-3 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="col-span-2 text-center">
                  <div className="text-base font-black text-white">{activeMatch.gang1.name}</div>
                  <div className="text-3xl font-black text-amber-400 mt-1 font-mono">
                    {activeMatch.gang1.score}
                  </div>
                </div>

                <div className="col-span-1 text-center font-bold text-xs text-slate-500 font-mono">
                  VS
                </div>

                <div className="col-span-2 text-center">
                  <div className="text-base font-black text-white">{activeMatch.gang2.name}</div>
                  <div className="text-3xl font-black text-amber-400 mt-1 font-mono">
                    {activeMatch.gang2.score}
                  </div>
                </div>
              </div>

              {/* Stream Link if available */}
              {activeMatch.streamUrl && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300">
                  <span>Official Stream Broadcast Available:</span>
                  <a
                    href={activeMatch.streamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline text-cyan-400 hover:text-cyan-300"
                  >
                    Watch Live Stream
                  </a>
                </div>
              )}

              {/* Admin Post Live Event Commentary */}
              {isAdmin && (
                <form onSubmit={handlePostLiveUpdate} className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                    Post Real-Time Match Commentary (Admin)
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUpdateText}
                      onChange={(e) => setNewUpdateText(e.target.value)}
                      placeholder="e.g. Round 2 underway: Gang Alpha claims mid control!"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={postingUpdate || !newUpdateText.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Live Updates Feed */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">
                  Match Event Log
                </h3>

                {(!activeMatch.liveUpdates || activeMatch.liveUpdates.length === 0) ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
                    No commentary logged yet. Match events and combat updates will be published live by Admin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeMatch.liveUpdates.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex items-start gap-2.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-200">{item.text}</span>
                          <span className="text-[10px] text-slate-500 font-mono ml-2">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Live War Match Setup/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-base">
                  {editingId ? 'Edit Live War' : 'Initialize Live War Match'}
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

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Match Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Grand Tournament Finals"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              {/* Gang 1 Inputs */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Gang 1 Name *</label>
                  <input
                    type="text"
                    value={formGang1Name}
                    onChange={(e) => setFormGang1Name(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Score</label>
                  <input
                    type="number"
                    min={0}
                    value={formGang1Score}
                    onChange={(e) => setFormGang1Score(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Gang 2 Inputs */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Gang 2 Name *</label>
                  <input
                    type="text"
                    value={formGang2Name}
                    onChange={(e) => setFormGang2Name(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Score</label>
                  <input
                    type="number"
                    min={0}
                    value={formGang2Score}
                    onChange={(e) => setFormGang2Score(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Match Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">LIVE NOW</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Round Info</label>
                  <input
                    type="text"
                    value={formRoundInfo}
                    onChange={(e) => setFormRoundInfo(e.target.value)}
                    placeholder="e.g. Round 2 / 5"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {formStatus === 'completed' && (
                <div>
                  <label className="text-xs font-bold text-amber-400 block mb-1.5">Declare Victorious Gang</label>
                  <input
                    type="text"
                    value={formWinnerName}
                    onChange={(e) => setFormWinnerName(e.target.value)}
                    placeholder="e.g. Celestial"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Stream URL (Optional)</label>
                <input
                  type="url"
                  value={formStreamUrl}
                  onChange={(e) => setFormStreamUrl(e.target.value)}
                  placeholder="https://youtube.com/... or twitch.tv/..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-white"
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
                  disabled={saving || !formTitle.trim()}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Live War' : 'Publish Live War'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
