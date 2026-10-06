import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Crown, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Trash2, 
  Edit3, 
  MessageSquare, 
  Swords, 
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  MoreVertical
} from 'lucide-react';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  where, 
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { WarsGang, WarsGangMember, UserRole } from '../../types';
import { CircularProfileAvatar } from '../CircularProfileAvatar';
import { stripSpoofedRoleTags } from '../../lib/validation';
import { GangMenuModal } from './GangMenuModal';
import { GangAllMembersModal } from './GangAllMembersModal';
import { GangInviteFriendModal } from './GangInviteFriendModal';

interface GangDetailModalProps {
  gang: WarsGang;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  onCreateMatching: () => void;
  onOpenAuth: () => void;
  onUpdateGang?: (updatedGang: WarsGang) => void;
}

export const GangDetailModal: React.FC<GangDetailModalProps> = ({
  gang,
  isOpen,
  onClose,
  onOpenChat,
  onCreateMatching,
  onOpenAuth,
  onUpdateGang
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [currentGang, setCurrentGang] = useState<WarsGang>(gang);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAllMembersOpen, setIsAllMembersOpen] = useState(false);
  const [isInviteFriendOpen, setIsInviteFriendOpen] = useState(false);

  useEffect(() => {
    setCurrentGang(gang);
  }, [gang]);

  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null);

  // Edit gang state for Admin
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(gang.name);
  const [editTag, setEditTag] = useState(gang.tag || '');
  const [editIconUrl, setEditIconUrl] = useState(gang.iconUrl || '');
  const [editBio, setEditBio] = useState(gang.bio || '');
  const [editLeaderUsername, setEditLeaderUsername] = useState(gang.leaderUsername);
  const [editStatus, setEditStatus] = useState<'active' | 'recruiting' | 'archived'>(gang.status || 'active');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isLeader = currentUser && gang.leaderUid === currentUser.uid;
  const isMember = currentUser && (
    gang.memberUids?.includes(currentUser.uid) ||
    gang.members?.some((m) => m.uid === currentUser.uid) ||
    gang.leaderUid === currentUser.uid
  );
  const canManageMembers = isAdmin || isLeader;

  // Handler to add a member by username
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUsername.trim() || addingMember) return;

    if (!canManageMembers) return;

    setAddingMember(true);
    setAddMemberError(null);
    setAddMemberSuccess(null);

    try {
      const cleanUsername = newMemberUsername.trim().toLowerCase();
      // Look up user by normalizedUsername or username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('normalizedUsername', '==', cleanUsername), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        setAddMemberError(`Player @${cleanUsername} not found.`);
        setAddingMember(false);
        return;
      }

      const targetDoc = snap.docs[0];
      const targetData = targetDoc.data();
      const targetUid = targetDoc.id;

      // Check if already in gang
      if (gang.memberUids?.includes(targetUid) || gang.members?.some((m) => m.uid === targetUid)) {
        setAddMemberError(`@${cleanUsername} is already a member of this gang.`);
        setAddingMember(false);
        return;
      }

      const newMember: WarsGangMember = {
        uid: targetUid,
        username: stripSpoofedRoleTags(targetData.username || cleanUsername),
        displayName: stripSpoofedRoleTags(targetData.name || targetData.username || cleanUsername),
        role: 'member',
        joinedAt: Date.now(),
        avatarUrl: targetData.profilePhoto || targetData.avatarUrl || '',
        userRole: targetData.role || 'user',
        membership: targetData.membership || undefined
      };

      const updatedMembers = [...(gang.members || []), newMember];
      const updatedMemberUids = [...(gang.memberUids || []), targetUid];

      await updateDoc(doc(db, 'wars_gangs', gang.id), {
        members: updatedMembers,
        memberUids: updatedMemberUids,
        updatedAt: Date.now()
      });

      setAddMemberSuccess(`Added @${cleanUsername} to ${gang.name}!`);
      setNewMemberUsername('');
    } catch (err: any) {
      console.error('Error adding member:', err);
      setAddMemberError(err.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  // Handler to remove a member
  const handleRemoveMember = async (memberUid: string, memberUsername: string) => {
    if (!canManageMembers) return;
    if (memberUid === gang.leaderUid && !isAdmin) {
      alert("Gang leader cannot be removed. Only Owner Admin can change the leader.");
      return;
    }

    if (!confirm(`Are you sure you want to remove @${memberUsername} from ${gang.name}?`)) {
      return;
    }

    try {
      const updatedMembers = (gang.members || []).filter((m) => m.uid !== memberUid);
      const updatedMemberUids = (gang.memberUids || []).filter((u) => u !== memberUid);

      await updateDoc(doc(db, 'wars_gangs', gang.id), {
        members: updatedMembers,
        memberUids: updatedMemberUids,
        updatedAt: Date.now()
      });
    } catch (err: any) {
      console.error('Error removing member:', err);
      alert('Failed to remove member: ' + err.message);
    }
  };

  // Admin delete gang
  const handleDeleteGang = async () => {
    if (!isAdmin) return;
    if (!confirm(`ADMIN ACTION: Are you sure you want to permanently delete gang "${gang.name}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'wars_gangs', gang.id));
      onClose();
    } catch (err: any) {
      console.error('Error deleting gang:', err);
      alert('Failed to delete gang: ' + err.message);
    }
  };

  // Admin save edited gang details
  const handleSaveGangEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || savingEdit) return;

    setSavingEdit(true);
    setEditError(null);

    try {
      let leaderUid = gang.leaderUid;
      let leaderUsername = gang.leaderUsername;

      // If Admin changed the leader username, look up the new leader UID
      if (editLeaderUsername.trim() && editLeaderUsername.trim().toLowerCase() !== gang.leaderUsername.toLowerCase()) {
        const cleanUser = editLeaderUsername.trim().toLowerCase();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('normalizedUsername', '==', cleanUser), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
          setEditError(`Cannot set leader: User @${cleanUser} does not exist.`);
          setSavingEdit(false);
          return;
        }
        const leaderDoc = snap.docs[0];
        leaderUid = leaderDoc.id;
        leaderUsername = cleanUser;
      }

      await updateDoc(doc(db, 'wars_gangs', gang.id), {
        name: editName.trim(),
        tag: editTag.trim().toUpperCase(),
        iconUrl: editIconUrl.trim(),
        bio: editBio.trim(),
        leaderUid,
        leaderUsername,
        status: editStatus,
        updatedAt: Date.now()
      });

      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving gang details:', err);
      setEditError(err.message || 'Failed to update gang.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold text-xl shadow-lg shadow-amber-500/15 overflow-hidden shrink-0">
              {gang.iconUrl ? (
                <img src={gang.iconUrl} alt={gang.name} className="w-full h-full object-cover" />
              ) : (
                <span>[{gang.tag || gang.name.substring(0, 3).toUpperCase()}]</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white">{gang.name}</h2>
                {gang.tag && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                    [{gang.tag}]
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  gang.status === 'active' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : gang.status === 'recruiting'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                }`}>
                  {gang.status || 'Active'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1 text-amber-400">
                  <Crown className="w-3.5 h-3.5" />
                  Leader: <span className="font-semibold text-white">@{gang.leaderUsername}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {gang.members?.length || 1} Members
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                title="Edit Gang (Admin)"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {/* THREE-DOT MENU BUTTON */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center justify-center shadow-sm"
              title="Gang Menu"
              aria-label="Gang Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenChat}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Gang Chat (30m Ephemeral)</span>
            </button>

            {(isLeader || isAdmin) && (
              <button
                onClick={onCreateMatching}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-amber-500/30 font-semibold text-xs flex items-center gap-2 transition"
              >
                <Swords className="w-4 h-4" />
                <span>Post War Matching</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleDeleteGang}
                className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs flex items-center gap-1.5 ml-auto transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Gang</span>
              </button>
            )}
          </div>

          {/* Admin Edit Panel */}
          {isAdmin && isEditing && (
            <form onSubmit={handleSaveGangEdit} className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                <Edit3 className="w-3.5 h-3.5" /> Owner Admin Gang Settings
              </div>

              {editError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Gang Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Tag (2-5 chars)</label>
                  <input
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    maxLength={5}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Gang Leader Username</label>
                  <input
                    type="text"
                    value={editLeaderUsername}
                    onChange={(e) => setEditLeaderUsername(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="active">Active</option>
                    <option value="recruiting">Recruiting</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Icon Image URL (optional)</label>
                  <input
                    type="url"
                    value={editIconUrl}
                    onChange={(e) => setEditIconUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Bio / Gang Description</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Bio / Description */}
          {gang.bio && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">
                About Gang
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{gang.bio}</p>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center">
              <div className="text-[11px] text-slate-400 font-mono">WAR WINS</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">{gang.stats?.wins || 0}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center">
              <div className="text-[11px] text-slate-400 font-mono">LOSSES</div>
              <div className="text-xl font-black text-slate-400 mt-0.5">{gang.stats?.losses || 0}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center">
              <div className="text-[11px] text-slate-400 font-mono">WAR RATING</div>
              <div className="text-xl font-black text-cyan-400 mt-0.5">{gang.stats?.rating || 1000}</div>
            </div>
          </div>

          {/* Member Management (For Gang Leader & Admin) */}
          {canManageMembers && (
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  {isLeader ? 'Leader Member Management' : 'Admin Member Management'}
                </div>
                <span className="text-[11px] text-slate-400">
                  {isLeader ? 'You can add/remove members for your gang' : 'Owner Admin Full Control'}
                </span>
              </div>

              {addMemberError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {addMemberError}
                </div>
              )}
              {addMemberSuccess && (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {addMemberSuccess}
                </div>
              )}

              <form onSubmit={handleAddMember} className="flex gap-2">
                <input
                  type="text"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                  placeholder="Enter username to add (e.g. player123)..."
                  className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMemberUsername.trim() || addingMember}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{addingMember ? 'Adding...' : 'Add Player'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                Roster ({gang.members?.length || 1})
              </h3>
            </div>

            <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
              {/* Leader Entry */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-900/40 transition">
                <div className="flex items-center gap-3">
                  <CircularProfileAvatar
                    alt={gang.leaderUsername}
                    size="sm"
                    role={gang.leaderUsername === 'strike' ? 'admin' : 'user'}
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>@{gang.leaderUsername}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" /> Gang Leader
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">Founding Leader</div>
                  </div>
                </div>
              </div>

              {/* Members */}
              {gang.members
                ?.filter((m) => m.uid !== gang.leaderUid)
                .map((member) => (
                  <div key={member.uid} className="p-3.5 flex items-center justify-between hover:bg-slate-900/40 transition group">
                    <div className="flex items-center gap-3">
                      <CircularProfileAvatar
                        src={member.profilePhoto || member.avatarUrl}
                        alt={member.username}
                        size="sm"
                        role={member.userRole}
                        membership={member.membership}
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{member.displayName || member.username}</span>
                          <span className="text-[11px] text-slate-400 font-mono font-normal">@{member.username}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {canManageMembers && (
                      <button
                        onClick={() => handleRemoveMember(member.uid, member.username)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                        title="Remove member from gang"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* GANG SUB-PAGES & MENUS */}
      {isInviteFriendOpen && (
        <GangInviteFriendModal
          gang={currentGang}
          isOpen={true}
          onBack={() => setIsInviteFriendOpen(false)}
          onClose={() => {
            setIsInviteFriendOpen(false);
            setIsMenuOpen(false);
            onClose();
          }}
          onUpdateGang={(updated) => {
            setCurrentGang(updated);
            if (onUpdateGang) onUpdateGang(updated);
          }}
        />
      )}

      {isAllMembersOpen && (
        <GangAllMembersModal
          gang={currentGang}
          isOpen={true}
          onBack={() => setIsAllMembersOpen(false)}
          onClose={() => {
            setIsAllMembersOpen(false);
            setIsMenuOpen(false);
            onClose();
          }}
          onUpdateGang={(updated) => {
            setCurrentGang(updated);
            if (onUpdateGang) onUpdateGang(updated);
          }}
        />
      )}

      {isMenuOpen && !isAllMembersOpen && !isInviteFriendOpen && (
        <GangMenuModal
          gang={currentGang}
          isOpen={true}
          onBack={() => setIsMenuOpen(false)}
          onClose={() => {
            setIsMenuOpen(false);
            onClose();
          }}
          onViewAllMembers={() => setIsAllMembersOpen(true)}
          onInviteFriend={() => setIsInviteFriendOpen(true)}
          onLeaveGangSuccess={() => {
            setIsMenuOpen(false);
            onClose();
          }}
          onUpdateGang={(updated) => {
            setCurrentGang(updated);
            if (onUpdateGang) onUpdateGang(updated);
          }}
        />
      )}
    </div>
  );
};
