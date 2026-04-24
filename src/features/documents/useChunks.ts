import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DocumentChunk } from "@/types/document";

export function useChunks(docId: string | undefined) {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) {
      setChunks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "documents", docId, "chunks"),
      orderBy("orderIndex", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChunks(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<DocumentChunk, "id">) }),
          ),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [docId]);

  return { chunks, loading };
}
