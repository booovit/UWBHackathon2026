import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";

export function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname;
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
      <h1 id="login-title">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <p className="muted">
        Studylift adapts to how you learn. Sign in to upload documents and
        configure your accessibility profile.
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
