import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  runTransaction, 
  serverTimestamp,
  deleteField,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile, UserRole, UserMembership, MembershipLevel, MembershipTitle } from '../types';
import { validateUsername, validateBio, sanitizeForFirestore, stripSpoofedRoleTags } from '../lib/validation';
import { isUserBanned, isUserMuted } from '../lib/moderation';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isProfileLoading: boolean;
  needsUsernameModal: boolean;
  authError: string | null;
  isAdmin: boolean;
  isOfficer: boolean;
  isStaff: boolean;
  isTrusted: boolean;
  isJMD: boolean;
  canChangeValues: boolean;
  canBanUnban: boolean;
  canDeleteChats: boolean;
  canChooseTrusted: boolean;
  isBanned: boolean;
  isMuted: boolean;
  membership: UserMembership | null;
  membershipLevel: MembershipLevel | null;
  membershipTitle: MembershipTitle | null;
  isVanguard: boolean;
  isOverlord: boolean;
  isSupreme: boolean;
  hasAdminTalk: boolean;
  isAdFree: boolean;
  clearError: () => void;
  signUpWithEmail: (
    email: string, 
    pass: string, 
    username: string, 
    name?: string,
    profilePhoto?: string | null
  ) => Promise<void>;
  logInWithEmail: (email: string, pass: string) => Promise<void>;
  logInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  claimGoogleUsername: (
    username: string, 
    name?: string,
    profilePhoto?: string | null
  ) => Promise<void>;
  updateUserProfileData: (updates: { name?: string; bio?: string; profilePhoto?: string | null }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Helper to determine if a profile is already completed (Rule 2 & 3)
export function isCompletedUserProfile(data: Partial<UserProfile> | undefined | null): boolean {
  if (!data) return false;
  // Explicitly completed flag
  if (data.profileSetupComplete === true) return true;
  // Rule 3: Old existing users who have required username and name
  const hasValidUsername = typeof data.username === 'string' && data.username.trim().length >= 3;
  const hasValidName = 
    (typeof data.name === 'string' && data.name.trim().length > 0) ||
    (typeof (data as any).displayName === 'string' && (data as any).displayName.trim().length > 0) ||
    hasValidUsername;
  return Boolean(hasValidUsername && hasValidName);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [needsUsernameModal, setNeedsUsernameModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // In-flight fetch deduplication to avoid concurrent duplicate requests for the same UID
  const inFlightFetchesRef = React.useRef<Map<string, Promise<UserProfile | null>>>(new Map());

  const clearError = () => setAuthError(null);

  // Load and verify user profile from Firestore strictly by Firebase Auth UID
  const checkAndFetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    if (!user || !user.uid) {
      setUserProfile(null);
      setNeedsUsernameModal(false);
      setIsProfileLoading(false);
      return null;
    }

    // Return in-flight request if one is already running for this UID
    const inFlight = inFlightFetchesRef.current.get(user.uid);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      setIsProfileLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);

        let userSnap = null;
        let lastError = null;

        // Retry loop for temporary network/cache glitches (up to 3 attempts)
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            userSnap = await getDoc(userDocRef);
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`[Auth] getDoc users/${user.uid} attempt ${attempt} notice:`, err);
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 400 * attempt));
            }
          }
        }

        // Handle persistent Firestore fetch failure
        if (lastError || !userSnap) {
          console.warn('[Auth] Firestore profile check failed temporarily:', lastError);
          // CRITICAL: Do NOT show Username setup on error. That would treat existing users as new users!
          setAuthError('Could not verify profile from Firestore. Please check your connection.');
          setNeedsUsernameModal(false);
          setIsProfileLoading(false);
          return null;
        }

        // Check if an existing profile document is found in users/{uid}
        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          if (!data.name) {
            data.name = (data as any).displayName || data.username;
          }

          // Check if this is an existing completed profile (Rule 1 & Rule 3)
          if (isCompletedUserProfile(data)) {
            // 1. EXISTING USER:
            // -> Directly open app / Home
            // -> Do NOT show Username/Name setup
            // -> Do NOT create a new profile
            // -> Do NOT change/reset any existing data
            const isStrikeOwner = 
              data.username?.toLowerCase() === 'strike' ||
              data.normalizedUsername === 'strike' ||
              data.name?.toLowerCase() === 'strike' ||
              user.displayName?.toLowerCase() === 'strike';

            if (isStrikeOwner && data.role !== 'admin') {
              data.role = 'admin';
              updateDoc(userDocRef, { role: 'admin' }).catch(() => {});
            }

            setUserProfile(data);
            setNeedsUsernameModal(false);
            setAuthError(null);
            setIsProfileLoading(false);
            return data;
          }
        }

        // 2. NEW USER:
        // No existing completed profile exists for this Firebase UID
        // -> Show Username + Name setup
        setUserProfile(null);
        setNeedsUsernameModal(true);
        setAuthError(null);
        setIsProfileLoading(false);
        return null;
      } catch (err: any) {
        console.warn('[Auth] Unexpected error during profile verification:', err);
        setAuthError('An error occurred verifying your profile.');
        setNeedsUsernameModal(false);
        setIsProfileLoading(false);
        return null;
      } finally {
        inFlightFetchesRef.current.delete(user.uid);
      }
    })();

    inFlightFetchesRef.current.set(user.uid, fetchPromise);
    return fetchPromise;
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (user) {
        await checkAndFetchUserProfile(user);

        // Real-time listener for instantaneous permission and role synchronization
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            if (!data.name) {
              data.name = (data as any).displayName || data.username;
            }
            if (isCompletedUserProfile(data)) {
              setUserProfile(data);
              setNeedsUsernameModal(false);
            }
          }
        }, (err) => {
          console.warn('Real-time user snapshot notice:', err);
        });
      } else {
        setUserProfile(null);
        setNeedsUsernameModal(false);
        setIsProfileLoading(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      await checkAndFetchUserProfile(currentUser);
    }
  };

  // Safe unique username validation & atomic transaction registration
  const validateAndClaimUsername = async (
    uid: string, 
    rawUsername: string, 
    email: string, 
    displayName?: string,
    realCreationTime?: number,
    profilePhoto?: string | null
  ) => {
    // Strict validation
    const valError = validateUsername(rawUsername);
    if (valError) {
      throw new Error(valError);
    }

    const exactUsername = rawUsername;

    // Check if registering the owner Strike account
    const isStrikeOwner = 
      exactUsername === 'strike' || 
      (displayName && displayName.trim().toLowerCase() === 'strike');

    const initialRole: UserRole = isStrikeOwner ? 'admin' : 'user';

    // Perform atomic transaction to ensure global uniqueness
    await runTransaction(db, async (transaction) => {
      const usernameDocRef = doc(db, 'usernames', exactUsername);
      const usernameDoc = await transaction.get(usernameDocRef);

      if (usernameDoc.exists()) {
        throw new Error('This username is already taken.');
      }

      const userDocRef = doc(db, 'users', uid);
      const finalDisplayName = (displayName && displayName.trim()) 
        ? stripSpoofedRoleTags(displayName.trim()) || exactUsername 
        : exactUsername;

      // Base profile with all standard fields preserved
      const newProfileData: Record<string, any> = {
        uid,
        username: exactUsername,
        normalizedUsername: exactUsername,
        name: finalDisplayName,
        email: email || '',
        avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(exactUsername)}`,
        role: initialRole,
        createdAt: realCreationTime || Date.now(),
        bio: '',
        profileSetupComplete: true, // Marked completed upon registration
      };

      if (profilePhoto && typeof profilePhoto === 'string' && profilePhoto.trim().length > 0) {
        newProfileData.profilePhoto = profilePhoto.trim();
        newProfileData.avatarUrl = profilePhoto.trim();
      }

      // Deeply sanitize both documents so zero `undefined` values ever reach Firestore
      const sanitizedProfile = sanitizeForFirestore(newProfileData);
      const sanitizedUsernameClaim = sanitizeForFirestore({
        uid,
        username: exactUsername,
        claimedAt: serverTimestamp(),
      });

      transaction.set(usernameDocRef, sanitizedUsernameClaim);
      transaction.set(userDocRef, sanitizedProfile);
    });
  };

  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    username: string, 
    name?: string,
    profilePhoto?: string | null
  ) => {
    setAuthError(null);
    
    const valError = validateUsername(username);
    if (valError) {
      throw new Error(valError);
    }

    const testDoc = await getDoc(doc(db, 'usernames', username));
    if (testDoc.exists()) {
      throw new Error('This username is already taken.');
    }

    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const creationTime = cred.user.metadata.creationTime 
      ? new Date(cred.user.metadata.creationTime).getTime() 
      : Date.now();
    
    try {
      await validateAndClaimUsername(cred.user.uid, username, email.trim(), name, creationTime, profilePhoto);
      await updateProfile(cred.user, { 
        displayName: (name && name.trim()) ? stripSpoofedRoleTags(name.trim()) : username 
      }).catch(() => {});
      await checkAndFetchUserProfile(cred.user);
    } catch (err: any) {
      await cred.user.delete().catch(() => {});
      throw err;
    }
  };

  const logInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await checkAndFetchUserProfile(cred.user);
  };

  const logInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        await checkAndFetchUserProfile(cred.user);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in popup was closed.');
      } else if (err.code === 'auth/popup-blocked') {
        throw new Error('Popup blocked by browser. Please allow popups for this site.');
      } else if (err.code === 'auth/unauthorized-domain') {
        console.warn('Google sign-in unauthorized domain:', err);
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        const errWithCode = new Error(
          `Domain "${hostname}" is not authorized for Google Sign-In in Firebase. Please add "${hostname}" to Authorized Domains in your Firebase Console (Authentication > Settings > Authorized Domains).`
        );
        (errWithCode as any).code = 'auth/unauthorized-domain';
        throw errWithCode;
      } else {
        console.warn('Google sign-in warning:', err);
        throw new Error(err.message || 'Could not authenticate with Google.');
      }
    }
  };

  const claimGoogleUsername = async (
    username: string, 
    name?: string,
    profilePhoto?: string | null
  ) => {
    if (!currentUser) throw new Error('Not logged in');
    const creationTime = currentUser.metadata.creationTime 
      ? new Date(currentUser.metadata.creationTime).getTime() 
      : Date.now();
    const finalName = name || currentUser.displayName || username;
    await validateAndClaimUsername(currentUser.uid, username, currentUser.email || '', finalName, creationTime, profilePhoto);
    await updateProfile(currentUser, { displayName: stripSpoofedRoleTags(finalName) || finalName }).catch(() => {});
    await checkAndFetchUserProfile(currentUser);
    setNeedsUsernameModal(false);
  };

  // Update profile fields: Name, Bio (<= 100 words), Profile Photo
  // Strictly preserves and protects: uid, role, createdAt, and admin permissions
  const updateUserProfileData = async (updates: { 
    name?: string; 
    bio?: string; 
    profilePhoto?: string | null 
  }) => {
    if (!currentUser || !userProfile) throw new Error('Not logged in');

    const rawUpdates: Record<string, any> = {};

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Display Name cannot be empty.');
      }
      // Strip spoofed role brackets like [ADMIN] to prevent identity fraud
      const cleaned = stripSpoofedRoleTags(trimmedName);
      rawUpdates.name = cleaned || trimmedName;
    }

    if (updates.bio !== undefined) {
      const bioError = validateBio(updates.bio);
      if (bioError) {
        throw new Error(bioError);
      }
      rawUpdates.bio = updates.bio;
    }

    if (updates.profilePhoto !== undefined) {
      if (updates.profilePhoto === null || updates.profilePhoto.trim() === '') {
        rawUpdates.profilePhoto = deleteField();
        rawUpdates.avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(userProfile.username)}`;
      } else {
        rawUpdates.profilePhoto = updates.profilePhoto.trim();
        rawUpdates.avatarUrl = updates.profilePhoto.trim();
      }
    }

    // Protect immutable, role & permission fields from ANY alteration
    delete rawUpdates.role;
    delete rawUpdates.permissions;
    delete rawUpdates.uid;
    delete rawUpdates.createdAt;
    delete rawUpdates.banned;
    delete rawUpdates.isBanned;
    delete rawUpdates.muted;
    delete rawUpdates.isMuted;

    // Sanitize updates to guarantee zero undefined values
    const cleanUpdates = sanitizeForFirestore(rawUpdates);

    // Save to Firestore
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, cleanUpdates);

    if (cleanUpdates.name && typeof cleanUpdates.name === 'string') {
      await updateProfile(currentUser, { displayName: cleanUpdates.name }).catch(() => {});
    }

    await checkAndFetchUserProfile(currentUser);
  };

  const logOut = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setNeedsUsernameModal(false);
    setIsProfileLoading(false);
    setAuthError(null);
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    await sendPasswordResetEmail(auth, email.trim());
  };

  // Protected Role & Permission Gates
  const isAdmin = userProfile?.role === 'admin';
  const isOfficer = userProfile?.role === 'officer';
  const isStaff = isAdmin || isOfficer;
  const isTrusted = isStaff || userProfile?.role === 'trusted';
  const isBanned = isUserBanned(userProfile);
  const isMuted = isUserMuted(userProfile);

  const isJMD = userProfile?.role === 'jmd' || (userProfile?.permissions != null && (
    !!userProfile.permissions.changeValues ||
    !!userProfile.permissions.banUnban ||
    !!userProfile.permissions.deleteChats ||
    !!userProfile.permissions.chooseTrusted
  ));

  const canChangeValues = isAdmin || isOfficer || (isJMD && !!userProfile?.permissions?.changeValues);
  const canBanUnban = isAdmin || (isJMD && !!userProfile?.permissions?.banUnban);
  const canDeleteChats = isAdmin || isOfficer || (isJMD && !!userProfile?.permissions?.deleteChats);
  const canChooseTrusted = isAdmin || (isJMD && !!userProfile?.permissions?.chooseTrusted);

  // Membership & VIP Levels (VANGUARD, OVERLORD, SUPREME)
  const membership = userProfile?.membership || null;
  const isMembershipActive = membership != null && membership.status === 'active';
  const membershipLevel = isMembershipActive ? membership.level : null;
  const membershipTitle = isMembershipActive ? membership.title : null;

  const isVanguard = isMembershipActive && membershipLevel === 'premium_lite';
  const isOverlord = isMembershipActive && membershipLevel === 'premium';
  const isSupreme = isMembershipActive && membershipLevel === 'vip';
  
  // Dedicated Admin Talk: Unlocked for Overlord, Supreme, and Owner Admin
  const hasAdminTalk = isAdmin || isOverlord || isSupreme;

  // Ad-Free Experience: Unlocked for Vanguard, Overlord, Supreme, and Owner Admin
  const isAdFree = isAdmin || isVanguard || isOverlord || isSupreme;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isProfileLoading,
        needsUsernameModal,
        authError,
        isAdmin,
        isOfficer,
        isStaff,
        isTrusted,
        isJMD,
        canChangeValues,
        canBanUnban,
        canDeleteChats,
        canChooseTrusted,
        isBanned,
        isMuted,
        membership,
        membershipLevel,
        membershipTitle,
        isVanguard,
        isOverlord,
        isSupreme,
        hasAdminTalk,
        isAdFree,
        clearError,
        signUpWithEmail,
        logInWithEmail,
        logInWithGoogle,
        logOut,
        resetPassword,
        claimGoogleUsername,
        updateUserProfileData,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
