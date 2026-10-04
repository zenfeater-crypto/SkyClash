import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  databaseId: firebaseConfigJson.firestoreDatabaseId || '(default)',
};

// Initialize app singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth setup
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Firestore with local cache for seamless offline support
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, firebaseConfig.databaseId);
} catch {
  // If already initialized, get standard Firestore instance
  dbInstance = getFirestore(app, firebaseConfig.databaseId);
}

export const db = dbInstance;
export const databaseId = firebaseConfig.databaseId;
export const projectId = firebaseConfig.projectId;
