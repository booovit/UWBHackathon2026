import { HttpsError } from "firebase-functions/v2/https";

interface GeminiApiErrorShape {
  status?: number;
  code?: number;
  error?: { code?: number; status?: string; message?: string };
  message?: string;
}

function asObj(value: unknown): GeminiApiErrorShape | null {
  if (!value || typeof value !== "object") return null;
  return value as GeminiApiErrorShape;
}

function extractRetrySeconds(message: string): number | null {
  const match = message.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? Math.ceil(n) : null;
}

/**
 * Convert Gemini SDK errors into friendly HttpsError values so the client
 * shows a helpful message instead of generic INTERNAL.
 */
export function toFriendlyHttpsError(err: unknown): HttpsError {
  const top = asObj(err);
  const inner = asObj(top?.error);
  const status = top?.status ?? inner?.code ?? inner?.status ?? top?.code;
  const apiMessage = inner?.message ?? top?.message ?? "";
  const text = String(apiMessage || (err instanceof Error ? err.message : err));

  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) {
    const retry = extractRetrySeconds(text);
    return new HttpsError(
      "resource-exhausted",
      retry
        ? `The Gemini free-tier quota is full for now. Try again in about ${retry} seconds, or upgrade the API key's plan.`
        : "The Gemini free-tier quota is full for now. Try again later, or upgrade the API key's plan.",
    );
  }
  if (status === 401 || status === 403 || /API key/i.test(text)) {
    return new HttpsError(
      "permission-denied",
      "Gemini rejected the API key. Check the GEMINI_API_KEY secret / .secret.local.",
    );
  }
  if (status === 503 || /UNAVAILABLE|overloaded/i.test(text)) {
    return new HttpsError(
      "unavailable",
      "Gemini is temporarily overloaded. Try again in a moment.",
    );
  }
  return new HttpsError(
    "internal",
    text || "Something went wrong while generating a response.",
  );
}
