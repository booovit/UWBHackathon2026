import type { RetrievedChunk } from "./retrieval";
import type { StudyMode, UserProfile } from "./types";

export interface PromptContext {
  profile: UserProfile;
  mode: StudyMode;
  chunks: RetrievedChunk[];
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  documentName: string;
}

const MODE_INSTRUCTIONS: Record<StudyMode, string> = {
  chat: "Answer the user's question directly using only the document excerpts.",
  summary:
    "Produce a clear summary with the key ideas and important terms first, then a short overview. Use short bullet points.",
  simplify:
    "Rewrite the requested content in plain, simple language. Use shorter sentences and define hard terms.",
  quiz:
    'Return only a JSON array of questions like [{"kind":"mcq","prompt":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":"..."},{"kind":"written","prompt":"...","correctAnswer":"...","acceptedAnswers":["..."],"explanation":"..."}]. Mix multiple-choice and written questions. Create 5-10 questions total.',
  flashcards:
    "Create study flashcards as a JSON array like [{\"front\":\"...\",\"back\":\"...\"}]. Create 6-12 cards with concise fronts and clear backs. Output only the JSON array.",
  steps:
    'Return only a JSON array of concise task steps like [{"title":"Task 1","instruction":"..."},{"title":"Task 2","instruction":"..."}]. Separate distinct assignments first, then list one concrete action per step.',
};

export function buildSystemPrompt(ctx: PromptContext): string {
  const ui = ctx.profile.uiPreferences ?? {};
  const study = ctx.profile.studyPreferences ?? {};
  const supports = ctx.profile.supports ?? {};

  const supportNotes: string[] = [];
  if (supports.dyslexia) {
    supportNotes.push(
      "Use short sentences, avoid dense paragraphs, and prefer plain language.",
    );
  }
  if (supports.adhd) {
    supportNotes.push(
      "Lead with the main point. Use short bullet lists. Surface one focused step at a time when relevant.",
    );
  }
  if (supports.lowVision || ui.highContrast) {
    supportNotes.push(
      "Prefer clear structure with semantic headings. Avoid relying on visual layout to carry meaning.",
    );
  }
  if (study.simplifyLanguage) {
    supportNotes.push("Default to simplified language.");
  }
  if (study.oneStepAtATime) {
    supportNotes.push("Walk the user through one step at a time.");
  }
  if (study.responseLength === "short") {
    supportNotes.push("Keep responses concise (under ~120 words unless asked).");
  }
  if (study.responseLength === "detailed") {
    supportNotes.push("Provide thorough explanations with examples.");
  }

  return [
    "You are Studylift, an accessibility-first study tutor.",
    "Always ground your answer in the provided document excerpts.",
    "If the excerpts do not contain the answer, say so clearly. Do not invent facts.",
    "Cite excerpts inline using [chunkId] when relevant.",
    "Never diagnose the user or label them with a disability.",
    `Document title: ${ctx.documentName}.`,
    `Mode-specific instruction: ${MODE_INSTRUCTIONS[ctx.mode]}`,
    supportNotes.length > 0
      ? `User support preferences:\n- ${supportNotes.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildUserPrompt(ctx: PromptContext): string {
  const excerpts = ctx.chunks.length
    ? ctx.chunks
        .map((c) => {
          const tag = c.pageNumber !== null ? ` page ${c.pageNumber}` : "";
          const heading = c.heading ? ` — ${c.heading}` : "";
          return `[chunk:${c.id}${tag}${heading}]\n${c.text}`;
        })
        .join("\n\n---\n\n")
    : "(No relevant excerpts were retrieved. Tell the user the document does not appear to cover this.)";

  const history = ctx.history.length
    ? `Recent conversation:\n${ctx.history
        .map((h) => `${h.role === "user" ? "User" : "Tutor"}: ${h.content}`)
        .join("\n")}`
    : "";

  return [
    `Document excerpts:\n${excerpts}`,
    history,
    `User request:\n${ctx.message}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
