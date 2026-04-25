import "./initRuntime";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall } from "firebase-functions/v2/https";
import { db } from "./firebaseAdmin";
import { geminiApiKey } from "./geminiClient";
import { badRequest, requireAuth, requireOwnership } from "./errors";
import { FUNCTIONS_REGION } from "./constants";
import type { DocumentRecord } from "./types";

export const onDocumentUploaded = onObjectFinalized(
  {
    secrets: [geminiApiKey],
    timeoutSeconds: 540,
    memory: "1GiB",
    region: FUNCTIONS_REGION,
  },
  async (event) => {
    const path = event.data.name;
    if (!path) return;
    const match = path.match(/^users\/[^/]+\/documents\/([^/]+)\/original\//);
    if (!match) {
      console.log("Skipping non-document upload:", path);
      return;
    }
    const docId = match[1];
    const { processDocument } = await import("./documentProcessor");
    await processDocument(docId);
  },
);

export const retryDocumentProcessing = onCall<
  { docId?: string },
  Promise<{ ok: true }>
>({
  secrets: [geminiApiKey],
  timeoutSeconds: 540,
  memory: "1GiB",
  region: FUNCTIONS_REGION,
}, async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);

  const docId = request.data?.docId;
  if (!docId || typeof docId !== "string") badRequest("docId is required");

  const ref = db.collection("documents").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) badRequest("Document not found");
  const docData = snap.data() as DocumentRecord;
  requireOwnership(docData.uid, uid);

  const { processDocument } = await import("./documentProcessor");
  await processDocument(docId);
  return { ok: true };
});

export { chatWithDocument } from "./chat";
export { quickChat } from "./quickChat";
export { saveFeedback } from "./profileFeedback";
