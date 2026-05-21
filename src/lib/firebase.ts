/// <reference types="vite/client" />
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | any; // Type as 'any' if undefined to avoid breaking components immediately
let db: Firestore | any;

if (firebaseConfig.projectId && firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} else {
  console.error("Firebase configuration is missing! Please set VITE_FIREBASE_* environment variables.");
  // Provide mock objects so the app doesn't crash on import
  // and components that use them optionally degrade gracefully
  auth = {
    currentUser: null,
    onAuthStateChanged: (cb: any) => {
      // simulate no user logged in after a short delay
      setTimeout(() => cb(null), 100);
      return () => {}; // return mock unsubscribe
    }
  } as any;
  db = {
    doc: () => ({}),
  } as any;
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();

// Validation per skill requirements
async function testConnection() {
  if (!db || !db.doc) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const loginWithGoogle = async () => {
  try {
    if (!firebaseConfig.apiKey) {
      throw new Error('La configuration Firebase (variables d\'environnement) est manquante.');
    }
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    
    // Verify with our backend
    const response = await fetch('/api/auth/verify-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    if (!response.ok) throw new Error('Backend verification failed');
    return await response.json();
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};
