import type { Timestamp } from "firebase/firestore";

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";

export type ProcessingStage =
  | "waiting"
  | "extracting_text"
  | "chunking"
  | "generating_embeddings"
  | "complete"
  | "failed";

export interface StudyDocument {
  id: string;
  uid: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  status: DocumentStatus;
  processingStage: ProcessingStage;
  chunkCount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  error: string | null;
}

export type SectionType =
  | "title"
  | "heading"
  | "body"
  | "list"
  | "table"
  | "unknown";

export interface ChunkAdaptationMetadata {
  suggestedChunkSize: "short" | "medium" | "long";
  estimatedDifficulty: "easy" | "medium" | "hard";
  hasDefinition: boolean;
  hasSteps: boolean;
}

export interface DocumentChunk {
  id: string;
  uid: string;
  docId: string;
  text: string;
  pageNumber: number | null;
  heading: string | null;
  sectionType: SectionType;
  orderIndex: number;
  keywords: string[];
  adaptationMetadata: ChunkAdaptationMetadata;
}
