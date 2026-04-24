export type ResponseLength = "short" | "medium" | "detailed";
export type StudyMode =
  | "chat"
  | "summary"
  | "simplify"
  | "quiz"
  | "flashcards"
  | "steps";
export type LineWidth = "standard" | "narrow";

export interface SupportFlags {
  dyslexia: boolean;
  adhd: boolean;
  lowVision: boolean;
}

export interface UiPreferences {
  fontScale: number;
  highContrast: boolean;
  extraSpacing: boolean;
  lineFocus: boolean;
  maxLineWidth: LineWidth;
  reducedMotion: boolean;
}

export interface StudyPreferences {
  readAloud: boolean;
  simplifyLanguage: boolean;
  oneStepAtATime: boolean;
  responseLength: ResponseLength;
  defaultStudyMode: StudyMode;
}

export interface FeedbackSignals {
  prefersShorterAnswers: number;
  prefersQuizFirst: number;
  prefersStepByStep: number;
  highContrastUsedOften: boolean;
}

export interface UserProfile {
  supports: SupportFlags;
  uiPreferences: UiPreferences;
  studyPreferences: StudyPreferences;
  feedbackSignals: FeedbackSignals;
  onboardingComplete: boolean;
  updatedAt?: unknown;
}

export const defaultProfile: UserProfile = {
  supports: { dyslexia: false, adhd: false, lowVision: false },
  uiPreferences: {
    fontScale: 1,
    highContrast: false,
    extraSpacing: false,
    lineFocus: false,
    maxLineWidth: "standard",
    reducedMotion: false,
  },
  studyPreferences: {
    readAloud: false,
    simplifyLanguage: false,
    oneStepAtATime: false,
    responseLength: "medium",
    defaultStudyMode: "chat",
  },
  feedbackSignals: {
    prefersShorterAnswers: 0,
    prefersQuizFirst: 0,
    prefersStepByStep: 0,
    highContrastUsedOften: false,
  },
  onboardingComplete: false,
};
