import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Plus, 
  Users, 
  Edit3, 
  Trash2, 
  Search, 
  Calendar, 
  Clock, 
  Gift, 
  Coins, 
  Swords, 
  Bed, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  Filter,
  Sparkles
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Tournament, TournamentCategory } from '../../types';
import { AdminTournamentModal } from './AdminTournamentModal';
import { AdminTournamentRegistrationModal } from './AdminTournamentRegistrationModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

export const AdminTournamentsPanelTab: React.FC = () => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | TournamentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tournamentToEdit, setTournamentToEdit] = useState<Tournament | null>(null);
  const [registrationTarget, setRegistrationTarget] = useState<Tournament | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Real-time listener for all tournaments
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Tournament[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Tournament);
        });
        setTournaments(list);
        setLoading(false);
      },
      (err) => {
        console.error('Admin tournaments listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        return (
          t.name?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.dateAndTiming?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [tournaments, categoryFilter, searchQuery]);

  // Overall statistics
  const totalRegistered = useMemo(() => {
    return tournaments.reduce((acc, t) => acc + (t.registeredCount || 0), 0);
  }, [tournaments]);

  // Handle confirmed deletion (triggers DeleteConfirmModal)
  const handleConfirmDeleteTournament = async () => {
    if (!deleteTarget) return;

    if (!isAdmin) {
      setDeleteError('Permission Denied: Only Owner Admin Strike can delete tournaments.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDoc(doc(db, 'tournaments', deleteTarget.id));
      setActionSuccess(`Tournament "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Error deleting tournament:', err);
      setDeleteError(err.message || 'Failed to delete tournament. Check permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> OWNER ADMIN TOURNAMENT COMMAND
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Official Tournaments & Player Rosters
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Create and publish competitive Skyblock & Bedwars tournaments, manage player registrations, enforce roster limits, and monitor prize pools.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTournamentToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>CREATE TOURNAMENT</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Tournaments</div>
            <div className="text-xl font-black text-white font-mono mt-0.5">{tournaments.length}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono text-cyan-400 uppercase">Total Registered Players</div>
            <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">{totalRegistered}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono text-amber-400 uppercase">Skyblock Events</div>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
              {tournaments.filter((t) => t.category === 'skyblock').length}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] font-mono text-rose-400 uppercase">Bedwars Events</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-0.5">
              {tournaments.filter((t) => t.category === 'bedwars').length}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category filters */}
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              categoryFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({tournaments.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('skyblock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              categoryFilter === 'skyblock'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Skyblock ({tournaments.filter((t) => t.category === 'skyblock').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('bedwars')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              categoryFilter === 'bedwars'
                ? 'bg-rose-500 text-white font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bed className="w-3.5 h-3.5" />
            <span>Bedwars ({tournaments.filter((t) => t.category === 'bedwars').length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournament name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      {/* Tournaments List Table / Cards */}
      {loading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-xs text-slate-400 font-mono">Loading tournaments list...</span>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-black text-white">No Tournaments Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery 
              ? `No tournament matches "${searchQuery}".` 
              : 'Create a new tournament to start hosting competitive events.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setTournamentToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tournament</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTournaments.map((t) => {
            const isSkyblock = t.category === 'skyblock';
            const count = t.registeredCount || 0;
            const max = t.maxPlayers || 32;

            return (
              <div
                key={t.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-4 shadow-xl"
              >
                <div>
                  {/* Top Bar: Category + Published Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border flex items-center gap-1.5 ${
                      isSkyblock
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    }`}>
                      {isSkyblock ? <Swords className="w-3 h-3" /> : <Bed className="w-3 h-3" />}
                      <span>{t.category.toUpperCase()}</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${
                      t.isPublished 
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {t.isPublished ? '● PUBLISHED' : '○ DRAFT'}
                    </span>
                  </div>

                  {/* Name & Banner */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                      <img src={t.bannerUrl} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-black text-white truncate">
                        {t.name}
                      </h4>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{t.dateAndTiming}</span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Count & Prize Details */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Players</div>
                      <div className="text-xs font-black text-cyan-400 font-mono mt-0.5">
                        {count} / {max}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Prize Pool</div>
                      <div className="text-xs font-black text-amber-400 font-mono mt-0.5 truncate">
                        {t.winningAmount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Entry Fee</div>
                      <div className="text-xs font-black text-slate-200 font-mono mt-0.5 truncate">
                        {t.entryFee}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Actions Bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  {/* Manage Registrations Roster */}
                  <button
                    type="button"
                    onClick={() => setRegistrationTarget(t)}
                    className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage Registrations ({count}/{max})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setTournamentToEdit(t);
                        setIsCreateModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Edit tournament"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete (Triggers DeleteConfirmModal) */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                      className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 hover:border-red-500/40 transition"
                      title="Delete tournament"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Create / Edit Modal */}
      <AdminTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTournamentToEdit(null);
        }}
        tournamentToEdit={tournamentToEdit}
        onSaved={(saved) => {
          setActionSuccess(`Tournament "${saved.name}" saved successfully.`);
        }}
      />

      {/* Admin Registration Manager Modal */}
      {registrationTarget && (
        <AdminTournamentRegistrationModal
          isOpen={!!registrationTarget}
          onClose={() => setRegistrationTarget(null)}
          tournament={registrationTarget}
          onTournamentUpdated={(updated) => {
            setTournaments((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          }}
        />
      )}

      {/* Universal Delete Confirmation Modal for Tournaments */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Confirm Tournament Deletion"
        itemTypeLabel="Competitive Tournament"
        itemName={deleteTarget?.name || ''}
        warningText="Are you sure you want to permanently delete this tournament? This will remove the tournament from the public feed. This action cannot be undone."
        confirmButtonText="Confirm Delete"
        cancelButtonText="Cancel"
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDeleteTournament}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
