import type { StudyMode } from "@/types/profile";

type ArtifactMode = Extract<StudyMode, "quiz" | "flashcards" | "steps">;

const HINTS: { mode: ArtifactMode; re: RegExp }[] = [
  { mode: "steps", re: /\bstep[-\s]by[-\s]step\b/i },
  { mode: "steps", re: /\bbreak (?:this |the |it |that )?(?:assignment |task )?into steps\b/i },
  { mode: "steps", re: /\bbreak (?:it|this) down into steps\b/i },
  { mode: "steps", re: /\b(?:walk|guide) me through\b/i },
  { mode: "steps", re: /\bone step at a time\b/i },
  { mode: "steps", re: /\binto (?:small )?steps\b/i },
  { mode: "flashcards", re: /\bmake flashcards?\b/i },
  { mode: "flashcards", re: /\bcreate flashcards?\b/i },
  { mode: "flashcards", re: /\bgenerate flashcards?\b/i },
  { mode: "flashcards", re: /\bflashcards?\s+(?:from|for|on|about)\b/i },
  { mode: "quiz", re: /\bmake (?:a )?quiz\b/i },
  { mode: "quiz", re: /\bcreate (?:a )?quiz\b/i },
  { mode: "quiz", re: /\bquiz me\b/i },
  { mode: "quiz", re: /\bquiz\s+(?:on|about|from)\b/i },
  { mode: "quiz", re: /\bpractice quiz\b/i },
];

/**
 * If the user clearly asks for flashcards, a quiz, or step-by-step help in plain
 * language, return that mode so the UI and request can match (without requiring
 * the mode buttons first). Otherwise null.
 */
export function inferStudyModeFromMessage(text: string): ArtifactMode | null {
  let best: { mode: ArtifactMode; index: number } | null = null;
  for (const { mode, re } of HINTS) {
    const m = text.match(re);
    if (m && m.index !== undefined) {
      if (!best || m.index < best.index) {
        best = { mode, index: m.index };
      }
    }
  }
  return best?.mode ?? null;
}
