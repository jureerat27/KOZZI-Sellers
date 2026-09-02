import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  NextOrObserver,
  Unsubscribe,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

/**
 * Authentication Service
 * Manages Login, Logout, and User Auth state subscription using Firebase Auth configuration
 * derived from firebase-applet-config.json.
 */

export interface AuthUserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

/**
 * Helper to convert Firebase User to a clean serializable object
 */
export function formatUserInfo(user: User | null): AuthUserInfo | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

/**
 * Get current logged in Firebase user (or null)
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Sign in using Google Provider via Popup (Recommended for web preview environment)
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error signing in with Email:', error);
    throw error;
  }
}

/**
 * Register / Sign up with Email and Password
 */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error creating user with Email:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Subscribe to Authentication State Changes (onAuthStateChanged)
 * @param callback Callback function receiving the current User or null
 * @returns Unsubscribe function to clean up the listener
 */
export function subscribeAuthState(
  callback: (user: User | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onAuthStateChanged(
    auth,
    (user) => {
      callback(user);
    },
    (error) => {
      console.error('Auth state change error:', error);
      if (onError) onError(error);
    }
  );
}

export { auth, firebaseConfig };
export type { User };
