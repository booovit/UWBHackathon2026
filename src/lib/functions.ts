import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { Citation } from "@/types/chat";
import type { StudyMode } from "@/types/profile";

export interface ChatRequest {
  docId: string;
  chatId?: string;
  message: string;
  mode: StudyMode;
}

export interface ChatResponse {
  chatId: string;
  messageId: string;
  content: string;
  retrievedChunkIds: string[];
  citations: Citation[];
}

export const callChatWithDocument = httpsCallable<ChatRequest, ChatResponse>(
  functions,
  "chatWithDocument",
);

export interface QuickChatRequest {
  message: string;
  mode?: StudyMode;
}

export interface QuickChatResponse {
  content: string;
}

export const callQuickChat = httpsCallable<QuickChatRequest, QuickChatResponse>(
  functions,
  "quickChat",
);

export interface RetryRequest {
  docId: string;
}

export const callRetryDocumentProcessing = httpsCallable<
  RetryRequest,
  { ok: true }
>(functions, "retryDocumentProcessing");

export interface FeedbackRequest {
  docId: string;
  targetType: "reader" | "chat" | "summary" | "quiz" | "flashcards" | "steps";
  targetId: string;
  signal: string;
  value: boolean | number | string;
}

export const callSaveFeedback = httpsCallable<FeedbackRequest, { ok: true }>(
  functions,
  "saveFeedback",
);
