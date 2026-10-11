import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  runTransaction 
} from 'firebase/firestore';
import { db } from './firebase';
import { WarsGang, WarsGangMember, GangApplication, GangInvitation, GangMembershipDoc, WarsCategory } from '../types';
import { stripSpoofedRoleTags } from './validation';

export const DEFAULT_GANG_MAX_MEMBERS = 10;

/**
 * Find if a user is a member or leader of ANY gang across Skyblock and Bedwars
 */
export function getUserGang(gangs: WarsGang[], uid?: string | null): WarsGang | null {
  if (!uid) return null;
  return gangs.find((g) => 
    g.leaderUid === uid || 
    g.memberUids?.includes(uid) || 
    g.members?.some((m) => m.uid === uid)
  ) || null;
}

/**
 * Filter gangs to only active gangs that accept members and have available space
 */
export function getAvailableGangs(gangs: WarsGang[]): WarsGang[] {
  return gangs.filter((g) => {
    // Must be active or recruiting (not archived)
    if (g.status === 'archived') return false;
    const memberCount = g.members?.length || g.memberUids?.length || 0;
    const maxCapacity = g.maxMembers || DEFAULT_GANG_MAX_MEMBERS;
    // Must have available space
    return memberCount < maxCapacity;
  });
}

/**
 * Submit an application to join a gang.
 * Prevents duplicate applications and validates user doesn't already belong to a gang.
 */
export async function applyToGang(
  gang: WarsGang,
  applicant: {
    uid: string;
    username: string;
    name?: string;
    avatarUrl?: string;
  },
  message?: string
): Promise<{ success: boolean; alreadyApplied?: boolean; error?: string }> {
  if (!applicant.uid || !gang.id) {
    return { success: false, error: 'Invalid applicant or gang.' };
  }

  // 1. Backend validation: check if applicant already belongs to ANY gang
  const membershipRef = doc(db, 'gangMemberships', applicant.uid);
  const membershipSnap = await getDoc(membershipRef);
  if (membershipSnap.exists()) {
    return { 
      success: false, 
      error: 'You already belong to a gang. Players can belong to only ONE gang across Skyblock and Bedwars.' 
    };
  }

  // 2. Prevent duplicate application
  const applicationId = `${gang.id}_${applicant.uid}`;
  const appRef = doc(db, 'gangApplications', applicationId);
  const existingSnap = await getDoc(appRef);

  if (existingSnap.exists()) {
    const data = existingSnap.data() as GangApplication;
    if (data.status === 'pending') {
      return { success: true, alreadyApplied: true };
    }
  }

  // 3. Create or update pending application
  const cleanUsername = stripSpoofedRoleTags(applicant.username);
  const cleanDisplayName = stripSpoofedRoleTags(applicant.name || applicant.username);

  const applicationData: GangApplication = {
    id: applicationId,
    gangId: gang.id,
    gangName: gang.name,
    gangTag: gang.tag || '',
    gangIcon: gang.iconUrl || '',
    gameType: gang.gameType || 'skyblock',
    applicantUid: applicant.uid,
    applicantUsername: cleanUsername,
    applicantDisplayName: cleanDisplayName,
    applicantAvatar: applicant.avatarUrl || '',
    leaderUid: gang.leaderUid,
    status: 'pending',
    message: message?.trim() || undefined,
    createdAt: Date.now()
  };

  await setDoc(appRef, applicationData);
  return { success: true, alreadyApplied: false };
}

/**
 * Approve a gang application using atomic transaction.
 * Enforces "One Gang at a Time" rule strictly in database transaction to prevent
 * simultaneous memberships even if processed concurrently.
 */
export async function approveGangApplication(
  application: GangApplication,
  applicantProfile: {
    uid: string;
    username: string;
    name?: string;
    avatarUrl?: string;
    role?: any;
    membership?: any;
  }
): Promise<void> {
  const gangRef = doc(db, 'wars_gangs', application.gangId);
  const membershipRef = doc(db, 'gangMemberships', application.applicantUid);
  const appRef = doc(db, 'gangApplications', application.id);

  await runTransaction(db, async (transaction) => {
    // 1. Check if user already belongs to another gang
    const memberSnap = await transaction.get(membershipRef);
    if (memberSnap.exists()) {
      throw new Error('User already belongs to a gang. Only one gang membership is permitted across Skyblock and Bedwars.');
    }

    // 2. Check gang status & capacity
    const gangSnap = await transaction.get(gangRef);
    if (!gangSnap.exists()) {
      throw new Error('Gang no longer exists.');
    }

    const gangData = gangSnap.data() as WarsGang;
    const currentMembers = gangData.members || [];
    const maxCapacity = gangData.maxMembers || DEFAULT_GANG_MAX_MEMBERS;

    if (currentMembers.length >= maxCapacity) {
      throw new Error(`Gang is full. Maximum limit of ${maxCapacity} members reached.`);
    }

    if (gangData.memberUids?.includes(application.applicantUid)) {
      throw new Error('User is already a member of this gang.');
    }

    const cleanUsername = stripSpoofedRoleTags(applicantProfile.username || application.applicantUsername);
    const cleanDisplayName = stripSpoofedRoleTags(applicantProfile.name || applicantProfile.username || application.applicantDisplayName);

    const newMember: WarsGangMember = {
      uid: application.applicantUid,
      username: cleanUsername,
      displayName: cleanDisplayName,
      role: 'member',
      joinedAt: Date.now(),
      avatarUrl: applicantProfile.avatarUrl || application.applicantAvatar || '',
      userRole: applicantProfile.role || 'user',
      membership: applicantProfile.membership || undefined
    };

    // 3. Atomically set user membership lock
    const membershipData: GangMembershipDoc = {
      uid: application.applicantUid,
      gangId: application.gangId,
      gangName: gangData.name,
      gameType: gangData.gameType || 'skyblock',
      role: 'member',
      joinedAt: Date.now()
    };
    transaction.set(membershipRef, membershipData);

    // 4. Atomically update gang members
    transaction.update(gangRef, {
      members: [...currentMembers, newMember],
      memberUids: [...(gangData.memberUids || []), application.applicantUid],
      updatedAt: Date.now()
    });

    // 5. Update application status
    transaction.update(appRef, {
      status: 'approved',
      updatedAt: Date.now()
    });
  });
}

/**
 * Reject a gang application
 */
export async function rejectGangApplication(applicationId: string): Promise<void> {
  const appRef = doc(db, 'gangApplications', applicationId);
  await updateDoc(appRef, {
    status: 'rejected',
    updatedAt: Date.now()
  });
}

/**
 * Atomically leave a gang and release the user's membership lock
 */
export async function leaveGangTransaction(gangId: string, userUid: string): Promise<void> {
  const gangRef = doc(db, 'wars_gangs', gangId);
  const membershipRef = doc(db, 'gangMemberships', userUid);

  await runTransaction(db, async (transaction) => {
    const gangSnap = await transaction.get(gangRef);
    if (gangSnap.exists()) {
      const gangData = gangSnap.data() as WarsGang;
      if (gangData.leaderUid === userUid) {
        throw new Error('Gang leader cannot leave the gang without transferring leadership or disbanding.');
      }

      const updatedMembers = (gangData.members || []).filter((m) => m.uid !== userUid);
      const updatedMemberUids = (gangData.memberUids || []).filter((u) => u !== userUid);

      transaction.update(gangRef, {
        members: updatedMembers,
        memberUids: updatedMemberUids,
        updatedAt: Date.now()
      });
    }

    // Delete membership lock so user can browse and join another gang
    transaction.delete(membershipRef);
  });
}

/**
 * Send an invitation to a player to join a gang.
 * Checks for existing gang memberships and duplicate invitations.
 */
export async function sendGangInvitation(
  gang: WarsGang,
  sender: { uid: string; username: string },
  receiver: { uid: string; username: string }
): Promise<{ success: boolean; error?: string }> {
  if (!receiver.uid || !gang.id) {
    return { success: false, error: 'Invalid invitation data.' };
  }

  // 1. Check if receiver already belongs to any gang
  const memSnap = await getDoc(doc(db, 'gangMemberships', receiver.uid));
  if (memSnap.exists()) {
    return { 
      success: false, 
      error: `@${receiver.username} already belongs to a gang. Players can belong to only ONE gang.` 
    };
  }

  // 2. Check if gang is at capacity
  const currentCount = gang.members?.length || gang.memberUids?.length || 0;
  const maxCapacity = gang.maxMembers || DEFAULT_GANG_MAX_MEMBERS;
  if (currentCount >= maxCapacity) {
    return { success: false, error: `Gang is full. Maximum limit of ${maxCapacity} members reached.` };
  }

  // 3. Prevent duplicate invitation
  const inviteId = `${gang.id}_${receiver.uid}`;
  const inviteSnap = await getDoc(doc(db, 'gangInvitations', inviteId));
  if (inviteSnap.exists()) {
    const data = inviteSnap.data() as GangInvitation;
    if (data.status === 'pending') {
      return { success: false, error: `An invitation has already been sent to @${receiver.username}.` };
    }
  }

  // 4. Create pending invitation
  const invitationData: GangInvitation = {
    id: inviteId,
    gangId: gang.id,
    gangName: gang.name,
    gangTag: gang.tag || '',
    gangIcon: gang.iconUrl || '',
    gameType: gang.gameType || 'skyblock',
    senderUid: sender.uid,
    senderUsername: stripSpoofedRoleTags(sender.username),
    receiverUid: receiver.uid,
    receiverUsername: stripSpoofedRoleTags(receiver.username),
    status: 'pending',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'gangInvitations', inviteId), invitationData);
  return { success: true };
}

/**
 * Accept a gang invitation using atomic transaction.
 * Enforces "One Gang at a Time" rule strictly in database transaction to prevent
 * simultaneous memberships even if processed concurrently.
 */
export async function acceptGangInvitation(
  invitation: GangInvitation,
  receiverProfile: {
    uid: string;
    username: string;
    name?: string;
    avatarUrl?: string;
    role?: any;
    membership?: any;
  }
): Promise<void> {
  const gangRef = doc(db, 'wars_gangs', invitation.gangId);
  const membershipRef = doc(db, 'gangMemberships', receiverProfile.uid);
  const inviteRef = doc(db, 'gangInvitations', invitation.id);

  await runTransaction(db, async (transaction) => {
    // 1. Check if user already belongs to any gang
    const memSnap = await transaction.get(membershipRef);
    if (memSnap.exists()) {
      throw new Error('You already belong to a gang. Players can belong to only ONE gang across Skyblock and Bedwars.');
    }

    // 2. Check gang existence and capacity
    const gangSnap = await transaction.get(gangRef);
    if (!gangSnap.exists()) {
      throw new Error('Gang no longer exists.');
    }

    const gangData = gangSnap.data() as WarsGang;
    const currentMembers = gangData.members || [];
    const maxCapacity = gangData.maxMembers || DEFAULT_GANG_MAX_MEMBERS;

    if (currentMembers.length >= maxCapacity) {
      throw new Error(`Gang is full. Maximum limit of ${maxCapacity} members reached.`);
    }

    if (gangData.memberUids?.includes(receiverProfile.uid)) {
      throw new Error('You are already a member of this gang.');
    }

    const cleanUsername = stripSpoofedRoleTags(receiverProfile.username);
    const cleanDisplayName = stripSpoofedRoleTags(receiverProfile.name || receiverProfile.username);

    const newMember: WarsGangMember = {
      uid: receiverProfile.uid,
      username: cleanUsername,
      displayName: cleanDisplayName,
      role: 'member',
      joinedAt: Date.now(),
      avatarUrl: receiverProfile.avatarUrl || '',
      userRole: receiverProfile.role || 'user',
      membership: receiverProfile.membership || undefined
    };

    // 3. Atomically set user membership lock
    const membershipData: GangMembershipDoc = {
      uid: receiverProfile.uid,
      gangId: invitation.gangId,
      gangName: gangData.name,
      gameType: gangData.gameType || 'skyblock',
      role: 'member',
      joinedAt: Date.now()
    };
    transaction.set(membershipRef, membershipData);

    // 4. Atomically update gang members
    transaction.update(gangRef, {
      members: [...currentMembers, newMember],
      memberUids: [...(gangData.memberUids || []), receiverProfile.uid],
      updatedAt: Date.now()
    });

    // 5. Update invitation status
    transaction.update(inviteRef, {
      status: 'accepted',
      updatedAt: Date.now()
    });
  });
}

/**
 * Decline a gang invitation
 */
export async function declineGangInvitation(invitationId: string): Promise<void> {
  const inviteRef = doc(db, 'gangInvitations', invitationId);
  await updateDoc(inviteRef, {
    status: 'declined',
    updatedAt: Date.now()
  });
}
