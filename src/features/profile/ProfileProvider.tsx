import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db, firebaseConfigured } from "@/lib/firebase";
import { defaultProfile, type UserProfile } from "@/types/profile";
import { useAuth } from "@/features/auth/AuthProvider";

interface ProfileContextValue {
  profile: UserProfile;
  loading: boolean;
  saveProfile: (next: Partial<UserProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined,
);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isDemoUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);

  // Synthetic preview user (auth fallback) is not signed into Firestore; keep profile in memory only.
  const useLocalProfileOnly = !firebaseConfigured || isDemoUser;

  useEffect(() => {
    if (!user || useLocalProfileOnly) {
      setProfile(defaultProfile);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, "users", user.uid, "profile", "main");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile({ ...defaultProfile, ...(snap.data() as UserProfile) });
        } else {
          setProfile(defaultProfile);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user, useLocalProfileOnly]);

  const saveProfile = useCallback(
    async (next: Partial<UserProfile>) => {
      if (!user) throw new Error("Not signed in");
      const mergedLocal: UserProfile = {
        ...defaultProfile,
        ...profile,
        ...next,
        supports: { ...profile.supports, ...(next.supports ?? {}) },
        uiPreferences: {
          ...profile.uiPreferences,
          ...(next.uiPreferences ?? {}),
        },
        studyPreferences: {
          ...profile.studyPreferences,
          ...(next.studyPreferences ?? {}),
        },
        feedbackSignals: {
          ...profile.feedbackSignals,
          ...(next.feedbackSignals ?? {}),
        },
      };
      if (useLocalProfileOnly) {
        setProfile(mergedLocal);
        return;
      }
      await setDoc(
        doc(db, "users", user.uid, "profile", "main"),
        { ...mergedLocal, updatedAt: serverTimestamp() },
        { merge: true },
      );
    },
    [user, profile, useLocalProfileOnly],
  );

  const value = useMemo(
    () => ({ profile, loading, saveProfile }),
    [profile, loading, saveProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx)
    throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
