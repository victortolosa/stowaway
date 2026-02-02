import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Critical validation for production stabilization
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

// Safely log configuration state for debugging
// eslint-disable-next-line no-constant-condition
if (import.meta.env.PROD || true) {
  console.group('Firebase Configuration Diagnostics');
  console.log('Status:', missingKeys.length === 0 ? 'VALID' : 'INVALID');
  if (missingKeys.length > 0) {
    console.error('Missing Keys:', missingKeys.join(', '));
  }

  // Safe logging of key presence and partial values
  Object.keys(firebaseConfig).forEach(key => {
    const value = firebaseConfig[key as keyof typeof firebaseConfig];
    if (!value) {
      console.warn(`${key}: MISSING`);
    } else {
      const valStr = String(value);
      const prefix = valStr.substring(0, 6);
      const suffix = valStr.substring(valStr.length - 4);
      console.log(`${key}: PRESENT (Length: ${valStr.length}, Prefix: ${prefix}..., Suffix: ...${suffix})`);
    }
  });
  console.groupEnd();
}

if (missingKeys.length > 0) {
  const errorMsg = `CRITICAL: Missing Firebase configuration keys: ${missingKeys.join(', ')}. Check your .env file or GitHub Secrets.`;
  console.error(errorMsg);
  if (import.meta.env.PROD) {
    window.FIREBASE_INIT_ERROR = errorMsg;
  }
}

// Safe initialization wrapper
let app!: FirebaseApp;
let auth!: Auth;
let db!: Firestore;
let storage!: FirebaseStorage;
let analytics: Analytics | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  if (typeof window !== 'undefined') {
    isSupported().then(yes => {
      if (yes) {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized');
      }
    });
  }
} catch (e) {
  const errorMsg = `FIREBASE_CRITICAL_ERROR: ${e instanceof Error ? e.message : String(e)}`;
  console.error(errorMsg, e);
  if (typeof window !== 'undefined') {
    window.FIREBASE_INIT_ERROR = (window.FIREBASE_INIT_ERROR || '') + '\n' + errorMsg;
  }
}

// Ensure exports are not undefined to prevent immediate crashes in the app
// This allows the RootErrorBoundary to actually render and show the error message
if (!auth) {
  auth = {
    currentUser: null,
    // Dummy implementation to prevent crash on execution
    onAuthStateChanged: (_cb: unknown) => {
      return () => { }; // Return dummy unsubscribe function
    },
    signOut: async () => { },
  } as Auth;
}

if (!db) db = {} as Firestore;
if (!storage) storage = {} as FirebaseStorage;

export { auth, db, storage, analytics };

// Disable persistence temporarily to debug hangs
/*
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.')
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence')
  }
})
*/
