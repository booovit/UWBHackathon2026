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
  loadPreviewQuizzes,
  randomId,
  savePreviewQuizzes,
} from "@/lib/previewLibrary";
import type { SavedQuiz } from "@/types/library";

export function useSavedQuizzes() {
  const { user, isDemoUser } = useAuth();
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const uid = user?.uid;

  const refreshPreview = useCallback(() => {
    if (!uid) {
      setQuizzes([]);
      return;
    }
    setQuizzes(loadPreviewQuizzes(uid));
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setQuizzes([]);
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
      collection(db, "users", uid, "quizzes"),
      orderBy("updatedAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setQuizzes(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<SavedQuiz, "id">) }),
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

  async function createQuiz(
    title: string,
    content: string,
    sourceDocId?: string | null,
  ) {
    if (!uid || !title.trim() || !content.trim()) return;
    if (!firebaseConfigured || isDemoUser) {
      const list = loadPreviewQuizzes(uid);
      const q: SavedQuiz = {
        id: randomId("quiz"),
        title: title.trim(),
        content: content.trim(),
        sourceDocId: sourceDocId ?? null,
      };
      list.push(q);
      savePreviewQuizzes(uid, list);
      refreshPreview();
      return;
    }
    await addDoc(collection(db, "users", uid, "quizzes"), {
      title: title.trim(),
      content: content.trim(),
      sourceDocId: sourceDocId ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function removeQuiz(id: string) {
    if (!uid) return;
    if (!firebaseConfigured || isDemoUser) {
      savePreviewQuizzes(
        uid,
        loadPreviewQuizzes(uid).filter((q) => q.id !== id),
      );
      refreshPreview();
      return;
    }
    await deleteDoc(doc(db, "users", uid, "quizzes", id));
  }

  return { quizzes, loading, error, createQuiz, removeQuiz };
}
