import type { Timestamp } from "firebase/firestore";

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
  /** Free-form text (e.g. markdown) of the quiz content */
  content: string;
  sourceDocId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
