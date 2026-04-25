import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";

const AUTH_FALLBACK_MS = 4000;

export interface AuthContextValue {
  user: User | null;
  isGuest: boolean;
  /** True when not using real Firebase (no config) or using synthetic preview user. */
  isDemoUser: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const ensuringAnon = useRef(false);

  useEffect(() => {
    if (!firebaseConfigured) {
      setUser(makeDemoGuest());
      setLoading(false);
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setUser((prev) => prev ?? makeDemoGuest());
      setLoading(false);
      ensuringAnon.current = false;
    }, AUTH_FALLBACK_MS);

    const unsubscribe = onAuthStateChanged(auth, async (next) => {
      if (next) {
        window.clearTimeout(fallbackTimer);
        setUser(next);
        setLoading(false);
        ensuringAnon.current = false;
        return;
      }
      if (ensuringAnon.current) {
        return;
      }
      ensuringAnon.current = true;
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Anonymous sign-in failed", err);
        window.clearTimeout(fallbackTimer);
        setUser(makeDemoGuest());
        setLoading(false);
        ensuringAnon.current = false;
      }
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest: user?.isAnonymous ?? false,
      isDemoUser: !firebaseConfigured || user?.uid === "demo-guest",
      loading,
      async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        if (auth.currentUser?.isAnonymous) {
          try {
            await linkWithPopup(auth.currentUser, provider);
            return;
          } catch (err) {
            if (isCredentialInUse(err)) {
              await signInWithPopup(auth, provider);
              return;
            }
            throw err;
          }
        }
        await signInWithPopup(auth, provider);
      },
      async signInWithEmail(email, password) {
        if (auth.currentUser?.isAnonymous) {
          const cred = EmailAuthProvider.credential(email, password);
          try {
            await linkWithCredential(auth.currentUser, cred);
            return;
          } catch (err) {
            if (isCredentialInUse(err)) {
              await signInWithEmailAndPassword(auth, email, password);
              return;
            }
            throw err;
          }
        }
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signUpWithEmail(email, password) {
        if (auth.currentUser?.isAnonymous) {
          const cred = EmailAuthProvider.credential(email, password);
          await linkWithCredential(auth.currentUser, cred);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      },
      async signOutUser() {
        await signOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

function isCredentialInUse(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: string }).code;
  return (
    code === "auth/credential-already-in-use" ||
    code === "auth/email-already-in-use"
  );
}

function makeDemoGuest(): User {
  return {
    uid: "demo-guest",
    isAnonymous: true,
    email: null,
    displayName: null,
  } as unknown as User;
}
