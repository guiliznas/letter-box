
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Helper to access environment variables robustly
const getEnv = (key: string): string => {
  // Check process.env first as it's the primary source in this environment
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  
  // Fallback for Vite-style environment variables if available
  try {
    // @ts-ignore
    const metaEnv = import.meta.env;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch (e) {
    // import.meta.env might not be defined in all contexts
  }

  return '';
};

// Map configuration with support for both VITE_ prefixed and standard names
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID') || getEnv('FIREBASE_APP_ID')
};

// Validate that we have an API Key before initializing to prevent FirebaseError
if (!firebaseConfig.apiKey) {
  console.error("Firebase Configuration Error: API Key is missing. The application may not function correctly.");
  // Provide a minimal dummy config if keys are missing to avoid immediate crash on initializeApp,
  // although subsequent auth operations will still require a valid key.
  if (!firebaseConfig.apiKey) firebaseConfig.apiKey = "MISSING_KEY";
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Required scopes for Gmail API
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');

export { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, collection, doc, setDoc, deleteDoc, getDocs, onSnapshot };
