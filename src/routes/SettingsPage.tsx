import { useState } from "react";
import { PreferenceForm } from "@/features/profile/PreferenceForm";
import { useProfile } from "@/features/profile/ProfileProvider";
import type { UserProfile } from "@/types/profile";

export function SettingsPage() {
  const { profile, saveProfile } = useProfile();
  const [saved, setSaved] = useState(false);

  async function handleSave(next: Partial<UserProfile>) {
    await saveProfile(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <section className="stack" aria-labelledby="settings-title">
      <header className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 id="settings-title">Accessibility &amp; study settings</h1>
        <p className="muted">
          Manual changes always override automatic preference learning.
        </p>
      </header>
      {saved && (
        <div className="badge status-ready" role="status" aria-live="polite">
          Settings saved
        </div>
      )}
      <PreferenceForm
        initial={profile}
        onSave={handleSave}
        submitLabel="Save settings"
      />
    </section>
  );
}
