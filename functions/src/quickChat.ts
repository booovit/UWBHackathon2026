import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "./constants";
import { db } from "./firebaseAdmin";
import { GENERATION_MODEL, geminiApiKey, getGenAi } from "./geminiClient";
import { badRequest, requireAuth } from "./errors";
import { toFriendlyHttpsError } from "./geminiErrors";
import { tryParseArtifact } from "./artifactParsers";
import type { StructuredArtifact, StructuredArtifactType } from "./studyArtifacts";
import type { StudyMode, UserProfile } from "./types";

interface QuickChatRequest {
  message?: string;
  mode?: StudyMode;
}

interface QuickChatResponse {
  content: string;
  artifactType?: StructuredArtifactType;
  artifact?: StructuredArtifact;
}

const VALID_MODES: StudyMode[] = [
  "chat",
  "summary",
  "simplify",
  "quiz",
  "flashcards",
  "steps",
];

const MODE_INSTRUCTIONS: Record<StudyMode, string> = {
  chat:
    "Answer the user's question directly. For longer answers, use short section labels and concise bullets. Do not use markdown heading symbols or decorative asterisks.",
  summary:
    "Produce a clear summary with the key ideas and important terms first, then a short overview. Use short section labels and concise bullets. Do not use markdown heading symbols or decorative asterisks.",
  simplify:
    "Rewrite or explain the requested content in plain, simple language. Use shorter sentences, define hard terms, and use short section labels when helpful. Do not use markdown heading symbols or decorative asterisks.",
  quiz:
    "Create study questions from the conversation or topic as JSON: [{\"prompt\":\"...\",\"kind\":\"mcq\",\"options\":[\"...\"],\"correctAnswer\":\"...\",\"explanation\":\"...\"}]. Use kind \"written\" for open questions. Output only the JSON array.",
  flashcards:
    "Create study flashcards as a JSON array like [{\"front\":\"...\",\"back\":\"...\"}]. Output only the JSON array.",
  steps:
    "Break the requested task into a short, ordered list of concrete steps as JSON: [{\"title\":\"...\",\"instruction\":\"...\"}]. Output only the JSON array.",
};

export const quickChat = onCall<QuickChatRequest, Promise<QuickChatResponse>>(
  {
    secrets: [geminiApiKey],
    timeoutSeconds: 60,
    memory: "512MiB",
    region: FUNCTIONS_REGION,
  },
  async (request) => {
    const uid = request.auth?.uid;
    requireAuth(uid);

    const message = request.data?.message;
    const mode = request.data?.mode ?? "chat";
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      badRequest("message is required");
    }
    if (message.length > 4000) badRequest("Message is too long.");
    if (!VALID_MODES.includes(mode)) badRequest("Unknown study mode");

    const profileSnap = await db
      .collection("users")
      .doc(uid)
      .collection("profile")
      .doc("main")
      .get();
    const profile = (profileSnap.data() as UserProfile | undefined) ?? {};

    const chatRef = db
      .collection("users")
      .doc(uid)
      .collection("quickChat")
      .doc("main");
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

    const ai = getGenAi();
    const generationConfig: Record<string, unknown> = {
      systemInstruction: buildSystemPrompt(profile, mode),
      temperature: 0.5,
    };
    if (mode === "flashcards" || mode === "quiz" || mode === "steps") {
      generationConfig.responseMimeType = "application/json";
    }
    let result;
    try {
      result = await ai.models.generateContent({
        model: GENERATION_MODEL,
        contents: buildPrompt(message, history),
        config: generationConfig as never,
      });
    } catch (err) {
      throw toFriendlyHttpsError(err);
    }

    const content =
      result.text?.trim() ??
      "I couldn't generate a response. Please try rephrasing your question.";
    const { artifactType, artifact } = tryParseArtifact(mode, content);

    const batch = db.batch();
    batch.set(
      chatRef,
      { uid, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    batch.set(messagesRef.doc(), {
      role: "user",
      content: message,
      mode,
      timestamp: FieldValue.serverTimestamp(),
    });
    batch.set(messagesRef.doc(), {
      role: "assistant",
      content,
      mode,
      artifactType: artifactType ?? null,
      artifact: artifact ?? null,
      timestamp: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return { content, artifactType, artifact };
  },
);

function buildSystemPrompt(profile: UserProfile, mode: StudyMode): string {
  const study = profile.studyPreferences ?? {};
  const supports = profile.supports ?? {};
  const notes: string[] = [];
  if (supports.dyslexia) {
    notes.push("Use short sentences and plain language.");
  }
  if (supports.adhd) {
    notes.push("Lead with the main point. Use bullet lists when helpful.");
  }
  if (supports.lowVision) {
    notes.push("Use clear semantic structure. Avoid relying on visual layout.");
  }
  if (study.simplifyLanguage) notes.push("Default to simplified language.");
  if (study.oneStepAtATime) notes.push("Walk through one step at a time.");
  if (study.responseLength === "short") {
    notes.push("Keep responses under ~120 words unless asked for more.");
  }
  if (study.responseLength === "detailed") {
    notes.push("Provide thorough explanations with examples.");
  }

  return [
    "You are Axessify, an accessibility-first AI study tutor.",
    "Help with studying, summarizing, simplifying, quizzing, and step-by-step explanations.",
    "Never diagnose the user or label them with a disability.",
    "When the user uploads a document later, your answers should ground in that document's content.",
    `Mode-specific instruction: ${MODE_INSTRUCTIONS[mode]}`,
    notes.length > 0 ? `User support preferences:\n- ${notes.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildPrompt(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
): string {
  const historyBlock = history.length
    ? `Recent conversation:\n${history
        .map((h) => `${h.role === "user" ? "User" : "Tutor"}: ${h.content}`)
        .join("\n")}\n\n`
    : "";
  return `${historyBlock}User: ${message}`;
}
