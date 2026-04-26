import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, firebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  loadPreviewFolders,
  randomId,
  savePreviewFolders,
} from "@/lib/previewLibrary";
import type { StudyFolder } from "@/types/library";

function normalizeStudyFolder(
  id: string,
  raw: Record<string, unknown>,
): StudyFolder {
  const strList = (v: unknown) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string")
      : [];
  return {
    id,
    name:
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : "Folder",
    documentIds: strList(raw.documentIds),
    deckIds: strList(raw.deckIds),
    quizIds: strList(raw.quizIds),
    stepPlanIds: strList(raw.stepPlanIds),
    createdAt: raw.createdAt as Timestamp | undefined,
    updatedAt: raw.updatedAt as Timestamp | undefined,
  };
}

function sortFoldersDesc(rows: StudyFolder[]) {
  return [...rows].sort((a, b) => {
    const tb = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
    const ta = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export function useStudyFolders() {
  const { user, isDemoUser } = useAuth();
  const [folders, setFolders] = useState<StudyFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid;

  const refreshPreview = useCallback(() => {
    if (!uid) {
      setFolders([]);
      return;
    }
    setFolders(sortFoldersDesc(loadPreviewFolders(uid).map((f) => normalizeStudyFolder(f.id, f as unknown as Record<string, unknown>))));
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setFolders([]);
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
    const q = query(collection(db, "users", uid, "folders"));
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) =>
          normalizeStudyFolder(d.id, d.data() as Record<string, unknown>),
        );
        setFolders(sortFoldersDesc(rows));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      },
    );
  }, [uid, isDemoUser, refreshPreview]);

  async function readFolderFromStore(folderId: string): Promise<StudyFolder | null> {
    if (!uid) return null;
    if (!firebaseConfigured || isDemoUser) {
      const f = loadPreviewFolders(uid).find((x) => x.id === folderId);
      return f
        ? normalizeStudyFolder(f.id, f as unknown as Record<string, unknown>)
        : null;
    }
    const snap = await getDoc(doc(db, "users", uid, "folders", folderId));
    if (!snap.exists()) return null;
    return normalizeStudyFolder(snap.id, snap.data() as Record<string, unknown>);
  }

  async function persistFolderMerge(
    folderId: string,
    mutate: (prev: StudyFolder) => StudyFolder,
  ) {
    if (!uid) return;
    const prev = await readFolderFromStore(folderId);
    if (!prev) return;
    const next = mutate(prev);
    if (!firebaseConfigured || isDemoUser) {
      const list = loadPreviewFolders(uid).map((f) =>
        f.id === folderId ? next : f,
      );
      savePreviewFolders(uid, list);
      refreshPreview();
      return;
    }
    await updateDoc(doc(db, "users", uid, "folders", folderId), {
      name: next.name,
      documentIds: next.documentIds,
      deckIds: next.deckIds,
      quizIds: next.quizIds,
      stepPlanIds: next.stepPlanIds,
      updatedAt: serverTimestamp(),
    });
  }

  async function createFolder(name: string): Promise<string | undefined> {
    const trimmed = name.trim();
    if (!trimmed || !uid) return undefined;
    if (!firebaseConfigured || isDemoUser) {
      const list = loadPreviewFolders(uid);
      const id = randomId("folder");
      const f: StudyFolder = {
        id,
        name: trimmed,
        documentIds: [],
        deckIds: [],
        quizIds: [],
        stepPlanIds: [],
      };
      list.push(f);
      savePreviewFolders(uid, list);
      refreshPreview();
      return id;
    }
    const ref = await addDoc(collection(db, "users", uid, "folders"), {
      name: trimmed,
      documentIds: [],
      deckIds: [],
      quizIds: [],
      stepPlanIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async function addDocumentToFolder(folderId: string, documentId: string) {
    await persistFolderMerge(folderId, (prev) => {
      if (prev.documentIds.includes(documentId)) return prev;
      return { ...prev, documentIds: [...prev.documentIds, documentId] };
    });
  }

  async function removeDocumentFromFolder(
    folderId: string,
    documentId: string,
  ) {
    await persistFolderMerge(folderId, (prev) => ({
      ...prev,
      documentIds: prev.documentIds.filter((id) => id !== documentId),
    }));
  }

  async function addDeckToFolder(folderId: string, deckId: string) {
    await persistFolderMerge(folderId, (prev) => {
      if (prev.deckIds.includes(deckId)) return prev;
      return { ...prev, deckIds: [...prev.deckIds, deckId] };
    });
  }

  async function removeDeckFromFolder(folderId: string, deckId: string) {
    await persistFolderMerge(folderId, (prev) => ({
      ...prev,
      deckIds: prev.deckIds.filter((id) => id !== deckId),
    }));
  }

  async function addQuizToFolder(folderId: string, quizId: string) {
    await persistFolderMerge(folderId, (prev) => {
      if (prev.quizIds.includes(quizId)) return prev;
      return { ...prev, quizIds: [...prev.quizIds, quizId] };
    });
  }

  async function removeQuizFromFolder(folderId: string, quizId: string) {
    await persistFolderMerge(folderId, (prev) => ({
      ...prev,
      quizIds: prev.quizIds.filter((id) => id !== quizId),
    }));
  }

  async function addStepPlanToFolder(folderId: string, planId: string) {
    await persistFolderMerge(folderId, (prev) => {
      if (prev.stepPlanIds.includes(planId)) return prev;
      return { ...prev, stepPlanIds: [...prev.stepPlanIds, planId] };
    });
  }

  async function removeStepPlanFromFolder(folderId: string, planId: string) {
    await persistFolderMerge(folderId, (prev) => ({
      ...prev,
      stepPlanIds: prev.stepPlanIds.filter((id) => id !== planId),
    }));
  }

  async function removeFolder(folderId: string) {
    if (!uid) return;
    if (!firebaseConfigured || isDemoUser) {
      savePreviewFolders(
        uid,
        loadPreviewFolders(uid).filter((f) => f.id !== folderId),
      );
      refreshPreview();
      return;
    }
    await deleteDoc(doc(db, "users", uid, "folders", folderId));
  }

  return {
    folders,
    loading,
    error,
    createFolder,
    addDocumentToFolder,
    removeDocumentFromFolder,
    addDeckToFolder,
    removeDeckFromFolder,
    addQuizToFolder,
    removeQuizFromFolder,
    addStepPlanToFolder,
    removeStepPlanFromFolder,
    removeFolder,
  };
}
