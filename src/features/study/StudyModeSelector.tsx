import { useProfile } from "@/features/profile/ProfileProvider";
import type { StudyMode } from "@/types/profile";

export const STUDY_MODES: {
  value: StudyMode;
  label: string;
  placeholder: string;
}[] = [
  {
    value: "chat",
    label: "Chat",
    placeholder: "Ask a question about this document...",
  },
  {
    value: "summary",
    label: "Summary",
    placeholder: "Summarize this document, or a section.",
  },
  {
    value: "simplify",
    label: "Simplify",
    placeholder: "Paste or describe what you want simplified.",
  },
  {
    value: "quiz",
    label: "Quiz",
    placeholder: "Make a quiz from section 3 (or the whole document).",
  },
  {
    value: "flashcards",
    label: "Flashcards",
    placeholder: "Create flashcards from the key terms.",
  },
  {
    value: "steps",
    label: "Step-by-step",
    placeholder: "Break this assignment into steps.",
  },
];

interface Props {
  mode?: StudyMode;
  onModeChange?: (mode: StudyMode) => void;
  label?: string;
}

export function StudyModeSelector({
  mode,
  onModeChange,
  label = "Study mode",
}: Props) {
  const { profile, saveProfile } = useProfile();
  const selectedMode = mode ?? profile.studyPreferences.defaultStudyMode;

  function selectMode(nextMode: StudyMode) {
    onModeChange?.(nextMode);
    void saveProfile({
      studyPreferences: {
        ...profile.studyPreferences,
        defaultStudyMode: nextMode,
      },
    }).catch((err) => {
      console.error("Could not save study mode", err);
    });
  }

  return (
    <div className="row" role="tablist" aria-label={label}>
      {STUDY_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="tab"
          aria-selected={selectedMode === m.value}
          className={selectedMode === m.value ? "button" : "button secondary"}
          onClick={() => selectMode(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
