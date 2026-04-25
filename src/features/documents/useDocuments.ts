import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db, firebaseConfigured } from "@/lib/firebase";
import type { StudyDocument } from "@/types/document";
import { useAuth } from "@/features/auth/AuthProvider";

export function useDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !firebaseConfigured) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "documents"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocuments(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<StudyDocument, "id">) }),
          ),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user]);

  return { documents, loading };
}

export function useDocument(docId: string | undefined) {
  const [document, setDocument] = useState<StudyDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId || !firebaseConfigured) {
      setDocument(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, "documents", docId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setDocument(
          snap.exists()
            ? ({ id: snap.id, ...(snap.data() as Omit<StudyDocument, "id">) })
            : null,
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [docId]);

  return { document, loading };
}
