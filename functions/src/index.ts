import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { db } from "./firebaseAdmin";
import { processDocument } from "./documentProcessor";
import { geminiApiKey } from "./geminiClient";
import { badRequest, requireAuth, requireOwnership } from "./errors";
import type { DocumentRecord } from "./types";

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

export const onDocumentUploaded = onObjectFinalized(
  { secrets: [geminiApiKey], timeoutSeconds: 540, memory: "1GiB" },
  async (event) => {
    const path = event.data.name;
    if (!path) return;
    const match = path.match(/^users\/[^/]+\/documents\/([^/]+)\/original\//);
    if (!match) {
      console.log("Skipping non-document upload:", path);
      return;
    }
    const docId = match[1];
    await processDocument(docId);
  },
);

export const retryDocumentProcessing = onCall<
  { docId?: string },
  Promise<{ ok: true }>
>({ secrets: [geminiApiKey], timeoutSeconds: 540, memory: "1GiB" }, async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);

  const docId = request.data?.docId;
  if (!docId || typeof docId !== "string") badRequest("docId is required");

  const ref = db.collection("documents").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) badRequest("Document not found");
  const docData = snap.data() as DocumentRecord;
  requireOwnership(docData.uid, uid);

  await processDocument(docId);
  return { ok: true };
});

export { chatWithDocument } from "./chat";
export { saveFeedback } from "./profileFeedback";
