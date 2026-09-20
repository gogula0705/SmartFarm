import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Client-side Firebase configuration for smartfarm-27e39.
// Uses Vite environment variables if provided, with built-in client Web App credentials
// so production deployments (such as Vercel) initialize properly even when .env is omitted from Git.
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyDdDgR9z_F_rr7PSwqKVr0hUXNkBkqZSnE',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'smartfarm-27e39.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    'smartfarm-27e39',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'smartfarm-27e39.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '495033913491',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:495033913491:web:c58e13440efdc679eefd66',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    'G-8FDJET4JK7',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY'
);

let app = null;
let auth = null;
let db = null;
// Firebase Storage is deferred to stay within Spark (free) plan.
// Set to null now; imageService handles image URLs/previews.
let storage = null;

if (isFirebaseConfigured) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn(
    '[Firebase] Credentials not provided yet. Please configure your VITE_FIREBASE_* variables in .env'
  );
}

export { app, auth, db, storage, firebaseConfig };
export default app;
