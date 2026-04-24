import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { firebaseConfigured } from "@/lib/firebase";

export function LandingPage() {
  const { user } = useAuth();

  return (
    <section className="stack" aria-labelledby="landing-title">
      {!firebaseConfigured && (
        <div className="error-banner" role="status">
          <strong>Firebase isn't configured.</strong> Sign-in, upload, and chat
          will fail until you copy <code>.env.example</code> to
          <code> .env.local</code> and fill in your Firebase web config. See
          the README for setup steps.
        </div>
      )}
      <header className="stack" style={{ gap: "var(--space-3)" }}>
        <p className="badge">Accessibility-first AI study platform</p>
        <h1 id="landing-title" style={{ fontSize: "2.4rem" }}>
          Study materials that adapt to how you read, focus, and learn.
        </h1>
        <p className="muted" style={{ maxWidth: "60ch" }}>
          Upload your class PDFs and notes. Pick the supports you need. Get an
          accessible reader, plus a Gemini-powered tutor that explains,
          simplifies, summarizes, quizzes, and breaks things into steps —
          grounded in the document you uploaded.
        </p>
        <div className="row">
          <Link to={user ? "/dashboard" : "/login"} className="button">
            {user ? "Open dashboard" : "Get started"}
          </Link>
          <Link to="/login" className="button secondary">
            Sign in
          </Link>
        </div>
      </header>

      <div className="grid-3">
        <FeatureCard
          title="Dyslexia supports"
          body="Larger spacing, shorter chunks, line focus, optional read-aloud."
        />
        <FeatureCard
          title="ADHD-friendly study"
          body="One idea at a time, guided steps, less clutter, quick summaries."
        />
        <FeatureCard
          title="Low-vision ready"
          body="High contrast, large text, keyboard navigation, audio output."
        />
      </div>
    </section>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="card stack" aria-label={title}>
      <h2 style={{ fontSize: "1.1rem" }}>{title}</h2>
      <p className="muted">{body}</p>
    </article>
  );
}
