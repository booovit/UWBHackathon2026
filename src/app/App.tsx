import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { useProfile } from "@/features/profile/ProfileProvider";
import { useApplyAccessibility } from "@/features/profile/applyAccessibility";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useAuth } from "@/features/auth/AuthProvider";
import { LandingPage } from "@/routes/LandingPage";
import { LoginPage } from "@/routes/LoginPage";
import { OnboardingPage } from "@/routes/OnboardingPage";
import { DashboardPage } from "@/routes/DashboardPage";
import { SettingsPage } from "@/routes/SettingsPage";
import { ProfilePage } from "@/routes/ProfilePage";
import { ProfileSetupPage } from "@/routes/ProfileSetupPage";
import { StudyPage } from "@/routes/StudyPage";
import { ThemeToggle } from "@/features/theme/ThemeProvider";

const LARGE_PRINT_SCALE = 2.4;

function BigFontToggle() {
  const { profile, saveProfile } = useProfile();
  const isActive = profile.uiPreferences.fontScale >= LARGE_PRINT_SCALE;

  function toggle() {
    void saveProfile({
      uiPreferences: {
        ...profile.uiPreferences,
        fontScale: isActive ? 1.0 : LARGE_PRINT_SCALE,
      },
    });
  }

  return (
    <button
      type="button"
      className={isActive ? "big-font-toggle active" : "big-font-toggle"}
      aria-pressed={isActive}
      onClick={toggle}
      aria-label={isActive ? "Turn off big font" : "Turn on big font for visual impairment"}
    >
      {isActive ? "Big Font ON" : "Big Font"}
    </button>
  );
}

export function App() {
  const { profile } = useProfile();
  useApplyAccessibility(profile.uiPreferences);

  return (
    <div className="app-shell">
      <Header />
      <main id="main" className="app-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/chat"
            element={<Navigate to="/study" replace />}
          />
          <Route
            path="/documents/:docId"
            element={
              <ProtectedRoute>
                <LegacyDocumentRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study"
            element={
              <ProtectedRoute>
                <StudyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study/:docId"
            element={
              <ProtectedRoute>
                <StudyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/setup"
            element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function LegacyDocumentRedirect() {
  const { docId } = useParams<{ docId: string }>();
  return <Navigate to={`/study/${docId ?? ""}`} replace />;
}

function ProfileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function Header() {
  const { user, isGuest, signOutUser } = useAuth();
  const isSignedIn = Boolean(user) && !isGuest;

  return (
    <header className="app-header">
      <Link to="/" className="brand">
        <span className="brand-dot" aria-hidden="true" />
        Axessify
      </Link>
      <nav className="header-nav row" aria-label="Primary">
        <ThemeToggle />
        <BigFontToggle />
        <Link to="/study" className="button ghost">
          Study
        </Link>
        <Link to="/dashboard" className="button ghost">
          Library
        </Link>
        {isSignedIn && (
          <Link to="/profile" className="button ghost" aria-label="Profile">
            <ProfileIcon />
          </Link>
        )}
        {isSignedIn ? (
          <>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                void signOutUser().catch((err) => {
                  console.error("Sign out failed", err);
                });
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <span className="badge" title="You're using Axessify as a guest">
              {isGuest ? "Guest" : "Loading"}
            </span>
            <Link to="/login" className="button">
              Sign in to save
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
