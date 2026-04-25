import { Link } from "react-router-dom";
import { useDocuments } from "@/features/documents/useDocuments";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/ProfileProvider";
import { firebaseConfigured } from "@/lib/firebase";
import type { StudyDocument } from "@/types/document";

export function DashboardPage() {
  const { documents, loading } = useDocuments();
  const { isGuest } = useAuth();
  const { profile } = useProfile();

  return (
    <section className="stack" aria-labelledby="library-title">
      <header className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 id="library-title">Your library</h1>
        <p className="muted">
          Past chats, documents, and study artifacts you have generated. Go to
          <Link to="/study"> Study</Link> to chat, upload, and work in one
          place.
        </p>
      </header>

      {!firebaseConfigured && (
        <div className="info-banner" role="status">
          <strong>Preview mode.</strong> Add <code>.env.local</code> to sync
          this library with Firebase. Layout below is a preview.
        </div>
      )}

      {isGuest && (
        <div
          className="card row"
          style={{ justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <div style={{ minWidth: 0 }}>
            <strong>Guest mode.</strong>
            <p className="muted" style={{ margin: 0 }}>
              Sign in to keep your library when you switch devices.
            </p>
          </div>
          <Link to="/login" className="button">
            Sign in
          </Link>
        </div>
      )}

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Link to="/study" className="button">
          Open study workspace
        </Link>
        <Link
          to={profile.onboardingComplete ? "/settings" : "/onboarding"}
          className="button secondary"
        >
          {profile.onboardingComplete
            ? "Accessibility settings"
            : "Set up profile"}
        </Link>
      </div>

      <div className="grid-2" style={{ alignItems: "stretch" }}>
        <section className="card stack" aria-labelledby="chats-heading">
          <h2 id="chats-heading" style={{ fontSize: "1.1rem" }}>
            Chats
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            General study chat and document-scoped conversations.
          </p>
          <ul
            className="stack"
            style={{ listStyle: "none", padding: 0, gap: "var(--space-2)" }}
          >
            <li>
              <Link
                to="/study"
                className="button secondary"
                style={{ width: "100%" }}
              >
                General study chat
              </Link>
            </li>
            {documents
              .filter((d) => d.status === "ready" || d.status === "processing")
              .map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/study/${d.id}`}
                    className="button secondary"
                    style={{ width: "100%", textAlign: "left" }}
                  >
                    {d.fileName}
                    {d.status === "processing" && (
                      <span className="muted"> — processing</span>
                    )}
                  </Link>
                </li>
              ))}
            {documents.length === 0 && !loading && (
              <li className="muted" style={{ fontSize: "0.9rem" }}>
                No document chats yet. Add a file from{" "}
                <Link to="/study">Study</Link>.
              </li>
            )}
          </ul>
        </section>

        <section className="card stack" aria-labelledby="folders-heading">
          <h2 id="folders-heading" style={{ fontSize: "1.1rem" }}>
            Folders
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Organize documents and saved sets into collections.
          </p>
          <p
            className="muted"
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontStyle: "italic",
            }}
          >
            Coming soon — you will be able to drag chats and materials into
            folders.
          </p>
        </section>
      </div>

      <div className="grid-2" style={{ alignItems: "stretch" }}>
        <section className="card stack" aria-labelledby="flashcards-heading">
          <h2 id="flashcards-heading" style={{ fontSize: "1.1rem" }}>
            Flashcards
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Sets you generate in study mode will appear here for spaced review.
          </p>
          <p
            className="muted"
            style={{ margin: 0, fontSize: "0.9rem", fontStyle: "italic" }}
          >
            None saved yet. Use Flashcards mode from a document in{" "}
            <Link to="/study">Study</Link>.
          </p>
        </section>

        <section className="card stack" aria-labelledby="quizzes-heading">
          <h2 id="quizzes-heading" style={{ fontSize: "1.1rem" }}>
            Quizzes
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Quizzes and practice runs created from your materials.
          </p>
          <p
            className="muted"
            style={{ margin: 0, fontSize: "0.9rem", fontStyle: "italic" }}
          >
            None saved yet. Open a document in <Link to="/study">Study</Link> and
            use Quiz mode in the chat panel.
          </p>
        </section>
      </div>

      <section className="stack" aria-labelledby="docs-heading">
        <header className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="docs-heading" style={{ fontSize: "1.15rem", margin: 0 }}>
            All documents
          </h2>
          <span className="muted">
            {loading ? "…" : `${documents.length} file${documents.length === 1 ? "" : "s"}`}
          </span>
        </header>

        {loading ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Loading…
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="card stack" style={{ alignItems: "flex-start" }}>
            <strong>No files yet</strong>
            <p className="muted" style={{ margin: 0 }}>
              Upload a PDF, DOCX, or notes from the{" "}
              <Link to="/study">study workspace</Link>.
            </p>
          </div>
        ) : (
          <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
            {documents.map((d) => (
              <li key={d.id}>
                <DocumentRow doc={d} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function DocumentRow({ doc }: { doc: StudyDocument }) {
  const linkable = doc.status !== "failed";
  return (
    <article
      className="card row"
      style={{ justifyContent: "space-between", alignItems: "flex-start" }}
    >
      <div className="stack" style={{ gap: "var(--space-1)", minWidth: 0 }}>
        <strong style={{ wordBreak: "break-word" }}>{doc.fileName}</strong>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <span className={`badge status-${doc.status}`}>
            {statusLabel(doc.status)}
          </span>
          <span className="muted">{stageLabel(doc.processingStage)}</span>
          {doc.chunkCount > 0 && (
            <span className="muted">{doc.chunkCount} chunks</span>
          )}
        </div>
        {doc.error && (
          <span className="muted" role="alert">
            {doc.error}
          </span>
        )}
      </div>
      <div className="row">
        {linkable && (
          <Link to={`/study/${doc.id}`} className="button">
            Open in study
          </Link>
        )}
      </div>
    </article>
  );
}

function statusLabel(status: StudyDocument["status"]) {
  switch (status) {
    case "uploaded":
      return "Uploaded";
    case "processing":
      return "Processing";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
  }
}

function stageLabel(stage: StudyDocument["processingStage"]) {
  switch (stage) {
    case "waiting":
      return "Waiting to process";
    case "extracting_text":
      return "Extracting text";
    case "chunking":
      return "Chunking";
    case "generating_embeddings":
      return "Generating embeddings";
    case "complete":
      return "Ready to study";
    case "failed":
      return "Processing failed";
  }
}
