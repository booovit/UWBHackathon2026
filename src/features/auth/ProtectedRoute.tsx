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
      <div
        className="app-main stack"
        style={{ gap: "var(--space-4)" }}
        role="alert"
      >
        <p style={{ margin: 0 }}>We couldn’t start a session. Try again.</p>
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
