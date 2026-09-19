import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthContext } from './authContextDef';
import {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  getUserProfile,
} from '../services/authService';

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(auth?.currentUser || null);
  const [userProfile, setUserProfile] = useState(null);
  // Only enter loading state if Firebase Auth is initialized and awaiting first emission
  const [loading, setLoading] = useState(Boolean(auth));

  // Sync user profile from Firestore
  const fetchProfile = async (uid) => {
    if (!uid) {
      setUserProfile(null);
      return null;
    }
    const profile = await getUserProfile(uid);
    setUserProfile(profile);
    return profile;
  };

  useEffect(() => {
    if (!auth) {
      return;
    }

    // Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    isAuthenticated: Boolean(user),
    register: registerUser,
    login: loginUser,
    logout: logoutUser,
    resetPassword,
    refreshProfile: () => (user ? fetchProfile(user.uid) : Promise.resolve(null)),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContextProvider;
