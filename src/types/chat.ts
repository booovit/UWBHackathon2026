import type { Timestamp } from "firebase/firestore";
import type { StudyMode } from "./profile";
import type { StructuredArtifact, StructuredArtifactType } from "./studyArtifacts";

export interface Citation {
  chunkId: string;
  pageNumber: number | null;
  heading: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  retrievedChunkIds: string[];
  citations: Citation[];
  mode: StudyMode;
  artifactType?: StructuredArtifactType;
  artifact?: StructuredArtifact;
  timestamp?: Timestamp;
}
