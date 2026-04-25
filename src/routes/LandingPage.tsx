import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { firebaseConfigured } from "@/lib/firebase";

export function LandingPage() {
  const { user, isGuest } = useAuth();
  const isSignedIn = Boolean(user) && !isGuest;

  return (
    <section className="stack" aria-labelledby="landing-title">
      {!firebaseConfigured && (
        <div className="info-banner" role="status">
          <strong>Preview mode.</strong> Firebase isn't configured yet, so
          chat will reply with a placeholder. Add <code>.env.local</code> with
          your Firebase config to enable sign-in, document upload, and the real
          Gemini tutor.
        </div>
      )}

      <section className="hero stack" aria-labelledby="hero-title">
        <p className="badge">Accessibility-first AI study platform</p>
        <h1 id="hero-title">
          Study materials that adapt to how you read, focus, and learn.
        </h1>
        <p className="lead">
          Studylift is an AI tutor designed around real learner supports — not
          one-size-fits-all output. Chat and upload in one workspace — no
          sign-in required. Add a PDF or DOCX to ground the tutor in your
          material, then use summary, quiz, flashcards, and more from the same
          place.
        </p>
        <div className="row">
          <Link to="/study" className="button">
            Start studying
          </Link>
          <Link to="/dashboard" className="button secondary">
            Your library
          </Link>
          {!isSignedIn && (
            <Link to="/login" className="button ghost">
              Sign in
            </Link>
          )}
        </div>
      </section>

      <section className="stack" aria-labelledby="how-title">
        <h2 id="how-title" style={{ fontSize: "1.4rem" }}>
          How it works
        </h2>
        <ol
          className="grid-3"
          style={{ padding: 0, listStyle: "none", margin: 0 }}
        >
          <Step
            num={1}
            title="Pick supports you want"
            body="Larger spacing, line focus, one-step-at-a-time, high contrast — combine whatever helps you."
          />
          <Step
            num={2}
            title="Chat or upload a document"
            body="Ask questions immediately, or upload a PDF/DOCX to get answers grounded in that material."
          />
          <Step
            num={3}
            title="Switch study modes"
            body="Summarize, simplify, quiz, flashcards, step-by-step — the same content, shaped for you."
          />
        </ol>
      </section>

      <section className="stack" aria-labelledby="supports-title">
        <h2 id="supports-title" style={{ fontSize: "1.4rem" }}>
          Built around composable supports
        </h2>
        <div className="grid-3">
          <FeatureCard
            title="Dyslexia"
            items={[
              "Larger letter and line spacing",
              "Narrow line widths",
              "Paragraph chunking",
              "Line focus",
              "Optional read-aloud",
            ]}
          />
          <FeatureCard
            title="ADHD / executive function"
            items={[
              "One idea at a time",
              "Guided next-step study flow",
              "Reduced clutter",
              "Short summaries first",
              "Quiz-first option",
            ]}
          />
          <FeatureCard
            title="Low vision"
            items={[
              "High-contrast theme",
              "Large text",
              "Keyboard-first navigation",
              "Semantic structure",
              "Audio output",
            ]}
          />
        </div>
      </section>

      <section className="stack" aria-labelledby="study-title">
        <h2 id="study-title" style={{ fontSize: "1.4rem" }}>
          Six ways to study the same document
        </h2>
        <div className="grid-3">
          <FeatureCard
            title="Chat"
            items={["Ask anything about your document."]}
          />
          <FeatureCard
            title="Summary"
            items={["Key ideas and important terms first."]}
          />
          <FeatureCard
            title="Simplify"
            items={["Plain language, shorter sentences."]}
          />
          <FeatureCard
            title="Quiz"
            items={["Multiple-choice and short answer."]}
          />
          <FeatureCard
            title="Flashcards"
            items={["Front/back cards from your material."]}
          />
          <FeatureCard
            title="Step-by-step"
            items={["Break assignments into focused steps."]}
          />
        </div>
      </section>

      <section
        className="card stack"
        style={{ alignItems: "flex-start" }}
        aria-labelledby="cta-title"
      >
        <h2 id="cta-title" style={{ fontSize: "1.3rem" }}>
          Ready to try it?
        </h2>
        <p className="muted">
          Start a chat in one click. Sign in later — your chats follow you.
        </p>
        <div className="row">
          <Link to="/study" className="button">
            Start studying
          </Link>
          <Link to="/dashboard" className="button secondary">
            Your library
          </Link>
        </div>
      </section>
    </section>
  );
}

function FeatureCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="card stack" aria-label={title}>
      <h3 style={{ fontSize: "1.05rem", margin: 0 }}>{title}</h3>
      <ul className="feature-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function Step({
  num,
  title,
  body,
}: {
  num: number;
  title: string;
  body: string;
}) {
  return (
    <li className="card stack" style={{ listStyle: "none" }}>
      <span className="badge" aria-hidden="true">
        Step {num}
      </span>
      <h3 style={{ fontSize: "1.05rem", margin: 0 }}>{title}</h3>
      <p className="muted" style={{ margin: 0 }}>
        {body}
      </p>
    </li>
  );
}
