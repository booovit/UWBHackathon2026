import type { Timestamp } from "firebase/firestore";
import type { StudyMode } from "./profile";

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
  timestamp?: Timestamp;
}
