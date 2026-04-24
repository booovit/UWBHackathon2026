import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebaseAdmin";
import { embedQuery } from "./embeddings";
import { GENERATION_MODEL, geminiApiKey, getGenAi } from "./geminiClient";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { retrieveChunks } from "./retrieval";
import { badRequest, requireAuth, requireOwnership } from "./errors";
import type { DocumentRecord, StudyMode, UserProfile } from "./types";

const VALID_MODES: StudyMode[] = [
  "chat",
  "summary",
  "simplify",
  "quiz",
  "flashcards",
  "steps",
];

interface ChatRequest {
  docId?: string;
  chatId?: string;
  message?: string;
  mode?: StudyMode;
}

interface Citation {
  chunkId: string;
  pageNumber: number | null;
  heading: string | null;
}

interface ChatResponseShape {
  chatId: string;
  messageId: string;
  content: string;
  retrievedChunkIds: string[];
  citations: Citation[];
}

export const chatWithDocument = onCall<ChatRequest, Promise<ChatResponseShape>>(
  { secrets: [geminiApiKey], timeoutSeconds: 60, memory: "512MiB" },
  async (request) => {
    const uid = request.auth?.uid;
    requireAuth(uid);

    const { docId, message, mode = "chat" } = request.data ?? {};
    if (!docId || typeof docId !== "string") badRequest("docId is required");
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      badRequest("message is required");
    }
    if (message.length > 4000) badRequest("Message is too long.");
    if (!VALID_MODES.includes(mode)) badRequest("Unknown study mode");

    const docRef = db.collection("documents").doc(docId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Document not found");
    }
    const docData = docSnap.data() as DocumentRecord;
    requireOwnership(docData.uid, uid);

    if (docData.status !== "ready") {
      badRequest(
        "Document is not ready yet. Wait for processing to finish or retry.",
      );
    }

    const profileSnap = await db
      .collection("users")
      .doc(uid)
      .collection("profile")
      .doc("main")
      .get();
    const profile = (profileSnap.data() as UserProfile | undefined) ?? {};

    const queryEmbedding = await embedQuery(message);
    const chunks = await retrieveChunks(docId, queryEmbedding, 6);

    const chatId = request.data?.chatId ?? docRef.collection("chats").doc().id;
    const chatRef = docRef.collection("chats").doc(chatId);

    await chatRef.set(
      {
        uid,
        docId,
        mode,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const messagesRef = chatRef.collection("messages");
    const recentSnap = await messagesRef
      .orderBy("timestamp", "desc")
      .limit(8)
      .get();
    const history = recentSnap.docs
      .reverse()
      .map((d) => d.data())
      .filter((m) => typeof m.content === "string")
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m.content),
      }));

    const systemPrompt = buildSystemPrompt({
      profile,
      mode,
      chunks,
      history,
      message,
      documentName: docData.fileName,
    });
    const userPrompt = buildUserPrompt({
      profile,
      mode,
      chunks,
      history,
      message,
      documentName: docData.fileName,
    });

    const ai = getGenAi();
    const result = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    const content =
      result.text?.trim() ??
      "I could not generate a response. Please try rephrasing your question.";

    const userMsgRef = messagesRef.doc();
    const assistantMsgRef = messagesRef.doc();
    const citations: Citation[] = chunks.map((c) => ({
      chunkId: c.id,
      pageNumber: c.pageNumber,
      heading: c.heading,
    }));

    const batch = db.batch();
    batch.set(userMsgRef, {
      role: "user",
      content: message,
      retrievedChunkIds: [],
      citations: [],
      mode,
      timestamp: FieldValue.serverTimestamp(),
    });
    batch.set(assistantMsgRef, {
      role: "assistant",
      content,
      retrievedChunkIds: chunks.map((c) => c.id),
      citations,
      mode,
      timestamp: FieldValue.serverTimestamp(),
    });
    batch.update(chatRef, { updatedAt: FieldValue.serverTimestamp() });

    await batch.commit();

    return {
      chatId,
      messageId: assistantMsgRef.id,
      content,
      retrievedChunkIds: chunks.map((c) => c.id),
      citations,
    };
  },
);
