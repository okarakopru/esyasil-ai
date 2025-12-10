// firebase.ts — Production Auth + Firestore + Storage configuration

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { useEffect, useState } from "react";
import { UserProfile } from "./types";

// --- Firebase Config (Your real credentials) ---
const firebaseConfig = {
  apiKey: "AIzaSyAi1BWPwEfEBfFnO9baZAq_ANKCdq-Z8c",
  authDomain: "esyasil-ai.firebaseapp.com",
  projectId: "esyasil-ai",
  storageBucket: "esyasil-ai.firebasestorage.app",
  messagingSenderId: "761816468792",
  appId: "1:761816468792:web:17e18dc0844defb7bc85cd",
  measurementId: "G-J3728K1BSC"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- Real Authentication Hook ---
export const useFirebaseAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      // Create Firestore user if first login
      if (!userSnap.exists()) {
        const newUser: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          credits: 5,                // ⭐ Every new user gets 5 credits
          subscriptionStatus: "none" // not subscribed by default
        };

        await setDoc(userRef, newUser);
        setUser(newUser);
      } 
      else {
        setUser(userSnap.data() as UserProfile);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Google Login ---
  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  // --- Logout ---
  const onLogout = async () => {
    await signOut(auth);
  };

  return { user, loading, login, onLogout };
};
