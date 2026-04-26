import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db, firebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  loadPreviewStepPlans,
  randomId,
  savePreviewStepPlans,
} from "@/lib/previewLibrary";
import type { SavedStepPlan } from "@/types/library";
import type { StructuredStep } from "@/types/studyArtifacts";

export function useSavedStepPlans() {
  const { user, isDemoUser } = useAuth();
  const [plans, setPlans] = useState<SavedStepPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const uid = user?.uid;

  const refreshPreview = useCallback(() => {
    if (!uid) {
      setPlans([]);
      return;
    }
    setPlans(loadPreviewStepPlans(uid));
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setPlans([]);
      setLoading(false);
      return;
    }
    if (!firebaseConfigured || isDemoUser) {
      refreshPreview();
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, "users", uid, "savedStepPlans"),
      orderBy("updatedAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setPlans(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<SavedStepPlan, "id">) }),
          ),
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      },
    );
  }, [uid, isDemoUser, refreshPreview]);

  async function createStepPlan(
    title: string,
    steps: StructuredStep[],
    content: string,
    sourceDocId?: string | null,
  ) {
    if (!uid || !title.trim() || steps.length === 0) return;
    const storedContent =
      content.trim() ||
      "Step-by-step plan saved from study chat.";
    if (!firebaseConfigured || isDemoUser) {
      const list = loadPreviewStepPlans(uid);
      const plan: SavedStepPlan = {
        id: randomId("steps"),
        title: title.trim(),
        content: storedContent,
        steps,
        sourceDocId: sourceDocId ?? null,
      };
      list.push(plan);
      savePreviewStepPlans(uid, list);
      refreshPreview();
      return;
    }
    await addDoc(collection(db, "users", uid, "savedStepPlans"), {
      title: title.trim(),
      content: storedContent,
      steps,
      sourceDocId: sourceDocId ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function removePlan(id: string) {
    if (!uid) return;
    if (!firebaseConfigured || isDemoUser) {
      savePreviewStepPlans(
        uid,
        loadPreviewStepPlans(uid).filter((p) => p.id !== id),
      );
      refreshPreview();
      return;
    }
    await deleteDoc(doc(db, "users", uid, "savedStepPlans", id));
  }

  return { plans, loading, error, createStepPlan, removePlan };
}
