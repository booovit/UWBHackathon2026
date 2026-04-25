import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-main" role="status" aria-live="polite">
        <p className="muted" style={{ margin: 0 }}>
          Loading…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-main stack" style={{ gap: "var(--space-4)" }}>
        <p style={{ margin: 0 }}>
          We couldn&apos;t start a session. Try again, or open the home page
          and check that Firebase Authentication (including Anonymous) is
          enabled for this project.
        </p>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link to="/" className="button">
            Home
          </Link>
          <Link to="/login" className="button secondary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
