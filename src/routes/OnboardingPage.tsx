import { Link, useNavigate } from "react-router-dom";
import { PreferenceForm } from "@/features/profile/PreferenceForm";
import { useProfile } from "@/features/profile/ProfileProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import type { UserProfile } from "@/types/profile";

export function OnboardingPage() {
  const { profile, saveProfile } = useProfile();
  const { isGuest } = useAuth();
  const navigate = useNavigate();

  async function handleSave(next: Partial<UserProfile>) {
    await saveProfile({ ...next, onboardingComplete: true });
    navigate("/dashboard");
  }

  return (
    <section className="stack" aria-labelledby="onboarding-title">
      <header className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 id="onboarding-title">Set up how you study</h1>
        <p className="muted">
          Pick the supports you want. You can change everything later in
          Settings, and you can always override mode by document.
        </p>
        {isGuest && (
          <p className="muted">
            You're a guest — these settings are saved to a temporary session.{" "}
            <Link to="/login">Sign in</Link> to keep them across devices.
          </p>
        )}
      </header>
      <PreferenceForm
        initial={profile}
        onSave={handleSave}
        submitLabel="Continue to dashboard"
      />
      <div>
        <Link to="/dashboard" className="button ghost">
          Skip for now
        </Link>
      </div>
    </section>
  );
}
