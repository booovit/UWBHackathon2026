import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/ProfileProvider";
import { useApplyAccessibility } from "@/features/profile/applyAccessibility";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { LandingPage } from "@/routes/LandingPage";
import { LoginPage } from "@/routes/LoginPage";
import { OnboardingPage } from "@/routes/OnboardingPage";
import { DashboardPage } from "@/routes/DashboardPage";
import { DocumentPage } from "@/routes/DocumentPage";
import { SettingsPage } from "@/routes/SettingsPage";

export function App() {
  const { profile } = useProfile();
  useApplyAccessibility(profile.uiPreferences);

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" className="app-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
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
            path="/documents/:docId"
            element={
              <ProtectedRoute>
                <DocumentPage />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Header() {
  const { user, signOutUser } = useAuth();

  return (
    <header className="app-header">
      <Link to={user ? "/dashboard" : "/"} className="brand">
        Studylift
      </Link>
      <nav className="row" aria-label="Primary">
        {user ? (
          <>
            <Link to="/dashboard" className="button ghost">
              Dashboard
            </Link>
            <Link to="/settings" className="button ghost">
              Settings
            </Link>
            <button
              type="button"
              className="button secondary"
              onClick={() => void signOutUser()}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="button">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
