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
  loadPreviewDecks,
  randomId,
  savePreviewDecks,
} from "@/lib/previewLibrary";
import type { FlashcardCard, FlashcardDeck } from "@/types/library";

export function useFlashcardDecks() {
  const { user, isDemoUser } = useAuth();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const uid = user?.uid;

  const refreshPreview = useCallback(() => {
    if (!uid) {
      setDecks([]);
      return;
    }
    setDecks(loadPreviewDecks(uid));
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setDecks([]);
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
      collection(db, "users", uid, "flashcardDecks"),
      orderBy("updatedAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setDecks(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<FlashcardDeck, "id">) }),
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

  async function createDeck(
    title: string,
    cards: FlashcardCard[],
    sourceDocId?: string | null,
  ) {
    if (!uid || !title.trim() || cards.length === 0) return;
    if (!firebaseConfigured || isDemoUser) {
      const list = loadPreviewDecks(uid);
      const deck: FlashcardDeck = {
        id: randomId("deck"),
        title: title.trim(),
        cards,
        sourceDocId: sourceDocId ?? null,
      };
      list.push(deck);
      savePreviewDecks(uid, list);
      refreshPreview();
      return;
    }
    await addDoc(collection(db, "users", uid, "flashcardDecks"), {
      title: title.trim(),
      cards,
      sourceDocId: sourceDocId ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function removeDeck(id: string) {
    if (!uid) return;
    if (!firebaseConfigured || isDemoUser) {
      savePreviewDecks(
        uid,
        loadPreviewDecks(uid).filter((d) => d.id !== id),
      );
      refreshPreview();
      return;
    }
    await deleteDoc(doc(db, "users", uid, "flashcardDecks", id));
  }

  return { decks, loading, error, createDeck, removeDeck };
}
