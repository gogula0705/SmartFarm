import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

/**
 * Register a new user with Firebase Authentication and create their user profile document in Firestore.
 * Passwords are handled exclusively by Firebase Auth and are NEVER stored in Firestore.
 *
 * @param {Object} params
 * @param {string} params.fullName
 * @param {string} params.email
 * @param {string} params.phone
 * @param {string} params.location
 * @param {string} params.password
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function registerUser({ fullName, email, phone, location, password }) {
  if (!auth || !db) {
    throw new Error('Firebase services are not initialized. Check your credentials in .env.');
  }

  // 1. Create user in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;

  // 2. Set Firebase Auth displayName
  if (fullName && fullName.trim()) {
    try {
      await updateProfile(user, { displayName: fullName.trim() });
    } catch (profileError) {
      console.warn('Could not update displayName in Firebase Auth:', profileError);
    }
  }

  // 3. Create user profile in Cloud Firestore at users/{uid}
  // Password is intentionally omitted to safeguard user security
  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, {
    uid: user.uid,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    location: location ? location.trim() : '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

/**
 * Log in an existing user with Email and Password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function loginUser(email, password) {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Check your credentials in .env.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return userCredential.user;
}

/**
 * Sign out the currently authenticated user.
 *
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  if (!auth) return;
  await signOut(auth);
}

/**
 * Send a password reset email to the specified address.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Check your credentials in .env.');
  }

  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Retrieve the user profile document from Firestore at users/{uid}.
 *
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
  if (!db || !uid) return null;

  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error fetching user profile from Firestore:', error);
  }

  return null;
}

/**
 * Convert Firebase error codes to user-friendly messages.
 *
 * @param {string} errorCode
 * @returns {string}
 */
export function formatAuthError(errorCode) {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please log in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to many failed attempts. Reset your password or try again later.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    default:
      return 'An unexpected authentication error occurred. Please try again.';
  }
}

/**
 * Format a phone number into readable Indian format (+91 XXXXX XXXXX).
 *
 * @param {string} phone
 * @returns {string}
 */
export function formatIndianPhone(phone) {
  if (!phone) return 'Not specified';
  const clean = String(phone).replace(/\D/g, '');
  const tenDigit = clean.length === 12 && clean.startsWith('91') ? clean.slice(2) : clean;
  if (tenDigit.length === 10) {
    return `+91 ${tenDigit.slice(0, 5)} ${tenDigit.slice(5)}`;
  }
  return phone;
}

/**
 * Update an existing user profile in Firestore at users/{uid}.
 * Does NOT modify internal technical fields (uid, email, createdAt).
 *
 * @param {string} uid
 * @param {Object} data
 * @param {string} data.fullName
 * @param {string} data.phone
 * @param {string} data.location
 * @returns {Promise<Object>}
 */
export async function updateUserProfile(uid, { fullName, phone, location }) {
  if (!db) {
    throw new Error('Database service is not initialized.');
  }
  if (!uid) {
    throw new Error('User identifier is required to update profile.');
  }

  // 1. Full name validation
  const trimmedName = fullName ? fullName.trim() : '';
  if (!trimmedName) {
    throw new Error('Full Name is required.');
  }
  if (trimmedName.length < 2) {
    throw new Error('Full Name must be at least 2 characters long.');
  }
  if (trimmedName.length > 100) {
    throw new Error('Full Name cannot exceed 100 characters.');
  }

  // 2. Indian Mobile Number validation (10 digits starting with 6, 7, 8, 9)
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
  const tenDigitPhone =
    cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!tenDigitPhone || !indianMobileRegex.test(tenDigitPhone)) {
    throw new Error(
      'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).'
    );
  }

  // 3. Location validation (required, City, District, State)
  const trimmedLocation = location ? location.trim() : '';
  if (!trimmedLocation) {
    throw new Error('Location is required. Please specify your City, District, State.');
  }
  if (trimmedLocation.length < 3) {
    throw new Error('Location must be at least 3 characters long.');
  }
  if (trimmedLocation.length > 150) {
    throw new Error('Location cannot exceed 150 characters.');
  }

  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) {
    throw new Error('User profile document not found.');
  }

  const updates = {
    fullName: trimmedName,
    phone: tenDigitPhone,
    location: trimmedLocation,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userDocRef, updates);

  // Synchronize Firebase Auth displayName
  if (auth?.currentUser && auth.currentUser.uid === uid) {
    try {
      await updateProfile(auth.currentUser, { displayName: trimmedName });
    } catch (profileError) {
      console.warn('Could not update displayName in Firebase Auth:', profileError);
    }
  }

  return {
    ...userDocSnap.data(),
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Change the current authenticated user's password using Firebase Authentication.
 * Passwords are NEVER written to Cloud Firestore.
 *
 * @param {string} newPassword
 * @returns {Promise<boolean>}
 */
export async function changeUserPassword(newPassword) {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to update your password.');
  }

  if (!newPassword || typeof newPassword !== 'string') {
    throw new Error('New password is required.');
  }

  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  try {
    await updatePassword(currentUser, newPassword);
    return true;
  } catch (error) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error(
        'For security reasons, changing your password requires recent authentication. Please sign out, log back in, and try again.'
      );
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('The password is too weak. Please use a stronger combination of characters.');
    }
    throw new Error(formatAuthError(error.code) || error.message || 'Failed to update password.');
  }
}
