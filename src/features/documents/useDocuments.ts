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
        // #region agent log
        fetch("http://127.0.0.1:7292/ingest/6a122457-2648-49ba-95d5-2a44979c6666", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "19cd69",
          },
          body: JSON.stringify({
            sessionId: "19cd69",
            location: "useDocuments.ts:onSnapshot:ok",
            message: "documents snapshot",
            data: { count: snap.docs.length, uid: user.uid?.slice(0, 8) },
            timestamp: Date.now(),
            hypothesisId: "H3",
          }),
        }).catch(() => {});
        // #endregion
        setDocuments(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<StudyDocument, "id">) }),
          ),
        );
        setLoading(false);
      },
      (err) => {
        // #region agent log
        fetch("http://127.0.0.1:7292/ingest/6a122457-2648-49ba-95d5-2a44979c6666", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "19cd69",
          },
          body: JSON.stringify({
            sessionId: "19cd69",
            location: "useDocuments.ts:onSnapshot:err",
            message: "documents listener error",
            data: { code: (err as { code?: string }).code, message: String(err).slice(0, 160) },
            timestamp: Date.now(),
            hypothesisId: "H3",
          }),
        }).catch(() => {});
        // #endregion
        setLoading(false);
      },
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
