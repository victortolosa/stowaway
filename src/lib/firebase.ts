import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

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

if (missingKeys.length > 0) {
  const errorMsg = `CRITICAL: Missing Firebase configuration keys: ${missingKeys.join(', ')}. Check your .env file or GitHub Secrets.`;
  console.error(errorMsg);
  // In production, we want this to be loud if it causes an initialization failure
  if (import.meta.env.PROD) {
    (window as any).FIREBASE_INIT_ERROR = errorMsg;
  }
}

console.log('Firebase Config Status:', missingKeys.length === 0 ? 'VALID' : 'INVALID');

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

// Optional: isSupported() check can be added if needed for specific environments
isSupported().then(yes => {
  if (yes) {
    console.log('Firebase Analytics is supported')
  }
})

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
