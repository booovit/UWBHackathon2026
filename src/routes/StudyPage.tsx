import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { firebaseConfigured } from "@/lib/firebase";
import { UploadDocument } from "@/features/documents/UploadDocument";
import { useDocument } from "@/features/documents/useDocuments";
import { useChunks } from "@/features/documents/useChunks";
import { AccessibilityToolbar } from "@/features/reader/AccessibilityToolbar";
import { DocumentReader } from "@/features/reader/DocumentReader";
import { ChatPanel } from "@/features/study/ChatPanel";
import { QuickChat } from "@/features/study/QuickChat";
import { callRetryDocumentProcessing } from "@/lib/functions";

export function StudyPage() {
  const { docId } = useParams<{ docId?: string }>();
  if (docId) {
    return <DocumentStudyView docId={docId} />;
  }
  return <GeneralStudyView />;
}

function GeneralStudyView() {
  const { isGuest } = useAuth();

  return (
    <section className="stack workspace" aria-labelledby="study-title">
      <header className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 id="study-title">Study</h1>
        <p className="muted">
          Chat with the tutor and add a document in one place. Upload
          course materials to ground answers in that file, then use
          summary, quiz, flashcards, and more from the same chat.
        </p>
      </header>

      {!firebaseConfigured && (
        <div className="info-banner" role="status">
          <strong>Preview mode.</strong> Add <code>.env.local</code> to enable
          real uploads and Gemini. You can still explore the layout below.
        </div>
      )}

      {firebaseConfigured && isGuest && (
        <div
          className="card row"
          style={{ justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <div style={{ minWidth: 0 }}>
            <strong>You're studying as a guest.</strong>
            <p className="muted" style={{ margin: 0 }}>
              Sign in to keep chats and documents across devices.
            </p>
          </div>
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <Link to="/login" className="button">
              Sign in to save
            </Link>
            <Link to="/dashboard" className="button secondary">
              Your library
            </Link>
          </div>
        </div>
      )}

      <div className="card stack" style={{ gap: "var(--space-5)" }}>
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <h2 className="visually-hidden">Add material</h2>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>
            1. Add a document (optional)
          </p>
          <UploadDocument variant="inline" noCard />
        </div>

        <div
          style={{
            height: 1,
            background: "var(--color-border)",
            margin: "0 calc(-1 * var(--space-5))",
          }}
          role="separator"
        />

        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>
            2. Chat and study
          </p>
          <QuickChat embedded />
        </div>
      </div>

      <p className="muted" style={{ textAlign: "center", fontSize: "0.9rem" }}>
        <Link to="/dashboard">Open your library</Link> for past chats, saved
        quizzes, and flashcards.
      </p>
    </section>
  );
}

function DocumentStudyView({ docId }: { docId: string }) {
  const { document, loading } = useDocument(docId);
  const { chunks, loading: chunksLoading } = useChunks(docId);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  if (loading) {
    return (
      <p className="muted" style={{ textAlign: "center" }}>
        Loading document…
      </p>
    );
  }

  if (!document) {
    return (
      <section className="stack">
        <p>Document not found.</p>
        <Link to="/study" className="button">
          Back to study
        </Link>
        <Link to="/dashboard" className="button secondary">
          Open library
        </Link>
      </section>
    );
  }

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    try {
      await callRetryDocumentProcessing({ docId });
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <section className="stack workspace" aria-labelledby="doc-study-title">
      <header className="row" style={{ justifyContent: "space-between" }}>
        <div className="stack" style={{ gap: "var(--space-1)" }}>
          <h1 id="doc-study-title" style={{ fontSize: "1.35rem" }}>
            {document.fileName}
          </h1>
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <span className={`badge status-${document.status}`}>
              {document.status}
            </span>
            <span className="muted">{document.processingStage}</span>
            {document.chunkCount > 0 && (
              <span className="muted">{document.chunkCount} chunks</span>
            )}
          </div>
        </div>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <Link to="/study" className="button secondary">
            New / general chat
          </Link>
          <Link to="/dashboard" className="button secondary">
            Library
          </Link>
          {document.status === "failed" && (
            <button
              type="button"
              className="button"
              onClick={() => void retry()}
              disabled={retrying}
            >
              {retrying ? "Retrying…" : "Retry processing"}
            </button>
          )}
        </div>
      </header>

      {document.error && (
        <div className="error-banner" role="alert">
          {document.error}
        </div>
      )}

      {retryError && (
        <div className="error-banner" role="alert">
          {retryError}
        </div>
      )}

      <div
        className="card row"
        style={{ flexWrap: "wrap", alignItems: "center" }}
        aria-label="Add another document"
      >
        <span className="muted" style={{ marginRight: "var(--space-2)" }}>
          Add or replace material:
        </span>
        <UploadDocument variant="inline" noCard />
      </div>

      <AccessibilityToolbar />

      <div className="grid-2" style={{ alignItems: "stretch" }}>
        {chunksLoading ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Loading reader…
            </p>
          </div>
        ) : (
          <DocumentReader chunks={chunks} />
        )}
        <ChatPanel docId={docId} />
      </div>
    </section>
  );
}
