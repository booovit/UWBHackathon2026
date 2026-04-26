import type { FlashcardDeck, SavedQuiz, SavedStepPlan, StudyFolder } from "@/types/library";

const PREFIX = "studylift.previewLibrary.";

function key(uid: string, part: string) {
  return `${PREFIX}${uid}.${part}`;
}

export function loadPreviewFolders(uid: string): StudyFolder[] {
  try {
    const raw = localStorage.getItem(key(uid, "folders"));
    if (!raw) return [];
    const data = JSON.parse(raw) as StudyFolder[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function savePreviewFolders(uid: string, items: StudyFolder[]) {
  localStorage.setItem(key(uid, "folders"), JSON.stringify(items));
}

export function loadPreviewDecks(uid: string): FlashcardDeck[] {
  try {
    const raw = localStorage.getItem(key(uid, "decks"));
    if (!raw) return [];
    const data = JSON.parse(raw) as FlashcardDeck[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function savePreviewDecks(uid: string, items: FlashcardDeck[]) {
  localStorage.setItem(key(uid, "decks"), JSON.stringify(items));
}

export function loadPreviewQuizzes(uid: string): SavedQuiz[] {
  try {
    const raw = localStorage.getItem(key(uid, "quizzes"));
    if (!raw) return [];
    const data = JSON.parse(raw) as SavedQuiz[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function savePreviewQuizzes(uid: string, items: SavedQuiz[]) {
  localStorage.setItem(key(uid, "quizzes"), JSON.stringify(items));
}

export function loadPreviewStepPlans(uid: string): SavedStepPlan[] {
  try {
    const raw = localStorage.getItem(key(uid, "stepPlans"));
    if (!raw) return [];
    const data = JSON.parse(raw) as SavedStepPlan[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function savePreviewStepPlans(uid: string, items: SavedStepPlan[]) {
  localStorage.setItem(key(uid, "stepPlans"), JSON.stringify(items));
}

export function randomId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
