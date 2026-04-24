import mammoth from "mammoth";
import type { ExtractedSection } from "../types";

export async function extractDocx(
  buffer: Buffer,
): Promise<ExtractedSection[]> {
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value ?? "").replace(/\r\n/g, "\n").trim();

  if (!text) return [];

  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  let lastHeading: string | null = null;
  const sections: ExtractedSection[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (looksLikeHeading(trimmed)) {
      lastHeading = trimmed;
      continue;
    }
    sections.push({
      text: trimmed,
      pageNumber: null,
      heading: lastHeading,
    });
  }
  return sections;
}

function looksLikeHeading(line: string): boolean {
  if (line.length > 90) return false;
  if (line.endsWith(".") || line.endsWith("?") || line.endsWith("!")) {
    return false;
  }
  const wordCount = line.split(/\s+/).length;
  if (wordCount > 12) return false;
  const upperRatio =
    line.replace(/[^A-Z]/g, "").length / Math.max(1, line.replace(/\s+/g, "").length);
  return wordCount <= 8 || upperRatio > 0.4;
}
