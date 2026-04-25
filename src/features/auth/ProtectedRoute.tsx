import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="app-main" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
