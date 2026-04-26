export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";

export type ProcessingStage =
  | "waiting"
  | "extracting_text"
  | "chunking"
  | "generating_embeddings"
  | "complete"
  | "failed";

export interface DocumentRecord {
  uid: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  status: DocumentStatus;
  processingStage: ProcessingStage;
  chunkCount: number;
  error: string | null;
}

export type StudyMode =
  | "chat"
  | "summary"
  | "simplify"
  | "quiz"
  | "flashcards"
  | "steps";

export interface UserProfile {
  supports?: {
    dyslexia?: boolean;
    adhd?: boolean;
    lowVision?: boolean;
  };
  uiPreferences?: {
    fontScale?: number;
    highContrast?: boolean;
    extraSpacing?: boolean;
    lineFocus?: boolean;
    maxLineWidth?: "standard" | "narrow";
  };
  studyPreferences?: {
    readAloud?: boolean;
    simplifyLanguage?: boolean;
    oneStepAtATime?: boolean;
    responseLength?: "short" | "medium" | "detailed";
    defaultStudyMode?: StudyMode;
  };
}

export interface ExtractedSection {
  text: string;
  pageNumber: number | null;
  heading: string | null;
}

export type {
  StructuredArtifact,
  StructuredArtifactType,
  StructuredFlashcard,
  StructuredQuizQuestion,
  StructuredStep,
} from "./studyArtifacts";
