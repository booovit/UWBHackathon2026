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
    setFolders(loadPreviewFolders(uid));
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
    const q = query(
      collection(db, "users", uid, "folders"),
      orderBy("updatedAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setFolders(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<StudyFolder, "id">) }),
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

  async function createFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed || !uid) return;
    if (!firebaseConfigured || isDemoUser) {
      const list = loadPreviewFolders(uid);
      const f: StudyFolder = {
        id: randomId("folder"),
        name: trimmed,
        documentIds: [],
      };
      list.push(f);
      savePreviewFolders(uid, list);
      refreshPreview();
      return;
    }
    await addDoc(collection(db, "users", uid, "folders"), {
      name: trimmed,
      documentIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function setDocumentIds(folderId: string, documentIds: string[]) {
    if (!uid) return;
    if (!firebaseConfigured || isDemoUser) {
      const list = loadPreviewFolders(uid).map((f) =>
        f.id === folderId ? { ...f, documentIds } : f,
      );
      savePreviewFolders(uid, list);
      refreshPreview();
      return;
    }
    await updateDoc(doc(db, "users", uid, "folders", folderId), {
      documentIds,
      updatedAt: serverTimestamp(),
    });
  }

  async function addDocumentToFolder(folderId: string, documentId: string) {
    const f = folders.find((x) => x.id === folderId);
    if (!f) return;
    if (f.documentIds.includes(documentId)) return;
    await setDocumentIds(folderId, [...f.documentIds, documentId]);
  }

  async function removeDocumentFromFolder(
    folderId: string,
    documentId: string,
  ) {
    const f = folders.find((x) => x.id === folderId);
    if (!f) return;
    await setDocumentIds(
      folderId,
      f.documentIds.filter((id) => id !== documentId),
    );
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
    removeFolder,
  };
}
