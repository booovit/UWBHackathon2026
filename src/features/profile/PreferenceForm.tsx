import { useState, type FormEvent } from "react";
import type {
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
        <div className="support-cards">
          {(
            [
              {
                key: "dyslexia",
                label: "Reading Support",
                description: "Dyslexia-friendly fonts, extra spacing, and line focus mode",
                helpfulFor: "Helpful for people with dyslexia, reading difficulties, or processing disorders",
              },
              {
                key: "adhd",
                label: "Focus Support",
                description: "Reduced distractions, step-by-step content, and shorter responses",
                helpfulFor: "Helpful for people with ADHD, attention difficulties, or cognitive load sensitivity",
              },
              {
                key: "lowVision",
                label: "Visual Support",
                description: "Larger text, high contrast, and screen reader friendly content",
                helpfulFor: "Helpful for people with low vision, blindness, or color blindness",
              },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              className={`support-card ${profile.supports[item.key] ? "selected" : ""}`}
              onClick={() =>
                update("supports", {
                  ...profile.supports,
                  [item.key]: !profile.supports[item.key],
                })
              }
              aria-pressed={profile.supports[item.key]}
            >
              <div className="support-card-content">
                <h3>{item.label}</h3>
                <p>{item.description}</p>
                <span className="helpful-for">{item.helpfulFor}</span>
              </div>
              <div className="support-card-check" aria-hidden="true">
                {profile.supports[item.key] ? "✓" : ""}
              </div>
            </button>
          ))}
        </div>
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
            <option value="short">Short — brief, to-the-point answers</option>
            <option value="medium">Medium — balanced detail</option>
            <option value="detailed">Detailed — comprehensive explanations</option>
          </select>
        </div>
        <p className="muted" style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>
          Learning accommodations — select options that help you learn better
        </p>
        <ul className="checkbox-list">
          {(
            [
              ["readAloud", "Read aloud — text-to-speech for content"],
              ["simplifyLanguage", "Simplified language — easier words and shorter sentences"],
              ["oneStepAtATime", "One step at a time — break content into small pieces"],
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
        <p className="muted" style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>
          Additional learning support
        </p>
        <ul className="checkbox-list">
          <li>
            <label>
              <input
                type="checkbox"
                checked={profile.studyPreferences.visualCues ?? false}
                onChange={(e) =>
                  update("studyPreferences", {
                    ...profile.studyPreferences,
                    visualCues: e.target.checked,
                  })
                }
              />
              Visual cues — highlights and icons for important content
            </label>
          </li>
          <li>
            <label>
              <input
                type="checkbox"
                checked={profile.studyPreferences.bulletPoints ?? false}
                onChange={(e) =>
                  update("studyPreferences", {
                    ...profile.studyPreferences,
                    bulletPoints: e.target.checked,
                  })
                }
              />
              Bullet points — prefer lists over paragraphs
            </label>
          </li>
          <li>
            <label>
              <input
                type="checkbox"
                checked={profile.studyPreferences.extendedTime ?? false}
                onChange={(e) =>
                  update("studyPreferences", {
                    ...profile.studyPreferences,
                    extendedTime: e.target.checked,
                  })
                }
              />
              Extended time — no time pressure on quizzes
            </label>
          </li>
          <li>
            <label>
              <input
                type="checkbox"
                checked={profile.studyPreferences.repeatInstructions ?? false}
                onChange={(e) =>
                  update("studyPreferences", {
                    ...profile.studyPreferences,
                    repeatInstructions: e.target.checked,
                  })
                }
              />
              Repeat instructions — restate key points multiple ways
            </label>
          </li>
        </ul>
      </fieldset>

      <fieldset className="card stack">
        <legend>Additional notes</legend>
        <p className="muted">
          Is there anything else we should know about how you learn best?
        </p>
        <textarea
          className="custom-notes-input"
          value={profile.customNotes || ""}
          onChange={(e) => update("customNotes", e.target.value)}
          placeholder="For example: I learn better with examples, I prefer bullet points over paragraphs, I need extra time to process information..."
          rows={4}
        />
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
