import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { firebaseConfigured } from "@/lib/firebase";

export function LoginPage() {
  const { user, isGuest, isDemoUser, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only leave when we have a real signed-in account (not guest / not preview demo user).
  if (user && !isGuest) {
    const from = (location.state as { from?: { pathname: string } })?.from
      ?.pathname;
    return <Navigate to={from ?? "/dashboard"} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="stack"
      style={{ maxWidth: 420, margin: "0 auto" }}
      aria-labelledby="login-title"
    >
      {isDemoUser && (
        <div className="info-banner" role="status">
          <strong>Preview mode.</strong> Add Firebase in <code>.env.local</code>{" "}
          for real sign-in. You can still use this form layout below.
        </div>
      )}
      {isGuest && user && !isDemoUser && firebaseConfigured && (
        <div className="info-banner" role="status">
          <strong>Guest session.</strong> Sign in or create an account to keep
          your work across devices. Your data will be linked to this account.
        </div>
      )}
      <h1 id="login-title">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <p className="muted">
        Axessify adapts to how you learn. Sign in to upload documents and
        configure your accessibility profile.
      </p>
      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
        <Link to="/">Back to home</Link> · <Link to="/study">Study</Link>
      </p>

      <button
        type="button"
        className="button secondary"
        onClick={() => void onGoogle()}
        disabled={busy}
      >
        Continue with Google
      </button>

      <form className="stack" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <button type="submit" className="button" disabled={busy}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        className="button ghost"
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </section>
  );
}
