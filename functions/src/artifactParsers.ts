import type {
  StructuredArtifact,
  StructuredArtifactType,
  StructuredFlashcard,
  StructuredQuizQuestion,
  StructuredStep,
} from "./studyArtifacts";
import type { StudyMode } from "./types";

function normalizeText(value: unknown, max = 1200): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseJsonBlock(raw: string): unknown {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    // Fenced code block fallback: ```json\n[..]\n```
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) {
      try {
        return JSON.parse(fenced.trim());
      } catch {
        // fall through to bracket extraction
      }
    }
    // Bracket-window fallback: take from first array/object opener to last matching closer.
    const firstSquare = text.indexOf("[");
    const lastSquare = text.lastIndexOf("]");
    if (firstSquare !== -1 && lastSquare > firstSquare) {
      try {
        return JSON.parse(text.slice(firstSquare, lastSquare + 1));
      } catch {
        // fall through
      }
    }
    const firstCurly = text.indexOf("{");
    const lastCurly = text.lastIndexOf("}");
    if (firstCurly !== -1 && lastCurly > firstCurly) {
      try {
        return JSON.parse(text.slice(firstCurly, lastCurly + 1));
      } catch {
        // fall through
      }
    }
    throw new Error("No valid JSON found");
  }
}

function unwrapArray(parsed: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  const obj = asRecord(parsed);
  if (obj) {
    for (const key of keys) {
      const value = obj[key];
      if (Array.isArray(value)) return value;
    }
  }
  throw new Error("Expected JSON array in response");
}

function parseFlashcards(raw: string): StructuredFlashcard[] {
  const parsedRaw = parseJsonBlock(raw);
  const parsed = unwrapArray(parsedRaw, "cards", "flashcards", "items");
  void parsedRaw;
  if (!Array.isArray(parsed)) {
    throw new Error("Flashcards response is not an array");
  }
  const cards: StructuredFlashcard[] = [];
  for (const [index, item] of parsed.entries()) {
    const obj = asRecord(item);
    if (!obj) continue;
    const front = normalizeText(obj.front, 240);
    const back = normalizeText(obj.back, 1200);
    if (!front || !back) continue;
    cards.push({
      id: `card-${index + 1}`,
      front,
      back,
    });
  }
  if (cards.length === 0) throw new Error("No valid flashcards");
  return cards.slice(0, 20);
}

function parseQuiz(raw: string): StructuredQuizQuestion[] {
  const parsed = unwrapArray(parseJsonBlock(raw), "questions", "items", "quiz");
  if (!Array.isArray(parsed)) {
    throw new Error("Quiz response is not an array");
  }
  const questions: StructuredQuizQuestion[] = [];
  for (const [index, item] of parsed.entries()) {
    const obj = asRecord(item);
    if (!obj) continue;
    const promptText = normalizeText(
      obj.prompt ?? obj.question,
      800,
    );
    const correctAnswer = normalizeText(
      obj.correctAnswer ?? obj.answer,
      400,
    );
    const explanation =
      normalizeText(obj.explanation ?? obj.rationale, 900) || undefined;
    if (!promptText || !correctAnswer) continue;

    const acceptedRaw = Array.isArray(obj.acceptedAnswers)
      ? obj.acceptedAnswers
      : Array.isArray(obj.alternateAnswers)
        ? obj.alternateAnswers
        : [];
    const acceptedAnswers = acceptedRaw
      .map((v) => normalizeText(v, 200))
      .filter(Boolean)
      .slice(0, 8);

    const optionsRaw = Array.isArray(obj.options) ? obj.options : [];
    const cleanOptions = optionsRaw
      .map((v) => normalizeText(v, 300))
      .filter(Boolean)
      .slice(0, 6);
    const inferredKind: "mcq" | "written" =
      obj.kind === "written"
        ? "written"
        : obj.kind === "mcq" || cleanOptions.length >= 2
          ? "mcq"
          : "written";
    const options =
      inferredKind === "mcq" && cleanOptions.length >= 2
        ? cleanOptions
        : undefined;

    questions.push({
      id: `q-${index + 1}`,
      kind: inferredKind,
      prompt: promptText,
      options,
      correctAnswer,
      acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : undefined,
      explanation,
    });
  }
  if (questions.length === 0) throw new Error("No valid quiz questions");
  return questions.slice(0, 20);
}

function parseSteps(raw: string): StructuredStep[] {
  const parsed = unwrapArray(parseJsonBlock(raw), "steps", "tasks", "items");
  if (!Array.isArray(parsed)) {
    throw new Error("Steps response is not an array");
  }
  const steps: StructuredStep[] = [];
  for (const [index, item] of parsed.entries()) {
    if (typeof item === "string") {
      const instruction = normalizeText(item, 800);
      if (!instruction) continue;
      steps.push({ id: `step-${index + 1}`, instruction });
      continue;
    }
    const obj = asRecord(item);
    if (!obj) continue;
    const title =
      normalizeText(obj.title ?? obj.heading ?? obj.name, 220) || undefined;
    const instruction = normalizeText(
      obj.instruction ?? obj.description ?? obj.text ?? obj.body,
      900,
    );
    if (!instruction) continue;
    steps.push({
      id: `step-${index + 1}`,
      title,
      instruction,
    });
  }
  if (steps.length === 0) throw new Error("No valid steps");
  return steps.slice(0, 30);
}

export function tryParseArtifact(
  mode: StudyMode,
  content: string,
): { artifactType?: StructuredArtifactType; artifact?: StructuredArtifact } {
  try {
    if (mode === "flashcards") {
      return {
        artifactType: "flashcards",
        artifact: stripUndefined({ cards: parseFlashcards(content) }),
      };
    }
    if (mode === "quiz") {
      return {
        artifactType: "quiz",
        artifact: stripUndefined({ questions: parseQuiz(content) }),
      };
    }
    if (mode === "steps") {
      return {
        artifactType: "steps",
        artifact: stripUndefined({ steps: parseSteps(content) }),
      };
    }
  } catch (error) {
    console.warn("Artifact parse failed:", error);
  }
  return {};
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefined(entry))
      .filter((entry) => entry !== undefined) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (raw === undefined) continue;
      const cleaned = stripUndefined(raw);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out as unknown as T;
  }
  return value;
}
