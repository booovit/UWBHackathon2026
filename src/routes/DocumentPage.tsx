import { Link, useParams } from "react-router-dom";
import { useDocument } from "@/features/documents/useDocuments";
import { useChunks } from "@/features/documents/useChunks";
import { AccessibilityToolbar } from "@/features/reader/AccessibilityToolbar";
import { DocumentReader } from "@/features/reader/DocumentReader";
import { ChatPanel } from "@/features/study/ChatPanel";
import { callRetryDocumentProcessing } from "@/lib/functions";
import { useState } from "react";

export function DocumentPage() {
  const { docId } = useParams<{ docId: string }>();
  const { document, loading } = useDocument(docId);
  const { chunks, loading: chunksLoading } = useChunks(docId);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  if (loading) {
    return <p>Loading…</p>;
  }

  if (!document || !docId) {
    return (
      <section className="stack">
        <p>Document not found.</p>
        <Link to="/dashboard" className="button">
          Back to dashboard
        </Link>
      </section>
    );
  }

  async function retry() {
    if (!docId) return;
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
    <section className="stack workspace" aria-labelledby="doc-title">
      <header className="row" style={{ justifyContent: "space-between" }}>
        <div className="stack" style={{ gap: "var(--space-1)" }}>
          <h1 id="doc-title">{document.fileName}</h1>
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
          <Link to="/dashboard" className="button secondary">
            Back
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

      <AccessibilityToolbar />

      <div className="grid-2">
        {chunksLoading ? (
          <div className="card">Loading reader…</div>
        ) : (
          <DocumentReader chunks={chunks} />
        )}
        <ChatPanel docId={docId} />
      </div>
    </section>
  );
}
