import type { ExtractedSection } from "./types";

const TARGET_CHARS = 1800;
const MIN_CHARS = 280;

export interface RawChunk {
  text: string;
  pageNumber: number | null;
  heading: string | null;
  orderIndex: number;
  sectionType: "title" | "heading" | "body" | "list" | "table" | "unknown";
  keywords: string[];
  adaptationMetadata: {
    suggestedChunkSize: "short" | "medium" | "long";
    estimatedDifficulty: "easy" | "medium" | "hard";
    hasDefinition: boolean;
    hasSteps: boolean;
  };
}

export function chunkSections(sections: ExtractedSection[]): RawChunk[] {
  const splits: ExtractedSection[] = [];

  for (const section of sections) {
    if (!section.text.trim()) continue;
    if (section.text.length <= TARGET_CHARS) {
      splits.push(section);
    } else {
      for (const piece of splitLong(section.text)) {
        splits.push({
          text: piece,
          pageNumber: section.pageNumber,
          heading: section.heading,
        });
      }
    }
  }

  const merged: ExtractedSection[] = [];
  for (const s of splits) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.text.length < MIN_CHARS &&
      prev.heading === s.heading &&
      prev.pageNumber === s.pageNumber
    ) {
      prev.text = `${prev.text}\n\n${s.text}`;
    } else {
      merged.push({ ...s });
    }
  }

  return merged.map((section, index) => ({
    text: section.text,
    pageNumber: section.pageNumber,
    heading: section.heading,
    orderIndex: index,
    sectionType: section.heading ? "body" : "unknown",
    keywords: extractKeywords(section.text),
    adaptationMetadata: {
      suggestedChunkSize:
        section.text.length > 1100
          ? "long"
          : section.text.length > 500
            ? "medium"
            : "short",
      estimatedDifficulty: estimateDifficulty(section.text),
      hasDefinition: /\bis\b.*\bcalled\b|defined as|means that/i.test(
        section.text,
      ),
      hasSteps: /step\s*\d|first,|second,|then,|finally,/i.test(section.text),
    },
  }));
}

function splitLong(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    const candidate = current ? `${current} ${s}` : s;
    if (candidate.length > TARGET_CHARS && current) {
      out.push(current);
      current = s;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) out.push(current);
  return out;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "have",
  "will",
  "they",
  "their",
  "what",
  "when",
  "where",
  "which",
  "would",
  "could",
  "should",
  "about",
  "there",
  "these",
  "those",
  "your",
  "been",
  "than",
  "then",
  "also",
  "such",
  "while",
  "were",
  "more",
]);

function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOP_WORDS.has(w));
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

function estimateDifficulty(text: string): "easy" | "medium" | "hard" {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "easy";
  const avgWordLength =
    words.reduce((acc, w) => acc + w.length, 0) / words.length;
  if (avgWordLength > 6.5) return "hard";
  if (avgWordLength > 5) return "medium";
  return "easy";
}
