import { useState, type FormEvent } from "react";
import type {
  StudyMode,
  ResponseLength,
  UserProfile,
} from "@/types/profile";

interface Props {
  initial: UserProfile;
  onSave: (profile: Partial<UserProfile>) => Promise<void>;
  submitLabel: string;
}

export function PreferenceForm({ initial, onSave, submitLabel }: Props) {
  const [profile, setProfile] = useState<UserProfile>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<T extends keyof UserProfile>(key: T, value: UserProfile[T]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={(e) => void handleSubmit(e)}>
      <fieldset className="card stack">
        <legend>Support areas</legend>
        <p className="muted">
          These are areas you'd like extra support in. They influence smart
          defaults — you can always toggle individual settings below.
        </p>
        <ul className="checkbox-list">
          {(
            [
              ["dyslexia", "Dyslexia / reading"],
              ["adhd", "ADHD / focus / executive function"],
              ["lowVision", "Low vision / visual impairment"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label>
                <input
                  type="checkbox"
                  checked={profile.supports[key]}
                  onChange={(e) =>
                    update("supports", {
                      ...profile.supports,
                      [key]: e.target.checked,
                    })
                  }
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="card stack">
        <legend>Display</legend>
        <div className="grid-2">
          <div>
            <label htmlFor="font-scale">
              Text size ({profile.uiPreferences.fontScale.toFixed(2)}x)
              {profile.uiPreferences.fontScale >= 2.0 && (
                <span className="badge" style={{ marginLeft: 8, verticalAlign: "middle" }}>
                  Large print
                </span>
              )}
            </label>
            <input
              id="font-scale"
              type="range"
              min={0.85}
              max={3.0}
              step={0.05}
              value={profile.uiPreferences.fontScale}
              onChange={(e) =>
                update("uiPreferences", {
                  ...profile.uiPreferences,
                  fontScale: Number(e.target.value),
                })
              }
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: 4 }}>
              <span>Small</span>
              <span>Normal</span>
              <span>Large print (visual impairment)</span>
            </div>
          </div>
          <div>
            <label htmlFor="line-width">Line width</label>
            <select
              id="line-width"
              value={profile.uiPreferences.maxLineWidth}
              onChange={(e) =>
                update("uiPreferences", {
                  ...profile.uiPreferences,
                  maxLineWidth: e.target.value as "standard" | "narrow",
                })
              }
            >
              <option value="standard">Standard</option>
              <option value="narrow">Narrow (recommended for dyslexia)</option>
            </select>
          </div>
        </div>
        <ul className="checkbox-list">
          {(
            [
              ["highContrast", "High contrast"],
              ["dyslexiaFont", "Dyslexic font"],
              ["extraSpacing", "Extra letter and line spacing"],
              ["lineFocus", "Line focus while reading"],
              ["reducedMotion", "Reduce animations"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label>
                <input
                  type="checkbox"
                  checked={profile.uiPreferences[key]}
                  onChange={(e) =>
                    update("uiPreferences", {
                      ...profile.uiPreferences,
                      [key]: e.target.checked,
                    })
                  }
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="card stack">
        <legend>Study</legend>
        <div className="grid-2">
          <div>
            <label htmlFor="response-length">Default response length</label>
            <select
              id="response-length"
              value={profile.studyPreferences.responseLength}
              onChange={(e) =>
                update("studyPreferences", {
                  ...profile.studyPreferences,
                  responseLength: e.target.value as ResponseLength,
                })
              }
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
          <div>
            <label htmlFor="default-mode">Default study mode</label>
            <select
              id="default-mode"
              value={profile.studyPreferences.defaultStudyMode}
              onChange={(e) =>
                update("studyPreferences", {
                  ...profile.studyPreferences,
                  defaultStudyMode: e.target.value as StudyMode,
                })
              }
            >
              <option value="chat">Chat</option>
              <option value="summary">Summary</option>
              <option value="simplify">Simplify</option>
              <option value="quiz">Quiz</option>
              <option value="flashcards">Flashcards</option>
              <option value="steps">Step-by-step</option>
            </select>
          </div>
        </div>
        <ul className="checkbox-list">
          {(
            [
              ["readAloud", "Show read-aloud controls by default"],
              ["simplifyLanguage", "Prefer simplified language"],
              ["oneStepAtATime", "One step at a time"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label>
                <input
                  type="checkbox"
                  checked={profile.studyPreferences[key]}
                  onChange={(e) =>
                    update("studyPreferences", {
                      ...profile.studyPreferences,
                      [key]: e.target.checked,
                    })
                  }
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="row">
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
