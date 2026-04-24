import pdfParse from "pdf-parse";
import type { ExtractedSection } from "../types";

export async function extractPdf(buffer: Buffer): Promise<ExtractedSection[]> {
  const result = await pdfParse(buffer);
  const text = result.text ?? "";
  const totalPages = result.numpages || 1;

  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (!cleaned) return [];

  const formFeedSplit = cleaned.split("\f");
  if (formFeedSplit.length > 1) {
    return formFeedSplit
      .map((page, i) => ({
        text: page.trim(),
        pageNumber: i + 1,
        heading: null,
      }))
      .filter((s) => s.text.length > 0);
  }

  const chunks = splitByApproxLength(cleaned, 1800);
  return chunks.map((chunk, i) => ({
    text: chunk,
    pageNumber: estimatePage(i, chunks.length, totalPages),
    heading: null,
  }));
}

function splitByApproxLength(text: string, target: number): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const out: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    const candidate = current ? `${current}\n\n${p}` : p;
    if (candidate.length > target && current) {
      out.push(current);
      current = p;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) out.push(current);
  return out;
}

function estimatePage(index: number, total: number, pages: number): number {
  if (pages <= 1 || total <= 1) return 1;
  return Math.min(pages, Math.max(1, Math.round((index / total) * pages) + 1));
}
