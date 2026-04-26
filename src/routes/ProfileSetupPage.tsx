import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/features/profile/ProfileProvider";
import type { SupportFlags, UiPreferences, StudyPreferences } from "@/types/profile";

interface SupportOption {
  key: keyof SupportFlags;
  label: string;
  description: string;
  helpfulFor: string;
}

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    key: "lowVision",
    label: "Visual Support",
    description: "Larger text, high contrast, and screen reader friendly content",
    helpfulFor: "Helpful for people with low vision, blindness, or color blindness",
  },
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
];

interface LearningOption {
  key: keyof StudyPreferences;
  label: string;
  description: string;
}

const LEARNING_OPTIONS: LearningOption[] = [
  {
    key: "readAloud",
    label: "Read content aloud",
    description: "Have AI responses read to you with text-to-speech",
  },
  {
    key: "simplifyLanguage",
    label: "Simplify language",
    description: "Use simpler words and shorter sentences",
  },
  {
    key: "oneStepAtATime",
    label: "One step at a time",
    description: "Break down content into smaller, manageable pieces",
  },
];

interface AccessibilityOption {
  key: keyof UiPreferences;
  label: string;
  description: string;
}

const ACCESSIBILITY_OPTIONS: AccessibilityOption[] = [
  {
    key: "highContrast",
    label: "High contrast mode",
    description: "Increase color contrast for better visibility",
  },
  {
    key: "extraSpacing",
    label: "Extra spacing",
    description: "Add more space between lines and elements",
  },
  {
    key: "lineFocus",
    label: "Line focus mode",
    description: "Highlight the current line while dimming others",
  },
  {
    key: "reducedMotion",
    label: "Reduced motion",
    description: "Minimize animations and transitions",
  },
];

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useProfile();

  const [supports, setSupports] = useState<SupportFlags>(profile.supports);
  const [studyPrefs, setStudyPrefs] = useState<StudyPreferences>(profile.studyPreferences);
  const [uiPrefs, setUiPrefs] = useState<UiPreferences>(profile.uiPreferences);
  const [customNotes, setCustomNotes] = useState(profile.customNotes || "");
  const [saving, setSaving] = useState(false);

  function toggleSupport(key: keyof SupportFlags) {
    setSupports((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleStudyPref(key: keyof StudyPreferences) {
    if (typeof studyPrefs[key] === "boolean") {
      setStudyPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  }

  function toggleUiPref(key: keyof UiPreferences) {
    if (typeof uiPrefs[key] === "boolean") {
      setUiPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await saveProfile({
        supports,
        studyPreferences: studyPrefs,
        uiPreferences: uiPrefs,
        customNotes,
        onboardingComplete: true,
      });
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-container">
        <header className="profile-setup-header">
          <h1>Set Up Your Learning Profile</h1>
          <p className="muted">
            Tell us how you learn best so we can personalize your experience.
            You can change these settings anytime.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <section className="profile-section">
            <h2>What kind of support do you need?</h2>
            <p className="muted">Select all that apply</p>

            <div className="support-options">
              {SUPPORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`support-card ${supports[option.key] ? "selected" : ""}`}
                  onClick={() => toggleSupport(option.key)}
                  aria-pressed={supports[option.key]}
                >
                  <div className="support-card-content">
                    <h3>{option.label}</h3>
                    <p>{option.description}</p>
                    <span className="helpful-for">{option.helpfulFor}</span>
                  </div>
                  <div className="support-card-check" aria-hidden="true">
                    {supports[option.key] ? "✓" : ""}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="profile-section">
            <h2>Learning Preferences</h2>
            <p className="muted">How would you like content delivered?</p>

            <div className="checkbox-group">
              {LEARNING_OPTIONS.map((option) => (
                <label key={option.key} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={studyPrefs[option.key] === true}
                    onChange={() => toggleStudyPref(option.key)}
                  />
                  <div className="checkbox-content">
                    <span className="checkbox-label">{option.label}</span>
                    <span className="checkbox-description">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="profile-section">
            <h2>Accessibility Preferences</h2>
            <p className="muted">Customize the interface for your needs</p>

            <div className="checkbox-group">
              {ACCESSIBILITY_OPTIONS.map((option) => (
                <label key={option.key} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={uiPrefs[option.key] === true}
                    onChange={() => toggleUiPref(option.key)}
                  />
                  <div className="checkbox-content">
                    <span className="checkbox-label">{option.label}</span>
                    <span className="checkbox-description">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="profile-section">
            <h2>Additional Notes</h2>
            <p className="muted">
              Is there anything else we should know about how you learn best?
            </p>

            <textarea
              className="custom-notes-input"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="For example: I learn better with examples, I prefer bullet points over paragraphs, I need extra time to process information..."
              rows={4}
            />
          </section>

          <div className="profile-setup-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => navigate("/dashboard")}
            >
              Skip for now
            </button>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
