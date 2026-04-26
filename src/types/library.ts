import type { Timestamp } from "firebase/firestore";
import type { StructuredQuizQuestion } from "./studyArtifacts";

export interface StudyFolder {
  id: string;
  name: string;
  documentIds: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FlashcardCard {
  front: string;
  back: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  cards: FlashcardCard[];
  sourceDocId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SavedQuiz {
  id: string;
  title: string;
  /** Backward-compatible free-form text content from older saves */
  content: string;
  /** Structured questions for interactive quizzes */
  questions?: StructuredQuizQuestion[];
  sourceDocId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
