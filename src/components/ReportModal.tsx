import React, { useState } from 'react';
import { Flag, X, AlertCircle, CheckCircle2, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'user' | 'world_message' | 'private_message' | 'recommendation' | 'trade_post';
  targetId: string;
  targetUsername?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetUsername,
}) => {
  const { currentUser, userProfile, isOfficer, isTrusted } = useAuth();
  const [reason, setReason] = useState(
    isOfficer ? 'Staff Recommendation: Ban User' : 'Scam / False Valuation'
  );
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be signed in to submit a report.');
      return;
    }

    if (!reason.trim()) {
      setError('Please select a report reason.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Verify reporter's actual server-side role from their protected user document
      let verifiedRole: UserRole = 'user';
      let verifiedUsername = userProfile?.username || 'Trader';

      try {
        const myDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (myDocSnap.exists()) {
          const myData = myDocSnap.data();
          verifiedRole = (myData?.role as UserRole) || 'user';
          if (myData?.username) verifiedUsername = myData.username;
        }
      } catch {
        verifiedRole = userProfile?.role || 'user';
      }

      // 2. Normal user reports:
      // Keep report functionality responsive and functional for all users.
      // However, normal-user reports must NOT be added to the Owner Admin Report Section.
      // Avoid unnecessary Firestore writes while delivering immediate confirmation feedback.
      if (verifiedRole !== 'officer' && verifiedRole !== 'trusted') {
        // Natural processing delay for responsive UX
        await new Promise((resolve) => setTimeout(resolve, 350));
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setDetails('');
          onClose();
        }, 1500);
        return;
      }

      // 3. Officer & Trusted user reports:
      // Retrieve reported account's role if reporting a user
      let reportedRole: UserRole = 'user';
      if (targetType === 'user' && targetId) {
        try {
          const userSnap = await getDoc(doc(db, 'users', targetId));
          if (userSnap.exists()) {
            reportedRole = (userSnap.data()?.role as UserRole) || 'user';
          }
        } catch {
          // fallback
        }
      }

      // Stored securely in Firestore with verified server role:
      // Only Officer and Trusted reports are written and reach the Owner Admin Report Section
      await addDoc(collection(db, 'reports'), {
        reporterUid: currentUser.uid,
        reporterUsername: verifiedUsername,
        reporterRole: verifiedRole, // Strictly 'officer' or 'trusted'
        reportedUid: targetId,
        reportedUsername: targetUsername || '',
        reportedRole,
        targetType,
        targetId,
        reason,
        evidence: details.trim(),
        status: 'pending',
        createdAt: Date.now(),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDetails('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white uppercase font-mono">
              {isOfficer ? 'Staff Report & Recommendation' : `Report ${targetType === 'user' ? 'Trader' : 'Message'}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {targetUsername && (
          <div className="text-xs text-slate-300">
            Target account: <span className="font-bold text-amber-400">@{targetUsername}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Report successfully logged for administration review.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Reason / Report Category
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
              >
                {isOfficer && (
                  <>
                    <option value="Staff Recommendation: Ban User">
                      Recommendation: Ban User (to Admin)
                    </option>
                    <option value="Staff Recommendation: Promote to Trusted">
                      Recommendation: Promote to Trusted (to Admin)
                    </option>
                  </>
                )}
                <option value="Scam / False Valuation">Scam / Price Manipulation</option>
                <option value="Spam / Flooding Chat">Spam / Flooding Chat</option>
                <option value="Abusive / Harassment Language">Abusive / Toxic Chat Behavior</option>
                <option value="Impersonation / Fake Staff">Impersonation / Fake Staff</option>
                <option value="Exploit / Glitch Abuse">Exploit / Bug Abuse</option>
                <option value="Other Rule Violation">Other Rule Violation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Evidence & Context (optional)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide notes, message context, or reasons for the administrator..."
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-3 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
