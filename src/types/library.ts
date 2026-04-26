import type { Timestamp } from "firebase/firestore";
import type { StructuredQuizQuestion, StructuredStep } from "./studyArtifacts";

export interface StudyFolder {
  id: string;
  name: string;
  /** Uploaded study documents */
  documentIds: string[];
  /** Saved flashcard decks from the library */
  deckIds: string[];
  /** Saved quizzes */
  quizIds: string[];
  /** Saved step-by-step plans */
  stepPlanIds: string[];
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

export interface SavedStepPlan {
  id: string;
  title: string;
  /** Optional tutor summary alongside structured steps */
  content: string;
  steps: StructuredStep[];
  sourceDocId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SavedQuickChat {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
