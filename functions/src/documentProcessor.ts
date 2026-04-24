import { FieldValue } from "firebase-admin/firestore";
import { db, storage } from "./firebaseAdmin";
import { extractPdf } from "./extractors/pdf";
import { extractDocx } from "./extractors/docx";
import { chunkSections } from "./chunking";
import { embedTexts } from "./embeddings";
import type {
  DocumentRecord,
  ExtractedSection,
  ProcessingStage,
} from "./types";

const TEXT_TYPES = new Set(["text/plain", "text/markdown"]);

export async function processDocument(docId: string): Promise<void> {
  const ref = db.collection("documents").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.warn("Document not found for processing:", docId);
    return;
  }
  const docData = snap.data() as DocumentRecord;

  await updateStage(docId, "processing", "extracting_text");

  try {
    const file = storage.bucket().file(docData.storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`Uploaded file not found at ${docData.storagePath}`);
    }
    const [buffer] = await file.download();

    const sections = await extractByMime(
      buffer,
      docData.mimeType,
      docData.fileName,
    );

    if (sections.length === 0) {
      throw new Error(
        "No readable text was extracted. Scanned PDFs without OCR are not supported in v1.",
      );
    }

    await updateStage(docId, "processing", "chunking");

    const chunks = chunkSections(sections);

    if (chunks.length === 0) {
      throw new Error("Could not produce any chunks for this document.");
    }

    await updateStage(docId, "processing", "generating_embeddings");

    const embeddings = await embedTexts(chunks.map((c) => c.text));

    const batch = db.batch();
    const chunksRef = ref.collection("chunks");

    const oldChunks = await chunksRef.listDocuments();
    for (const old of oldChunks) batch.delete(old);

    chunks.forEach((chunk, i) => {
      const embedding = embeddings[i];
      const chunkRef = chunksRef.doc();
      batch.set(chunkRef, {
        uid: docData.uid,
        docId,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        heading: chunk.heading,
        sectionType: chunk.sectionType,
        orderIndex: chunk.orderIndex,
        keywords: chunk.keywords,
        adaptationMetadata: chunk.adaptationMetadata,
        embedding: FieldValue.vector(embedding),
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    batch.update(ref, {
      status: "ready",
      processingStage: "complete",
      chunkCount: chunks.length,
      error: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown processing error";
    console.error("Document processing failed:", message);
    await ref.update({
      status: "failed",
      processingStage: "failed",
      error: message,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

async function extractByMime(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractedSection[]> {
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    return extractPdf(buffer);
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.toLowerCase().endsWith(".docx")
  ) {
    return extractDocx(buffer);
  }
  if (TEXT_TYPES.has(mimeType) || /\.(txt|md)$/i.test(fileName)) {
    const text = buffer.toString("utf8").trim();
    if (!text) return [];
    return text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => ({ text: block, pageNumber: null, heading: null }));
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function updateStage(
  docId: string,
  status: DocumentRecord["status"],
  stage: ProcessingStage,
): Promise<void> {
  await db.collection("documents").doc(docId).update({
    status,
    processingStage: stage,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
