export interface ArtifactCitation {
  chunkId: string;
  pageNumber: number | null;
  heading: string | null;
}

export interface StructuredFlashcard {
  id: string;
  front: string;
  back: string;
  citations?: ArtifactCitation[];
}

export interface StructuredQuizQuestion {
  id: string;
  kind: "mcq" | "written";
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation?: string;
  citations?: ArtifactCitation[];
}

export interface StructuredStep {
  id: string;
  title?: string;
  instruction: string;
  citations?: ArtifactCitation[];
}

export interface FlashcardsArtifact {
  cards: StructuredFlashcard[];
}

export interface QuizArtifact {
  questions: StructuredQuizQuestion[];
}

export interface StepsArtifact {
  steps: StructuredStep[];
}

export type StructuredArtifactType = "flashcards" | "quiz" | "steps";

export type StructuredArtifact =
  | FlashcardsArtifact
  | QuizArtifact
  | StepsArtifact;
