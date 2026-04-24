import { GoogleGenAI } from "@google/genai";
import { defineSecret } from "firebase-functions/params";

export const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const GENERATION_MODEL = "gemini-2.5-flash";
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSION = 768;

export function getGenAi(): GoogleGenAI {
  const key = geminiApiKey.value();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Run `firebase functions:secrets:set GEMINI_API_KEY` " +
        "or add it to functions/.secret.local for local development.",
    );
  }
  return new GoogleGenAI({ apiKey: key });
}
