import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PreferenceForm } from "@/features/profile/PreferenceForm";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/ProfileProvider";
import type { UserProfile } from "@/types/profile";

export function ProfilePage() {
  const { user, isGuest } = useAuth();
  const { profile, saveProfile } = useProfile();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const isFirstSetup = !profile.onboardingComplete;

  async function handleSave(next: Partial<UserProfile>) {
    await saveProfile({ ...next, onboardingComplete: true });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
    if (isFirstSetup) navigate("/dashboard");
  }

  return (
    <section className="stack" aria-labelledby="profile-title">
      <header className="stack" style={{ gap: "var(--space-2)" }}>
        <p className="badge" style={{ width: "fit-content" }}>
          {isFirstSetup ? "Profile setup" : "Profile"}
        </p>
        <h1 id="profile-title">Your learning profile</h1>
        <p className="muted">
          Keep disability supports, access needs, display preferences, and study
          defaults together. Studylift uses this profile to adapt the reader and
          tutor responses.
        </p>
        {isGuest && (
          <p className="muted">
            You're using a guest session. <Link to="/login">Sign in</Link> to
            keep this profile across devices.
          </p>
        )}
      </header>

      <section className="card stack" aria-labelledby="account-heading">
        <h2 id="account-heading" style={{ fontSize: "1.1rem" }}>
          Account
        </h2>
        <div className="grid-2">
          <ProfileFact label="Email" value={user?.email ?? "Guest session"} />
          <ProfileFact
            label="Name"
            value={profile.displayName || user?.displayName || "Not provided"}
          />
        </div>
      </section>

      {saved && (
        <div className="badge status-ready" role="status" aria-live="polite">
          Profile saved
        </div>
      )}

      <PreferenceForm
        initial={profile}
        onSave={handleSave}
        submitLabel={isFirstSetup ? "Save profile and continue" : "Save profile"}
      />
    </section>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
