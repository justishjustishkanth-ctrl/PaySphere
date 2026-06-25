import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/firebaseConfig';

export const signInWithGoogle = async () => {
  try {
    // Enforce persistence is local so it survives page reloads
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    // Get the JWT ID Token from Google Authentication
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      idToken
    };
  } catch (error: any) {
    console.error('Firebase sign-in error:', error);
    // Customize error messaging for popups blocked or cancelled
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please enable popups for this site.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in popup was closed before completing authentication.');
    } else {
      throw new Error(error.message || 'Google sign-in failed.');
    }
  }
};

export const logoutFromGoogle = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase sign-out error:', error);
    throw error;
  }
};
