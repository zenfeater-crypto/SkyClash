import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Sparkles, 
  ShieldAlert, 
  X, 
  Check, 
  AlertCircle,
  ExternalLink
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
import { WarsAnnouncement, WarsCategory } from '../../types';
import { stripSpoofedRoleTags } from '../../lib/validation';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface WarsAnnouncementsProps {
  gameType?: WarsCategory;
}

export const WarsAnnouncements: React.FC<WarsAnnouncementsProps> = ({ gameType = 'skyblock' }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<WarsAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected announcement for reading full details
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<WarsAnnouncement | null>(null);

  // Modal for Admin Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [formImportant, setFormImportant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<WarsAnnouncement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isBedwars = gameType === 'bedwars';

  useEffect(() => {
    const q = query(collection(db, 'wars_announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WarsAnnouncement[] = [];
        snapshot.forEach((d) => {
          const item = { ...d.data(), id: d.id } as WarsAnnouncement;
          const itemGameType = item.gameType || 'skyblock';
          if (itemGameType === gameType) {
            list.push(item);
          }
        });
        setAnnouncements(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching announcements:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [gameType]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormThumbnail('');
    setFormImportant(false);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: WarsAnnouncement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormThumbnail(item.thumbnailUrl || '');
    setFormImportant(item.isImportant || false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = (item: WarsAnnouncement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setDeleteTarget(item);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !isAdmin) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDoc(doc(db, 'wars_announcements', deleteTarget.id));
      if (selectedAnnouncement?.id === deleteTarget.id) {
        setSelectedAnnouncement(null);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Failed to delete announcement:', err);
      setDeleteError(err.message || 'Failed to delete announcement.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim() || saving) return;
    if (!isAdmin || !currentUser) {
      setError('Only the Owner Admin can post announcements.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = Date.now();
      const payload = {
        title: formTitle.trim(),
        content: formContent.trim(),
        gameType: gameType,
        thumbnailUrl: formThumbnail.trim() || '',
        isImportant: formImportant,
        createdByUid: currentUser.uid,
        createdByUsername: stripSpoofedRoleTags(userProfile?.username || 'Owner Admin'),
        updatedAt: now
      };

      if (editingId) {
        await updateDoc(doc(db, 'wars_announcements', editingId), payload);
      } else {
        await addDoc(collection(db, 'wars_announcements'), {
          ...payload,
          createdAt: now
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save announcement:', err);
      setError(err.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className={`w-5 h-5 ${isBedwars ? 'text-rose-400' : 'text-amber-400'}`} />
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
              {isBedwars ? 'Bedwars' : 'Skyblock'} Wars Announcements
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official season directives, battle schedules, and rule updates issued by the Owner Admin.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className={`py-2.5 px-4 rounded-xl ${isBedwars ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/20' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20'} font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition shrink-0`}
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <Megaphone className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="font-bold text-white text-sm">No Announcements Yet</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The Owner Admin has not posted any Skyblock Wars announcements yet. Check back soon for Season 1 updates!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedAnnouncement(item)}
              className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between group ${
                item.isImportant
                  ? 'bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/40 hover:border-amber-400/70 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div>
                {item.thumbnailUrl && (
                  <div className="w-full h-36 rounded-2xl overflow-hidden mb-4 bg-slate-950 border border-slate-800">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {item.isImportant && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Major Notice
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white group-hover:text-amber-300 transition line-clamp-2 mb-2">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {item.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 group-hover:underline flex items-center gap-1">
                  Read full details <ExternalLink className="w-3 h-3" />
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => openEditModal(item, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Announcement"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {selectedAnnouncement.isImportant && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                      Official Admin Directive
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(selectedAnnouncement.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{selectedAnnouncement.title}</h2>
                <div className="text-xs text-amber-400 font-mono mt-1">
                  Issued by Owner Admin @{selectedAnnouncement.createdByUsername}
                </div>
              </div>

              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {selectedAnnouncement.thumbnailUrl && (
                <div className="w-full max-h-72 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={selectedAnnouncement.thumbnailUrl}
                    alt={selectedAnnouncement.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedAnnouncement.content}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Post / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {editingId ? 'Edit Announcement' : 'New Skyblock Wars Announcement'}
                  </h3>
                  <div className="text-[11px] text-amber-400 font-mono">Owner Admin Only</div>
                </div>
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
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Skyblock Wars Season 1 Kickoff & Rules"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Content / Full Description *
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={6}
                  placeholder="Enter complete directive, schedule, arena details, reward pools..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Optional Thumbnail URL
                </label>
                <input
                  type="url"
                  value={formThumbnail}
                  onChange={(e) => setFormThumbnail(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formImportant"
                  checked={formImportant}
                  onChange={(e) => setFormImportant(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-950 border-slate-700"
                />
                <label htmlFor="formImportant" className="text-xs font-medium text-slate-300 cursor-pointer">
                  Mark as Major Announcement (Highlighted Border & Badge)
                </label>
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
                  disabled={saving || !formTitle.trim() || !formContent.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  {saving ? 'Publishing...' : editingId ? 'Save Changes' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Announcements */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Confirm Announcement Deletion"
        itemTypeLabel="War Announcement"
        itemName={deleteTarget?.title || ''}
        warningText="Are you sure you want to permanently delete this announcement? This action cannot be undone."
        confirmButtonText="Confirm Delete"
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
