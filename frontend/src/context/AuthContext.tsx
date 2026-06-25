import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { signInWithGoogle, logoutFromGoogle } from '../services/firebaseAuth';
import { googleLoginSync } from '../api';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

interface AuthContextType {
  user: User | null;
  currentUser: any;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User, sessionProvider?: string) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  currentUser: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('paysphere_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Ref to prevent onAuthStateChanged from interfering with loginWithGoogle
  const isLoggingInRef = useRef(false);
  // Ref to track if an explicit logout was triggered by the user
  const isLoggingOutRef = useRef(false);

  // ────────────────────────────────────────────────────────────────────────
  // CORE PRINCIPLE: onAuthStateChanged should NEVER clear a valid session.
  // Only the explicit logout() function may clear user state.
  //
  // Firebase is the *identity provider* — it handles Google Sign-In.
  // The PaySphere JWT (stored in localStorage) is the *session token*.
  // If Firebase auth goes null transiently (StrictMode remount, token
  // rotation, tab backgrounding, etc.), the PaySphere session stays valid.
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log("[AuthContext] Subscribing to onAuthStateChanged");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[AuthContext] onAuthStateChanged", {
        hasFirebaseUser: !!firebaseUser,
        isLoggingIn: isLoggingInRef.current,
        isLoggingOut: isLoggingOutRef.current,
      });

      // ── Guard: loginWithGoogle() in progress ──────────────────────────
      // loginWithGoogle() handles its own sync and state setting.
      if (isLoggingInRef.current) {
        console.log("[AuthContext] Skipping — loginWithGoogle in progress");
        if (firebaseUser) setCurrentUser(firebaseUser);
        setLoading(false);
        return;
      }

      // ── Case A: Firebase has a signed-in user ─────────────────────────
      if (firebaseUser) {
        console.log("[AuthContext] Firebase user present:", firebaseUser.email);
        setCurrentUser(firebaseUser);

        // Check localStorage for an existing PaySphere session
        const stored = localStorage.getItem('paysphere_user');
        let parsedStored: User | null = null;
        if (stored) {
          try { parsedStored = JSON.parse(stored); } catch { /* ignore */ }
        }

        if (parsedStored && parsedStored.email === firebaseUser.email) {
          // Session already in sync — just restore React state from storage
          console.log("[AuthContext] Stored session matches Firebase user — keeping");
          setUser(parsedStored);
        } else if (parsedStored && parsedStored.email !== firebaseUser.email) {
          // Different user in Firebase vs localStorage — re-sync with backend
          console.log("[AuthContext] Email mismatch — re-syncing with backend");
          try {
            const idToken = await firebaseUser.getIdToken();
            const syncedUser = await googleLoginSync(idToken) as User;
            const userWithProvider = { ...syncedUser, provider: 'GOOGLE' };
            // Double-check localStorage hasn't been set by loginWithGoogle() during the await
            const freshStored = localStorage.getItem('paysphere_user');
            if (freshStored) {
              try {
                const freshParsed = JSON.parse(freshStored);
                // If loginWithGoogle already wrote the correct user, use that
                if (freshParsed.email === firebaseUser.email) {
                  setUser(freshParsed);
                } else {
                  setUser(userWithProvider);
                  localStorage.setItem('paysphere_user', JSON.stringify(userWithProvider));
                }
              } catch {
                setUser(userWithProvider);
                localStorage.setItem('paysphere_user', JSON.stringify(userWithProvider));
              }
            } else {
              setUser(userWithProvider);
              localStorage.setItem('paysphere_user', JSON.stringify(userWithProvider));
            }
          } catch (err) {
            console.error("[AuthContext] Backend sync error (keeping existing session):", err);
            // CRITICAL: Do NOT clear the user. Keep the existing session.
            // The stored PaySphere JWT is still valid even if this sync failed.
            setUser(parsedStored);
          }
        } else {
          // No stored session but Firebase user exists — first-time sync
          console.log("[AuthContext] No stored session — syncing with backend");
          try {
            const idToken = await firebaseUser.getIdToken();
            const syncedUser = await googleLoginSync(idToken) as User;
            const userWithProvider = { ...syncedUser, provider: 'GOOGLE' };
            setUser(userWithProvider);
            localStorage.setItem('paysphere_user', JSON.stringify(userWithProvider));
          } catch (err) {
            console.error("[AuthContext] Initial sync error:", err);
            // No existing session to preserve — user stays null (will see login page)
          }
        }

      // ── Case B: Firebase auth is null ─────────────────────────────────
      } else {
        console.log("[AuthContext] Firebase auth null");
        setCurrentUser(null);

        if (isLoggingOutRef.current) {
          // Explicit logout — clear everything
          console.log("[AuthContext] Explicit logout — clearing session");
          setUser(null);
          localStorage.removeItem('paysphere_user');
          isLoggingOutRef.current = false;
        } else {
          // Firebase auth went null WITHOUT an explicit logout.
          // This can happen due to:
          //   - React StrictMode double-mounting effects
          //   - Firebase SDK re-initialization
          //   - Tab backgrounding / network issues
          //   - Token rotation
          //
          // DO NOT clear the PaySphere session.
          // The user's PaySphere JWT is still valid.
          // Only explicit logout() should end the session.
          const stored = localStorage.getItem('paysphere_user');
          if (stored) {
            console.log("[AuthContext] Firebase null but PaySphere session exists — KEEPING SESSION (safe)");
            try {
              const parsedStored = JSON.parse(stored);
              setUser(parsedStored);
            } catch {
              // Corrupt localStorage — but still don't redirect
              console.error("[AuthContext] Corrupt localStorage — keeping current state");
            }
          }
          // If no stored session and no Firebase user, user stays null (login page)
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = (u: User, sessionProvider?: string) => {
    console.log("[AuthContext] LOGIN SUCCESS");
    const userWithProvider = {
      ...u,
      provider: sessionProvider || 'LOCAL'
    };
    setUser(userWithProvider);
    localStorage.setItem('paysphere_user', JSON.stringify(userWithProvider));
    console.log("[AuthContext] Session stored in localStorage");
  };

  const loginWithGoogle = async () => {
    // Set flag BEFORE signInWithGoogle to prevent onAuthStateChanged interference
    isLoggingInRef.current = true;
    try {
      const { idToken } = await signInWithGoogle();
      console.log("[AuthContext] Firebase sign-in complete");
      const syncedUser = await googleLoginSync(idToken) as User;
      console.log("[AuthContext] Backend sync complete");
      login(syncedUser, 'GOOGLE');
      // Also set currentUser from Firebase
      setCurrentUser(auth.currentUser);
    } catch (error) {
      console.error('[AuthContext] Google Sign-In error:', error);
      throw error;
    } finally {
      // Delay clearing the flag to ensure any pending onAuthStateChanged
      // callbacks from the sign-in flow are also skipped
      setTimeout(() => {
        isLoggingInRef.current = false;
        console.log("[AuthContext] Login guard released");
      }, 1000);
    }
  };

  const logout = async () => {
    console.log("[AuthContext] LOGOUT initiated");
    // Set flag to tell onAuthStateChanged this is an intentional logout
    isLoggingOutRef.current = true;
    try {
      await logoutFromGoogle();
    } catch (e) {
      console.warn('[AuthContext] Firebase logout issue (non-fatal):', e);
    }
    // Always clear regardless of Firebase signOut result
    setUser(null);
    setCurrentUser(null);
    localStorage.removeItem('paysphere_user');
    console.log("[AuthContext] Session cleared");
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentUser,
      isAuthenticated: !!user,
      loading,
      login,
      loginWithGoogle,
      logout,
      isAdmin: user?.role === 'ADMIN'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
