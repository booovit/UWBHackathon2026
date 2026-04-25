import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "./constants";
import { db } from "./firebaseAdmin";
import { badRequest, requireAuth, requireOwnership } from "./errors";
import type { DocumentRecord } from "./types";

const VALID_TARGETS = new Set([
  "reader",
  "chat",
  "summary",
  "quiz",
  "flashcards",
  "steps",
]);

interface FeedbackRequest {
  docId?: string;
  targetType?: string;
  targetId?: string;
  signal?: string;
  value?: boolean | number | string;
}

export const saveFeedback = onCall<FeedbackRequest, Promise<{ ok: true }>>(
  { region: FUNCTIONS_REGION },
  async (request) => {
    const uid = request.auth?.uid;
    requireAuth(uid);

    const data = request.data ?? {};
    if (!data.docId || typeof data.docId !== "string") {
      badRequest("docId is required");
    }
    if (!data.targetType || !VALID_TARGETS.has(String(data.targetType))) {
      badRequest("Invalid targetType");
    }
    if (!data.signal || typeof data.signal !== "string") {
      badRequest("signal is required");
    }
    if (typeof data.targetId !== "string") {
      badRequest("targetId is required");
    }

    const docRef = db.collection("documents").doc(data.docId);
    const snap = await docRef.get();
    if (!snap.exists) badRequest("Document not found");
    const docData = snap.data() as DocumentRecord;
    requireOwnership(docData.uid, uid);

    await docRef.collection("feedback").add({
      uid,
      targetType: data.targetType,
      targetId: data.targetId,
      signal: data.signal,
      value: data.value ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    const profileRef = db
      .collection("users")
      .doc(uid)
      .collection("profile")
      .doc("main");

    const updates: Record<string, FirebaseFirestore.FieldValue | boolean> = {};
    switch (data.signal) {
      case "too_long":
        updates["feedbackSignals.prefersShorterAnswers"] =
          FieldValue.increment(1);
        break;
      case "use_this_style":
        if (data.targetType === "quiz") {
          updates["feedbackSignals.prefersQuizFirst"] = FieldValue.increment(1);
        }
        if (data.targetType === "steps") {
          updates["feedbackSignals.prefersStepByStep"] = FieldValue.increment(1);
        }
        break;
      case "easier_to_read":
        updates["feedbackSignals.highContrastUsedOften"] = true;
        break;
    }
    if (Object.keys(updates).length > 0) {
      updates["updatedAt"] = FieldValue.serverTimestamp();
      await profileRef.set(updates, { merge: true });
    }

    return { ok: true };
  },
);
